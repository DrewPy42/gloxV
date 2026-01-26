import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

// GET /api/covers - List covers with filters
router.get('/api/covers', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT
        cv.*,
        cp.issue_id,
        i.issue_number,
        i.issue_title,
        s.title as series_title,
        s.series_id,
        p.first_name as artist_first_name,
        p.last_name as artist_last_name
      FROM cover cv
      LEFT JOIN copy cp ON cv.copy_id = cp.copy_id
      LEFT JOIN issue i ON cp.issue_id = i.issue_id
      LEFT JOIN series s ON i.series_id = s.series_id
      LEFT JOIN person p ON cv.cover_artist_person_id = p.person_id
      WHERE cv.deleted_at IS NULL
    `;

    const id = req.query.id as string | undefined;
    const copyId = req.query.copy_id as string | undefined;
    const coverType = req.query.cover_type as string | undefined;

    let queryString = baseQuery;
    const params: (string | number)[] = [];

    if (id) {
      queryString += ' AND cv.cover_id = ?';
      params.push(parseInt(id));
    } else {
      if (copyId) {
        queryString += ' AND cv.copy_id = ?';
        params.push(parseInt(copyId));
      }
      if (coverType) {
        queryString += ' AND cv.cover_type = ?';
        params.push(coverType);
      }
    }

    queryString += ' ORDER BY s.title, i.sort_order, cv.is_primary DESC';

    if (!id && !copyId) {
      const limit = parseInt(req.query.limit as string) || 25;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      queryString += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const results = await query<RowDataPacket[]>(queryString, params);
    const count = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM cover WHERE deleted_at IS NULL'
    );

    res.json({ results, count });
  } catch (err) {
    console.error('Error fetching covers:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/covers/:id - Get single cover
router.get('/api/covers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const results = await query<RowDataPacket[]>(
      `SELECT
        cv.*,
        cp.issue_id,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        s.title as series_title,
        s.series_id,
        p.first_name as artist_first_name,
        p.last_name as artist_last_name
       FROM cover cv
       LEFT JOIN copy cp ON cv.copy_id = cp.copy_id
       LEFT JOIN issue i ON cp.issue_id = i.issue_id
       LEFT JOIN series s ON i.series_id = s.series_id
       LEFT JOIN person p ON cv.cover_artist_person_id = p.person_id
       WHERE cv.cover_id = ? AND cv.deleted_at IS NULL`,
      [id]
    );

    if (results.length === 0) {
      res.status(404).json({ error: 'Cover not found' });
      return;
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching cover:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/covers - Create a new cover
router.post('/api/covers', async (req: Request, res: Response) => {
  try {
    const {
      copy_id,
      cover_type,
      cover_description,
      cover_artist_person_id,
      cover_image_path,
      is_primary,
      notes
    } = req.body;

    if (!copy_id) {
      res.status(400).json({ error: 'copy_id is required' });
      return;
    }

    // If setting as primary, unset other primaries for this copy
    if (is_primary) {
      await execute(
        'UPDATE cover SET is_primary = 0 WHERE copy_id = ?',
        [copy_id]
      );
    }

    const result = await execute(
      `INSERT INTO cover (copy_id, cover_type, cover_description,
        cover_artist_person_id, cover_image_path, is_primary, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        copy_id,
        cover_type || 'standard',
        cover_description || null,
        cover_artist_person_id || null,
        cover_image_path || null,
        is_primary ? 1 : 0,
        notes || null
      ]
    );

    res.status(201).json({
      cover_id: result.insertId,
      message: 'Cover created successfully'
    });
  } catch (err) {
    console.error('Error creating cover:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/covers/:id - Update a cover
router.put('/api/covers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      cover_type,
      cover_description,
      cover_artist_person_id,
      cover_image_path,
      is_primary,
      notes
    } = req.body;

    // If setting as primary, unset other primaries for this issue
    if (is_primary) {
      const currentCover = await query<RowDataPacket[]>(
        'SELECT issue_id FROM cover WHERE cover_id = ?',
        [id]
      );
      if (currentCover.length > 0) {
        await execute(
          'UPDATE cover SET is_primary = 0 WHERE issue_id = ? AND cover_id != ?',
          [currentCover[0].issue_id, id]
        );
      }
    }

    const result = await execute(
      `UPDATE cover SET 
        cover_type = COALESCE(?, cover_type),
        cover_description = ?,
        cover_artist_person_id = ?,
        cover_image_path = ?,
        is_primary = COALESCE(?, is_primary),
        notes = ?
       WHERE cover_id = ? AND deleted_at IS NULL`,
      [
        cover_type,
        cover_description ?? null,
        cover_artist_person_id ?? null,
        cover_image_path ?? null,
        is_primary !== undefined ? (is_primary ? 1 : 0) : null,
        notes ?? null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Cover not found' });
      return;
    }

    res.json({ message: 'Cover updated successfully' });
  } catch (err) {
    console.error('Error updating cover:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/covers/:id - Soft delete a cover
router.delete('/api/covers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const result = await execute(
      'UPDATE cover SET deleted_at = NOW() WHERE cover_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Cover not found' });
      return;
    }

    res.json({ message: 'Cover deleted successfully' });
  } catch (err) {
    console.error('Error deleting cover:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
