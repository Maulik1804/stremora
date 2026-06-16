"use strict";

const { Router } = require("express");
const { body, param, query } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");

const {
  getComments,
  getReplies,
  createComment,
  deleteComment,
  getTimestampComments,
} = require("../controllers/comment.controller");
const verifyJWT = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const cachePublicRead = require("../middlewares/responseCache.middleware");

const router = Router();

const validId = param("id").isMongoId().withMessage("Invalid id");

// Feature 1: timestamp comments — must be before /:id routes
router.get(
  "/timestamps",
  cachePublicRead({ ttlSeconds: 30 }),
  asyncHandler(getTimestampComments),
);

router.get("/", cachePublicRead({ ttlSeconds: 30 }), getComments);
router.get(
  "/:id/replies",
  [validId],
  validate,
  cachePublicRead({ ttlSeconds: 30 }),
  getReplies,
);

router.post(
  "/",
  verifyJWT,
  [
    body("videoId").isMongoId().withMessage("Invalid videoId"),
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Comment text is required")
      .isLength({ max: 1000 })
      .withMessage("Max 1000 characters"),
    body("timestamp")
      .optional()
      .isNumeric()
      .withMessage("timestamp must be a number"),
  ],
  validate,
  createComment,
);

router.delete("/:id", verifyJWT, [validId], validate, deleteComment);

module.exports = router;
