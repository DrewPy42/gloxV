import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

interface LocationRow extends RowDataPacket {
  location_id: number;
  storage_type: string;
  location_name: string | null;
  cabinet_number: number | null;
  drawer_number: number | null;
  divider: string | null;
  row_num: number | null;
  shelf_description: string | null;
  file_path: string | null;
  backup_path: string | null;
  notes: string | null;
  is_insured_separately: boolean;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// GET /api/locations - List all locations
router.get('/api/locations', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT
        l.location_id,
        l.storage_type,
        l.location_name,
        l.cabinet_number,
        l.drawer_number,
        l.divider,
        l.row_num,
        l.shelf_description,
        l.file_path,
        l.backup_path,
        l.notes,
        l.is_insured_separately,
        l.created_at,
        l.updated_at,
        COUNT(DISTINCT s.series_id) as series_count,
        (SELECT COUNT(*) FROM copy c WHERE c.location_id = l.location_id AND c.deleted_at IS NULL) as copy_count,
        (SELECT COALESCE(SUM(c2.current_value), 0) FROM copy c2 WHERE c2.location_id = l.location_id AND c2.deleted_at IS NULL) as total_value
      FROM location l
      LEFT JOIN series s ON l.location_id = s.default_location_id AND s.deleted_at IS NULL
      WHERE l.deleted_at IS NULL
    `;

    const id = req.query.id as string | undefined;
    const storageType = req.query.storage_type as string | undefined;
    const cabinetNumber = req.query.cabinet_number as string | undefined;

    let queryString = baseQuery;
    const params: (string | number)[] = [];

    if (id) {
      queryString += ' AND l.location_id = ?';
      params.push(parseInt(id));
    } else {
      if (storageType) {
        queryString += ' AND l.storage_type = ?';
        params.push(storageType);
      }
      if (cabinetNumber) {
        queryString += ' AND l.cabinet_number = ?';
        params.push(parseInt(cabinetNumber));
      }
    }

    queryString += ' GROUP BY l.location_id ORDER BY l.storage_type, l.cabinet_number, l.drawer_number, l.divider';

    if (!id) {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      queryString += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const results = await query<LocationRow[]>(queryString, params);
    const count = await query<CountRow[]>(
      'SELECT COUNT(*) as total FROM location WHERE deleted_at IS NULL'
    );

    res.json({ results, count });
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/locations/:id - Get single location with contents
router.get('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Get location details
    const locationResults = await query<LocationRow[]>(
      `SELECT * FROM location WHERE location_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (locationResults.length === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    // Get series that use this as default location
    const seriesResults = await query<RowDataPacket[]>(
      `SELECT series_id, title, sort_title 
       FROM series 
       WHERE default_location_id = ? AND deleted_at IS NULL
       ORDER BY COALESCE(sort_title, title)`,
      [id]
    );

    // Get copies at this location
    const copyResults = await query<RowDataPacket[]>(
      `SELECT 
        c.copy_id,
        c.format,
        c.current_value,
        i.issue_number,
        i.issue_title,
        s.title as series_title
       FROM copy c
       JOIN issue i ON c.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE c.location_id = ? AND c.deleted_at IS NULL
       ORDER BY s.title, i.sort_order`,
      [id]
    );

    // Get collected editions at this location
    const collectedEditionResults = await query<RowDataPacket[]>(
      `SELECT collected_edition_id, title, format, current_value
       FROM collected_edition
       WHERE location_id = ? AND deleted_at IS NULL
       ORDER BY title`,
      [id]
    );

    res.json({
      location: locationResults[0],
      series: seriesResults,
      copies: copyResults,
      collected_editions: collectedEditionResults
    });
  } catch (err) {
    console.error('Error fetching location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/locations/cabinet/:cabinetNumber - Get contents of a cabinet
router.get('/api/locations/cabinet/:cabinetNumber', async (req: Request, res: Response) => {
  try {
    const cabinetNumber = parseInt(req.params.cabinetNumber);

    const drawers = await query<RowDataPacket[]>(
      `SELECT 
        l.*,
        COUNT(DISTINCT s.series_id) as series_count,
        (SELECT COUNT(*) FROM copy c2 WHERE c2.location_id = l.location_id AND c2.deleted_at IS NULL) as copy_count
       FROM location l
       LEFT JOIN series s ON l.location_id = s.default_location_id AND s.deleted_at IS NULL
       WHERE l.storage_type = 'cabinet' AND l.cabinet_number = ? AND l.deleted_at IS NULL
       GROUP BY l.location_id
       ORDER BY l.drawer_number, l.divider`,
      [cabinetNumber]
    );

    res.json({ cabinet_number: cabinetNumber, drawers });
  } catch (err) {
    console.error('Error fetching cabinet:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/locations - Create a new location
router.post('/api/locations', async (req: Request, res: Response) => {
  try {
    const {
      storage_type,
      location_name,
      cabinet_number,
      drawer_number,
      divider,
      row_num,
      shelf_description,
      file_path,
      backup_path,
      notes,
      is_insured_separately
    } = req.body;

    if (!storage_type) {
      res.status(400).json({ error: 'storage_type is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO location (storage_type, location_name, cabinet_number, drawer_number,
        divider, row_num, shelf_description, file_path, backup_path, notes,
        is_insured_separately)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storage_type,
        location_name || null,
        cabinet_number || null,
        drawer_number || null,
        divider || null,
        row_num || null,
        shelf_description || null,
        file_path || null,
        backup_path || null,
        notes || null,
        is_insured_separately ? 1 : 0
      ]
    );

    res.status(201).json({
      location_id: result.insertId,
      message: 'Location created successfully'
    });
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/locations/:id - Update a location
router.put('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      storage_type,
      location_name,
      cabinet_number,
      drawer_number,
      divider,
      row_num,
      shelf_description,
      file_path,
      backup_path,
      notes,
      is_insured_separately
    } = req.body;

    const result = await execute(
      `UPDATE location SET
        storage_type = COALESCE(?, storage_type),
        location_name = ?,
        cabinet_number = ?,
        drawer_number = ?,
        divider = ?,
        row_num = ?,
        shelf_description = ?,
        file_path = ?,
        backup_path = ?,
        notes = ?,
        is_insured_separately = COALESCE(?, is_insured_separately)
       WHERE location_id = ? AND deleted_at IS NULL`,
      [
        storage_type,
        location_name ?? null,
        cabinet_number ?? null,
        drawer_number ?? null,
        divider ?? null,
        row_num ?? null,
        shelf_description ?? null,
        file_path ?? null,
        backup_path ?? null,
        notes ?? null,
        is_insured_separately !== undefined ? (is_insured_separately ? 1 : 0) : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json({ message: 'Location updated successfully' });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/locations/:id - Soft delete a location
router.delete('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE location SET deleted_at = NOW() WHERE location_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
