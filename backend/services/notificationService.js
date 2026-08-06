import Notification from '../models/Notification.js';

/**
 * Create an in-app notification for a user (owner account).
 * Failures are logged and never throw — notification delivery must not break core flows.
 */
export async function notifyUser({
  userId,
  type,
  title,
  message,
  link = null,
  meta = {},
  important = false,
}) {
  try {
    if (!userId || !type || !title || !message) return null;
    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      meta,
      important,
    });
  } catch (error) {
    console.error('notifyUser failed', error?.message || error);
    return null;
  }
}
