const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { globalSearch } = require('../controllers/globalSearchController');

// Allow authenticated users; controller will filter results by role.
router.get('/', authenticate, globalSearch);

module.exports = router;
