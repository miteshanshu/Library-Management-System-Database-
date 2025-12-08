const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getOverdueReport,
  getCirculationReport,
  getInventorySummary,
  getMemberActivityReport,
  getDebtAgingReport,
  getTurnaroundMetrics,
  getDashboardSummary,
} = require('../controllers/reportsController');

router.use(authenticate, requireRole('admin'));

router.get('/overdue', getOverdueReport);

router.get('/circulation', getCirculationReport);

router.get('/inventory', getInventorySummary);

router.get('/member-activity', getMemberActivityReport);

router.get('/debt-aging', getDebtAgingReport);

router.get('/turnaround-metrics', getTurnaroundMetrics);

router.get('/dashboard-summary', getDashboardSummary);

module.exports = router;
