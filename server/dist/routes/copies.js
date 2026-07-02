"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../controllers/db");
const router = (0, express_1.Router)();
// GET /api/copies - List copies with filters
router.get('/api/copies', async (req, res) => {
    try {
        // location_path: walk up the hierarchy from the copy's location to build a breadcrumb string
        const locationPathSubquery = `
      (WITH RECURSIVE loc_path (location_id, parent_location_id, seg, depth) AS (
        SELECT loc.location_id, loc.parent_location_id,
               COALESCE(loc.location_name,
                 CASE
                   WHEN loc.cabinet_number IS NOT NULL AND loc.drawer_number IS NOT NULL AND loc.divider IS NOT NULL
                     THEN CONCAT('Cabinet ', loc.cabinet_number, ' / Drawer ', loc.drawer_number, ' / ', loc.divider)
                   WHEN loc.cabinet_number IS NOT NULL AND loc.drawer_number IS NOT NULL
                     THEN CONCAT('Cabinet ', loc.cabinet_number, ' / Drawer ', loc.drawer_number)
                   WHEN loc.cabinet_number IS NOT NULL
                     THEN CONCAT('Cabinet ', loc.cabinet_number)
                   ELSE loc.storage_type
                 END
               ) AS seg,
               0 AS depth
        FROM location loc WHERE loc.location_id = c.location_id
        UNION ALL
        SELECT l2.location_id, l2.parent_location_id,
               COALESCE(l2.location_name, l2.storage_type),
               lp.depth + 1
        FROM location l2 INNER JOIN loc_path lp ON l2.location_id = lp.parent_location_id
        WHERE l2.deleted_at IS NULL
      )
      SELECT GROUP_CONCAT(seg ORDER BY depth DESC SEPARATOR ' / ') FROM loc_path)
    `;
        const baseQuery = `
      SELECT
        c.*,
        cc.condition_code,
        cc.condition_text,
        COALESCE(cv.cover_type) as cover_type,
        COALESCE(cv.cover_description) as cover_description,
        COALESCE(cv.cover_image_path) as cover_image_path,
        l.location_name,
        l.storage_type,
        l.divider,
        ${locationPathSubquery} as location_path,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        i.sort_order as issue_sort_order,
        s.title as series_title,
        s.sort_title as series_sort_title,
        s.series_id,
        v.volume_number
      FROM copy c
      JOIN issue i ON c.issue_id = i.issue_id
      JOIN series s ON i.series_id = s.series_id
      LEFT JOIN volume v ON i.volume_id = v.volume_id
      LEFT JOIN condition_code cc ON c.condition_id = cc.condition_id
      LEFT JOIN cover cv ON c.copy_id = cv.copy_id AND cv.deleted_at IS NULL
      LEFT JOIN location l ON c.location_id = l.location_id
      WHERE c.deleted_at IS NULL
    `;
        const id = req.query.id;
        const issueId = req.query.issue_id;
        const seriesId = req.query.series_id;
        const locationId = req.query.location_id;
        const includeDescendants = req.query.include_descendants === 'true';
        const format = req.query.format;
        let queryString = baseQuery;
        const params = [];
        if (id) {
            queryString += ' AND c.copy_id = ?';
            params.push(parseInt(id));
        }
        else {
            if (issueId) {
                queryString += ' AND c.issue_id = ?';
                params.push(parseInt(issueId));
            }
            if (seriesId) {
                queryString += ' AND i.series_id = ?';
                params.push(parseInt(seriesId));
            }
            if (locationId === 'unassigned') {
                queryString += ' AND c.location_id IS NULL';
            }
            else if (locationId) {
                if (includeDescendants) {
                    // Filter copies in the location and all its descendants
                    queryString += `
            AND c.location_id IN (
              WITH RECURSIVE loc_descendants AS (
                SELECT location_id FROM location WHERE location_id = ? AND deleted_at IS NULL
                UNION ALL
                SELECT l2.location_id FROM location l2
                INNER JOIN loc_descendants ld ON l2.parent_location_id = ld.location_id
                WHERE l2.deleted_at IS NULL
              )
              SELECT location_id FROM loc_descendants
            )`;
                }
                else {
                    queryString += ' AND c.location_id = ?';
                }
                params.push(parseInt(locationId));
            }
            if (format) {
                queryString += ' AND c.format = ?';
                params.push(format);
            }
        }
        // Copies within a location are sorted by filing order; all others by series/issue
        const orderBy = locationId
            ? 'COALESCE(s.sort_title, s.title), v.volume_number, i.sort_order, c.copy_id'
            : 'COALESCE(s.sort_title, s.title), i.sort_order';
        if (!id) {
            const limit = parseInt(req.query.limit) || 25;
            const page = parseInt(req.query.page) || 1;
            const offset = (page - 1) * limit;
            queryString += ` ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
        }
        const results = await (0, db_1.query)(queryString, params);
        // Count query — mirrors the filters above but without pagination or location_path
        let countQuery = `
      SELECT COUNT(*) as total
      FROM copy c
      JOIN issue i ON c.issue_id = i.issue_id
      JOIN series s ON i.series_id = s.series_id
      WHERE c.deleted_at IS NULL`;
        const countParams = [];
        if (issueId) {
            countQuery += ' AND c.issue_id = ?';
            countParams.push(parseInt(issueId));
        }
        if (seriesId) {
            countQuery += ' AND i.series_id = ?';
            countParams.push(parseInt(seriesId));
        }
        if (locationId === 'unassigned') {
            countQuery += ' AND c.location_id IS NULL';
        }
        else if (locationId) {
            if (includeDescendants) {
                countQuery += `
          AND c.location_id IN (
            WITH RECURSIVE loc_descendants AS (
              SELECT location_id FROM location WHERE location_id = ? AND deleted_at IS NULL
              UNION ALL
              SELECT l2.location_id FROM location l2
              INNER JOIN loc_descendants ld ON l2.parent_location_id = ld.location_id
              WHERE l2.deleted_at IS NULL
            )
            SELECT location_id FROM loc_descendants
          )`;
            }
            else {
                countQuery += ' AND c.location_id = ?';
            }
            countParams.push(parseInt(locationId));
        }
        if (format) {
            countQuery += ' AND c.format = ?';
            countParams.push(format);
        }
        const count = await (0, db_1.query)(countQuery, countParams);
        res.json({ results, count });
    }
    catch (err) {
        console.error('Error fetching copies:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/copy-tree - Series list with copy counts for bulk assignment picker
router.get('/api/copy-tree', async (req, res) => {
    try {
        const includeAssigned = req.query.include_assigned === 'true';
        const assignedFilter = includeAssigned ? '' : 'AND c.location_id IS NULL';
        const rows = await (0, db_1.query)(`
      SELECT
        s.series_id,
        s.title AS series_title,
        s.sort_title AS series_sort_title,
        COUNT(c.copy_id) AS copy_count
      FROM series s
      JOIN issue i ON i.series_id = s.series_id AND i.deleted_at IS NULL
      JOIN copy c ON c.issue_id = i.issue_id AND c.deleted_at IS NULL
        ${assignedFilter}
      WHERE s.deleted_at IS NULL
      GROUP BY s.series_id, s.title, s.sort_title
      ORDER BY COALESCE(s.sort_title, s.title)
    `, []);
        res.json({ series: rows });
    }
    catch (err) {
        console.error('Error fetching copy tree:', err);
        res.status(500).json({ error: err?.message || 'Database error occurred' });
    }
});
// GET /api/copy-tree/:seriesId - Volumes → issues → copies for one series
router.get('/api/copy-tree/:seriesId', async (req, res) => {
    try {
        const seriesId = parseInt(req.params.seriesId);
        const includeAssigned = req.query.include_assigned === 'true';
        const assignedFilter = includeAssigned ? '' : 'AND c.location_id IS NULL';
        const copies = await (0, db_1.query)(`
      SELECT
        c.copy_id,
        c.issue_id,
        c.format,
        c.location_id,
        c.cover_price,
        c.current_value,
        c.notes,
        i.issue_number,
        i.issue_title,
        i.sort_order,
        i.volume_id,
        v.volume_number,
        l.location_name,
        l.storage_type,
        l.divider
      FROM copy c
      JOIN issue i ON c.issue_id = i.issue_id AND i.series_id = ? AND i.deleted_at IS NULL
      LEFT JOIN volume v ON i.volume_id = v.volume_id
      LEFT JOIN location l ON c.location_id = l.location_id
      WHERE c.deleted_at IS NULL
        ${assignedFilter}
      ORDER BY v.volume_number, i.sort_order, c.copy_id
    `, [seriesId]);
        // Build volumes → issues → copies structure
        const volumeMap = new Map();
        for (const row of copies) {
            const volKey = row.volume_id ?? null;
            if (!volumeMap.has(volKey)) {
                volumeMap.set(volKey, {
                    volume_id: row.volume_id ?? null,
                    volume_number: row.volume_number ?? null,
                    issues: new Map(),
                    copy_count: 0,
                });
            }
            const volume = volumeMap.get(volKey);
            volume.copy_count++;
            if (!volume.issues.has(row.issue_id)) {
                volume.issues.set(row.issue_id, {
                    issue_id: row.issue_id,
                    issue_number: row.issue_number,
                    issue_title: row.issue_title,
                    sort_order: row.sort_order,
                    copies: [],
                });
            }
            volume.issues.get(row.issue_id).copies.push({
                copy_id: row.copy_id,
                format: row.format,
                location_id: row.location_id,
                location_name: row.location_name,
                storage_type: row.storage_type,
                divider: row.divider,
                cover_price: row.cover_price,
                current_value: row.current_value,
                notes: row.notes,
            });
        }
        const volumes = Array.from(volumeMap.values()).map((v) => ({
            ...v,
            issues: Array.from(v.issues.values()),
        }));
        res.json({ volumes });
    }
    catch (err) {
        console.error('Error fetching series copy tree:', err);
        res.status(500).json({ error: err?.message || 'Database error occurred' });
    }
});
// GET /api/copies/:id - Get single copy with full details
router.get('/api/copies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const copyQuery = `
      SELECT
        c.*,
        cc.condition_code,
        cc.condition_text,
        COALESCE(cv.cover_type, pcv.cover_type) as cover_type,
        COALESCE(cv.cover_description, pcv.cover_description) as cover_description,
        COALESCE(cv.cover_image_path, pcv.cover_image_path) as cover_image_path,
        l.location_name,
        l.storage_type,
        l.cabinet_number,
        l.drawer_number,
        l.divider,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        s.title as series_title,
        s.series_id,
        v.volume_number,
        p.publisher_name
      FROM copy c
      JOIN issue i ON c.issue_id = i.issue_id
      JOIN series s ON i.series_id = s.series_id
      LEFT JOIN publisher p ON s.publisher_id = p.publisher_id
      LEFT JOIN volume v ON i.volume_id = v.volume_id
      LEFT JOIN condition_code cc ON c.condition_id = cc.condition_id
      LEFT JOIN cover cv ON c.cover_id = cv.cover_id
      LEFT JOIN cover pcv ON c.copy_id = pcv.copy_id AND pcv.is_primary = 1 AND pcv.deleted_at IS NULL
      LEFT JOIN location l ON c.location_id = l.location_id
      WHERE c.copy_id = ? AND c.deleted_at IS NULL
    `;
        const results = await (0, db_1.query)(copyQuery, [id]);
        if (results.length === 0) {
            res.status(404).json({ error: 'Copy not found' });
            return;
        }
        res.json(results[0]);
    }
    catch (err) {
        console.error('Error fetching copy:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/copies - Create a new copy
router.post('/api/copies', async (req, res) => {
    try {
        const { issue_id, cover_id, condition_id, format, cover_price, current_value, value_date, purchase_date, purchase_source, location_id, grade, certification_number, file_path, notes } = req.body;
        if (!issue_id) {
            res.status(400).json({ error: 'issue_id is required' });
            return;
        }
        const result = await (0, db_1.execute)(`INSERT INTO copy (issue_id, cover_id, condition_id, format, cover_price,
        current_value, value_date, purchase_date, purchase_source, location_id,
        grade, certification_number, file_path, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            issue_id,
            cover_id || null,
            condition_id || null,
            format || 'paperback',
            cover_price || null,
            current_value || null,
            value_date || null,
            purchase_date || null,
            purchase_source || null,
            location_id || null,
            grade || null,
            certification_number || null,
            file_path || null,
            notes || null
        ]);
        // If current_value is set, add to value_history
        if (current_value) {
            await (0, db_1.execute)(`INSERT INTO value_history (entity_type, entity_id, value, recorded_at)
         VALUES ('copy', ?, ?, NOW())`, [result.insertId, current_value]);
        }
        res.status(201).json({
            copy_id: result.insertId,
            message: 'Copy created successfully'
        });
    }
    catch (err) {
        console.error('Error creating copy:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// PUT /api/copies/bulk - Bulk update copies
router.put('/api/copies/bulk', async (req, res) => {
    try {
        const { copy_ids, updates, assign_all_unassigned } = req.body;
        // Handle "assign all unassigned" case
        if (assign_all_unassigned) {
            if (!updates || typeof updates !== 'object') {
                res.status(400).json({ error: 'updates object is required' });
                return;
            }
            // Build dynamic SET clause based on provided fields
            const setFields = [];
            const values = [];
            if (updates.location_id !== undefined) {
                setFields.push('location_id = ?');
                values.push(updates.location_id || null);
            }
            if (updates.condition_id !== undefined) {
                setFields.push('condition_id = ?');
                values.push(updates.condition_id || null);
            }
            if (updates.format !== undefined) {
                setFields.push('format = ?');
                values.push(updates.format);
            }
            if (updates.cover_price !== undefined) {
                setFields.push('cover_price = ?');
                values.push(updates.cover_price || null);
            }
            if (updates.current_value !== undefined) {
                setFields.push('current_value = ?');
                values.push(updates.current_value || null);
            }
            if (updates.value_date !== undefined) {
                setFields.push('value_date = ?');
                values.push(updates.value_date || null);
            }
            if (updates.purchase_date !== undefined) {
                setFields.push('purchase_date = ?');
                values.push(updates.purchase_date || null);
            }
            if (updates.purchase_source !== undefined) {
                setFields.push('purchase_source = ?');
                values.push(updates.purchase_source || null);
            }
            if (updates.grade !== undefined) {
                setFields.push('grade = ?');
                values.push(updates.grade || null);
            }
            if (updates.certification_number !== undefined) {
                setFields.push('certification_number = ?');
                values.push(updates.certification_number || null);
            }
            if (updates.file_path !== undefined) {
                setFields.push('file_path = ?');
                values.push(updates.file_path || null);
            }
            if (updates.notes !== undefined) {
                setFields.push('notes = ?');
                values.push(updates.notes || null);
            }
            if (setFields.length === 0) {
                res.status(400).json({ error: 'No valid fields to update' });
                return;
            }
            const queryString = `
        UPDATE copy
        SET ${setFields.join(', ')}, updated_at = NOW()
        WHERE location_id IS NULL
        AND deleted_at IS NULL
      `;
            const result = await (0, db_1.execute)(queryString, values);
            res.json({
                message: 'Bulk update successful',
                updated_count: result.affectedRows
            });
            return;
        }
        // Handle normal bulk update case
        if (!copy_ids || !Array.isArray(copy_ids) || copy_ids.length === 0) {
            res.status(400).json({ error: 'copy_ids array is required' });
            return;
        }
        if (!updates || typeof updates !== 'object') {
            res.status(400).json({ error: 'updates object is required' });
            return;
        }
        // Build dynamic SET clause based on provided fields
        const setFields = [];
        const values = [];
        if (updates.location_id !== undefined) {
            setFields.push('location_id = ?');
            values.push(updates.location_id || null);
        }
        if (updates.condition_id !== undefined) {
            setFields.push('condition_id = ?');
            values.push(updates.condition_id || null);
        }
        if (updates.format !== undefined) {
            setFields.push('format = ?');
            values.push(updates.format);
        }
        if (updates.cover_price !== undefined) {
            setFields.push('cover_price = ?');
            values.push(updates.cover_price || null);
        }
        if (updates.current_value !== undefined) {
            setFields.push('current_value = ?');
            values.push(updates.current_value || null);
        }
        if (updates.value_date !== undefined) {
            setFields.push('value_date = ?');
            values.push(updates.value_date || null);
        }
        if (updates.purchase_date !== undefined) {
            setFields.push('purchase_date = ?');
            values.push(updates.purchase_date || null);
        }
        if (updates.purchase_source !== undefined) {
            setFields.push('purchase_source = ?');
            values.push(updates.purchase_source || null);
        }
        if (updates.grade !== undefined) {
            setFields.push('grade = ?');
            values.push(updates.grade || null);
        }
        if (updates.certification_number !== undefined) {
            setFields.push('certification_number = ?');
            values.push(updates.certification_number || null);
        }
        if (updates.file_path !== undefined) {
            setFields.push('file_path = ?');
            values.push(updates.file_path || null);
        }
        if (updates.notes !== undefined) {
            setFields.push('notes = ?');
            values.push(updates.notes || null);
        }
        if (setFields.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }
        // Add copy_ids to values array
        values.push(...copy_ids);
        const queryString = `
      UPDATE copy
      SET ${setFields.join(', ')}, updated_at = NOW()
      WHERE copy_id IN (${copy_ids.map(() => '?').join(',')})
      AND deleted_at IS NULL
    `;
        const result = await (0, db_1.execute)(queryString, values);
        res.json({
            message: 'Bulk update successful',
            updated_count: result.affectedRows
        });
    }
    catch (err) {
        console.error('Error bulk updating copies:', err);
        res.status(500).json({ error: err?.message || 'Database error occurred' });
    }
});
// PUT /api/copies/:id - Update a copy
router.put('/api/copies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { cover_id, condition_id, format, cover_price, current_value, value_date, purchase_date, purchase_source, location_id, grade, certification_number, file_path, notes, track_value_change } = req.body;
        // If tracking value changes and current_value is being updated
        if (track_value_change && current_value !== undefined) {
            // Get current value first
            const currentCopy = await (0, db_1.query)('SELECT current_value FROM copy WHERE copy_id = ?', [id]);
            if (currentCopy.length > 0 && currentCopy[0].current_value !== current_value) {
                // Add to value_history
                await (0, db_1.execute)(`INSERT INTO value_history (entity_type, entity_id, value, recorded_at)
           VALUES ('copy', ?, ?, NOW())`, [id, current_value]);
            }
        }
        const result = await (0, db_1.execute)(`UPDATE copy SET 
        cover_id = ?,
        condition_id = ?,
        format = COALESCE(?, format),
        cover_price = ?,
        current_value = ?,
        value_date = ?,
        purchase_date = ?,
        purchase_source = ?,
        location_id = ?,
        grade = ?,
        certification_number = ?,
        file_path = ?,
        notes = ?
       WHERE copy_id = ? AND deleted_at IS NULL`, [
            cover_id ?? null,
            condition_id ?? null,
            format,
            cover_price ?? null,
            current_value ?? null,
            value_date ?? null,
            purchase_date ?? null,
            purchase_source ?? null,
            location_id ?? null,
            grade ?? null,
            certification_number ?? null,
            file_path ?? null,
            notes ?? null,
            id
        ]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Copy not found' });
            return;
        }
        res.json({ message: 'Copy updated successfully' });
    }
    catch (err) {
        console.error('Error updating copy:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// DELETE /api/copies/:id - Soft delete a copy
router.delete('/api/copies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await (0, db_1.execute)('UPDATE copy SET deleted_at = NOW() WHERE copy_id = ? AND deleted_at IS NULL', [id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Copy not found' });
            return;
        }
        res.json({ message: 'Copy deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting copy:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/copies/:id/value-history - Get value history for a copy
router.get('/api/copies/:id/value-history', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const results = await (0, db_1.query)(`SELECT * FROM value_history 
       WHERE entity_type = 'copy' AND entity_id = ?
       ORDER BY recorded_at DESC`, [id]);
        res.json({ results });
    }
    catch (err) {
        console.error('Error fetching value history:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
exports.default = router;
//# sourceMappingURL=copies.js.map