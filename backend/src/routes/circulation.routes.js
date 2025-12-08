const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  checkoutBook,
  issueBook,
  returnBook,
  getLoanDetails,
  getLoansByMember,
  getLoansByCopy,
  getActiveLoansByMember,
} = require('../controllers/circulationController');

router.use(authenticate, requireRole('admin', 'librarian'));

router.post('/checkout', checkoutBook);

router.post('/issue', issueBook);

router.post('/return', returnBook);

router.get('/loans/:loan_id', getLoanDetails);

router.get('/member/:member_id/active-loans', getActiveLoansByMember);

router.get('/member/:member_id/loans', getLoansByMember);

router.get('/copy/:copy_id/history', getLoansByCopy);

module.exports = router;
