/** Broadcast so HubLayout refetches nav badges immediately. */
export const refreshAdminBadges = () => {
  window.dispatchEvent(new CustomEvent('echo:refresh-admin-badges'));
};

const SEEN_DISPUTES_KEY = 'echo_admin_seen_disputes';
const SEEN_TICKETS_KEY = 'echo_admin_seen_tickets';

export const getAdminQueueSeen = (queue) => {
  try {
    const key = queue === 'disputes' ? SEEN_DISPUTES_KEY : SEEN_TICKETS_KEY;
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

/** Mark dispute/support queue as read — badges clear until newer items arrive. */
export const markAdminQueueSeen = (queue) => {
  try {
    const key = queue === 'disputes' ? SEEN_DISPUTES_KEY : SEEN_TICKETS_KEY;
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    /* ignore */
  }
  refreshAdminBadges();
};
