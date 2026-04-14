'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const {
  toggleSubscription,
  getMySubscriptions,
  updateNotificationPreference,
  getSubscriberCount,
} = require('../controllers/subscription.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.get('/me', verifyJWT, getMySubscriptions);
router.get('/channel/:channelId', getSubscriberCount);

router.post('/:channelId', verifyJWT, toggleSubscription);

router.patch(
  '/:channelId/notifications',
  verifyJWT,
  [body('preference').isIn(['all', 'personalized', 'none']).withMessage('Invalid preference')],
  validate,
  updateNotificationPreference
);

module.exports = router;
