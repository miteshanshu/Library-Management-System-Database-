const pool = require('../config/db');

// Create reservation
exports.createReservation = async (req, res) => {
    const { book_id } = req.body;
    const user_id = req.user.user_id;

    try {
        // Get member_id from user_id (assuming simple 1-to-1 for students)
        const memberRes = await pool.query('SELECT member_id FROM members WHERE email = $1', [req.user.email]);
        if (memberRes.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
        const member_id = memberRes.rows[0].member_id;

        // Check if copy available (if so, why reserve? maybe hold for pickup)
        // For now simple insert
        const result = await pool.query(
            `INSERT INTO reservations (book_id, member_id) VALUES ($1, $2) RETURNING *`,
            [book_id, member_id]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get my reservations
exports.getMyReservations = async (req, res) => {
    const user_id = req.user.user_id;
    try {
        const memberRes = await pool.query('SELECT member_id FROM members WHERE email = $1', [req.user.email]);
        if (memberRes.rows.length === 0) return res.json({ success: true, data: [] });
        const member_id = memberRes.rows[0].member_id;

        const result = await pool.query(
            `SELECT r.*, b.title, b.isbn 
       FROM reservations r 
       JOIN books b ON r.book_id = b.book_id 
       WHERE r.member_id = $1 
       ORDER BY r.reserved_at DESC`,
            [member_id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE reservations SET status = 'CANCELLED' WHERE reservation_id = $1`,
            [id]
        );
        res.json({ success: true, message: 'Reservation cancelled' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all reservations (for librarian/admin)
exports.getAllReservations = async (req, res) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT r.*, 
                   b.title, b.isbn,
                   m.first_name, m.last_name, m.email, m.card_number
            FROM reservations r 
            JOIN books b ON r.book_id = b.book_id 
            JOIN members m ON r.member_id = m.member_id
        `;

        const params = [];

        if (status) {
            query += ` WHERE r.status = $1`;
            params.push(status);
        }

        query += ` ORDER BY r.reserved_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Fulfill reservation (mark as FULFILLED when book is ready)
exports.fulfillReservation = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE reservations SET status = 'FULFILLED', expiry_at = NOW() + INTERVAL '3 days' 
             WHERE reservation_id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }

        res.json({ success: true, data: result.rows[0], message: 'Reservation fulfilled - member has 3 days to collect' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

