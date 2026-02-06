const BASE = '/api';

function getToken() {
  return localStorage.getItem('ff_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers });
  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : null;

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  /* ── Auth ── */
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  /* ── Friends ── */
  searchUsers: name => request(`/friends/search?name=${encodeURIComponent(name)}`),
  sendFriendRequest: recipientId =>
    request('/friends/request', { method: 'POST', body: JSON.stringify({ recipientId }) }),
  incomingFriendRequests: () => request('/friends/requests/incoming'),
  outgoingFriendRequests: () => request('/friends/requests/outgoing'),
  acceptFriendRequest: requestId =>
    request(`/friends/request/${requestId}/accept`, { method: 'POST' }),
  declineFriendRequest: requestId =>
    request(`/friends/request/${requestId}/decline`, { method: 'POST' }),
  listFriends: () => request('/friends'),
  removeFriend: friendId =>
    request(`/friends/${friendId}`, { method: 'DELETE' }),

  /* ── Competitions ── */
  sendCompetitionRequest: opponentId =>
    request('/competitions/request', { method: 'POST', body: JSON.stringify({ opponentId }) }),
  incomingCompetitionRequests: () => request('/competitions/requests/incoming'),
  outgoingCompetitionRequests: () => request('/competitions/requests/outgoing'),
  acceptCompetitionRequest: requestId =>
    request(`/competitions/request/${requestId}/accept`, { method: 'POST' }),
  declineCompetitionRequest: requestId =>
    request(`/competitions/request/${requestId}/decline`, { method: 'POST' }),
  activeCompetitions: () => request('/competitions/active'),
  competitionHistory: () => request('/competitions/history'),
  competitionDetail: competitionId => request(`/competitions/${competitionId}`),
  endCompetition: competitionId =>
    request(`/competitions/${competitionId}/end`, { method: 'POST' }),

  /* ── Workouts ── */
  logSet: (competitionId, exercise, weight, reps) =>
    request('/workouts/sets', {
      method: 'POST',
      body: JSON.stringify({ competitionId, exercise, weight, reps })
    }),
  logBatch: (competitionId, sets) =>
    request('/workouts/sets/batch', {
      method: 'POST',
      body: JSON.stringify({ competitionId, sets })
    }),
  getSets: competitionId => request(`/workouts/sets/${competitionId}`),
  deleteSet: setId => request(`/workouts/sets/${setId}`, { method: 'DELETE' }),

  /* ── Solo ── */
  createSoloSession: (name) =>
    request('/solo/sessions', { method: 'POST', body: JSON.stringify({ name }) }),
  activeSoloSessions: () => request('/solo/sessions/active'),
  soloHistory: () => request('/solo/sessions/history'),
  soloRecords: () => request('/solo/records'),
  soloSessionDetail: (sessionId) => request(`/solo/sessions/${sessionId}`),
  endSoloSession: (sessionId) =>
    request(`/solo/sessions/${sessionId}/end`, { method: 'POST' }),
  logSoloSet: (sessionId, exercise, weight, reps) =>
    request('/solo/sets', {
      method: 'POST',
      body: JSON.stringify({ sessionId, exercise, weight, reps })
    }),
  deleteSoloSet: (setId) =>
    request(`/solo/sets/${setId}`, { method: 'DELETE' }),
};
