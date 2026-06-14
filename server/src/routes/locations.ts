import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../controllers/db';

const router = Router();

interface LocationRow extends RowDataPacket {
  location_id: number;
  parent_location_id: number | null;
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

interface LocationLinkRow extends RowDataPacket {
  location_link_id: number;
  from_location_id: number;
  to_location_id: number;
  notes: string | null;
  created_at: Date;
}

// Returns every ancestor location_id of the given location (inclusive of self).
// Used to detect cycles before reparenting.
async function getAncestorIds(locationId: number): Promise<Set<number>> {
  const rows = await query<RowDataPacket[]>(
    `WITH RECURSIVE ancestors AS (
       SELECT location_id, parent_location_id
       FROM location
       WHERE location_id = ? AND deleted_at IS NULL
       UNION ALL
       SELECT l.location_id, l.parent_location_id
       FROM location l
       INNER JOIN ancestors a ON l.location_id = a.parent_location_id
       WHERE l.deleted_at IS NULL
     )
     SELECT location_id FROM ancestors`,
    [locationId]
  );
  return new Set(rows.map(r => r.location_id as number));
}

// Returns every descendant location_id of the given location (inclusive of self).
async function getDescendantIds(locationId: number): Promise<Set<number>> {
  const rows = await query<RowDataPacket[]>(
    `WITH RECURSIVE descendants AS (
       SELECT location_id
       FROM location
       WHERE location_id = ? AND deleted_at IS NULL
       UNION ALL
       SELECT l.location_id
       FROM location l
       INNER JOIN descendants d ON l.parent_location_id = d.location_id
       WHERE l.deleted_at IS NULL
     )
     SELECT location_id FROM descendants`,
    [locationId]
  );
  return new Set(rows.map(r => r.location_id as number));
}

// GET /api/locations - List all locations (flat, paginated)
router.get('/api/locations', async (req: Request, res: Response) => {
  try {
    const baseQuery = `
      SELECT
        l.location_id,
        l.parent_location_id,
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
    const parentId = req.query.parent_location_id as string | undefined;

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
      if (parentId === 'null') {
        queryString += ' AND l.parent_location_id IS NULL';
      } else if (parentId) {
        queryString += ' AND l.parent_location_id = ?';
        params.push(parseInt(parentId));
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

// GET /api/locations/tree - Full location hierarchy as a nested tree
router.get('/api/locations/tree', async (req: Request, res: Response) => {
  try {
    const rows = await query<LocationRow[]>(
      `SELECT
         l.location_id,
         l.parent_location_id,
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
         (SELECT COUNT(*) FROM copy c WHERE c.location_id = l.location_id AND c.deleted_at IS NULL) as copy_count,
         (SELECT COALESCE(SUM(c2.current_value), 0) FROM copy c2 WHERE c2.location_id = l.location_id AND c2.deleted_at IS NULL) as total_value
       FROM location l
       WHERE l.deleted_at IS NULL
       ORDER BY l.storage_type, l.cabinet_number, l.drawer_number, l.divider`
    );

    type TreeNode = LocationRow & { children: TreeNode[] };
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    for (const row of rows) {
      map.set(row.location_id, { ...row, children: [] });
    }
    for (const node of map.values()) {
      if (node.parent_location_id != null) {
        const parent = map.get(node.parent_location_id);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node); // orphan — parent was deleted or missing
        }
      } else {
        roots.push(node);
      }
    }

    res.json({ tree: roots });
  } catch (err) {
    console.error('Error fetching location tree:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/locations/:id/path - Full path from root to this location
router.get('/api/locations/:id/path', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);

    const rows = await query<LocationRow[]>(
      `WITH RECURSIVE path AS (
         SELECT location_id, parent_location_id, storage_type, location_name,
                cabinet_number, drawer_number, divider, 0 AS depth
         FROM location
         WHERE location_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT l.location_id, l.parent_location_id, l.storage_type, l.location_name,
                l.cabinet_number, l.drawer_number, l.divider, p.depth + 1
         FROM location l
         INNER JOIN path p ON l.location_id = p.parent_location_id
         WHERE l.deleted_at IS NULL
       )
       SELECT * FROM path ORDER BY depth DESC`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json({ path: rows });
  } catch (err) {
    console.error('Error fetching location path:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/locations/:id/counts - Direct and rolled-up copy counts and value
router.get('/api/locations/:id/counts', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);

    const [directRow] = await query<RowDataPacket[]>(
      `SELECT
         COUNT(*) as copy_count,
         COALESCE(SUM(current_value), 0) as total_value
       FROM copy
       WHERE location_id = ? AND deleted_at IS NULL`,
      [id]
    );

    const [rollupRow] = await query<RowDataPacket[]>(
      `WITH RECURSIVE descendants AS (
         SELECT location_id FROM location WHERE location_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT l.location_id FROM location l
         INNER JOIN descendants d ON l.parent_location_id = d.location_id
         WHERE l.deleted_at IS NULL
       )
       SELECT
         COUNT(*) as copy_count,
         COALESCE(SUM(c.current_value), 0) as total_value
       FROM copy c
       INNER JOIN descendants d ON c.location_id = d.location_id
       WHERE c.deleted_at IS NULL`,
      [id]
    );

    res.json({
      direct: {
        copy_count: directRow.copy_count,
        total_value: directRow.total_value,
      },
      rollup: {
        copy_count: rollupRow.copy_count,
        total_value: rollupRow.total_value,
      },
    });
  } catch (err) {
    console.error('Error fetching location counts:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/locations/:id/links - Continuation links for a location
router.get('/api/locations/:id/links', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);

    const outgoing = await query<LocationLinkRow[]>(
      `SELECT ll.*,
              l.location_name as to_location_name, l.storage_type as to_storage_type
       FROM location_link ll
       JOIN location l ON ll.to_location_id = l.location_id
       WHERE ll.from_location_id = ?`,
      [id]
    );

    const incoming = await query<LocationLinkRow[]>(
      `SELECT ll.*,
              l.location_name as from_location_name, l.storage_type as from_storage_type
       FROM location_link ll
       JOIN location l ON ll.from_location_id = l.location_id
       WHERE ll.to_location_id = ?`,
      [id]
    );

    res.json({ continues_to: outgoing, overflow_from: incoming });
  } catch (err) {
    console.error('Error fetching location links:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET /api/locations/cabinet/:cabinetNumber - Get contents of a cabinet
router.get('/api/locations/cabinet/:cabinetNumber', async (req: Request, res: Response) => {
  try {
    const cabinetNumber = parseInt(<string>req.params.cabinetNumber);

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

// GET /api/locations/:id - Get single location with contents
router.get('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);

    const locationResults = await query<LocationRow[]>(
      `SELECT * FROM location WHERE location_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (locationResults.length === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    const seriesResults = await query<RowDataPacket[]>(
      `SELECT series_id, title, sort_title
       FROM series
       WHERE default_location_id = ? AND deleted_at IS NULL
       ORDER BY COALESCE(sort_title, title)`,
      [id]
    );

    const copyResults = await query<RowDataPacket[]>(
      `SELECT
        c.copy_id,
        c.format,
        c.current_value,
        i.issue_number,
        i.issue_title,
        i.sort_order,
        s.title as series_title,
        s.sort_title as series_sort_title
       FROM copy c
       JOIN issue i ON c.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE c.location_id = ? AND c.deleted_at IS NULL
       ORDER BY COALESCE(s.sort_title, s.title), i.sort_order, c.copy_id`,
      [id]
    );

    const collectedEditionResults = await query<RowDataPacket[]>(
      `SELECT collected_edition_id, title, format, current_value
       FROM collected_edition
       WHERE location_id = ? AND deleted_at IS NULL
       ORDER BY title`,
      [id]
    );

    const childLocations = await query<LocationRow[]>(
      `SELECT location_id, parent_location_id, storage_type, location_name,
              cabinet_number, drawer_number, divider
       FROM location
       WHERE parent_location_id = ? AND deleted_at IS NULL
       ORDER BY storage_type, location_name`,
      [id]
    );

    res.json({
      location: locationResults[0],
      children: childLocations,
      series: seriesResults,
      copies: copyResults,
      collected_editions: collectedEditionResults,
    });
  } catch (err) {
    console.error('Error fetching location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/locations - Create a new location
router.post('/api/locations', async (req: Request, res: Response) => {
  try {
    const {
      parent_location_id,
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
      is_insured_separately,
    } = req.body;

    if (!storage_type) {
      res.status(400).json({ error: 'storage_type is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO location (parent_location_id, storage_type, location_name, cabinet_number,
        drawer_number, divider, row_num, shelf_description, file_path, backup_path, notes,
        is_insured_separately)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parent_location_id ?? null,
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
        is_insured_separately ? 1 : 0,
      ]
    );

    res.status(201).json({
      location_id: result.insertId,
      message: 'Location created successfully',
    });
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/locations/:id/move - Reparent a location (cycle-safe)
router.put('/api/locations/:id/move', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);
    const { parent_location_id } = req.body;
    const newParentId: number | null = parent_location_id ?? null;

    // A location cannot be its own parent
    if (newParentId === id) {
      res.status(400).json({ error: 'A location cannot be its own parent' });
      return;
    }

    // The new parent must not be a descendant of the location being moved
    if (newParentId !== null) {
      const descendants = await getDescendantIds(id);
      if (descendants.has(newParentId)) {
        res.status(400).json({
          error: 'Cannot move a location into one of its own descendants (would create a cycle)',
        });
        return;
      }
    }

    const result = await execute(
      `UPDATE location SET parent_location_id = ? WHERE location_id = ? AND deleted_at IS NULL`,
      [newParentId, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json({ message: 'Location moved successfully' });
  } catch (err) {
    console.error('Error moving location:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT /api/locations/:id - Update a location's fields (not its parent — use /move for that)
router.put('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);
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
      is_insured_separately,
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
        id,
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
    const id = parseInt(<string>req.params.id);

    // Block delete if location has active children
    const [childCount] = await query<CountRow[]>(
      'SELECT COUNT(*) as total FROM location WHERE parent_location_id = ? AND deleted_at IS NULL',
      [id]
    );
    if (childCount.total > 0) {
      res.status(400).json({
        error: 'Cannot delete a location that has child locations. Delete or move them first.',
      });
      return;
    }

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

// GET /api/location-links - List all continuation links
router.get('/api/location-links', async (req: Request, res: Response) => {
  try {
    const links = await query<LocationLinkRow[]>(
      `SELECT ll.*,
              f.location_name as from_location_name, f.storage_type as from_storage_type,
              t.location_name as to_location_name,   t.storage_type as to_storage_type
       FROM location_link ll
       JOIN location f ON ll.from_location_id = f.location_id
       JOIN location t ON ll.to_location_id   = t.location_id
       ORDER BY ll.from_location_id`
    );
    res.json({ results: links });
  } catch (err) {
    console.error('Error fetching location links:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST /api/location-links - Create a continuation link
router.post('/api/location-links', async (req: Request, res: Response) => {
  try {
    const { from_location_id, to_location_id, notes } = req.body;

    if (!from_location_id || !to_location_id) {
      res.status(400).json({ error: 'from_location_id and to_location_id are required' });
      return;
    }
    if (from_location_id === to_location_id) {
      res.status(400).json({ error: 'A location cannot link to itself' });
      return;
    }

    const result = await execute(
      `INSERT INTO location_link (from_location_id, to_location_id, notes)
       VALUES (?, ?, ?)`,
      [from_location_id, to_location_id, notes ?? null]
    );

    res.status(201).json({
      location_link_id: result.insertId,
      message: 'Continuation link created successfully',
    });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'A link between these two locations already exists' });
      return;
    }
    console.error('Error creating location link:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE /api/location-links/:id - Remove a continuation link
router.delete('/api/location-links/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(<string>req.params.id);

    const result = await execute(
      'DELETE FROM location_link WHERE location_link_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    res.json({ message: 'Continuation link removed successfully' });
  } catch (err) {
    console.error('Error deleting location link:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

export default router;
