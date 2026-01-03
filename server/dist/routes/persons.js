"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../controllers/db");
const router = (0, express_1.Router)();
// GET /api/persons - List all persons (creators)
router.get('/api/persons', async (req, res) => {
    try {
        const search = req.query.search;
        let queryString = `
      SELECT 
        p.*,
        COUNT(ic.issue_credit_id) as credit_count
      FROM person p
      LEFT JOIN issue_credit ic ON p.person_id = ic.person_id
      WHERE p.deleted_at IS NULL
    `;
        const params = [];
        if (search) {
            queryString += ` AND (p.first_name LIKE ? OR p.last_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        queryString += ' GROUP BY p.person_id ORDER BY p.last_name, p.first_name';
        const limit = parseInt(req.query.limit) || 25;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        queryString += ` LIMIT ${limit} OFFSET ${offset}`;
        const results = await (0, db_1.query)(queryString, params);
        let countQuery = 'SELECT COUNT(*) as total FROM person WHERE deleted_at IS NULL';
        const countParams = [];
        if (search) {
            countQuery += ` AND (first_name LIKE ? OR last_name LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        const count = await (0, db_1.query)(countQuery, countParams);
        res.json({ results, count });
    }
    catch (err) {
        console.error('Error fetching persons:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/persons/:id - Get single person with credits
router.get('/api/persons/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Get person details
        const personResults = await (0, db_1.query)('SELECT * FROM person WHERE person_id = ? AND deleted_at IS NULL', [id]);
        if (personResults.length === 0) {
            res.status(404).json({ error: 'Person not found' });
            return;
        }
        // Get aliases
        const aliases = await (0, db_1.query)('SELECT * FROM person_alias WHERE person_id = ? ORDER BY alias_name', [id]);
        // Get credit summary by job category
        const creditSummary = await (0, db_1.query)(`SELECT 
        jc.category_name,
        COUNT(*) as credit_count
       FROM issue_credit ic
       JOIN job_title jt ON ic.job_title_id = jt.job_title_id
       LEFT JOIN job_category jc ON jt.job_category_id = jc.job_category_id
       WHERE ic.person_id = ?
       GROUP BY jc.job_category_id
       ORDER BY credit_count DESC`, [id]);
        // Get recent credits
        const recentCredits = await (0, db_1.query)(`SELECT 
        ic.*,
        jt.job_title,
        i.issue_number,
        i.cover_date,
        s.title as series_title
       FROM issue_credit ic
       JOIN job_title jt ON ic.job_title_id = jt.job_title_id
       JOIN issue i ON ic.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE ic.person_id = ?
       ORDER BY i.cover_date DESC
       LIMIT 20`, [id]);
        res.json({
            person: personResults[0],
            aliases,
            credit_summary: creditSummary,
            recent_credits: recentCredits
        });
    }
    catch (err) {
        console.error('Error fetching person:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/persons - Create a new person
router.post('/api/persons', async (req, res) => {
    try {
        const { first_name, last_name, biography } = req.body;
        if (!last_name) {
            res.status(400).json({ error: 'last_name is required' });
            return;
        }
        const result = await (0, db_1.execute)('INSERT INTO person (first_name, last_name, biography) VALUES (?, ?, ?)', [first_name || null, last_name, biography || null]);
        res.status(201).json({
            person_id: result.insertId,
            message: 'Person created successfully'
        });
    }
    catch (err) {
        console.error('Error creating person:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// PUT /api/persons/:id - Update a person
router.put('/api/persons/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { first_name, last_name, biography } = req.body;
        const result = await (0, db_1.execute)(`UPDATE person SET 
        first_name = ?,
        last_name = COALESCE(?, last_name),
        biography = ?
       WHERE person_id = ? AND deleted_at IS NULL`, [first_name ?? null, last_name, biography ?? null, id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Person not found' });
            return;
        }
        res.json({ message: 'Person updated successfully' });
    }
    catch (err) {
        console.error('Error updating person:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// DELETE /api/persons/:id - Soft delete a person
router.delete('/api/persons/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await (0, db_1.execute)('UPDATE person SET deleted_at = NOW() WHERE person_id = ? AND deleted_at IS NULL', [id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Person not found' });
            return;
        }
        res.json({ message: 'Person deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting person:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/persons/:id/aliases - Add an alias
router.post('/api/persons/:id/aliases', async (req, res) => {
    try {
        const personId = parseInt(req.params.id);
        const { alias_name, alias_type, notes } = req.body;
        if (!alias_name) {
            res.status(400).json({ error: 'alias_name is required' });
            return;
        }
        const result = await (0, db_1.execute)('INSERT INTO person_alias (person_id, alias_name, alias_type, notes) VALUES (?, ?, ?, ?)', [personId, alias_name, alias_type || 'other', notes || null]);
        res.status(201).json({
            person_alias_id: result.insertId,
            message: 'Alias added successfully'
        });
    }
    catch (err) {
        console.error('Error adding alias:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// DELETE /api/persons/:id/aliases/:aliasId - Remove an alias
router.delete('/api/persons/:id/aliases/:aliasId', async (req, res) => {
    try {
        const personId = parseInt(req.params.id);
        const aliasId = parseInt(req.params.aliasId);
        const result = await (0, db_1.execute)('DELETE FROM person_alias WHERE person_alias_id = ? AND person_id = ?', [aliasId, personId]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Alias not found' });
            return;
        }
        res.json({ message: 'Alias removed successfully' });
    }
    catch (err) {
        console.error('Error removing alias:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/persons/:id/credits - Get all credits for a person
router.get('/api/persons/:id/credits', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const categoryId = req.query.category_id;
        let queryString = `
      SELECT 
        ic.*,
        jt.job_title,
        jc.category_name,
        i.issue_id,
        i.issue_number,
        i.issue_title,
        i.cover_date,
        s.series_id,
        s.title as series_title
       FROM issue_credit ic
       JOIN job_title jt ON ic.job_title_id = jt.job_title_id
       LEFT JOIN job_category jc ON jt.job_category_id = jc.job_category_id
       JOIN issue i ON ic.issue_id = i.issue_id
       JOIN series s ON i.series_id = s.series_id
       WHERE ic.person_id = ?
    `;
        const params = [id];
        if (categoryId) {
            queryString += ' AND jt.job_category_id = ?';
            params.push(parseInt(categoryId));
        }
        queryString += ' ORDER BY i.cover_date DESC, s.title, i.sort_order';
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        queryString += ` LIMIT ${limit} OFFSET ${offset}`;
        const results = await (0, db_1.query)(queryString, params);
        const count = await (0, db_1.query)('SELECT COUNT(*) as total FROM issue_credit WHERE person_id = ?', [id]);
        res.json({ results, count });
    }
    catch (err) {
        console.error('Error fetching person credits:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
exports.default = router;
//# sourceMappingURL=persons.js.map