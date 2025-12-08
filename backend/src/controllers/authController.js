const pool = require('../config/db');
const env = require('../config/env');
const { generateToken } = require('../middleware/auth');
const { sendSuccess } = require('../utils/response');
const { ValidationError, AuthenticationError } = require('../utils/error');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError('Email and password are required'));
    }

    const result = await pool.query(
      `SELECT * FROM ${env.DB_SCHEMA}.fn_verify_user_credentials($1, $2)`,
      [email, password]
    );

    if (result.rows.length === 0) {
      return next(new AuthenticationError('Invalid credentials'));
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return next(new AuthenticationError('User account is inactive'));
    }

    const token = generateToken(user);

    sendSuccess(
      res,
      {
        token,
        user: {
          user_id: user.user_id,
          email,
          role: user.role,
          full_name: user.full_name,
        },
      },
      'Login successful',
      200
    );
  } catch (err) {
    next(err);
  }
};

const registerStudent = async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return next(new ValidationError('Full name, email, and password are required'));
    }

    if (password.length < 6) {
      return next(new ValidationError('Password must be at least 6 characters'));
    }

    const result = await pool.query(
      `SELECT * FROM ${env.DB_SCHEMA}.fn_register_student_user($1, $2, $3)`,
      [full_name, email, password]
    );

    if (result.rows.length === 0) {
      return next(new ValidationError('Registration failed'));
    }

    const registration = result.rows[0];

    const userResult = await pool.query(
      `SELECT user_id, email, role, full_name FROM ${env.DB_SCHEMA}.users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return next(new ValidationError('User creation failed'));
    }

    const user = userResult.rows[0];
    const token = generateToken(user);

    sendSuccess(
      res,
      {
        token,
        user: {
          user_id: registration.new_user_id,
          email,
          role: 'student',
          full_name,
          member_id: registration.new_member_id,
          card_number: registration.new_card_number,
        },
      },
      'Student registration successful',
      201
    );
  } catch (err) {
    if (err.message.includes('already registered') || err.message.includes('Email already')) {
      return next(new ValidationError('Email already registered'));
    }
    next(err);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT user_id, email, role, full_name, is_active FROM ${env.DB_SCHEMA}.users WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return next(new ValidationError('User not found'));
    }

    sendSuccess(res, result.rows[0], 'Current user retrieved', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  registerStudent,
  getCurrentUser,
};
