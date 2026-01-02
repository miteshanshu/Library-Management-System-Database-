const pool = require('../config/db');
const env = require('../config/env');

// Get all announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, u.full_name as author 
       FROM ${env.DB_SCHEMA}.announcements a 
       LEFT JOIN ${env.DB_SCHEMA}.users u ON a.created_by = u.user_id 
       WHERE a.is_active = TRUE 
       ORDER BY CASE WHEN priority = 'HIGH' THEN 1 WHEN priority = 'NORMAL' THEN 2 ELSE 3 END, created_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create announcement (Admin only)
exports.createAnnouncement = async (req, res) => {
    const { title, content, priority } = req.body;
    const created_by = req.user.user_id;

    try {
        const result = await pool.query(
            `INSERT INTO ${env.DB_SCHEMA}.announcements (title, content, priority, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
            [title, content, priority, created_by]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
