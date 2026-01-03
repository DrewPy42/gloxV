import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

interface PublisherRow extends RowDataPacket {
  publisher_id: number;
  publisher_name: string;
  logo_path: string | null;
  website: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  issue_count: number;
  copy_count: number;
  total_value: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// GET /api/publishers - List all publishers
router.get('/api/publishers', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT 
        p.publisher_id,
        p.publisher_name,
        p.logo_path,
        p.website,
        p.notes,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT s.series_id) as series_count,
        COUNT(DISTINCT i.issue_id) as issue_count,
        COUNT(DISTINCT c.copy_id) as copy_count,
        COALESCE(SUM(c.current_value), 0) as total_value
      FROM publisher p
      LEFT JOIN series s ON p.publisher_id = s.publisher_id AND s.deleted_at IS NULL
      LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
      LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.publisher_id
    `;

    const id = req.query.id as string | undefined;
    const getAll = req.query.getall as string | undefined;

    if (id) {
      const results = await query<PublisherRow[]>(
        `${baseQuery} AND publisher_id = ?`,
        [parseInt(id)]
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM publisher WHERE deleted_at IS NULL'
      );
      res.json({ results, count });
    } else if (getAll) {
      const results = await query<PublisherRow[]>(
        `${baseQuery} ORDER BY publisher_name`
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM publisher WHERE deleted_at IS NULL'
      );
      res.json({ results, count });
    } else {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;

      const results = await query<PublisherRow[]>(
        `${baseQuery} ORDER BY publisher_name LIMIT ${limit} OFFSET ${offset}`,
        []
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM publisher WHERE deleted_at IS NULL'
      );
      res.json({ results, count });
    }
  } catch (err) {
    console.error('Error fetching publishers:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/publishers/:id - Get single publisher with stats
router.get('/api/publishers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const publisherQuery = `
      SELECT 
        p.*,
        COUNT(DISTINCT s.series_id) as series_count,
        COUNT(DISTINCT i.issue_id) as issue_count,
        COUNT(DISTINCT c.copy_id) as copy_count,
        COALESCE(SUM(c.current_value), 0) as total_value
      FROM publisher p
      LEFT JOIN series s ON p.publisher_id = s.publisher_id AND s.deleted_at IS NULL
      LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
      LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
      WHERE p.publisher_id = ? AND p.deleted_at IS NULL
      GROUP BY p.publisher_id
    `;

    const results = await query<RowDataPacket[]>(publisherQuery, [id]);

    if (results.length === 0) {
      res.status(404).json({ error: 'Publisher not found' });
      return;
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching publisher:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/publishers - Create a new publisher
router.post('/api/publishers', async (req: Request, res: Response) => {
  try {
    const { publisher_name, logo_path, website, notes } = req.body;

    if (!publisher_name) {
      res.status(400).json({ error: 'publisher_name is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO publisher (publisher_name, logo_path, website, notes)
       VALUES (?, ?, ?, ?)`,
      [publisher_name, logo_path || null, website || null, notes || null]
    );

    res.status(201).json({
      publisher_id: result.insertId,
      message: 'Publisher created successfully'
    });
  } catch (err) {
    console.error('Error creating publisher:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/publishers/:id - Update a publisher
router.put('/api/publishers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { publisher_name, logo_path, website, notes } = req.body;

    const result = await execute(
      `UPDATE publisher SET 
        publisher_name = COALESCE(?, publisher_name),
        logo_path = ?,
        website = ?,
        notes = ?
       WHERE publisher_id = ? AND deleted_at IS NULL`,
      [publisher_name, logo_path ?? null, website ?? null, notes ?? null, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Publisher not found' });
      return;
    }

    res.json({ message: 'Publisher updated successfully' });
  } catch (err) {
    console.error('Error updating publisher:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/publishers/:id - Soft delete a publisher
router.delete('/api/publishers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE publisher SET deleted_at = NOW() WHERE publisher_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Publisher not found' });
      return;
    }

    res.json({ message: 'Publisher deleted successfully' });
  } catch (err) {
    console.error('Error deleting publisher:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
