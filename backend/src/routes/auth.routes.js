const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { login, registerStudent, getCurrentUser } = require('../controllers/authController');

router.post('/login', login);

router.post('/register', registerStudent);

router.get('/me', authenticate, getCurrentUser);

module.exports = router;
