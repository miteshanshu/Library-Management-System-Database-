const searchService = require('../services/globalSearch.service');
const { sendSuccess } = require('../utils/response');
const { ValidationError } = require('../utils/error');

const globalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      throw new ValidationError('Query parameter "q" is required');
    }

    // optional pagination per-entity
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    // req.user provided by authenticate middleware (JWT)
    const viewer = req.user || { role: 'student' };

    const results = await searchService.searchAll(q, { limit, offset, role: viewer.role });

    sendSuccess(res, results, 'Search results retrieved', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  globalSearch,
};
