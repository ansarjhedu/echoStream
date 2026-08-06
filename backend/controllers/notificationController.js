import Notification from '../models/Notification.js';

const listNotifications = async (req, res) => {
  try {
    const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
    if (!targetOwnerId) {
      return res.status(200).json({ data: [], unread: 0 });
    }

    const filter = { user: targetOwnerId };
    if (req.query.unread === '1') filter.isRead = false;
    if (req.query.important === '1') filter.important = true;

    const [items, unread] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(80),
      Notification.countDocuments({ user: targetOwnerId, isRead: false }),
    ]);

    return res.status(200).json({ data: items, unread });
  } catch (error) {
    console.error('listNotifications', error);
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: targetOwnerId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: 'Notification not found' });
    return res.status(200).json({ data: note });
  } catch (error) {
    console.error('markNotificationRead', error);
    return res.status(500).json({ message: 'Failed to update notification' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
    await Notification.updateMany({ user: targetOwnerId, isRead: false }, { $set: { isRead: true } });
    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllNotificationsRead', error);
    return res.status(500).json({ message: 'Failed to mark notifications read' });
  }
};

export { listNotifications, markNotificationRead, markAllNotificationsRead };
