const pool = require('../config/db');
const env = require('../config/env');
const { ValidationError } = require('../utils/error');

// Get My Wishlist
exports.getWishlist = async (req, res, next) => {
    try {
        const userId = req.user.user_id;

        const result = await pool.query(
            `SELECT w.wishlist_id, w.added_at, b.book_id, b.title, b.isbn, b.publication_year,
                    p.publisher_name,
                    (SELECT COALESCE(AVG(rating), 0) FROM ${env.DB_SCHEMA}.reviews r WHERE r.book_id = b.book_id) as avg_rating,
                    (SELECT COUNT(*) FROM ${env.DB_SCHEMA}.reviews r WHERE r.book_id = b.book_id) as review_count
             FROM ${env.DB_SCHEMA}.wishlist w
             JOIN ${env.DB_SCHEMA}.books b ON w.book_id = b.book_id
             LEFT JOIN ${env.DB_SCHEMA}.publishers p ON b.publisher_id = p.publisher_id
             WHERE w.user_id = $1
             ORDER BY w.added_at DESC`,
            [userId]
        );

        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

// Add to Wishlist
exports.addToWishlist = async (req, res, next) => {
    const { book_id } = req.body;
    const userId = req.user.user_id;

    if (!book_id) {
        return next(new ValidationError('Book ID is required'));
    }

    try {
        const result = await pool.query(
            `INSERT INTO ${env.DB_SCHEMA}.wishlist (user_id, book_id) VALUES ($1, $2) RETURNING *`,
            [userId, book_id]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            return res.status(409).json({ success: false, message: 'Book already in wishlist' });
        }
        next(err);
    }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
    const { bookId } = req.params;
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            `DELETE FROM ${env.DB_SCHEMA}.wishlist WHERE user_id = $1 AND book_id = $2 RETURNING *`,
            [userId, bookId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
        }

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (err) {
        next(err);
    }
};
