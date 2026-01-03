import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

interface StorylineRow extends RowDataPacket {
  storyline_id: number;
  storyline_name: string;
  storyline_type: string;
  start_date: Date | null;
  end_date: Date | null;
  description: string | null;
  banner_image_path: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// GET /api/storylines - List all storylines
router.get('/api/storylines', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT
        sl.*,
        COUNT(si.issue_id) as issue_count
      FROM storyline sl
      LEFT JOIN storyline_issue si ON sl.storyline_id = si.storyline_id
      WHERE sl.deleted_at IS NULL
    `;

    const id = req.query.id as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    let queryString = baseQuery;
    let countWhere = 'WHERE deleted_at IS NULL';
    const params: (string | number)[] = [];
    const countParams: (string | number)[] = [];

    if (id) {
      queryString += ' AND sl.storyline_id = ?';
      params.push(parseInt(id));
    } else {
      if (type) {
        queryString += ' AND sl.storyline_type = ?';
        countWhere += ' AND storyline_type = ?';
        params.push(type);
        countParams.push(type);
      }
      if (search) {
        queryString += ' AND sl.storyline_name LIKE ?';
        countWhere += ' AND storyline_name LIKE ?';
        const searchPattern = `%${search}%`;
        params.push(searchPattern);
        countParams.push(searchPattern);
      }
    }

    queryString += ' GROUP BY sl.storyline_id ORDER BY sl.storyline_name';

    if (!id) {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      queryString += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const results = await query<StorylineRow[]>(queryString, params);
    const count = await query<CountRow[]>(
      `SELECT COUNT(*) as total FROM storyline ${countWhere}`,
      countParams
    );

    res.json({ results, count });
  } catch (err) {
    console.error('Error fetching storylines:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/storylines/:id - Get single storyline with reading order
router.get('/api/storylines/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Get storyline details
    const storylineResults = await query<StorylineRow[]>(
      `SELECT * FROM storyline WHERE storyline_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (storylineResults.length === 0) {
      res.status(404).json({ error: 'Storyline not found' });
      return;
    }

    // Get issues in reading order
    const issueResults = await query<RowDataPacket[]>(
      `SELECT 
        si.storyline_issue_id,
        si.part_number,
        si.part_label,
        si.reading_order,
        i.issue_id,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        s.series_id,
        s.title as series_title,
        EXISTS(SELECT 1 FROM copy c WHERE c.issue_id = i.issue_id AND c.deleted_at IS NULL) as owned
       FROM storyline_issue si
       JOIN issue i ON si.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE si.storyline_id = ? AND i.deleted_at IS NULL
       ORDER BY si.reading_order, i.cover_date, s.title, i.sort_order`,
      [id]
    );

    // Get series involved
    const seriesResults = await query<RowDataPacket[]>(
      `SELECT DISTINCT s.series_id, s.title
       FROM storyline_issue si
       JOIN issue i ON si.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE si.storyline_id = ?
       ORDER BY s.title`,
      [id]
    );

    res.json({
      storyline: storylineResults[0],
      issues: issueResults,
      series: seriesResults
    });
  } catch (err) {
    console.error('Error fetching storyline:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/storylines - Create a new storyline
router.post('/api/storylines', async (req: Request, res: Response) => {
  try {
    const {
      storyline_name,
      storyline_type,
      start_date,
      end_date,
      description,
      banner_image_path
    } = req.body;

    if (!storyline_name) {
      res.status(400).json({ error: 'storyline_name is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO storyline (storyline_name, storyline_type, start_date, end_date,
        description, banner_image_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        storyline_name,
        storyline_type || 'arc',
        start_date || null,
        end_date || null,
        description || null,
        banner_image_path || null
      ]
    );

    res.status(201).json({
      storyline_id: result.insertId,
      message: 'Storyline created successfully'
    });
  } catch (err) {
    console.error('Error creating storyline:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/storylines/:id - Update a storyline
router.put('/api/storylines/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      storyline_name,
      storyline_type,
      start_date,
      end_date,
      description,
      banner_image_path
    } = req.body;

    const result = await execute(
      `UPDATE storyline SET
        storyline_name = COALESCE(?, storyline_name),
        storyline_type = COALESCE(?, storyline_type),
        start_date = ?,
        end_date = ?,
        description = ?,
        banner_image_path = ?
       WHERE storyline_id = ? AND deleted_at IS NULL`,
      [
        storyline_name,
        storyline_type,
        start_date ?? null,
        end_date ?? null,
        description ?? null,
        banner_image_path ?? null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Storyline not found' });
      return;
    }

    res.json({ message: 'Storyline updated successfully' });
  } catch (err) {
    console.error('Error updating storyline:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/storylines/:id - Soft delete a storyline
router.delete('/api/storylines/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE storyline SET deleted_at = NOW() WHERE storyline_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Storyline not found' });
      return;
    }

    res.json({ message: 'Storyline deleted successfully' });
  } catch (err) {
    console.error('Error deleting storyline:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/storylines/:id/issues - Add issue to storyline
router.post('/api/storylines/:id/issues', async (req: Request, res: Response) => {
  try {
    const storylineId = parseInt(req.params.id);
    const { issue_id, part_number, part_label, reading_order } = req.body;

    if (!issue_id) {
      res.status(400).json({ error: 'issue_id is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO storyline_issue (storyline_id, issue_id, part_number, part_label, reading_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        storylineId,
        issue_id,
        part_number || null,
        part_label || null,
        reading_order || null
      ]
    );

    res.status(201).json({
      storyline_issue_id: result.insertId,
      message: 'Issue added to storyline successfully'
    });
  } catch (err) {
    console.error('Error adding issue to storyline:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/storylines/:id/issues/:issueId - Remove issue from storyline
router.delete('/api/storylines/:id/issues/:issueId', async (req: Request, res: Response) => {
  try {
    const storylineId = parseInt(req.params.id);
    const issueId = parseInt(req.params.issueId);

    const result = await execute(
      'DELETE FROM storyline_issue WHERE storyline_id = ? AND issue_id = ?',
      [storylineId, issueId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Issue not found in storyline' });
      return;
    }

    res.json({ message: 'Issue removed from storyline successfully' });
  } catch (err) {
    console.error('Error removing issue from storyline:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/storylines/:id/issues/:issueId - Update issue in storyline (reading order, etc.)
router.put('/api/storylines/:id/issues/:issueId', async (req: Request, res: Response) => {
  try {
    const storylineId = parseInt(req.params.id);
    const issueId = parseInt(req.params.issueId);
    const { part_number, part_label, reading_order } = req.body;

    const result = await execute(
      `UPDATE storyline_issue SET 
        part_number = ?,
        part_label = ?,
        reading_order = ?
       WHERE storyline_id = ? AND issue_id = ?`,
      [
        part_number ?? null,
        part_label ?? null,
        reading_order ?? null,
        storylineId,
        issueId
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Issue not found in storyline' });
      return;
    }

    res.json({ message: 'Storyline issue updated successfully' });
  } catch (err) {
    console.error('Error updating storyline issue:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
