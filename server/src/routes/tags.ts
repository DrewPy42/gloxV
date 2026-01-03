import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

// GET /api/tags - List all tags
router.get('/api/tags', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    let queryString = `
      SELECT 
        t.*,
        COUNT(tg.taggable_id) as usage_count
      FROM tag t
      LEFT JOIN taggable tg ON t.tag_id = tg.tag_id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (category) {
      queryString += ' AND t.tag_category = ?';
      params.push(category);
    }
    if (search) {
      queryString += ' AND t.tag_name LIKE ?';
      params.push(`%${search}%`);
    }

    queryString += ' GROUP BY t.tag_id ORDER BY t.tag_category, t.tag_name';

    const results = await query<RowDataPacket[]>(queryString, params);
    const count = await query<RowDataPacket[]>('SELECT COUNT(*) as total FROM tag');

    res.json({ results, count });
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/tags/categories - Get all tag categories
router.get('/api/tags/categories', async (req: Request, res: Response) => {
  try {
    const results = await query<RowDataPacket[]>(
      `SELECT DISTINCT tag_category, COUNT(*) as tag_count
       FROM tag
       WHERE tag_category IS NOT NULL
       GROUP BY tag_category
       ORDER BY tag_category`
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching tag categories:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/tags/:id - Get single tag with usage
router.get('/api/tags/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const tagResults = await query<RowDataPacket[]>(
      'SELECT * FROM tag WHERE tag_id = ?',
      [id]
    );

    if (tagResults.length === 0) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    // Get all entities with this tag
    const usageResults = await query<RowDataPacket[]>(
      `SELECT 
        tg.entity_type,
        tg.entity_id,
        CASE 
          WHEN tg.entity_type = 'series' THEN (SELECT title FROM series WHERE series_id = tg.entity_id)
          WHEN tg.entity_type = 'issue' THEN (SELECT CONCAT(s.title, ' #', i.issue_number) FROM issue i JOIN series s ON i.series_id = s.series_id WHERE i.issue_id = tg.entity_id)
          WHEN tg.entity_type = 'person' THEN (SELECT CONCAT(COALESCE(first_name, ''), ' ', last_name) FROM person WHERE person_id = tg.entity_id)
          WHEN tg.entity_type = 'storyline' THEN (SELECT storyline_name FROM storyline WHERE storyline_id = tg.entity_id)
          WHEN tg.entity_type = 'collected_edition' THEN (SELECT title FROM collected_edition WHERE collected_edition_id = tg.entity_id)
          ELSE 'Unknown'
        END as entity_name
       FROM taggable tg
       WHERE tg.tag_id = ?
       ORDER BY tg.entity_type, entity_name`,
      [id]
    );

    res.json({
      tag: tagResults[0],
      usage: usageResults
    });
  } catch (err) {
    console.error('Error fetching tag:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/tags - Create a new tag
router.post('/api/tags', async (req: Request, res: Response) => {
  try {
    const { tag_name, tag_category, color } = req.body;

    if (!tag_name) {
      res.status(400).json({ error: 'tag_name is required' });
      return;
    }

    const result = await execute(
      'INSERT INTO tag (tag_name, tag_category, color) VALUES (?, ?, ?)',
      [tag_name, tag_category || null, color || null]
    );

    res.status(201).json({
      tag_id: result.insertId,
      message: 'Tag created successfully'
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Tag name already exists' });
      return;
    }
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/tags/:id - Update a tag
router.put('/api/tags/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { tag_name, tag_category, color } = req.body;

    const result = await execute(
      `UPDATE tag SET 
        tag_name = COALESCE(?, tag_name),
        tag_category = ?,
        color = ?
       WHERE tag_id = ?`,
      [tag_name, tag_category ?? null, color ?? null, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json({ message: 'Tag updated successfully' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Tag name already exists' });
      return;
    }
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/tags/:id - Delete a tag
router.delete('/api/tags/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // This will cascade delete from taggable due to foreign key
    const result = await execute('DELETE FROM tag WHERE tag_id = ?', [id]);

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/tags/:id/apply - Apply tag to an entity
router.post('/api/tags/:id/apply', async (req: Request, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
      res.status(400).json({ error: 'entity_type and entity_id are required' });
      return;
    }

    const validTypes = ['series', 'volume', 'issue', 'copy', 'collected_edition', 'person', 'storyline'];
    if (!validTypes.includes(entity_type)) {
      res.status(400).json({ error: `entity_type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const result = await execute(
      'INSERT INTO taggable (tag_id, entity_type, entity_id) VALUES (?, ?, ?)',
      [tagId, entity_type, entity_id]
    );

    res.status(201).json({
      taggable_id: result.insertId,
      message: 'Tag applied successfully'
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Tag already applied to this entity' });
      return;
    }
    console.error('Error applying tag:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/tags/:id/remove - Remove tag from an entity
router.delete('/api/tags/:id/remove', async (req: Request, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
      res.status(400).json({ error: 'entity_type and entity_id are required' });
      return;
    }

    const result = await execute(
      'DELETE FROM taggable WHERE tag_id = ? AND entity_type = ? AND entity_id = ?',
      [tagId, entity_type, entity_id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Tag not found on this entity' });
      return;
    }

    res.json({ message: 'Tag removed successfully' });
  } catch (err) {
    console.error('Error removing tag:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/tags/entity/:type/:id - Get all tags for an entity
router.get('/api/tags/entity/:type/:id', async (req: Request, res: Response) => {
  try {
    const entityType = req.params.type;
    const entityId = parseInt(req.params.id);

    const validTypes = ['series', 'volume', 'issue', 'copy', 'collected_edition', 'person', 'storyline'];
    if (!validTypes.includes(entityType)) {
      res.status(400).json({ error: `entity_type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const results = await query<RowDataPacket[]>(
      `SELECT t.* 
       FROM tag t
       JOIN taggable tg ON t.tag_id = tg.tag_id
       WHERE tg.entity_type = ? AND tg.entity_id = ?
       ORDER BY t.tag_category, t.tag_name`,
      [entityType, entityId]
    );

    res.json({ results });
  } catch (err) {
    console.error('Error fetching entity tags:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
