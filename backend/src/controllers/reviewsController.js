const pool = require('../config/db');

// Add a review
exports.addReview = async (req, res) => {
    const { book_id, rating, comment } = req.body;
    const user_id = req.user.user_id;

    try {
        const result = await pool.query(
            `INSERT INTO reviews (book_id, user_id, rating, comment) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (book_id, user_id) 
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
            [book_id, user_id, rating, comment]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get reviews for a book
exports.getBookReviews = async (req, res) => {
    const { bookId } = req.params;
    try {
        const reviews = await pool.query(
            `SELECT r.*, u.full_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.book_id = $1 
       ORDER BY r.created_at DESC`,
            [bookId]
        );

        // Get average stats
        const stats = await pool.query(
            `SELECT * FROM fn_calculate_book_rating($1)`,
            [bookId]
        );

        res.json({
            success: true,
            data: {
                reviews: reviews.rows,
                stats: stats.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
