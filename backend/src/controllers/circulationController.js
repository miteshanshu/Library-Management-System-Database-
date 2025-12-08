const pool = require('../config/db');
const env = require('../config/env');
const { sendSuccess } = require('../utils/response');
const { ValidationError, NotFoundError } = require('../utils/error');

const checkoutBook = async (req, res, next) => {
  try {
    const { barcode, member_id } = req.body;

    if (!barcode || !member_id) {
      return next(new ValidationError('Barcode and member ID are required'));
    }

    await pool.query(
      `CALL ${env.DB_SCHEMA}.sp_checkout_book($1, $2)`,
      [member_id, barcode]
    );

    sendSuccess(res, { message: 'Book checked out successfully' }, 'Checkout successful', 201);
  } catch (err) {
    if (err.message.includes('already loaned') || err.message.includes('not available') || err.message.includes('Copy')) {
      return next(new ValidationError(err.message));
    }
    next(err);
  }
};

const issueBook = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { barcode, member_id } = req.body;

    if (!barcode || !member_id) {
      return next(new ValidationError('Barcode and member ID are required'));
    }

    await client.query('BEGIN');

    const memberCheck = await client.query(
      `SELECT m.member_id, m.first_name, m.last_name, m.email, m.status, 
              mt.loan_limit, mt.loan_period_days 
       FROM ${env.DB_SCHEMA}.members m
       JOIN ${env.DB_SCHEMA}.membership_types mt ON m.membership_type_id = mt.membership_type_id
       WHERE m.member_id = $1`,
      [member_id]
    );

    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new NotFoundError(`Member with ID ${member_id} not found`));
    }

    const member = memberCheck.rows[0];

    if (member.status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return next(new ValidationError(`Member account is ${member.status}. Cannot issue book`));
    }

    const copyCheck = await client.query(
      `SELECT bc.copy_id, bc.book_id, bc.status, bc.barcode, b.title, b.isbn, l.location_name
       FROM ${env.DB_SCHEMA}.book_copies bc
       JOIN ${env.DB_SCHEMA}.books b ON bc.book_id = b.book_id
       LEFT JOIN ${env.DB_SCHEMA}.library_locations l ON bc.location_id = l.location_id
       WHERE bc.barcode = $1`,
      [barcode]
    );

    if (copyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new NotFoundError(`Book copy with barcode ${barcode} not found`));
    }

    const copy = copyCheck.rows[0];

    if (copy.status !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return next(new ValidationError(`Book copy is ${copy.status}. Current status: ${copy.status}. Expected: AVAILABLE`));
    }

    const activeLoanCount = await client.query(
      `SELECT COUNT(*) as loan_count FROM ${env.DB_SCHEMA}.loans
       WHERE member_id = $1 AND status IN ('ACTIVE', 'OVERDUE')`,
      [member_id]
    );

    const currentLoans = parseInt(activeLoanCount.rows[0].loan_count);

    if (currentLoans >= member.loan_limit) {
      await client.query('ROLLBACK');
      return next(new ValidationError(
        `Member has reached loan limit. Active loans: ${currentLoans}/${member.loan_limit}`
      ));
    }

    const unpaidFees = await client.query(
      `SELECT SUM(amount) as total_unpaid FROM ${env.DB_SCHEMA}.loan_fees
       WHERE member_id = $1 AND status = 'UNPAID'`,
      [member_id]
    );

    const totalUnpaid = parseFloat(unpaidFees.rows[0]?.total_unpaid || 0);

    if (totalUnpaid > 0) {
      await client.query('ROLLBACK');
      return next(new ValidationError(
        `Member has unpaid fees: ${totalUnpaid}. Please pay before issuing new book`
      ));
    }

    const checkoutDate = new Date();
    const dueDate = new Date(checkoutDate.getTime() + member.loan_period_days * 24 * 60 * 60 * 1000);

    const loanResult = await client.query(
      `INSERT INTO ${env.DB_SCHEMA}.loans (member_id, copy_id, checkout_date, due_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING loan_id, member_id, copy_id, checkout_date, due_date, status`,
      [member_id, copy.copy_id, checkoutDate, dueDate, 'ACTIVE']
    );

    const updateCopyStatus = await client.query(
      `UPDATE ${env.DB_SCHEMA}.book_copies SET status = $1 WHERE copy_id = $2`,
      ['LOANED', copy.copy_id]
    );

    if (updateCopyStatus.rowCount === 0) {
      await client.query('ROLLBACK');
      return next(new ValidationError('Failed to update book copy status'));
    }

    await client.query('COMMIT');

    const response = {
      loan_id: loanResult.rows[0].loan_id,
      member: {
        member_id: member.member_id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email
      },
      book: {
        title: copy.title,
        isbn: copy.isbn,
        barcode: copy.barcode,
        location: copy.location_name || 'Not specified'
      },
      checkout_date: loanResult.rows[0].checkout_date,
      due_date: loanResult.rows[0].due_date,
      loan_period_days: member.loan_period_days,
      status: loanResult.rows[0].status
    };

    sendSuccess(res, response, `Book "${copy.title}" issued successfully to ${member.first_name} ${member.last_name}`, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Issue Book Error:', err);
    next(err);
  } finally {
    client.release();
  }
};

const returnBook = async (req, res, next) => {
  try {
    const { loan_id } = req.body;

    if (!loan_id) {
      return next(new ValidationError('Loan ID is required'));
    }

    await pool.query(
      `CALL ${env.DB_SCHEMA}.sp_return_book($1)`,
      [loan_id]
    );

    sendSuccess(res, { message: 'Book returned successfully' }, 'Return successful', 200);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('closed')) {
      return next(new ValidationError(err.message));
    }
    next(err);
  }
};

const getLoanDetails = async (req, res, next) => {
  try {
    const { loan_id } = req.params;

    const result = await pool.query(
      `SELECT l.*, b.title, b.isbn, m.card_number, m.first_name, m.last_name FROM ${env.DB_SCHEMA}.loans l JOIN ${env.DB_SCHEMA}.book_copies bc ON l.copy_id = bc.copy_id JOIN ${env.DB_SCHEMA}.books b ON bc.book_id = b.book_id JOIN ${env.DB_SCHEMA}.members m ON l.member_id = m.member_id WHERE l.loan_id = $1`,
      [loan_id]
    );

    if (result.rows.length === 0) {
      return next(new NotFoundError('Loan not found'));
    }

    sendSuccess(res, result.rows[0], 'Loan details retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getLoansByMember = async (req, res, next) => {
  try {
    const { member_id } = req.params;
    const { status } = req.query;

    let query = `SELECT l.*, b.title, b.isbn, bc.barcode FROM ${env.DB_SCHEMA}.loans l JOIN ${env.DB_SCHEMA}.book_copies bc ON l.copy_id = bc.copy_id JOIN ${env.DB_SCHEMA}.books b ON bc.book_id = b.book_id WHERE l.member_id = $1`;
    const params = [member_id];

    if (status) {
      query += ' AND l.status = $2';
      params.push(status);
    }

    query += ' ORDER BY l.checkout_date DESC';

    const result = await pool.query(query, params);

    sendSuccess(res, result.rows, 'Loans retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getLoansByCopy = async (req, res, next) => {
  try {
    const { copy_id } = req.params;

    const result = await pool.query(
      `SELECT l.*, m.card_number, m.first_name, m.last_name FROM ${env.DB_SCHEMA}.loans l JOIN ${env.DB_SCHEMA}.members m ON l.member_id = m.member_id WHERE l.copy_id = $1 ORDER BY l.checkout_date DESC`,
      [copy_id]
    );

    sendSuccess(res, result.rows, 'Copy history retrieved', 200);
  } catch (err) {
    next(err);
  }
};

const getActiveLoansByMember = async (req, res, next) => {
  try {
    const { member_id } = req.params;

    const result = await pool.query(
      `SELECT l.*, b.title, b.isbn, bc.barcode FROM ${env.DB_SCHEMA}.loans l JOIN ${env.DB_SCHEMA}.book_copies bc ON l.copy_id = bc.copy_id JOIN ${env.DB_SCHEMA}.books b ON bc.book_id = b.book_id WHERE l.member_id = $1 AND l.status IN ($2, $3) ORDER BY l.due_date`,
      [member_id, 'ACTIVE', 'OVERDUE']
    );

    sendSuccess(res, result.rows, 'Active loans retrieved', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkoutBook,
  issueBook,
  returnBook,
  getLoanDetails,
  getLoansByMember,
  getLoansByCopy,
  getActiveLoansByMember,
};
