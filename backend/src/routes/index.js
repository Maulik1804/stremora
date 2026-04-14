'use strict';

const { Router } = require('express');

const authRouter = require('./auth.routes');
const userRouter = require('./user.routes');
const videoRouter = require('./video.routes');
const commentRouter = require('./comment.routes');
const likeRouter = require('./like.routes');
const subscriptionRouter = require('./subscription.routes');
const playlistRouter = require('./playlist.routes');
const historyRouter = require('./history.routes');
const featuresRouter = require('./features.routes');
const notificationRouter = require('./notification.routes');
const goalRouter = require('./goal.routes');

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/videos', videoRouter);
router.use('/comments', commentRouter);
router.use('/likes', likeRouter);
router.use('/subscriptions', subscriptionRouter);
router.use('/playlists', playlistRouter);
router.use('/history', historyRouter);
router.use('/features', featuresRouter);
router.use('/notifications', notificationRouter);
router.use('/goals', goalRouter);

module.exports = router;
