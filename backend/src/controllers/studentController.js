const pool = require('../config/db');
const env = require('../config/env');
const { sendSuccess } = require('../utils/response');
const { NotFoundError } = require('../utils/error');

const getMyLoans = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT l.*, b.title, bc.barcode FROM ${env.DB_SCHEMA}.loans l JOIN ${env.DB_SCHEMA}.book_copies bc ON l.copy_id = bc.copy_id JOIN ${env.DB_SCHEMA}.books b ON bc.book_id = b.book_id WHERE l.member_id = (SELECT member_id FROM ${env.DB_SCHEMA}.members WHERE email = $1) ORDER BY l.checkout_date DESC`,
      [req.user.email]
    );

    sendSuccess(res, result.rows, 'Your loans retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getMyOverdueLoans = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT l.*, b.title, bc.barcode FROM ${env.DB_SCHEMA}.loans l JOIN ${env.DB_SCHEMA}.book_copies bc ON l.copy_id = bc.copy_id JOIN ${env.DB_SCHEMA}.books b ON bc.book_id = b.book_id WHERE l.member_id = (SELECT member_id FROM ${env.DB_SCHEMA}.members WHERE email = $1) AND l.status = $2 ORDER BY l.due_date ASC`,
      [req.user.email, 'OVERDUE']
    );

    sendSuccess(res, result.rows, 'Your overdue loans retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getMyFees = async (req, res, next) => {
  try {
    const memberResult = await pool.query(
      `SELECT member_id FROM ${env.DB_SCHEMA}.members WHERE email = $1`,
      [req.user.email]
    );

    if (memberResult.rows.length === 0) {
      return next(new NotFoundError('Member profile not found'));
    }

    const member_id = memberResult.rows[0].member_id;

    const result = await pool.query(
      `SELECT * FROM ${env.DB_SCHEMA}.loan_fees WHERE member_id = $1 ORDER BY assessed_date DESC`,
      [member_id]
    );

    const summary = {
      total_fees: result.rows.reduce((sum, fee) => sum + parseFloat(fee.amount), 0),
      unpaid_fees: result.rows
        .filter((fee) => fee.status === 'UNPAID')
        .reduce((sum, fee) => sum + parseFloat(fee.amount), 0),
      fees: result.rows,
    };

    sendSuccess(res, summary, 'Your fees retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getMyAlerts = async (req, res, next) => {
  try {
    const memberResult = await pool.query(
      `SELECT member_id FROM ${env.DB_SCHEMA}.members WHERE email = $1`,
      [req.user.email]
    );

    if (memberResult.rows.length === 0) {
      return next(new NotFoundError('Member profile not found'));
    }

    const member_id = memberResult.rows[0].member_id;

    const result = await pool.query(
      `SELECT * FROM ${env.DB_SCHEMA}.member_alerts WHERE member_id = $1 ORDER BY alert_date DESC`,
      [member_id]
    );

    sendSuccess(res, result.rows, 'Your alerts retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const memberResult = await pool.query(
      `SELECT member_id FROM ${env.DB_SCHEMA}.members WHERE email = $1`,
      [req.user.email]
    );

    if (memberResult.rows.length === 0) {
      return next(new NotFoundError('Member profile not found'));
    }

    const member_id = memberResult.rows[0].member_id;

    const result = await pool.query(
      `SELECT fp.*, lf.fee_type, lf.amount FROM ${env.DB_SCHEMA}.fee_payments fp JOIN ${env.DB_SCHEMA}.loan_fees lf ON fp.fee_id = lf.fee_id WHERE lf.member_id = $1 ORDER BY fp.payment_date DESC`,
      [member_id]
    );

    sendSuccess(res, result.rows, 'Payment history retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const browseBooks = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, search, genre_id, author_id } = req.query;

    let query = `SELECT DISTINCT b.*, p.publisher_name FROM ${env.DB_SCHEMA}.books b LEFT JOIN ${env.DB_SCHEMA}.publishers p ON b.publisher_id = p.publisher_id`;
    const params = [];
    let paramIndex = 1;

    if (genre_id) {
      query += ` JOIN ${env.DB_SCHEMA}.book_genres bg ON b.book_id = bg.book_id`;
    }

    if (author_id) {
      query += ` JOIN ${env.DB_SCHEMA}.book_authors ba ON b.book_id = ba.book_id`;
    }

    query += ' WHERE 1=1';

    if (search) {
      query += ` AND (b.title ILIKE $${paramIndex} OR b.isbn ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (genre_id) {
      query += ` AND bg.genre_id = $${paramIndex}`;
      params.push(genre_id);
      paramIndex++;
    }

    if (author_id) {
      query += ` AND ba.author_id = $${paramIndex}`;
      params.push(author_id);
      paramIndex++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(query, params);

    sendSuccess(res, result.rows, 'Books retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getBookDetails = async (req, res, next) => {
  try {
    const { book_id } = req.params;

    const bookResult = await pool.query(
      `SELECT b.*, p.publisher_name FROM ${env.DB_SCHEMA}.books b LEFT JOIN ${env.DB_SCHEMA}.publishers p ON b.publisher_id = p.publisher_id WHERE b.book_id = $1`,
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      return next(new NotFoundError('Book not found'));
    }

    const authorsResult = await pool.query(
      `SELECT a.* FROM ${env.DB_SCHEMA}.authors a JOIN ${env.DB_SCHEMA}.book_authors ba ON a.author_id = ba.author_id WHERE ba.book_id = $1 ORDER BY ba.is_primary DESC`,
      [book_id]
    );

    const genresResult = await pool.query(
      `SELECT g.* FROM ${env.DB_SCHEMA}.genres g JOIN ${env.DB_SCHEMA}.book_genres bg ON g.genre_id = bg.genre_id WHERE bg.book_id = $1`,
      [book_id]
    );

    const copiesResult = await pool.query(
      `SELECT bc.copy_id, bc.status, l.location_name FROM ${env.DB_SCHEMA}.book_copies bc LEFT JOIN ${env.DB_SCHEMA}.library_locations l ON bc.location_id = l.location_id WHERE bc.book_id = $1`,
      [book_id]
    );

    const book = bookResult.rows[0];
    book.authors = authorsResult.rows;
    book.genres = genresResult.rows;
    book.copies = copiesResult.rows;

    sendSuccess(res, book, 'Book details retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getAvailableCopies = async (req, res, next) => {
  try {
    const { book_id } = req.params;

    const result = await pool.query(
      `SELECT bc.*, l.location_name FROM ${env.DB_SCHEMA}.book_copies bc LEFT JOIN ${env.DB_SCHEMA}.library_locations l ON bc.location_id = l.location_id WHERE bc.book_id = $1 AND bc.status = $2`,
      [book_id, 'AVAILABLE']
    );

    sendSuccess(res, result.rows, 'Available copies retrieved', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyLoans,
  getMyOverdueLoans,
  getMyFees,
  getMyAlerts,
  getPaymentHistory,
  browseBooks,
  getBookDetails,
  getAvailableCopies,
};
