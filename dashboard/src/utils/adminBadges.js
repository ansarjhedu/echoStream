/** Broadcast so HubLayout refetches nav badges immediately. */
export const refreshAdminBadges = () => {
  window.dispatchEvent(new CustomEvent('echo:refresh-admin-badges'));
};

const SEEN_TICKETS_KEY = 'echo_admin_seen_tickets';

export const getAdminQueueSeen = (queue) => {
  try {
    return localStorage.getItem(SEEN_TICKETS_KEY) || null;
  } catch {
    return null;
  }
};

/** Mark support queue as read — badges clear until newer items arrive. */
export const markAdminQueueSeen = () => {
  try {
    localStorage.setItem(SEEN_TICKETS_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
  refreshAdminBadges();
};
