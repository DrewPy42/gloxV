import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

interface SeriesRow extends RowDataPacket {
  series_id: number;
  title: string;
  sort_title: string | null;
  issn: string | null;
  publisher_id: number | null;
  publisher_name: string | null;
  logo_path: string | null;
  website: string | null;
  comic_age_id: number | null;
  comic_age: string | null;
  is_limited_series: boolean;
  limited_series_count: number | null;
  notes: string | null;
  default_location_id: number | null;
  location_name: string | null;
  divider: string | null;
  created_at: Date;
  updated_at: Date;
  // Computed stats
  volume_count: number;
  issue_count: number;
  copy_count: number;
  total_cost: number;
  total_value: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// GET /api/series - List all series with computed stats or get one by ID
router.get('/api/series', async (req: Request, res: Response) => {
  try {
    // Base query now includes computed stats via subqueries for efficiency
    const baseQuery = `
      SELECT 
        s.series_id,
        s.title,
        s.sort_title,
        s.issn,
        s.publisher_id,
        p.publisher_name,
        p.logo_path,
        p.website,
        s.comic_age_id,
        ca.comic_age,
        s.is_limited_series,
        s.limited_series_count,
        s.notes,
        s.default_location_id,
        l.name as location_name,
        l.divider,
        s.created_at,
        s.updated_at,
        COALESCE(vol_stats.volume_count, 0) as volume_count,
        COALESCE(issue_stats.issue_count, 0) as issue_count,
        COALESCE(copy_stats.copy_count, 0) as copy_count,
        COALESCE(copy_stats.total_cost, 0) as total_cost,
        COALESCE(copy_stats.total_value, 0) as total_value
      FROM series s
      LEFT JOIN publisher p ON s.publisher_id = p.publisher_id
      LEFT JOIN comic_age ca ON s.comic_age_id = ca.comic_age_id
      LEFT JOIN location l ON s.default_location_id = l.location_id
      LEFT JOIN (
        SELECT series_id, COUNT(*) as volume_count
        FROM volume 
        WHERE deleted_at IS NULL
        GROUP BY series_id
      ) vol_stats ON s.series_id = vol_stats.series_id
      LEFT JOIN (
        SELECT series_id, COUNT(*) as issue_count
        FROM issue
        WHERE deleted_at IS NULL
        GROUP BY series_id
      ) issue_stats ON s.series_id = issue_stats.series_id
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
      WHERE s.deleted_at IS NULL
    `;

    const id = req.query.id as string | undefined;
    
    if (id) {
      const results = await query<SeriesRow[]>(
        `${baseQuery} AND s.series_id = ? ORDER BY COALESCE(s.sort_title, s.title)`,
        [parseInt(id)]
      );
      const count = await query<CountRow[]>(
        'SELECT COUNT(*) as total FROM series WHERE deleted_at IS NULL'
      );
      res.json({ results, count });
    } else {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      const search = req.query.search as string | undefined;
      const publisher_id = req.query.publisher_id as string | undefined;

      let queryString = baseQuery;
      const params: (string | number)[] = [];

      if (search) {
        queryString += ` AND (s.title LIKE ? OR s.sort_title LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      if (publisher_id) {
        queryString += ` AND s.publisher_id = ?`;
        params.push(parseInt(publisher_id));
      }

      queryString += ` ORDER BY COALESCE(s.sort_title, s.title) LIMIT ${limit} OFFSET ${offset}`;

      const results = await query<SeriesRow[]>(queryString, params);
      
      let countQuery = 'SELECT COUNT(*) as total FROM series WHERE deleted_at IS NULL';
      const countParams: (string | number)[] = [];
      if (search) {
        countQuery += ` AND (title LIKE ? OR sort_title LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
      }
      if (publisher_id) {
        countQuery += ` AND publisher_id = ?`;
        countParams.push(parseInt(publisher_id));
      }
      const count = await query<CountRow[]>(countQuery, countParams);

      res.json({ results, count });
    }
  } catch (err) {
    console.error('Error fetching series:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/series/:id/summary - Get series with computed stats (detailed view)
router.get('/api/series/:id/summary', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const seriesQuery = `
      SELECT 
        s.*,
        p.publisher_name,
        p.logo_path,
        p.website,
        ca.comic_age,
        COUNT(DISTINCT v.volume_id) as volume_count,
        COUNT(DISTINCT i.issue_id) as issue_count,
        COUNT(DISTINCT c.copy_id) as copy_count,
        COALESCE(SUM(c.purchase_price), 0) as total_cost,
        COALESCE(SUM(c.current_value), 0) as total_value
      FROM series s
      LEFT JOIN publisher p ON s.publisher_id = p.publisher_id
      LEFT JOIN comic_age ca ON s.comic_age_id = ca.comic_age_id
      LEFT JOIN volume v ON s.series_id = v.series_id AND v.deleted_at IS NULL
      LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
      LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
      WHERE s.series_id = ? AND s.deleted_at IS NULL
      GROUP BY s.series_id
    `;
    
    const results = await query<RowDataPacket[]>(seriesQuery, [id]);
    
    if (results.length === 0) {
      res.status(404).json({ error: 'Series not found' });
      return;
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching series summary:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/series - Create a new series
router.post('/api/series', async (req: Request, res: Response) => {
  try {
    const {
      title,
      sort_title,
      issn,
      publisher_id,
      comic_age_id,
      is_limited_series,
      limited_series_count,
      notes,
      default_location_id
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO series (title, sort_title, issn, publisher_id, comic_age_id, 
        is_limited_series, limited_series_count, notes, default_location_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        sort_title || null,
        issn || null,
        publisher_id || null,
        comic_age_id || null,
        is_limited_series ? 1 : 0,
        limited_series_count || null,
        notes || null,
        default_location_id || null
      ]
    );

    res.status(201).json({ 
      series_id: result.insertId,
      message: 'Series created successfully' 
    });
  } catch (err) {
    console.error('Error creating series:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/series/:id - Update a series
router.put('/api/series/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title,
      sort_title,
      issn,
      publisher_id,
      comic_age_id,
      is_limited_series,
      limited_series_count,
      notes,
      default_location_id
    } = req.body;

    const result = await execute(
      `UPDATE series SET 
        title = COALESCE(?, title),
        sort_title = ?,
        issn = ?,
        publisher_id = ?,
        comic_age_id = ?,
        is_limited_series = COALESCE(?, is_limited_series),
        limited_series_count = ?,
        notes = ?,
        default_location_id = ?
       WHERE series_id = ? AND deleted_at IS NULL`,
      [
        title,
        sort_title ?? null,
        issn ?? null,
        publisher_id ?? null,
        comic_age_id ?? null,
        is_limited_series !== undefined ? (is_limited_series ? 1 : 0) : null,
        limited_series_count ?? null,
        notes ?? null,
        default_location_id ?? null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Series not found' });
      return;
    }

    res.json({ message: 'Series updated successfully' });
  } catch (err) {
    console.error('Error updating series:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/series/:id - Soft delete a series
router.delete('/api/series/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE series SET deleted_at = NOW() WHERE series_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Series not found' });
      return;
    }

    res.json({ message: 'Series deleted successfully' });
  } catch (err) {
    console.error('Error deleting series:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/series/:id/links - Get linked series (continues_story, spin_off, etc.)
router.get('/api/series/:id/links', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const results = await query<RowDataPacket[]>(
      `SELECT 
        sl.*,
        sf.title as from_title,
        st.title as to_title
      FROM series_link sl
      JOIN series sf ON sl.from_series_id = sf.series_id
      JOIN series st ON sl.to_series_id = st.series_id
      WHERE sl.from_series_id = ? OR sl.to_series_id = ?`,
      [id, id]
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching series links:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
