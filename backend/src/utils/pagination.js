'use strict';

const mongoose = require('mongoose');

const PAGE_SIZE = 20;

/**
 * Build a cursor-based pagination query.
 * @param {string|undefined} cursor - Last document _id from previous page
 * @returns {object} Mongoose query filter fragment
 */
const cursorFilter = (cursor) => {
  if (!cursor || !mongoose.Types.ObjectId.isValid(cursor)) return {};
  return { _id: { $lt: new mongoose.Types.ObjectId(cursor) } };
};

/**
 * Build a pagination response envelope.
 * @param {Array} docs - Result documents
 * @param {number} limit - Page size used
 * @returns {{ items, nextCursor, hasMore }}
 */
const paginateResult = (docs, limit = PAGE_SIZE) => {
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;
  return { items, nextCursor, hasMore };
};

module.exports = { PAGE_SIZE, cursorFilter, paginateResult };
