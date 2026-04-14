# Implementation Plan: Streamora Video Platform Backend — Phase 1

## Overview

This phase establishes the complete backend foundation: Express server, MongoDB Atlas connection, environment configuration, security middleware stack, JWT authentication with refresh token rotation, the User model, and all auth routes (register, login, logout, refresh). All code targets Node.js 20 LTS with CommonJS modules inside a `backend/` directory.

## Tasks

- [x] 1. Initialize project structure and package configuration
  - Create `backend/` directory with the folder structure defined in the design: `src/config`, `src/models`, `src/controllers`, `src/routes`, `src/middlewares`, `src/services`, `src/utils`, `tests/unit`, `tests/integration`, `tests/property`
  - Create `backend/package.json` with all required dependencies: `express`, `mongoose`, `jsonwebtoken`, `bcrypt`, `express-validator`, `express-rate-limit`, `helmet`, `cors`, `compression`, `express-mongo-sanitize`, `xss-clean`, `cookie-parser`, `dotenv`, `node-cache`
  - Add dev dependencies: `jest`, `supertest`, `mongodb-memory-server`, `fast-check`, `nodemon`
  - Configure Jest in `package.json` with `testEnvironment: node` and `--runInBand` for integration tests
  - Add npm scripts: `start`, `dev`, `test`, `test:unit`, `test:integration`, `test:property`
  - _Requirements: 17.2, 18.5, 18.6_

- [x] 2. Create environment configuration and utility foundations
  - [x] 2.1 Create `backend/.env.example` with all variables from the design document
    - Include sections: Server, MongoDB Atlas, JWT, Cloudinary, CORS, Rate Limiting, Email
    - _Requirements: 2.1, 2.5, 17.3, 18.5_
  - [x] 2.2 Create `backend/src/config/env.js` that loads and validates all required env vars
    - Use `dotenv` to load `.env`
    - Throw a descriptive error at startup if any required variable is missing
    - Export typed constants: `PORT`, `MONGODB_URI`, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `NODE_ENV`
    - _Requirements: 17.2_
  - [x] 2.3 Create utility files: `ApiError`, `ApiResponse`, `asyncHandler`, `constants`
    - `src/utils/ApiError.js`: custom error class with `statusCode`, `message`, `errors`, `success: false` as per design
    - `src/utils/ApiResponse.js`: standardized success wrapper with `statusCode`, `data`, `message`, `success: true`
    - `src/utils/asyncHandler.js`: `Promise.resolve(fn(req, res, next)).catch(next)` wrapper
    - `src/utils/constants.js`: enums for `VIDEO_VISIBILITY`, `VIDEO_STATUS`, `NOTIFICATION_TYPES`, `USER_ROLES`
    - _Requirements: 17.6_

- [x] 3. Set up MongoDB Atlas connection
  - [x] 3.1 Create `backend/src/config/db.js` with Mongoose connection logic
    - Connect using `MONGODB_URI` from env config
    - Configure connection pool: `minPoolSize: MONGODB_POOL_MIN`, `maxPoolSize: MONGODB_POOL_MAX`
    - Log connection success with host name; log and exit process on connection error
    - Export `connectDB` function
    - _Requirements: 18.5_
  - [ ]* 3.2 Write unit test for `connectDB`
    - Test successful connection logs the host
    - Test failed connection calls `process.exit(1)`
    - _Requirements: 18.5_

- [x] 4. Implement the User model
  - [x] 4.1 Create `backend/src/models/User.js` with the full schema from the design
    - Fields: `email` (unique, lowercase), `username` (unique, lowercase), `passwordHash` (select: false), `displayName`, `avatar`, `banner`, `bio` (maxlength: 1000), `refreshTokenHash` (select: false), `passwordResetToken` (select: false), `passwordResetExpires` (select: false), `isHistoryPaused`, `isSuspended`, `role` (enum: user/creator/admin)
    - Enable `timestamps: true` for `createdAt`/`updatedAt`
    - Add indexes: unique on `email`, unique on `username`
    - Add instance method `isPasswordCorrect(password)` using `bcrypt.compare`
    - Add instance method `generateAccessToken()` signing with `ACCESS_TOKEN_SECRET` and `ACCESS_TOKEN_EXPIRY`
    - Add instance method `generateRefreshToken()` signing with `REFRESH_TOKEN_SECRET` and `REFRESH_TOKEN_EXPIRY`
    - _Requirements: 1.1, 1.4, 2.1, 3.1_
  - [ ]* 4.2 Write unit tests for User model methods
    - Test `isPasswordCorrect` returns true for matching password, false for wrong password
    - Test `generateAccessToken` returns a JWT with correct `sub` and expiry
    - Test `generateRefreshToken` returns a JWT with correct `sub` and 7-day expiry
    - _Requirements: 1.4, 2.1_

- [x] 5. Build the middleware stack
  - [x] 5.1 Create `backend/src/middlewares/error.middleware.js`
    - Implement `globalErrorHandler(err, req, res, next)` as specified in the design
    - In production: return generic message for 5xx, no stack trace
    - In development: include `stack` in response
    - Handle non-`ApiError` instances by defaulting `statusCode` to 500
    - _Requirements: 17.6_
  - [x] 5.2 Create `backend/src/middlewares/validate.middleware.js`
    - Use `validationResult` from `express-validator` to collect errors
    - If errors exist, throw `ApiError(400, 'Validation failed', errors.array())`
    - Export as `validate` middleware function
    - _Requirements: 1.3, 1.6_
  - [x] 5.3 Create `backend/src/middlewares/auth.middleware.js`
    - Extract Bearer token from `Authorization` header
    - Verify with `ACCESS_TOKEN_SECRET` using `jsonwebtoken.verify`
    - Fetch user from DB by decoded `_id`, excluding `passwordHash` and `refreshTokenHash`
    - Attach user to `req.user`; throw `ApiError(401, 'Authentication required')` on any failure
    - Export as `verifyJWT` middleware
    - _Requirements: 17.1_
  - [x] 5.4 Create `backend/src/middlewares/rateLimiter.middleware.js`
    - `globalRateLimiter`: 100 requests per `RATE_LIMIT_WINDOW_MS` per IP, returns 429 with `ApiError` JSON on exceed
    - `authRateLimiter`: stricter limiter (10 requests per 15 minutes) for auth routes
    - _Requirements: 17.3_
  - [ ]* 5.5 Write integration tests for middleware
    - Test `globalErrorHandler` returns generic message in production mode
    - Test `verifyJWT` returns 401 for missing token, expired token, and invalid token
    - Test `authRateLimiter` returns 429 after exceeding the limit
    - _Requirements: 17.1, 17.3, 17.6_

- [x] 6. Configure the Express application
  - [x] 6.1 Create `backend/src/app.js` with the full middleware stack in design order
    - Apply in order: `helmet()`, `cors(corsOptions)`, `compression()`, `express.json({ limit: '10kb' })`, `express.urlencoded({ extended: true })`, `cookie-parser`, `mongoSanitize()`, `xss-clean`, `globalRateLimiter`
    - Configure `corsOptions` using `CORS_ORIGIN` from env, with `credentials: true`
    - Mount routes at `/api/v1` (placeholder for now, wired in task 8)
    - Add 404 handler: `ApiError(404, 'Route not found')`
    - Mount `globalErrorHandler` last
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 18.6_
  - [x] 6.2 Create `backend/server.js` entry point
    - Import `connectDB` and `app`
    - Call `connectDB()` then start `app.listen(PORT)`
    - Log server URL on successful start
    - _Requirements: 17.2_

- [x] 7. Implement the Auth service
  - [x] 7.1 Create `backend/src/services/auth.service.js`
    - `generateTokens(user)`: calls `user.generateAccessToken()` and `user.generateRefreshToken()`, hashes the refresh token with `bcrypt` (cost 10), saves `refreshTokenHash` on the user document, returns `{ accessToken, refreshToken }`
    - `verifyRefreshToken(token, user)`: uses `bcrypt.compare` to validate the incoming token against `user.refreshTokenHash`
    - `clearRefreshToken(userId)`: sets `refreshTokenHash` to `undefined` and saves
    - `setRefreshCookie(res, refreshToken)`: sets HTTP-only, Secure, SameSite=Strict cookie named `refreshToken` with 7-day `maxAge`
    - `clearRefreshCookie(res)`: clears the `refreshToken` cookie
    - _Requirements: 2.1, 2.3, 2.5, 2.6_
  - [ ]* 7.2 Write unit tests for auth service
    - Test `generateTokens` stores a bcrypt hash (not plaintext) on the user
    - Test `verifyRefreshToken` returns true for correct token, false for wrong token
    - Test `clearRefreshToken` nullifies `refreshTokenHash`
    - _Requirements: 2.3, 2.5_

- [x] 8. Implement authentication controller and routes
  - [x] 8.1 Create `backend/src/controllers/auth.controller.js` with four handlers
    - `register`: validate body → check duplicate email/username (409) → hash password with `bcrypt` cost 12 → create User → call `generateTokens` → set cookie → return 201 with user profile (no passwordHash) and accessToken
    - `login`: validate body → find user by email (401 if not found) → check `isSuspended` (403) → `isPasswordCorrect` (401 if wrong, same generic message for both) → `generateTokens` → set cookie → return 200 with user profile and accessToken
    - `logout`: `verifyJWT` required → `clearRefreshToken` → `clearRefreshCookie` → return 200
    - `refreshToken`: read `req.cookies.refreshToken` → find user by decoded JWT `_id` → `verifyRefreshToken` (401 if invalid) → `generateTokens` → set new cookie → return 200 with new accessToken
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 8.2 Create `backend/src/routes/auth.routes.js`
    - Apply `authRateLimiter` to all auth routes
    - Define express-validator chains for `register` (email format, username min 3 chars, password min 8 chars) and `login` (email, password required)
    - Wire: `POST /register`, `POST /login`, `POST /logout` (with `verifyJWT`), `POST /refresh`
    - _Requirements: 1.1, 1.3, 1.6, 17.3_
  - [x] 8.3 Create `backend/src/routes/index.js` and mount auth routes
    - Mount `authRouter` at `/auth`
    - Update `app.js` to use this router at `/api/v1`
    - _Requirements: 1.1_
  - [ ]* 8.4 Write property test: Valid Registration Round-Trip (Property 1)
    - **Property 1: Valid Registration Round-Trip**
    - Use `fc.record({ email: fc.emailAddress(), username: fc.stringMatching(/^[a-z0-9_]{3,20}$/), password: fc.string({ minLength: 8, maxLength: 72 }) })`
    - Register each generated payload → assert 201, user profile fields present, accessToken in body, Set-Cookie contains `refreshToken` with HttpOnly flag
    - **Validates: Requirements 1.1, 1.5**
  - [ ]* 8.5 Write property test: Duplicate Registration Rejected (Property 2)
    - **Property 2: Duplicate Registration Rejected**
    - Register a user, then re-register with same email → assert 409; repeat with same username → assert 409
    - **Validates: Requirements 1.2**
  - [ ]* 8.6 Write property test: Password Hash Security Invariant (Property 3)
    - **Property 3: Password Hash Security Invariant**
    - Use `fc.string({ minLength: 8 })` → register → query DB directly → assert `passwordHash` starts with `$2b$` and cost factor ≥ 10, assert plaintext not present
    - **Validates: Requirements 1.4**
  - [ ]* 8.7 Write property test: Email Format Validation (Property 4)
    - **Property 4: Email Format Validation**
    - Use `fc.string()` filtered to strings that are NOT valid RFC 5322 emails → POST /register → assert 400
    - **Validates: Requirements 1.6**
  - [ ]* 8.8 Write property test: Login Response Contract (Property 5)
    - **Property 5: Login Response Contract**
    - Register a user → login → assert 200, accessToken JWT expiry is ~15 min (±30s), Set-Cookie has HttpOnly + Secure + SameSite=Strict + maxAge ~7 days
    - **Validates: Requirements 2.1, 2.5**
  - [ ]* 8.9 Write property test: Invalid Credentials Generic Response (Property 6)
    - **Property 6: Invalid Credentials Generic Response**
    - Use `fc.emailAddress()` and `fc.string()` for wrong credentials → POST /login → assert 401, response message does not contain "email" or "password" as the incorrect field identifier
    - **Validates: Requirements 2.2**
  - [ ]* 8.10 Write property test: Refresh Token Rotation (Property 7)
    - **Property 7: Refresh Token Rotation**
    - Login → capture refreshToken cookie → POST /refresh → assert new accessToken returned, new refreshToken cookie set with a different value → use old refreshToken → assert 401
    - **Validates: Requirements 2.3**
  - [ ]* 8.11 Write property test: Logout Invalidates Refresh Token (Property 8)
    - **Property 8: Logout Invalidates Refresh Token**
    - Login → logout → attempt POST /refresh with old cookie → assert 401
    - **Validates: Requirements 2.6**
  - [ ]* 8.12 Write property test: Suspended User Login Blocked (Property 9)
    - **Property 9: Suspended User Login Blocked**
    - Create user with `isSuspended: true` directly in DB → POST /login with correct credentials → assert 403
    - **Validates: Requirements 2.7**

- [x] 9. Checkpoint — verify foundation is wired end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm `POST /api/v1/auth/register`, `/login`, `/logout`, `/refresh` return correct status codes and cookie behavior
  - Confirm MongoDB connection pooling config is applied
  - Confirm error middleware suppresses stack traces when `NODE_ENV=production`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with `numRuns: 100` and `mongodb-memory-server` for isolation
- Each property test file must include the tag comment: `// Feature: streamora-video-platform, Property N: <property_text>`
- bcrypt cost factor is 12 (exceeds the requirement minimum of 10)
- The `refreshTokenHash` field stores a bcrypt hash of the refresh token — never the raw token
- All controllers use `asyncHandler` to avoid repetitive try/catch blocks
- Phase 2 will cover video upload, Cloudinary integration, and remaining domain routes
