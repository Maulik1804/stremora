'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const {
  createGoal,
  getUserGoals,
  getActiveGoal,
  updateGoal,
  completeGoal,
  deleteGoal,
} = require('../controllers/goal.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.use(verifyJWT);

router.get('/', getUserGoals);
router.get('/active', getActiveGoal);

router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
  body('targetVideos').isInt({ min: 1 }).withMessage('targetVideos must be at least 1'),
  body('endDate').notEmpty().withMessage('endDate is required'),
], validate, createGoal);

router.patch('/:id', updateGoal);
router.patch('/:id/complete', completeGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
