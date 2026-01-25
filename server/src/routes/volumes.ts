import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

interface VolumeRow extends RowDataPacket {
  volume_id: number;
  series_id: number;
  volume_number: number;
  issue_range: string | null;
  start_issue: number | null;
  end_issue: number | null;
  start_date: Date | null;
  end_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  issue_count: number;
  copy_count: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// GET /api/volumes - List volumes, optionally filtered by series
router.get('/api/volumes', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT
        v.volume_id,
        v.series_id,
        v.volume_number,
        v.issue_range,
        v.start_issue,
        v.end_issue,
        v.start_date,
        v.end_date,
        v.notes,
        v.created_at,
        v.updated_at,
        s.title as series_title,
        COALESCE(issue_stats.issue_count, 0) as issue_count,
        COALESCE(copy_stats.copy_count, 0) as copy_count
      FROM volume v
      JOIN series s ON v.series_id = s.series_id
      LEFT JOIN (
        SELECT volume_id, COUNT(*) as issue_count
        FROM issue 
        WHERE deleted_at IS NULL
        GROUP BY volume_id
      ) issue_stats ON v.volume_id = issue_stats.volume_id
      LEFT JOIN (
        SELECT i.series_id, 
               COUNT(c.copy_id) as copy_count,
               SUM(c.purchase_price) as total_cost,
               SUM(c.current_value) as total_value
        FROM issue i
        JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
        WHERE i.deleted_at IS NULL
        GROUP BY i.series_id
      ) copy_stats ON s.series_id = copy_stats.series_id
      WHERE v.deleted_at IS NULL
    `;

    const id = req.query.id as string | undefined;
    const seriesId = req.query.series_id as string | undefined;

    if (id) {
      const results = await query<VolumeRow[]>(
        `${baseQuery} AND v.volume_id = ?`,
        [parseInt(id)]
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM volume WHERE deleted_at IS NULL'
      );
      res.json({ results, count });
    } else if (seriesId) {
      const results = await query<VolumeRow[]>(
        `${baseQuery} AND v.series_id = ? ORDER BY v.volume_number`,
        [parseInt(seriesId)]
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM volume WHERE series_id = ? AND deleted_at IS NULL',
        [parseInt(seriesId)]
      );
      res.json({ results, count });
    } else {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;

      const results = await query<VolumeRow[]>(
        `${baseQuery} ORDER BY s.title, v.volume_number LIMIT ${limit} OFFSET ${offset}`,
        []
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM volume WHERE deleted_at IS NULL'
      );
      res.json({ results, count });
    }
  } catch (err) {
    console.error('Error fetching volumes:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/volumes/:id/summary - Get volume with computed stats
router.get('/api/volumes/:id/summary', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const volumeQuery = `
      SELECT 
        v.*,
        s.title as series_title,
        COUNT(DISTINCT i.issue_id) as issue_count,
        COUNT(DISTINCT c.copy_id) as copy_count,
        COALESCE(SUM(c.purchase_price), 0) as total_cost,
        COALESCE(SUM(c.current_value), 0) as total_value
      FROM volume v
      JOIN series s ON v.series_id = s.series_id
      LEFT JOIN issue i ON v.volume_id = i.volume_id AND i.deleted_at IS NULL
      LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
      WHERE v.volume_id = ? AND v.deleted_at IS NULL
      GROUP BY v.volume_id
    `;

    const results = await query<RowDataPacket[]>(volumeQuery, [id]);

    if (results.length === 0) {
      res.status(404).json({ error: 'Volume not found' });
      return;
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching volume summary:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// Helper function to parse issue_range and compute start_issue/end_issue
function parseIssueRange(issueRange: string | null): { start: number | null; end: number | null } {
  if (!issueRange) return { start: null, end: null };

  const segments = issueRange.split(',').map(s => s.trim());
  let minIssue: number | null = null;
  let maxIssue: number | null = null;
  let isOpenEnded = false;

  for (const segment of segments) {
    if (segment.endsWith('+')) {
      // Open-ended range like "500+"
      const num = parseInt(segment.slice(0, -1), 10);
      if (!isNaN(num)) {
        if (minIssue === null || num < minIssue) minIssue = num;
        isOpenEnded = true;
      }
    } else if (segment.includes('-')) {
      // Range like "1-416"
      const [startStr, endStr] = segment.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start)) {
        if (minIssue === null || start < minIssue) minIssue = start;
      }
      if (!isNaN(end)) {
        if (maxIssue === null || end > maxIssue) maxIssue = end;
      }
    } else {
      // Single issue like "7"
      const num = parseInt(segment, 10);
      if (!isNaN(num)) {
        if (minIssue === null || num < minIssue) minIssue = num;
        if (maxIssue === null || num > maxIssue) maxIssue = num;
      }
    }
  }

  return {
    start: minIssue,
    end: isOpenEnded ? null : maxIssue
  };
}

// POST /api/volumes - Create a new volume
router.post('/api/volumes', async (req: Request, res: Response) => {
  try {
    const {
      series_id,
      volume_number,
      issue_range,
      start_issue,
      end_issue,
      start_date,
      end_date,
      notes
    } = req.body;

    if (!series_id || volume_number === undefined) {
      res.status(400).json({ error: 'series_id and volume_number are required' });
      return;
    }

    // If issue_range is provided, compute start_issue/end_issue from it
    let computedStart = start_issue;
    let computedEnd = end_issue;
    if (issue_range) {
      const parsed = parseIssueRange(issue_range);
      computedStart = parsed.start;
      computedEnd = parsed.end;
    }

    const result = await execute(
      `INSERT INTO volume (series_id, volume_number, issue_range, start_issue, end_issue,
        start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        series_id,
        volume_number,
        issue_range || null,
        computedStart || null,
        computedEnd || null,
        start_date || null,
        end_date || null,
        notes || null
      ]
    );

    res.status(201).json({
      volume_id: result.insertId,
      message: 'Volume created successfully'
    });
  } catch (err) {
    console.error('Error creating volume:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/volumes/:id - Update a volume
router.put('/api/volumes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      volume_number,
      issue_range,
      start_issue,
      end_issue,
      start_date,
      end_date,
      notes
    } = req.body;

    // If issue_range is provided, compute start_issue/end_issue from it
    let computedStart = start_issue;
    let computedEnd = end_issue;
    if (issue_range !== undefined) {
      const parsed = parseIssueRange(issue_range);
      computedStart = parsed.start;
      computedEnd = parsed.end;
    }

    const result = await execute(
      `UPDATE volume SET
        volume_number = COALESCE(?, volume_number),
        issue_range = ?,
        start_issue = ?,
        end_issue = ?,
        start_date = ?,
        end_date = ?,
        notes = ?
       WHERE volume_id = ? AND deleted_at IS NULL`,
      [
        volume_number,
        issue_range ?? null,
        computedStart ?? null,
        computedEnd ?? null,
        start_date ?? null,
        end_date ?? null,
        notes ?? null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Volume not found' });
      return;
    }

    res.json({ message: 'Volume updated successfully' });
  } catch (err) {
    console.error('Error updating volume:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/volumes/:id - Soft delete a volume
router.delete('/api/volumes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE volume SET deleted_at = NOW() WHERE volume_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Volume not found' });
      return;
    }

    res.json({ message: 'Volume deleted successfully' });
  } catch (err) {
    console.error('Error deleting volume:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
