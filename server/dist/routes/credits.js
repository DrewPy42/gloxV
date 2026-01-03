"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../controllers/db");
const router = (0, express_1.Router)();
// GET /api/credits - List credits with filters
router.get('/api/credits', async (req, res) => {
    try {
        const baseQuery = `
      SELECT 
        ic.*,
        p.first_name,
        p.last_name,
        jt.job_title,
        jc.category_name as job_category,
        i.issue_number,
        i.issue_title,
        s.title as series_title,
        s.series_id
      FROM issue_credit ic
      JOIN person p ON ic.person_id = p.person_id
      JOIN job_title jt ON ic.job_title_id = jt.job_title_id
      LEFT JOIN job_category jc ON jt.job_category_id = jc.job_category_id
      JOIN issue i ON ic.issue_id = i.issue_id
      JOIN series s ON i.series_id = s.series_id
      WHERE 1=1
    `;
        const issueId = req.query.issue_id;
        const personId = req.query.person_id;
        const categoryId = req.query.category_id;
        let queryString = baseQuery;
        const params = [];
        if (issueId) {
            queryString += ' AND ic.issue_id = ?';
            params.push(parseInt(issueId));
        }
        if (personId) {
            queryString += ' AND ic.person_id = ?';
            params.push(parseInt(personId));
        }
        if (categoryId) {
            queryString += ' AND jt.job_category_id = ?';
            params.push(parseInt(categoryId));
        }
        queryString += ' ORDER BY s.title, i.sort_order, jc.category_name, jt.job_title';
        if (!issueId) {
            const limit = parseInt(req.query.limit) || 50;
            const page = parseInt(req.query.page) || 1;
            const offset = (page - 1) * limit;
            queryString += ` LIMIT ${limit} OFFSET ${offset}`;
        }
        const results = await (0, db_1.query)(queryString, params);
        const count = await (0, db_1.query)('SELECT COUNT(*) as total FROM issue_credit');
        res.json({ results, count });
    }
    catch (err) {
        console.error('Error fetching credits:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/credits/job-titles - List all job titles
router.get('/api/credits/job-titles', async (req, res) => {
    try {
        const results = await (0, db_1.query)(`SELECT jt.*, jc.category_name
       FROM job_title jt
       LEFT JOIN job_category jc ON jt.job_category_id = jc.job_category_id
       ORDER BY jc.category_name, jt.job_title`);
        res.json({ results });
    }
    catch (err) {
        console.error('Error fetching job titles:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// GET /api/credits/job-categories - List all job categories
router.get('/api/credits/job-categories', async (req, res) => {
    try {
        const results = await (0, db_1.query)(`SELECT jc.*, COUNT(jt.job_title_id) as title_count
       FROM job_category jc
       LEFT JOIN job_title jt ON jc.job_category_id = jt.job_category_id
       GROUP BY jc.job_category_id
       ORDER BY jc.category_name`);
        res.json({ results });
    }
    catch (err) {
        console.error('Error fetching job categories:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/credits - Create a new credit
router.post('/api/credits', async (req, res) => {
    try {
        const { issue_id, person_id, job_title_id, notes } = req.body;
        if (!issue_id || !person_id || !job_title_id) {
            res.status(400).json({ error: 'issue_id, person_id, and job_title_id are required' });
            return;
        }
        const result = await (0, db_1.execute)('INSERT INTO issue_credit (issue_id, person_id, job_title_id, notes) VALUES (?, ?, ?, ?)', [issue_id, person_id, job_title_id, notes || null]);
        res.status(201).json({
            issue_credit_id: result.insertId,
            message: 'Credit created successfully'
        });
    }
    catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'This credit already exists' });
            return;
        }
        console.error('Error creating credit:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// DELETE /api/credits/:id - Delete a credit
router.delete('/api/credits/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await (0, db_1.execute)('DELETE FROM issue_credit WHERE issue_credit_id = ?', [id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Credit not found' });
            return;
        }
        res.json({ message: 'Credit deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting credit:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/credits/job-titles - Create a new job title
router.post('/api/credits/job-titles', async (req, res) => {
    try {
        const { job_title, job_category_id } = req.body;
        if (!job_title) {
            res.status(400).json({ error: 'job_title is required' });
            return;
        }
        const result = await (0, db_1.execute)('INSERT INTO job_title (job_title, job_category_id) VALUES (?, ?)', [job_title, job_category_id || null]);
        res.status(201).json({
            job_title_id: result.insertId,
            message: 'Job title created successfully'
        });
    }
    catch (err) {
        console.error('Error creating job title:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
// POST /api/credits/job-categories - Create a new job category
router.post('/api/credits/job-categories', async (req, res) => {
    try {
        const { category_name } = req.body;
        if (!category_name) {
            res.status(400).json({ error: 'category_name is required' });
            return;
        }
        const result = await (0, db_1.execute)('INSERT INTO job_category (category_name) VALUES (?)', [category_name]);
        res.status(201).json({
            job_category_id: result.insertId,
            message: 'Job category created successfully'
        });
    }
    catch (err) {
        console.error('Error creating job category:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});
exports.default = router;
//# sourceMappingURL=credits.js.map