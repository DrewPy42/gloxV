"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../controllers/db");
const router = (0, express_1.Router)();
// GET /api/copies - List copies with filters
router.get('/api/copies', async (req, res) => {
    try {
        const baseQuery = `
      SELECT 
        c.*,
        cc.condition_code,
        cc.condition_text,
        cv.cover_type,
        cv.cover_description,
        cv.cover_image_path,
        l.location_name,
        l.storage_type,
        l.divider,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        s.title as series_title,
        s.series_id,
        v.volume_number
      FROM copy c
      JOIN issue i ON c.issue_id = i.issue_id
      JOIN series s ON i.series_id = s.series_id
      LEFT JOIN volume v ON i.volume_id = v.volume_id
      LEFT JOIN condition_code cc ON c.condition_id = cc.condition_id
      LEFT JOIN cover cv ON c.cover_id = cv.cover_id
      LEFT JOIN location l ON c.location_id = l.location_id
      WHERE c.deleted_at IS NULL
    `;
        const id = req.query.id;
        const issueId = req.query.issue_id;
        const seriesId = req.query.series_id;
        const locationId = req.query.location_id;
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
            if (locationId) {
                queryString += ' AND c.location_id = ?';
                params.push(parseInt(locationId));
            }
            if (format) {
                queryString += ' AND c.format = ?';
                params.push(format);
            }
        }
        // Add pagination if no specific ID
        if (!id) {
            const limit = parseInt(req.query.limit) || 25;
            const page = parseInt(req.query.page) || 1;
            const offset = (page - 1) * limit;
            queryString += ` ORDER BY s.title, i.sort_order LIMIT ${limit} OFFSET ${offset}`;
        }
        const results = await (0, db_1.query)(queryString, params);
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM copy c JOIN issue i ON c.issue_id = i.issue_id WHERE c.deleted_at IS NULL';
        const countParams = [];
        if (issueId) {
            countQuery += ' AND c.issue_id = ?';
            countParams.push(parseInt(issueId));
        }
        if (seriesId) {
            countQuery += ' AND i.series_id = ?';
            countParams.push(parseInt(seriesId));
        }
        if (locationId) {
            countQuery += ' AND c.location_id = ?';
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
// GET /api/copies/:id - Get single copy with full details
router.get('/api/copies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const copyQuery = `
      SELECT 
        c.*,
        cc.condition_code,
        cc.condition_text,
        cv.cover_type,
        cv.cover_description,
        cv.cover_image_path,
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
        const { issue_id, cover_id, condition_id, format, purchase_price, current_value, value_date, purchase_date, purchase_source, location_id, grade, certification_number, file_path, notes } = req.body;
        if (!issue_id) {
            res.status(400).json({ error: 'issue_id is required' });
            return;
        }
        const result = await (0, db_1.execute)(`INSERT INTO copy (issue_id, cover_id, condition_id, format, purchase_price,
        current_value, value_date, purchase_date, purchase_source, location_id,
        grade, certification_number, file_path, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            issue_id,
            cover_id || null,
            condition_id || null,
            format || 'floppy',
            purchase_price || null,
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
// PUT /api/copies/:id - Update a copy
router.put('/api/copies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { cover_id, condition_id, format, purchase_price, current_value, value_date, purchase_date, purchase_source, location_id, grade, certification_number, file_path, notes, track_value_change } = req.body;
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
        purchase_price = ?,
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
            purchase_price ?? null,
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