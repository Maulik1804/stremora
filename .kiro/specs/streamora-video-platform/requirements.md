# Requirements Document

## Introduction

Streamora is a production-level MERN stack video sharing platform inspired by YouTube. It enables users to upload, discover, watch, and interact with video content. The platform supports creator channels, subscriptions, playlists, comments, likes, notifications, memberships, and analytics dashboards. The system is built with React + Vite (frontend), Node.js + Express (backend), MongoDB Atlas (database), Cloudinary (media storage), JWT-based authentication, Tailwind CSS, and Framer Motion for UI.

---

## Glossary

- **Streamora**: The video sharing platform system as a whole.
- **User**: Any registered account on Streamora (viewer or creator).
- **Creator**: A User who has uploaded at least one video or has a channel.
- **Viewer**: A User who watches and interacts with content.
- **Auth_Service**: The backend service responsible for authentication and token management.
- **Video_Service**: The backend service responsible for video upload, processing, and retrieval.
- **Comment_Service**: The backend service responsible for comment creation and management.
- **Subscription_Service**: The backend service responsible for channel subscriptions.
- **Playlist_Service**: The backend service responsible for playlist management.
- **Like_Service**: The backend service responsible for like/dislike tracking.
- **History_Service**: The backend service responsible for watch history tracking.
- **Notification_Service**: The backend service responsible for delivering notifications.
- **Analytics_Service**: The backend service responsible for creator dashboard metrics.
- **Membership_Service**: The backend service responsible for channel membership tiers.
- **Search_Service**: The backend service responsible for video and channel search.
- **Cloudinary**: The third-party cloud media storage and streaming service.
- **MongoDB_Atlas**: The cloud-hosted MongoDB database cluster.
- **Access_Token**: A short-lived JWT used to authenticate API requests.
- **Refresh_Token**: A long-lived token used to obtain new Access_Tokens.
- **Video_Player**: The frontend component responsible for video playback.
- **Feed**: The homepage video recommendation feed shown to authenticated and guest users.
- **Dashboard**: The creator analytics and management interface.
- **CDN**: Content Delivery Network used via Cloudinary for media delivery.

---

## Requirements

### Requirement 1: User Registration and Account Creation

**User Story:** As a visitor, I want to create an account, so that I can upload videos, subscribe to channels, and interact with content.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept a registration request containing a unique email address, a username, and a password of at least 8 characters.
2. WHEN a registration request is received with a duplicate email or username, THE Auth_Service SHALL return a 409 Conflict response with a descriptive error message.
3. WHEN a registration request is received with a missing required field, THE Auth_Service SHALL return a 400 Bad Request response identifying the missing field.
4. WHEN a valid registration request is received, THE Auth_Service SHALL hash the password using bcrypt with a minimum cost factor of 10 before persisting the User record.
5. WHEN a User account is successfully created, THE Auth_Service SHALL return a 201 Created response containing the user profile and a valid Access_Token and Refresh_Token pair.
6. THE Auth_Service SHALL enforce email format validation using RFC 5322 syntax rules before persisting any User record.

---

### Requirement 2: User Authentication (Login and Token Management)

**User Story:** As a registered user, I want to log in securely, so that I can access my personalized content and creator tools.

#### Acceptance Criteria

1. WHEN a login request is received with a valid email and password, THE Auth_Service SHALL return a 200 OK response containing an Access_Token with a 15-minute expiry and a Refresh_Token with a 7-day expiry.
2. WHEN a login request is received with an invalid email or incorrect password, THE Auth_Service SHALL return a 401 Unauthorized response without revealing which credential is incorrect.
3. WHEN a valid Refresh_Token is submitted to the token refresh endpoint, THE Auth_Service SHALL issue a new Access_Token and rotate the Refresh_Token.
4. WHEN an expired or invalid Refresh_Token is submitted, THE Auth_Service SHALL return a 401 Unauthorized response and invalidate the token from the store.
5. THE Auth_Service SHALL store Refresh_Tokens in an HTTP-only, Secure, SameSite=Strict cookie to prevent client-side JavaScript access.
6. WHEN a logout request is received with a valid Access_Token, THE Auth_Service SHALL invalidate the associated Refresh_Token and clear the cookie.
7. IF a User account is suspended, THEN THE Auth_Service SHALL return a 403 Forbidden response on any login attempt for that account.

---

### Requirement 3: User Profile Management

**User Story:** As a registered user, I want to manage my profile, so that I can personalize my channel and account information.

#### Acceptance Criteria

1. THE User SHALL have a profile containing: display name, username, avatar image URL, banner image URL, bio (max 1000 characters), and creation date.
2. WHEN a profile update request is received with a valid Access_Token, THE Auth_Service SHALL update only the fields provided in the request body and return the updated profile.
3. WHEN an avatar or banner image is uploaded, THE Video_Service SHALL upload the image to Cloudinary and store the returned CDN URL in the User record.
4. IF an uploaded avatar or banner image exceeds 5 MB, THEN THE Video_Service SHALL return a 413 Payload Too Large response and reject the upload.
5. WHEN a User updates their password, THE Auth_Service SHALL require the current password for verification before persisting the new hashed password.

---

### Requirement 4: Video Upload

**User Story:** As a creator, I want to upload videos, so that I can share content with my audience.

#### Acceptance Criteria

1. WHEN a video upload request is received with a valid Access_Token, THE Video_Service SHALL accept video files in MP4, MOV, AVI, and MKV formats.
2. IF an uploaded video file exceeds 2 GB, THEN THE Video_Service SHALL return a 413 Payload Too Large response and reject the upload.
3. WHEN a video file is received, THE Video_Service SHALL upload it to Cloudinary using chunked upload and store the resulting video URL, public ID, duration, and thumbnail URL in the Video record.
4. WHEN a video is uploaded without a custom thumbnail, THE Video_Service SHALL use the auto-generated Cloudinary thumbnail as the default thumbnail URL.
5. THE Video_Service SHALL require a title (max 100 characters) and allow an optional description (max 5000 characters) for every video upload.
6. WHEN a video upload is initiated, THE Video_Service SHALL set the video status to "processing" and update it to "published" upon successful Cloudinary ingestion.
7. IF the Cloudinary upload fails, THEN THE Video_Service SHALL set the video status to "failed", log the error, and return a 502 Bad Gateway response to the client.
8. WHEN a video is successfully published, THE Notification_Service SHALL dispatch a notification to all subscribers of the creator's channel.
9. THE Video_Service SHALL allow the creator to set video visibility to "public", "unlisted", or "private" at upload time or via a subsequent update.

---

### Requirement 5: Video Playback and Streaming

**User Story:** As a viewer, I want to watch videos smoothly, so that I can enjoy content without interruption.

#### Acceptance Criteria

1. WHEN a video watch request is received, THE Video_Player SHALL load the Cloudinary streaming URL and begin adaptive bitrate playback.
2. THE Video_Player SHALL support playback speeds of 0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, and 2x.
3. THE Video_Player SHALL support full-screen mode, picture-in-picture mode, and theatre mode.
4. THE Video_Player SHALL display a progress bar with seek functionality allowing the viewer to jump to any timestamp in the video.
5. THE Video_Player SHALL support keyboard shortcuts: Space (play/pause), Arrow Left/Right (seek ±5 seconds), Arrow Up/Down (volume ±10%), F (fullscreen), M (mute).
6. WHEN a video finishes playing, THE Video_Player SHALL display an autoplay countdown of 5 seconds before loading the next recommended video, unless autoplay is disabled by the User.
7. WHEN a video is watched for more than 30 seconds or 50% of its duration (whichever is less), THE History_Service SHALL record the watch event for the authenticated User.
8. WHEN a video watch event is recorded, THE Video_Service SHALL increment the video's view count by 1.
9. WHERE captions are available, THE Video_Player SHALL display subtitle tracks selectable by the User.

---

### Requirement 6: Video Discovery and Feed

**User Story:** As a viewer, I want to discover relevant videos on the homepage, so that I can find content I enjoy.

#### Acceptance Criteria

1. WHEN an authenticated User loads the Feed, THE Video_Service SHALL return a paginated list of videos ranked by a combination of recency, view count, and subscription relevance.
2. WHEN a guest (unauthenticated) user loads the Feed, THE Video_Service SHALL return a paginated list of trending public videos ranked by view count and recency.
3. THE Video_Service SHALL return Feed results in pages of 20 videos per request, with cursor-based pagination.
4. WHEN a User loads the Subscriptions feed, THE Video_Service SHALL return videos exclusively from channels the User is subscribed to, ordered by upload date descending.
5. THE Feed SHALL exclude videos with "private" or "unlisted" visibility from all public-facing responses.

---

### Requirement 7: Video Search

**User Story:** As a viewer, I want to search for videos and channels, so that I can find specific content quickly.

#### Acceptance Criteria

1. WHEN a search query of at least 2 characters is submitted, THE Search_Service SHALL return matching videos and channels ranked by relevance using full-text index scoring.
2. THE Search_Service SHALL support filtering search results by: upload date (today, this week, this month, this year), duration (short <4 min, medium 4–20 min, long >20 min), and sort order (relevance, upload date, view count).
3. WHEN a search query returns no results, THE Search_Service SHALL return a 200 OK response with an empty results array and a "no results found" message.
4. THE Search_Service SHALL return search results in pages of 20 items per request using cursor-based pagination.
5. WHEN a search query is submitted, THE Search_Service SHALL complete the response within 2 seconds under normal load conditions.

---

### Requirement 8: Comments

**User Story:** As a viewer, I want to comment on videos, so that I can engage with creators and other viewers.

#### Acceptance Criteria

1. WHEN an authenticated User submits a comment on a video, THE Comment_Service SHALL persist the comment with the user ID, video ID, text content (max 1000 characters), and timestamp.
2. THE Comment_Service SHALL support threaded replies up to 2 levels deep (comment → reply).
3. WHEN a comment is posted on a video, THE Notification_Service SHALL send a notification to the video's creator.
4. WHEN a reply is posted on a comment, THE Notification_Service SHALL send a notification to the original comment author.
5. WHEN the creator or comment author requests deletion of a comment, THE Comment_Service SHALL soft-delete the comment and replace its text with "[deleted]" in all responses.
6. THE Comment_Service SHALL return comments for a video in pages of 20 per request, ordered by top-level comment creation date descending by default, with an option to sort by like count.
7. IF a comment text contains more than 1000 characters, THEN THE Comment_Service SHALL return a 400 Bad Request response.

---

### Requirement 9: Likes and Dislikes

**User Story:** As a viewer, I want to like or dislike videos and comments, so that I can express my reaction to content.

#### Acceptance Criteria

1. WHEN an authenticated User submits a like on a video, THE Like_Service SHALL record the like and increment the video's like count by 1.
2. WHEN an authenticated User submits a dislike on a video they have already liked, THE Like_Service SHALL remove the like, decrement the like count by 1, and record the dislike.
3. WHEN an authenticated User submits a like on a video they have already liked, THE Like_Service SHALL remove the like (toggle off) and decrement the like count by 1.
4. THE Like_Service SHALL allow likes on both videos and comments using the same endpoint pattern with a resource type discriminator.
5. WHEN a like or dislike is recorded, THE Like_Service SHALL return the updated like count and the User's current reaction state in the response.

---

### Requirement 10: Subscriptions

**User Story:** As a viewer, I want to subscribe to channels, so that I can follow creators and receive their new content.

#### Acceptance Criteria

1. WHEN an authenticated User subscribes to a channel, THE Subscription_Service SHALL create a subscription record linking the User to the creator's channel.
2. WHEN an authenticated User subscribes to a channel they are already subscribed to, THE Subscription_Service SHALL remove the subscription (toggle unsubscribe).
3. THE Subscription_Service SHALL return the current subscriber count for a channel in all channel profile responses.
4. WHEN a User subscribes to a channel, THE Notification_Service SHALL send a welcome notification to the subscribing User.
5. THE Subscription_Service SHALL allow a User to set notification preferences per subscription: "all", "personalized", or "none".

---

### Requirement 11: Playlists

**User Story:** As a user, I want to create and manage playlists, so that I can organize videos I want to watch.

#### Acceptance Criteria

1. WHEN an authenticated User creates a playlist, THE Playlist_Service SHALL persist the playlist with a title (max 150 characters), optional description (max 500 characters), visibility ("public" or "private"), and the creator's user ID.
2. WHEN an authenticated User adds a video to a playlist, THE Playlist_Service SHALL append the video to the playlist's ordered video list and return the updated playlist.
3. WHEN an authenticated User removes a video from a playlist, THE Playlist_Service SHALL remove the video from the ordered list and return the updated playlist.
4. THE Playlist_Service SHALL allow the creator to reorder videos within a playlist by specifying a new position index.
5. WHEN a playlist is set to "private", THE Playlist_Service SHALL exclude it from all public-facing responses and return a 403 Forbidden response to non-owner requests.
6. THE Playlist_Service SHALL automatically create a "Watch Later" playlist for every new User upon account creation.

---

### Requirement 12: Watch History

**User Story:** As a user, I want to view and manage my watch history, so that I can revisit videos I have watched.

#### Acceptance Criteria

1. THE History_Service SHALL maintain a per-User watch history list ordered by most recently watched.
2. WHEN a User watches the same video multiple times, THE History_Service SHALL update the existing history entry's timestamp rather than creating a duplicate entry.
3. WHEN an authenticated User requests their watch history, THE History_Service SHALL return a paginated list of 20 entries per page with video metadata.
4. WHEN an authenticated User deletes a specific video from their history, THE History_Service SHALL remove that entry and return a 200 OK response.
5. WHEN an authenticated User clears their entire watch history, THE History_Service SHALL delete all history entries for that User and return a 200 OK response.
6. WHILE history is paused by the User, THE History_Service SHALL not record any new watch events for that User.

---

### Requirement 13: Notifications

**User Story:** As a user, I want to receive notifications, so that I can stay informed about activity on my content and subscriptions.

#### Acceptance Criteria

1. THE Notification_Service SHALL deliver in-app notifications for the following events: new video from subscribed channel, new comment on own video, new reply to own comment, new subscriber, and channel membership purchase.
2. WHEN a notification is delivered, THE Notification_Service SHALL mark it as "unread" until the User views it.
3. WHEN an authenticated User requests their notifications, THE Notification_Service SHALL return a paginated list of 20 notifications per page ordered by creation date descending.
4. WHEN an authenticated User marks a notification as read, THE Notification_Service SHALL update its status to "read" and return a 200 OK response.
5. WHEN an authenticated User marks all notifications as read, THE Notification_Service SHALL update all unread notifications for that User to "read" status.
6. THE Notification_Service SHALL respect the per-subscription notification preference set by the User when determining whether to dispatch a new-video notification.

---

### Requirement 14: Creator Dashboard and Analytics

**User Story:** As a creator, I want to view analytics for my channel, so that I can understand my audience and improve my content.

#### Acceptance Criteria

1. WHEN an authenticated Creator accesses the Dashboard, THE Analytics_Service SHALL return channel-level metrics including: total views, total watch time (minutes), total subscribers, and total revenue (if membership is enabled).
2. THE Analytics_Service SHALL provide per-video metrics including: view count, average watch duration (seconds), like count, dislike count, comment count, and impressions.
3. THE Analytics_Service SHALL provide time-series data for views and subscribers over selectable periods: last 7 days, last 28 days, last 90 days, and last 365 days.
4. THE Analytics_Service SHALL provide audience demographic data including: top countries by view count and traffic source breakdown (search, feed, external, direct).
5. WHEN a Creator requests analytics data, THE Analytics_Service SHALL return the response within 3 seconds under normal load conditions.

---

### Requirement 15: Channel Membership

**User Story:** As a viewer, I want to join a creator's membership, so that I can support creators and access exclusive perks.

#### Acceptance Criteria

1. THE Membership_Service SHALL allow Creators to define up to 5 membership tiers, each with a name, monthly price (USD), and list of perks (max 10 perks per tier).
2. WHEN a User purchases a membership tier, THE Membership_Service SHALL create a membership record linking the User to the tier with an active status and billing cycle start date.
3. WHEN a membership is active, THE Membership_Service SHALL grant the member access to exclusive content tagged with that tier or lower.
4. WHEN a membership payment fails or is cancelled, THE Membership_Service SHALL update the membership status to "inactive" and revoke access to exclusive content.
5. WHEN a membership is purchased, THE Notification_Service SHALL send a notification to the Creator with the new member's username and selected tier.

---

### Requirement 16: Video Management (Creator Controls)

**User Story:** As a creator, I want to manage my uploaded videos, so that I can edit, delete, or update my content.

#### Acceptance Criteria

1. WHEN an authenticated Creator submits an update request for their own video, THE Video_Service SHALL update the specified fields (title, description, thumbnail, visibility, tags) and return the updated Video record.
2. WHEN an authenticated Creator deletes their own video, THE Video_Service SHALL soft-delete the Video record, remove it from all public feeds, and delete the associated Cloudinary asset.
3. IF a User attempts to update or delete a video they do not own, THEN THE Video_Service SHALL return a 403 Forbidden response.
4. THE Video_Service SHALL allow Creators to add up to 15 tags per video, each tag being a maximum of 30 characters.
5. WHEN a Creator updates a video's thumbnail, THE Video_Service SHALL upload the new image to Cloudinary and update the thumbnail URL in the Video record.

---

### Requirement 17: Security and Authorization

**User Story:** As a platform operator, I want all API endpoints to be secured, so that user data and content are protected from unauthorized access.

#### Acceptance Criteria

1. THE Auth_Service SHALL validate the Access_Token on every protected API request and return a 401 Unauthorized response if the token is missing, expired, or invalid.
2. THE Streamora backend SHALL enforce HTTPS for all API communication.
3. THE Streamora backend SHALL apply rate limiting of 100 requests per minute per IP address on all public endpoints and return a 429 Too Many Requests response when the limit is exceeded.
4. THE Streamora backend SHALL sanitize all user-supplied text inputs to prevent XSS and NoSQL injection attacks before persisting to MongoDB_Atlas.
5. THE Auth_Service SHALL implement CORS policy restricting API access to the configured frontend origin domains only.
6. THE Streamora backend SHALL not expose internal error stack traces in API responses; all 5xx responses SHALL return a generic error message.
7. WHEN a User requests password reset, THE Auth_Service SHALL generate a single-use, time-limited reset token (valid for 1 hour) and send it to the User's registered email address.

---

### Requirement 18: Scalability and Performance

**User Story:** As a platform operator, I want the system to handle high traffic efficiently, so that users experience consistent performance under load.

#### Acceptance Criteria

1. THE Streamora backend SHALL use MongoDB_Atlas indexes on all frequently queried fields including: userId, videoId, channelId, createdAt, and status.
2. THE Video_Service SHALL implement cursor-based pagination on all list endpoints to avoid offset-based performance degradation at scale.
3. THE Streamora backend SHALL cache frequently accessed data (Feed, trending videos, channel profiles) using an in-memory cache with a TTL of 60 seconds.
4. THE Video_Service SHALL deliver video content exclusively via Cloudinary CDN to minimize origin server load.
5. THE Streamora backend SHALL use connection pooling for MongoDB_Atlas with a minimum pool size of 5 and a maximum pool size of 50 connections.
6. THE Streamora backend SHALL compress all API responses using gzip or Brotli encoding.

---

### Requirement 19: Frontend Architecture and State Management

**User Story:** As a developer, I want a well-structured frontend, so that the application is maintainable and performant.

#### Acceptance Criteria

1. THE Streamora frontend SHALL be built with React 18+ and Vite, organized into the following top-level directories: `src/components`, `src/pages`, `src/features`, `src/hooks`, `src/services`, `src/store`, `src/utils`, and `src/assets`.
2. THE Streamora frontend SHALL use Redux Toolkit for global state management covering: authentication state, video feed state, notification state, and player state.
3. THE Streamora frontend SHALL use React Query (TanStack Query) for server state management, caching, and background refetching of API data.
4. THE Streamora frontend SHALL implement code splitting using React.lazy and Suspense for all page-level components to reduce initial bundle size.
5. THE Streamora frontend SHALL use Tailwind CSS for all styling and Framer Motion for page transitions and micro-interactions.
6. WHEN the application is in an unauthenticated state, THE Streamora frontend SHALL redirect protected routes to the login page and preserve the originally requested URL for post-login redirect.

---

### Requirement 20: Frontend Pages and Routing

**User Story:** As a user, I want a complete set of pages, so that I can navigate all platform features.

#### Acceptance Criteria

1. THE Streamora frontend SHALL implement the following public pages: Home (Feed), Video Watch, Channel Profile, Search Results, Login, and Register.
2. THE Streamora frontend SHALL implement the following authenticated pages: Subscriptions Feed, History, Liked Videos, Playlists, Playlist Detail, Studio (video management), Dashboard (analytics), Settings, and Notifications.
3. THE Streamora frontend SHALL use React Router v6 with nested routes for the Studio and Dashboard sections.
4. WHEN a route is not found, THE Streamora frontend SHALL display a 404 page with a link back to the Home page.
5. THE Streamora frontend SHALL implement a persistent sidebar navigation that collapses to icon-only mode on screens narrower than 1024px and hides completely on screens narrower than 768px.
6. THE Streamora frontend SHALL be fully responsive and functional on viewport widths from 320px to 2560px.
```
