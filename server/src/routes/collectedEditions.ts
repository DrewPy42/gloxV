import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

// GET /api/collected-editions - List collected editions
router.get('/api/collected-editions', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT 
        ce.*,
        p.publisher_name,
        cc.condition_code,
        cc.condition_text,
        l.location_name,
        l.storage_type,
        COUNT(cei.issue_id) as issue_count
      FROM collected_edition ce
      LEFT JOIN publisher p ON ce.publisher_id = p.publisher_id
      LEFT JOIN condition_code cc ON ce.condition_id = cc.condition_id
      LEFT JOIN location l ON ce.location_id = l.location_id
      LEFT JOIN collected_edition_issue cei ON ce.collected_edition_id = cei.collected_edition_id
      WHERE ce.deleted_at IS NULL
    `;

    const id = req.query.id as string | undefined;
    const format = req.query.format as string | undefined;
    const search = req.query.search as string | undefined;

    let queryString = baseQuery;
    const params: (string | number)[] = [];

    if (id) {
      queryString += ' AND ce.collected_edition_id = ?';
      params.push(parseInt(id));
    } else {
      if (format) {
        queryString += ' AND ce.format = ?';
        params.push(format);
      }
      if (search) {
        queryString += ' AND ce.title LIKE ?';
        params.push(`%${search}%`);
      }
    }

    queryString += ' GROUP BY ce.collected_edition_id ORDER BY ce.title';

    if (!id) {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      queryString += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const results = await query<RowDataPacket[]>(queryString, params);
    const count = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM collected_edition WHERE deleted_at IS NULL'
    );

    res.json({ results, count });
  } catch (err) {
    console.error('Error fetching collected editions:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/collected-editions/:id - Get single collected edition with contents
router.get('/api/collected-editions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Get collected edition details
    const ceResults = await query<RowDataPacket[]>(
      `SELECT 
        ce.*,
        p.publisher_name,
        cc.condition_code,
        cc.condition_text,
        l.location_name,
        l.storage_type,
        l.cabinet_number,
        l.drawer_number,
        l.divider
       FROM collected_edition ce
       LEFT JOIN publisher p ON ce.publisher_id = p.publisher_id
       LEFT JOIN condition_code cc ON ce.condition_id = cc.condition_id
       LEFT JOIN location l ON ce.location_id = l.location_id
       WHERE ce.collected_edition_id = ? AND ce.deleted_at IS NULL`,
      [id]
    );

    if (ceResults.length === 0) {
      res.status(404).json({ error: 'Collected edition not found' });
      return;
    }

    // Get contained issues
    const issueResults = await query<RowDataPacket[]>(
      `SELECT 
        cei.*,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        s.title as series_title,
        s.series_id
       FROM collected_edition_issue cei
       JOIN issue i ON cei.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE cei.collected_edition_id = ?
       ORDER BY cei.sequence_order, s.title, i.sort_order`,
      [id]
    );

    res.json({
      collected_edition: ceResults[0],
      issues: issueResults
    });
  } catch (err) {
    console.error('Error fetching collected edition:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/collected-editions - Create a new collected edition
router.post('/api/collected-editions', async (req: Request, res: Response) => {
  try {
    const {
      title,
      publisher_id,
      format,
      isbn,
      page_count,
      cover_price,
      release_date,
      cover_image_path,
      condition_id,
      purchase_price,
      current_value,
      value_date,
      purchase_date,
      purchase_source,
      location_id,
      file_path,
      backup_path,
      notes
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO collected_edition (title, publisher_id, format, isbn, page_count,
        cover_price, release_date, cover_image_path, condition_id, purchase_price,
        current_value, value_date, purchase_date, purchase_source, location_id,
        file_path, backup_path, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        publisher_id || null,
        format || 'tpb',
        isbn || null,
        page_count || null,
        cover_price || null,
        release_date || null,
        cover_image_path || null,
        condition_id || null,
        purchase_price || null,
        current_value || null,
        value_date || null,
        purchase_date || null,
        purchase_source || null,
        location_id || null,
        file_path || null,
        backup_path || null,
        notes || null
      ]
    );

    // Add to value history if current_value is set
    if (current_value) {
      await execute(
        `INSERT INTO value_history (entity_type, entity_id, value, recorded_at)
         VALUES ('collected_edition', ?, ?, NOW())`,
        [result.insertId, current_value]
      );
    }

    res.status(201).json({
      collected_edition_id: result.insertId,
      message: 'Collected edition created successfully'
    });
  } catch (err) {
    console.error('Error creating collected edition:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/collected-editions/:id - Update a collected edition
router.put('/api/collected-editions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title,
      publisher_id,
      format,
      isbn,
      page_count,
      cover_price,
      release_date,
      cover_image_path,
      condition_id,
      purchase_price,
      current_value,
      value_date,
      purchase_date,
      purchase_source,
      location_id,
      file_path,
      backup_path,
      notes,
      track_value_change
    } = req.body;

    // Track value change if requested
    if (track_value_change && current_value !== undefined) {
      const currentCe = await query<RowDataPacket[]>(
        'SELECT current_value FROM collected_edition WHERE collected_edition_id = ?',
        [id]
      );
      
      if (currentCe.length > 0 && currentCe[0].current_value !== current_value) {
        await execute(
          `INSERT INTO value_history (entity_type, entity_id, value, recorded_at)
           VALUES ('collected_edition', ?, ?, NOW())`,
          [id, current_value]
        );
      }
    }

    const result = await execute(
      `UPDATE collected_edition SET 
        title = COALESCE(?, title),
        publisher_id = ?,
        format = COALESCE(?, format),
        isbn = ?,
        page_count = ?,
        cover_price = ?,
        release_date = ?,
        cover_image_path = ?,
        condition_id = ?,
        purchase_price = ?,
        current_value = ?,
        value_date = ?,
        purchase_date = ?,
        purchase_source = ?,
        location_id = ?,
        file_path = ?,
        backup_path = ?,
        notes = ?
       WHERE collected_edition_id = ? AND deleted_at IS NULL`,
      [
        title,
        publisher_id ?? null,
        format,
        isbn ?? null,
        page_count ?? null,
        cover_price ?? null,
        release_date ?? null,
        cover_image_path ?? null,
        condition_id ?? null,
        purchase_price ?? null,
        current_value ?? null,
        value_date ?? null,
        purchase_date ?? null,
        purchase_source ?? null,
        location_id ?? null,
        file_path ?? null,
        backup_path ?? null,
        notes ?? null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Collected edition not found' });
      return;
    }

    res.json({ message: 'Collected edition updated successfully' });
  } catch (err) {
    console.error('Error updating collected edition:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/collected-editions/:id - Soft delete a collected edition
router.delete('/api/collected-editions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE collected_edition SET deleted_at = NOW() WHERE collected_edition_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Collected edition not found' });
      return;
    }

    res.json({ message: 'Collected edition deleted successfully' });
  } catch (err) {
    console.error('Error deleting collected edition:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/collected-editions/:id/issues - Add issue to collected edition
router.post('/api/collected-editions/:id/issues', async (req: Request, res: Response) => {
  try {
    const ceId = parseInt(req.params.id);
    const { issue_id, sequence_order, page_start, page_end, notes } = req.body;

    if (!issue_id) {
      res.status(400).json({ error: 'issue_id is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO collected_edition_issue (collected_edition_id, issue_id, 
        sequence_order, page_start, page_end, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ceId,
        issue_id,
        sequence_order || null,
        page_start || null,
        page_end || null,
        notes || null
      ]
    );

    res.status(201).json({
      collected_edition_issue_id: result.insertId,
      message: 'Issue added to collected edition successfully'
    });
  } catch (err) {
    console.error('Error adding issue to collected edition:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/collected-editions/:id/issues/:issueId - Remove issue from collected edition
router.delete('/api/collected-editions/:id/issues/:issueId', async (req: Request, res: Response) => {
  try {
    const ceId = parseInt(req.params.id);
    const issueId = parseInt(req.params.issueId);

    const result = await execute(
      'DELETE FROM collected_edition_issue WHERE collected_edition_id = ? AND issue_id = ?',
      [ceId, issueId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Issue not found in collected edition' });
      return;
    }

    res.json({ message: 'Issue removed from collected edition successfully' });
  } catch (err) {
    console.error('Error removing issue from collected edition:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/collected-editions/:id/value-history - Get value history
router.get('/api/collected-editions/:id/value-history', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const results = await query<RowDataPacket[]>(
      `SELECT * FROM value_history 
       WHERE entity_type = 'collected_edition' AND entity_id = ?
       ORDER BY recorded_at DESC`,
      [id]
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching value history:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
