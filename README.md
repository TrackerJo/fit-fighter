Group members: Jason Emsley, Nathaniel Kemme Nash

# Fit Fighter API

A competitive workout tracking backend built with Node.js, Express, and a JSON file database. Users can create accounts, add friends, challenge them to workout competitions, log sets throughout the week, and see who comes out on top.

## Getting Started

```bash
npm install
npm start        # Start the server (default port 3000)
npm run dev      # Start with --watch for auto-restart on changes
```

The server runs at `http://localhost:3000` by default. Set the `PORT` environment variable to change it.

## Authentication

All routes except **Register** and **Login** require a JWT token. Include it in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned on register and login and are valid for 7 days.

---

## API Routes

### Auth — `/api/auth`

#### `POST /api/auth/register`

Create a new account.

**Body:**

```json
{ "name": "Alice", "email": "alice@test.com", "password": "pass123" }
```

**Response `201`:**

```json
{
  "message": "Account created",
  "token": "eyJhbG...",
  "user": { "id": "uuid", "name": "Alice", "email": "alice@test.com" }
}
```

---

#### `POST /api/auth/login`

Log in to an existing account.

**Body:**

```json
{ "email": "alice@test.com", "password": "pass123" }
```

**Response `200`:**

```json
{
  "message": "Logged in",
  "token": "eyJhbG...",
  "user": { "id": "uuid", "name": "Alice", "email": "alice@test.com" }
}
```

---

#### `GET /api/auth/me` 🔒

Get the current user's profile.

**Response `200`:**

```json
{ "id": "uuid", "name": "Alice", "email": "alice@test.com" }
```

---

### Friends — `/api/friends` 🔒

All friend routes require authentication.

#### `GET /api/friends/search?name=Bob`

Search for users by name (case-insensitive partial match). Excludes the current user from results.

**Response `200`:**

```json
{
  "users": [{ "id": "uuid", "name": "Bob" }]
}
```

---

#### `POST /api/friends/request`

Send a friend request.

**Body:**

```json
{ "friendId": "target-user-uuid" }
```

**Response `201`:**

```json
{
  "message": "Friend request sent",
  "request": { "id": "uuid", "from": "...", "to": "...", "status": "pending", "createdAt": "..." }
}
```

---

#### `GET /api/friends/requests/incoming`

View pending friend requests sent to you.

**Response `200`:**

```json
{
  "requests": [
    { "id": "uuid", "from": "...", "to": "...", "status": "pending", "createdAt": "...", "fromName": "Alice" }
  ]
}
```

---

#### `GET /api/friends/requests/outgoing`

View pending friend requests you have sent.

**Response `200`:**

```json
{
  "requests": [
    { "id": "uuid", "from": "...", "to": "...", "status": "pending", "createdAt": "...", "toName": "Bob" }
  ]
}
```

---

#### `POST /api/friends/request/:requestId/accept`

Accept a friend request. Creates a friendship between both users.

**Response `200`:**

```json
{
  "message": "Friend request accepted",
  "friendship": { "id": "uuid", "userA": "...", "userB": "...", "createdAt": "..." }
}
```

---

#### `POST /api/friends/request/:requestId/decline`

Decline a friend request.

**Response `200`:**

```json
{ "message": "Friend request declined" }
```

---

#### `GET /api/friends`

List all current friends.

**Response `200`:**

```json
{
  "friends": [
    { "friendshipId": "uuid", "id": "friend-uuid", "name": "Bob", "since": "2026-01-15T..." }
  ]
}
```

---

#### `DELETE /api/friends/:friendId`

Remove a friend.

**Response `200`:**

```json
{ "message": "Friend removed" }
```

---

### Competitions — `/api/competitions` 🔒

All competition routes require authentication.

#### `POST /api/competitions/request`

Challenge a friend to a workout competition. You must be friends first. Only one active competition or pending request can exist between two users at a time.

**Body:**

```json
{ "friendId": "friend-uuid" }
```

**Response `201`:**

```json
{
  "message": "Competition request sent",
  "request": { "id": "uuid", "from": "...", "to": "...", "status": "pending", "createdAt": "..." }
}
```

---

#### `GET /api/competitions/requests/incoming`

View pending competition challenges sent to you.

**Response `200`:**

```json
{
  "requests": [
    { "id": "uuid", "from": "...", "to": "...", "status": "pending", "createdAt": "...", "fromName": "Alice" }
  ]
}
```

---

#### `GET /api/competitions/requests/outgoing`

View pending competition challenges you have sent.

**Response `200`:**

```json
{
  "requests": [
    { "id": "uuid", "from": "...", "to": "...", "status": "pending", "createdAt": "...", "toName": "Bob" }
  ]
}
```

---

#### `POST /api/competitions/request/:requestId/accept`

Accept a competition challenge. This starts the competition immediately.

**Response `200`:**

```json
{
  "message": "Competition started!",
  "competition": {
    "id": "uuid", "userA": "...", "userB": "...",
    "status": "active", "startedAt": "...",
    "endedAt": null, "winnerId": null, "scoreA": 0, "scoreB": 0
  }
}
```

---

#### `POST /api/competitions/request/:requestId/decline`

Decline a competition challenge.

**Response `200`:**

```json
{ "message": "Competition request declined" }
```

---

#### `GET /api/competitions/active`

List all your currently active competitions.

**Response `200`:**

```json
{
  "competitions": [
    { "id": "uuid", "userA": "...", "userB": "...", "status": "active", "opponentName": "Bob", "..." : "..." }
  ]
}
```

---

#### `GET /api/competitions/history`

List all your completed (past) competitions.

**Response `200`:**

```json
{
  "competitions": [
    { "id": "uuid", "status": "completed", "winnerId": "...", "scoreA": 1667.17, "scoreB": 758.59, "opponentName": "Bob" }
  ]
}
```

---

#### `GET /api/competitions/:competitionId`

Get full competition details including both participants' workout sets and live scores. Both users in the competition can see each other's progress.

**Response `200`:**

```json
{
  "competition": { "id": "uuid", "status": "active", "scoreA": 1667.17, "scoreB": 758.59, "..." : "..." },
  "participants": {
    "userA": {
      "id": "...", "name": "Alice", "score": 1667.17,
      "sets": [
        { "id": "uuid", "exercise": "Bench Press", "weight": 135, "reps": 10, "score": 851.79, "loggedAt": "..." }
      ]
    },
    "userB": {
      "id": "...", "name": "Bob", "score": 758.59,
      "sets": [
        { "id": "uuid", "exercise": "Deadlift", "weight": 315, "reps": 3, "score": 758.59, "loggedAt": "..." }
      ]
    }
  }
}
```

---

#### `POST /api/competitions/:competitionId/end`

End an active competition. Either participant can end it. The winner is determined by comparing total scores. Returns the final result.

**Response `200`:**

```json
{
  "message": "Competition ended!",
  "result": {
    "competitionId": "uuid",
    "scoreA": 1667.17,
    "scoreB": 758.59,
    "userA": { "id": "...", "name": "Alice" },
    "userB": { "id": "...", "name": "Bob" },
    "winner": { "id": "...", "name": "Alice" }
  }
}
```

If scores are tied, `winner` will be `"Tie"`.

---

### Workouts — `/api/workouts` 🔒

All workout routes require authentication.

#### `POST /api/workouts/sets`

Log a single workout set for an active competition.

**Body:**

```json
{ "competitionId": "uuid", "exercise": "Bench Press", "weight": 135, "reps": 10 }
```

**Response `201`:**

```json
{
  "message": "Set logged",
  "set": {
    "id": "uuid", "userId": "...", "competitionId": "...",
    "exercise": "Bench Press", "weight": 135, "reps": 10,
    "score": 851.79, "loggedAt": "..."
  }
}
```

---

#### `POST /api/workouts/sets/batch`

Log multiple sets at once for an active competition. Invalid entries are skipped.

**Body:**

```json
{
  "competitionId": "uuid",
  "sets": [
    { "exercise": "Bench Press", "weight": 135, "reps": 10 },
    { "exercise": "Squat", "weight": 225, "reps": 5 }
  ]
}
```

**Response `201`:**

```json
{
  "message": "2 sets logged",
  "sets": [ { "..." : "..." }, { "..." : "..." } ]
}
```

---

#### `GET /api/workouts/sets/:competitionId`

Get your logged sets and total score for a specific competition.

**Response `200`:**

```json
{
  "sets": [ { "id": "...", "exercise": "Bench Press", "weight": 135, "reps": 10, "score": 851.79, "..." : "..." } ],
  "totalScore": 1667.17
}
```

---

#### `DELETE /api/workouts/sets/:setId`

Delete one of your logged sets. Only works while the competition is still active.

**Response `200`:**

```json
{ "message": "Set deleted" }
```

---

## Scoring Algorithm

Each set is scored using the formula:

```
setScore = weight × reps ^ 0.8
```

The `0.8` exponent applies **diminishing returns on reps**, which rewards workout intensity (heavier weight) over high-rep, low-weight volume:

| Reps | Effective Multiplier | % of Raw Reps |
|------|---------------------|---------------|
| 3    | 2.41                | 80%           |
| 5    | 3.62                | 72%           |
| 10   | 6.31                | 63%           |
| 15   | 8.75                | 58%           |
| 20   | 10.99               | 55%           |

A user's total competition score is the sum of all their individual set scores.

---

## Database Schema

The JSON database (`db/database.json`) stores six collections:

| Collection           | Key Fields                                           |
|----------------------|------------------------------------------------------|
| `users`              | `id`, `name`, `email`, `password`, `createdAt`       |
| `friendRequests`     | `id`, `from`, `to`, `status`, `createdAt`            |
| `friendships`        | `id`, `userA`, `userB`, `createdAt`                  |
| `competitionRequests`| `id`, `from`, `to`, `status`, `createdAt`            |
| `competitions`       | `id`, `userA`, `userB`, `status`, `startedAt`, `endedAt`, `winnerId`, `scoreA`, `scoreB` |
| `workoutSets`        | `id`, `userId`, `competitionId`, `exercise`, `weight`, `reps`, `score`, `loggedAt` |

---

## Typical Flow

1. Two users **register** accounts
2. User A **searches** for User B by name
3. User A **sends a friend request** → User B **accepts**
4. User A **sends a competition request** → User B **accepts** → competition starts
5. Both users **log workout sets** throughout the week
6. Both users can **view competition progress** (see each other's sets and scores)
7. Either user **ends the competition** → winner is determined by total score
