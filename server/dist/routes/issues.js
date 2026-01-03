"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../controllers/db");
const router = (0, express_1.Router)();
// Helper function to calculate sort_order from issue_number
function calculateSortOrder(issueNumber) {
    // Direct numeric
    if (/^\d+$/.test(issueNumber)) {
        return parseInt(issueNumber) * 100;
    }
    // Fractions: "1/2" -> 50, "0.5" -> 50
    if (issueNumber === '1/2' || issueNumber === '0.5') {
        return 50;
    }
    // Negative: "-1" -> -100
    if (/^-\d+$/.test(issueNumber)) {
        return parseInt(issueNumber) * 100;
    }
    // Letter suffixes: "1A" -> 101, "1B" -> 102
    const letterMatch = issueNumber.match(/^(\d+)([A-Z])$/i);
    if (letterMatch) {
        const base = parseInt(letterMatch[1]) * 100;
        const offset = letterMatch[2].toUpperCase().charCodeAt(0) - 64;
        return base + offset;
    }
    // Zero issue
    if (issueNumber === '0') {
        return 0;
    }
    // Fallback: try to parse any leading number
    const numMatch = issueNumber.match(/^(\d+)/);
    if (numMatch) {
        return parseInt(numMatch[1]) * 100;
    }
    return 0;
}
// Helper to extract numeric portion
function extractNumeric(issueNumber) {
    const match = issueNumber.match(/^-?\d+/);
    return match ? parseInt(match[0]) : null;
}
// GET /api/issues - List issues with filters
router.get('/api/issues', async (req, res) => {
    try {
        const baseQuery = `
      SELECT 
        i.issue_id,
        i.series_id,
        i.volume_id,
        i.issue_number,
        i.issue_number_numeric,
        i.sort_order,
        i.issue_title,
        i.title_variant,
        i.cover_date,
        i.release_date,
        i.cover_price,
        i.page_count,
        i.notes,
        i.created_at,
        i.updated_at,
        s.title as series_title,
        v.volume_number
      FROM issue i
      JOIN series s ON i.series_id = s.series_id
      LEFT JOIN volume v ON i.volume_id = v.volume_id
      WHERE i.deleted_at IS NULL
    `;
        const id = req.query.id;
        const volumeId = req.query.volume_id;
        const seriesId = req.query.series_id;
        if (id) {
            const results = await (0, db_1.query)(`${baseQuery} AND i.issue_id = ?`, [parseInt(id)]);
            const count = await (0, db_1.query)('SELECT COUNT(*) as total FROM issue WHERE deleted_at IS NULL');
            res.json({ results, count });
        }
        else if (volumeId) {
            const results = await (0, db_1.query)(`${baseQuery} AND i.volume_id = ? ORDER BY i.sort_order`, [parseInt(volumeId)]);
            const count = await (0, db_1.query)('SELECT COUNT(*) as total FROM issue WHERE volume_id = ? AND deleted_at IS NULL', [parseInt(volumeId)]);
            res.json({ results, count });
        }
        else if (seriesId) {
            const results = await (0, db_1.query)(`${baseQuery} AND i.series_id = ? ORDER BY i.sort_order`, [parseInt(seriesId)]);
            const count = await (0, db_1.query)('SELECT COUNT(*) as total FROM issue WHERE series_id = ? AND deleted_at IS NULL', [parseInt(seriesId)]);
            res.json({ results, count });
        }
        else {
            const limit = parseInt(req.query.limit) || 25;
            const page = parseInt(req.query.page) || 1;
            const offset = (page - 1) * limit;
            const results = await (0, db_1.query)(`${baseQuery} ORDER BY s.title, i.sort_order LIMIT ${limit} OFFSET ${offset}`, []);
            const count = await (0, db_1.query)('SELECT COUNT(*) as total FROM issue WHERE deleted_at IS NULL');
            res.json({ results, count });
        }
    }
    catch (err) {
        console.error('Error fetching issues:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/issues/:id - Get single issue with details
router.get('/api/issues/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const issueQuery = `
      SELECT 
        i.*,
        s.title as series_title,
        v.volume_number,
        p.publisher_name
      FROM issue i
      JOIN series s ON i.series_id = s.series_id
      LEFT JOIN volume v ON i.volume_id = v.volume_id
      LEFT JOIN publisher p ON s.publisher_id = p.publisher_id
      WHERE i.issue_id = ? AND i.deleted_at IS NULL
    `;
        const results = await (0, db_1.query)(issueQuery, [id]);
        if (results.length === 0) {
            res.status(404).json({ error: 'Issue not found' });
            return;
        }
        res.json(results[0]);
    }
    catch (err) {
        console.error('Error fetching issue:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/issues/:id/copies - Get all copies of an issue
router.get('/api/issues/:id/copies', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const results = await (0, db_1.query)(`SELECT 
        c.*,
        cc.condition_code,
        cc.condition_text,
        cv.cover_type,
        cv.cover_description,
        l.location_name,
        l.storage_type
      FROM copy c
      LEFT JOIN condition_code cc ON c.condition_id = cc.condition_id
      LEFT JOIN cover cv ON c.cover_id = cv.cover_id
      LEFT JOIN location l ON c.location_id = l.location_id
      WHERE c.issue_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at`, [id]);
        res.json({ results });
    }
    catch (err) {
        console.error('Error fetching issue copies:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/issues/:id/storylines - Get storylines this issue belongs to
router.get('/api/issues/:id/storylines', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const results = await (0, db_1.query)(`SELECT 
        sl.*,
        si.part_number,
        si.part_label,
        si.reading_order
      FROM storyline_issue si
      JOIN storyline sl ON si.storyline_id = sl.storyline_id
      WHERE si.issue_id = ? AND sl.deleted_at IS NULL
      ORDER BY sl.storyline_name`, [id]);
        res.json({ results });
    }
    catch (err) {
        console.error('Error fetching issue storylines:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/issues - Create a new issue
router.post('/api/issues', async (req, res) => {
    try {
        const { series_id, volume_id, issue_number, issue_title, title_variant, cover_date, release_date, cover_price, page_count, notes, sort_order: customSortOrder } = req.body;
        if (!series_id || !issue_number) {
            res.status(400).json({ error: 'series_id and issue_number are required' });
            return;
        }
        const sortOrder = customSortOrder ?? calculateSortOrder(issue_number);
        const numericValue = extractNumeric(issue_number);
        const result = await (0, db_1.execute)(`INSERT INTO issue (series_id, volume_id, issue_number, issue_number_numeric, 
        sort_order, issue_title, title_variant, cover_date, release_date, 
        cover_price, page_count, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            series_id,
            volume_id || null,
            issue_number,
            numericValue,
            sortOrder,
            issue_title || null,
            title_variant || null,
            cover_date || null,
            release_date || null,
            cover_price || null,
            page_count || null,
            notes || null
        ]);
        res.status(201).json({
            issue_id: result.insertId,
            message: 'Issue created successfully'
        });
    }
    catch (err) {
        console.error('Error creating issue:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// PUT /api/issues/:id - Update an issue
router.put('/api/issues/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { volume_id, issue_number, issue_title, title_variant, cover_date, release_date, cover_price, page_count, notes, sort_order: customSortOrder } = req.body;
        // If issue_number is being updated, recalculate sort_order and numeric
        let sortOrder = customSortOrder;
        let numericValue = null;
        if (issue_number) {
            sortOrder = customSortOrder ?? calculateSortOrder(issue_number);
            numericValue = extractNumeric(issue_number);
        }
        const result = await (0, db_1.execute)(`UPDATE issue SET 
        volume_id = ?,
        issue_number = COALESCE(?, issue_number),
        issue_number_numeric = COALESCE(?, issue_number_numeric),
        sort_order = COALESCE(?, sort_order),
        issue_title = ?,
        title_variant = ?,
        cover_date = ?,
        release_date = ?,
        cover_price = ?,
        page_count = ?,
        notes = ?
       WHERE issue_id = ? AND deleted_at IS NULL`, [
            volume_id ?? null,
            issue_number,
            numericValue,
            sortOrder,
            issue_title ?? null,
            title_variant ?? null,
            cover_date ?? null,
            release_date ?? null,
            cover_price ?? null,
            page_count ?? null,
            notes ?? null,
            id
        ]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Issue not found' });
            return;
        }
        res.json({ message: 'Issue updated successfully' });
    }
    catch (err) {
        console.error('Error updating issue:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// DELETE /api/issues/:id - Soft delete an issue
router.delete('/api/issues/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await (0, db_1.execute)('UPDATE issue SET deleted_at = NOW() WHERE issue_id = ? AND deleted_at IS NULL', [id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Issue not found' });
            return;
        }
        res.json({ message: 'Issue deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting issue:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
exports.default = router;
//# sourceMappingURL=issues.js.map