/**
 * Competition event bus — lightweight pub/sub for real-time SSE streaming.
 *
 * Each active competition can have multiple SSE subscribers (the two
 * participants viewing the duel).  When a set is logged, deleted, or the
 * competition ends, the relevant route calls `emit()` and every connected
 * client receives the event instantly.
 */

const EventEmitter = require("events");

const bus = new EventEmitter();
bus.setMaxListeners(200); // allow many concurrent competitions

/**
 * Map of competitionId → Set<response>.
 * Each value is a Set of Express response objects that are kept open
 * for Server-Sent Events streaming.
 */
const subscribers = new Map();

/**
 * Register an SSE client for a competition.
 * @param {string} competitionId
 * @param {import('express').Response} res - Express response kept open for SSE
 */
function subscribe(competitionId, res) {
  if (!subscribers.has(competitionId)) {
    subscribers.set(competitionId, new Set());
  }
  subscribers.get(competitionId).add(res);

  // Clean up when the client disconnects
  res.on("close", () => {
    const subs = subscribers.get(competitionId);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) subscribers.delete(competitionId);
    }
  });
}

/**
 * Broadcast an event to all subscribers of a competition.
 * @param {string} competitionId
 * @param {string} event - event name (e.g. "set-logged", "set-deleted", "competition-ended")
 * @param {object} data  - payload to JSON-encode
 */
function emit(competitionId, event, data = {}) {
  const subs = subscribers.get(competitionId);
  if (!subs || subs.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of subs) {
    try {
      res.write(payload);
    } catch {
      // Client already gone, clean up
      subs.delete(res);
    }
  }
}

/**
 * Return the count of active subscribers for a competition.
 */
function subscriberCount(competitionId) {
  return subscribers.has(competitionId) ? subscribers.get(competitionId).size : 0;
}

module.exports = { subscribe, emit, subscriberCount };
