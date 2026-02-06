/**
 * Event bus — lightweight pub/sub for real-time SSE streaming.
 *
 * Two tiers:
 *   1. Competition-level  – subscribers watching a specific duel
 *   2. User-level         – per-user notification stream (friend requests,
 *                           challenge invites, etc.)
 */

const EventEmitter = require("events");

const bus = new EventEmitter();
bus.setMaxListeners(500);

// ── Competition-level subscribers ──────────────────────────────────────────
/** Map of competitionId → Set<Response> */
const subscribers = new Map();

function subscribe(competitionId, res) {
  if (!subscribers.has(competitionId)) {
    subscribers.set(competitionId, new Set());
  }
  subscribers.get(competitionId).add(res);

  res.on("close", () => {
    const subs = subscribers.get(competitionId);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) subscribers.delete(competitionId);
    }
  });
}

function emit(competitionId, event, data = {}) {
  const subs = subscribers.get(competitionId);
  if (!subs || subs.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of subs) {
    try { res.write(payload); }
    catch { subs.delete(res); }
  }
}

function subscriberCount(competitionId) {
  return subscribers.has(competitionId) ? subscribers.get(competitionId).size : 0;
}

// ── User-level notification subscribers ────────────────────────────────────
/** Map of userId → Set<Response> */
const userSubscribers = new Map();

function subscribeUser(userId, res) {
  if (!userSubscribers.has(userId)) {
    userSubscribers.set(userId, new Set());
  }
  userSubscribers.get(userId).add(res);

  res.on("close", () => {
    const subs = userSubscribers.get(userId);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) userSubscribers.delete(userId);
    }
  });
}

function emitToUser(userId, event, data = {}) {
  const subs = userSubscribers.get(userId);
  if (!subs || subs.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of subs) {
    try { res.write(payload); }
    catch { subs.delete(res); }
  }
}

module.exports = { subscribe, emit, subscriberCount, subscribeUser, emitToUser };
