const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getMyLoans,
  getMyOverdueLoans,
  getMyFees,
  getMyAlerts,
  getPaymentHistory,
  browseBooks,
  getBookDetails,
  getAvailableCopies,
} = require('../controllers/studentController');

router.use(authenticate, requireRole('student'));

router.get('/my-loans', getMyLoans);

router.get('/my-overdue-loans', getMyOverdueLoans);

router.get('/my-fees', getMyFees);

router.get('/my-alerts', getMyAlerts);

router.get('/payment-history', getPaymentHistory);

router.get('/books/:book_id/available-copies', getAvailableCopies);

router.get('/books/:book_id', getBookDetails);

router.get('/books', browseBooks);

module.exports = router;
