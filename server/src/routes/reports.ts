import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query } from '../controllers/db';

const router = Router();

const LOCATION_LABEL = (alias: string) => `
  COALESCE(${alias}.location_name,
    CASE
      WHEN ${alias}.cabinet_number IS NOT NULL AND ${alias}.drawer_number IS NOT NULL AND ${alias}.divider IS NOT NULL
        THEN CONCAT('Cabinet ', ${alias}.cabinet_number, ' / Drawer ', ${alias}.drawer_number, ' / ', ${alias}.divider)
      WHEN ${alias}.cabinet_number IS NOT NULL AND ${alias}.drawer_number IS NOT NULL
        THEN CONCAT('Cabinet ', ${alias}.cabinet_number, ' / Drawer ', ${alias}.drawer_number)
      WHEN ${alias}.cabinet_number IS NOT NULL
        THEN CONCAT('Cabinet ', ${alias}.cabinet_number)
      ELSE ${alias}.storage_type
    END)`;

// GET /api/reports/filters - Options for report filter dropdowns
router.get('/api/reports/filters', async (_req: Request, res: Response) => {
  try {
    const publishers = await query<RowDataPacket[]>(
      `SELECT publisher_id, publisher_name FROM publisher
       WHERE deleted_at IS NULL ORDER BY publisher_name`
    );
    const series = await query<RowDataPacket[]>(
      `SELECT series_id, title, publisher_id FROM series
       WHERE deleted_at IS NULL ORDER BY COALESCE(sort_title, title)`
    );
    const locations = await query<RowDataPacket[]>(
      `SELECT l.location_id, ${LOCATION_LABEL('l')} AS label
       FROM location l WHERE l.deleted_at IS NULL
       ORDER BY l.storage_type, l.cabinet_number, l.drawer_number, l.divider`
    );
    res.json({ publishers, series, locations });
  } catch (err) {
    console.error('Error fetching report filters:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/reports/inventory - One row per copy; issues with no copies appear
// once with a null copy_id so missing holdings are visible in an audit.
// Filters: publisher_id, series_id, location_id, format
router.get('/api/reports/inventory', async (req: Request, res: Response) => {
  try {
    const where: string[] = ['s.deleted_at IS NULL', 'i.deleted_at IS NULL'];
    const params: (string | number)[] = [];

    const publisherId = parseInt(req.query.publisher_id as string);
    const seriesId = parseInt(req.query.series_id as string);
    const locationId = parseInt(req.query.location_id as string);
    const format = req.query.format as string | undefined;

    if (!isNaN(publisherId)) {
      where.push('s.publisher_id = ?');
      params.push(publisherId);
    }
    if (!isNaN(seriesId)) {
      where.push('s.series_id = ?');
      params.push(seriesId);
    }
    // Copy-level filters drop issues with no copies, which is intended:
    // the filter is asking about copies.
    if (!isNaN(locationId)) {
      where.push('COALESCE(c.location_id, s.default_location_id) = ?');
      params.push(locationId);
    }
    if (format === 'digital') {
      where.push("c.format = 'digital'");
    } else if (format === 'physical') {
      where.push("c.format <> 'digital'");
    }

    const results = await query<RowDataPacket[]>(
      `SELECT
        p.publisher_name,
        s.series_id,
        s.title AS series_title,
        v.volume_id,
        v.volume_number,
        i.issue_id,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        c.copy_id,
        (SELECT COUNT(*) FROM copy c2
          WHERE c2.issue_id = c.issue_id AND c2.deleted_at IS NULL AND c2.copy_id <= c.copy_id) AS copy_number,
        (SELECT COUNT(*) FROM copy c3
          WHERE c3.issue_id = c.issue_id AND c3.deleted_at IS NULL) AS copy_total,
        cv.cover_type,
        cv.cover_description,
        c.format,
        c.grade,
        c.certification_number,
        cc.condition_code,
        c.cover_price AS cost,
        c.current_value,
        c.value_date,
        ${LOCATION_LABEL('l')} AS location
       FROM issue i
       JOIN series s ON i.series_id = s.series_id
       LEFT JOIN publisher p ON s.publisher_id = p.publisher_id
       LEFT JOIN volume v ON i.volume_id = v.volume_id AND v.deleted_at IS NULL
       LEFT JOIN copy c ON i.issue_id = c.issue_id AND c.deleted_at IS NULL
       LEFT JOIN cover cv ON c.copy_id = cv.copy_id AND cv.deleted_at IS NULL
       LEFT JOIN condition_code cc ON c.condition_id = cc.condition_id
       LEFT JOIN location l ON COALESCE(c.location_id, s.default_location_id) = l.location_id
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(s.sort_title, s.title), s.series_id, v.volume_number, i.sort_order, c.copy_id`,
      params
    );

    res.json({ generated_at: new Date().toISOString(), results });
  } catch (err) {
    console.error('Error generating inventory report:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
