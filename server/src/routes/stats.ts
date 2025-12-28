import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query } from '../controllers/db';

const router = Router();

// GET /api/stats - Get overall collection statistics
router.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const seriesId = req.query.series_id as string | undefined;

    if (seriesId) {
      // Stats for a specific series
      const stats = await query<RowDataPacket[]>(
        `SELECT 
          s.series_id,
          s.title,
          COUNT(DISTINCT v.volume_id) as volume_count,
          COUNT(DISTINCT i.issue_id) as issue_count,
          COUNT(DISTINCT c.copy_id) as copy_count,
          COALESCE(SUM(c.purchase_price), 0) as total_cost,
          COALESCE(SUM(c.current_value), 0) as total_value,
          CASE 
            WHEN COALESCE(SUM(c.purchase_price), 0) > 0 
            THEN (COALESCE(SUM(c.current_value), 0) - COALESCE(SUM(c.purchase_price), 0)) / COALESCE(SUM(c.purchase_price), 0)
            ELSE 0 
          END as value_change_percent
         FROM series s
         LEFT JOIN volume v ON s.series_id = v.series_id AND v.deleted_at IS NULL
         LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
         LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
         WHERE s.series_id = ? AND s.deleted_at IS NULL
         GROUP BY s.series_id`,
        [parseInt(seriesId)]
      );

      if (stats.length === 0) {
        res.status(404).json({ error: 'Series not found' });
        return;
      }

      res.json(stats[0]);
    } else {
      // Overall collection stats
      const stats = await query<RowDataPacket[]>(
        `SELECT 
          COUNT(DISTINCT s.series_id) as series_count,
          COUNT(DISTINCT v.volume_id) as volume_count,
          COUNT(DISTINCT i.issue_id) as issue_count,
          COUNT(DISTINCT c.copy_id) as copy_count,
          COUNT(DISTINCT ce.collected_edition_id) as collected_edition_count,
          COALESCE(SUM(c.purchase_price), 0) + COALESCE((SELECT SUM(purchase_price) FROM collected_edition WHERE deleted_at IS NULL), 0) as total_cost,
          COALESCE(SUM(c.current_value), 0) + COALESCE((SELECT SUM(current_value) FROM collected_edition WHERE deleted_at IS NULL), 0) as total_value
         FROM series s
         LEFT JOIN volume v ON s.series_id = v.series_id AND v.deleted_at IS NULL
         LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
         LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
         LEFT JOIN collected_edition ce ON ce.deleted_at IS NULL
         WHERE s.deleted_at IS NULL`
      );

      const result = stats[0];
      result.value_change_percent = result.total_cost > 0 
        ? (result.total_value - result.total_cost) / result.total_cost 
        : 0;

      res.json(result);
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/stats/by-publisher - Stats grouped by publisher
router.get('/api/stats/by-publisher', async (req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT 
        p.publisher_id,
        p.publisher_name,
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
       ORDER BY total_value DESC`
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching publisher stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/stats/by-age - Stats grouped by comic age
router.get('/api/stats/by-age', async (req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT 
        ca.comic_age_id,
        ca.comic_age,
        COUNT(DISTINCT s.series_id) as series_count,
        COUNT(DISTINCT i.issue_id) as issue_count,
        COUNT(DISTINCT c.copy_id) as copy_count,
        COALESCE(SUM(c.current_value), 0) as total_value
       FROM comic_age ca
       LEFT JOIN series s ON ca.comic_age_id = s.comic_age_id AND s.deleted_at IS NULL
       LEFT JOIN issue i ON s.series_id = i.series_id AND i.deleted_at IS NULL
       LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
       GROUP BY ca.comic_age_id
       ORDER BY ca.comic_age_id`
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching age stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/stats/by-condition - Stats grouped by condition
router.get('/api/stats/by-condition', async (req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT 
        cc.condition_id,
        cc.condition_code,
        cc.condition_text,
        COUNT(c.copy_id) as copy_count,
        COALESCE(SUM(c.current_value), 0) as total_value
       FROM condition_code cc
       LEFT JOIN copy c ON cc.condition_id = c.condition_id AND c.deleted_at IS NULL
       GROUP BY cc.condition_id
       ORDER BY cc.sort_order`
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching condition stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/stats/by-location - Stats grouped by location
router.get('/api/stats/by-location', async (req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT 
        l.location_id,
        l.storage_type,
        l.name,
        l.divider,
        l.cabinet_number,
        l.drawer_number,
        COUNT(DISTINCT s.series_id) as series_count,
        COUNT(DISTINCT c.copy_id) as copy_count,
        COALESCE(SUM(c.current_value), 0) as total_value
       FROM location l
       LEFT JOIN series s ON l.location_id = s.default_location_id AND s.deleted_at IS NULL
       LEFT JOIN copy c ON l.location_id = c.location_id AND c.deleted_at IS NULL
       WHERE l.deleted_at IS NULL
       GROUP BY l.location_id
       ORDER BY l.storage_type, l.cabinet_number, l.drawer_number, l.divider`
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching location stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/stats/high-value - Top valued items
router.get('/api/stats/high-value', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;

    // Top valued copies
    const copies = await query<RowDataPacket[]>(
      `SELECT 
        c.copy_id,
        c.current_value,
        c.format,
        c.grade,
        cc.condition_code,
        i.issue_number,
        i.issue_title,
        s.title as series_title
       FROM copy c
       JOIN issue i ON c.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       LEFT JOIN condition_code cc ON c.condition_id = cc.condition_id
       WHERE c.deleted_at IS NULL AND c.current_value > 0
       ORDER BY c.current_value DESC
       LIMIT ${limit}`,
      []
    );

    // Top valued collected editions
    const collectedEditions = await query<RowDataPacket[]>(
      `SELECT 
        ce.collected_edition_id,
        ce.title,
        ce.format,
        ce.current_value,
        cc.condition_code
       FROM collected_edition ce
       LEFT JOIN condition_code cc ON ce.condition_id = cc.condition_id
       WHERE ce.deleted_at IS NULL AND ce.current_value > 0
       ORDER BY ce.current_value DESC
       LIMIT ${limit}`,
      []
    );

    res.json({ copies, collected_editions: collectedEditions });
  } catch (err) {
    console.error('Error fetching high value stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/stats/recent - Recently added/updated items
router.get('/api/stats/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Recent copies
    const copies = await query<RowDataPacket[]>(
      `SELECT 
        c.copy_id,
        c.created_at,
        c.current_value,
        i.issue_number,
        s.title as series_title
       FROM copy c
       JOIN issue i ON c.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT ${limit}`,
      []
    );

    // Recent series
    const series = await query<RowDataPacket[]>(
      `SELECT series_id, title, created_at
       FROM series
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      []
    );

    res.json({ copies, series });
  } catch (err) {
    console.error('Error fetching recent stats:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
