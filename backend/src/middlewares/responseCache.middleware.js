"use strict";

const NodeCache = require("node-cache");

const cacheStore = new NodeCache({
  stdTTL: 0,
  checkperiod: 120,
  useClones: false,
  maxKeys: 2000,
});

const buildCacheKey = (req, prefix = "") => `${prefix}${req.originalUrl}`;

const responseCache = ({ ttlSeconds = 60, keyPrefix = "" } = {}) => {
  return (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.user?._id) return next();

    const cacheKey = buildCacheKey(req, keyPrefix);
    const cached = cacheStore.get(cacheKey);

    if (cached) {
      res.set(cached.headers);
      res.set("X-Response-Cache", "HIT");
      return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.set(
      "Cache-Control",
      `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds * 5}, stale-while-revalidate=${ttlSeconds}`,
    );
    res.set("X-Response-Cache", "MISS");

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(
          cacheKey,
          {
            status: res.statusCode,
            headers: {
              "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds * 5}, stale-while-revalidate=${ttlSeconds}`,
              "X-Response-Cache": "HIT",
              Vary: "Accept-Encoding, Origin",
            },
            body,
          },
          ttlSeconds,
        );
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = responseCache;
