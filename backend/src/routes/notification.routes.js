'use strict';

const { Router } = require('express');
const { param } = require('express-validator');
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
} = require('../controllers/notification.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

const validId = param('id').isMongoId().withMessage('Invalid id');

router.use(verifyJWT);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', [validId], validate, markRead);
router.delete('/', clearAllNotifications);
router.delete('/:id', [validId], validate, deleteNotification);

module.exports = router;
