import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamNotification } from '@/types/team';
import './TeamNotifications.css';

export const TeamNotifications = () => {
  const { currentTeam } = useWorkspace();
  const [notifications, setNotifications] = useState<TeamNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    if (!currentTeam) return;
    loadNotifications();
  }, [currentTeam]);

  const loadNotifications = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.getNotifications(currentTeam.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await teamApi.markNotificationRead(notificationId);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'page_shared': return '📄';
      case 'mention': return '👤';
      case 'contradiction': return '⚠️';
      case 'review_request': return '📋';
      case 'graph_update': return '🔵';
      default: return '🔔';
    }
  };

  if (!currentTeam) return <div className="notifications-empty">No team selected</div>;

  return (
    <div className="team-notifications">
      <div className="notifications-header">
        <h2>Notifications</h2>
        <div className="notifications-actions">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <button className="refresh-btn" onClick={loadNotifications}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading notifications...</div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-card ${!notification.read ? 'unread' : ''}`}
              onClick={() => {
                if (!notification.read) handleMarkRead(notification.id);
              }}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <span className="notification-date">
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </div>
              {!notification.read && (
                <div className="unread-indicator"></div>
              )}
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="empty-state">
              <p>No notifications found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};