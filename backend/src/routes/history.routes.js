'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const {
  recordHistory,
  getHistory,
  deleteHistoryEntry,
  clearHistory,
  toggleHistoryPause,
} = require('../controllers/history.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.use(verifyJWT); // all history routes require auth

router.get('/', getHistory);
router.post('/', [body('videoId').notEmpty().withMessage('videoId is required')], validate, recordHistory);
router.patch('/pause', toggleHistoryPause);
router.delete('/', clearHistory);
router.delete('/:videoId', deleteHistoryEntry);

module.exports = router;
