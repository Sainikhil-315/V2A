// src/components/common/NotificationToast.jsx
import React, { useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const NotificationToast = () => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Real-time notification handlers
    const handleNotification = (data) => {
      const { type, title, message, icon, duration = 4000 } = data;
      
      const toastOptions = {
        duration,
        position: 'top-right',
        icon: icon || getDefaultIcon(type),
        style: {
          borderRadius: '8px',
          background: getBackgroundColor(type),
          color: getTextColor(type),
          border: `1px solid ${getBorderColor(type)}`
        }
      };

      switch (type) {
        case 'success':
          toast.success(message, toastOptions);
          break;
        case 'error':
          toast.error(message, toastOptions);
          break;
        case 'warning':
          toast(message, { ...toastOptions, icon: '⚠️' });
          break;
        case 'info':
          toast(message, { ...toastOptions, icon: 'ℹ️' });
          break;
        default:
          toast(message, toastOptions);
      }
    };

    const handleIssueStatusChanged = (data) => {
      const statusMessages = {
        verified: '✅ Your issue has been verified',
        rejected: '❌ Your issue was rejected',
        assigned: '📋 Your issue has been assigned',
        in_progress: '🔧 Work has started on your issue',
        resolved: '🎉 Your issue has been resolved!',
        closed: '📁 Your issue has been closed'
      };

      const message = statusMessages[data.newStatus] || 'Issue status updated';
      
      toast.success(message, {
        duration: 6000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: '#ffffff',
          borderRadius: '8px',
          fontWeight: '500'
        }
      });
    };

    const handleNewIssueSubmitted = (data) => {
      toast(`🚨 New issue: ${data.title}`, {
        duration: 5000,
        position: 'top-right',
        style: {
          background: '#3b82f6',
          color: '#ffffff',
          borderRadius: '8px'
        }
      });
    };

    const handleCommentAdded = (data) => {
      if (data.user.name) {
        toast(`💬 ${data.user.name} commented on an issue`, {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#6366f1',
            color: '#ffffff',
            borderRadius: '8px'
          }
        });
      }
    };

    const handleUrgentIssueAlert = (data) => {
      toast(`🚨 URGENT: ${data.title}`, {
        duration: 8000,
        position: 'top-center',
        style: {
          background: '#ef4444',
          color: '#ffffff',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '16px'
        }
      });
    };

    const handleSystemAnnouncement = (data) => {
      const icon = data.type === 'warning' ? '⚠️' : 
                  data.type === 'success' ? '✅' : 
                  data.type === 'error' ? '❌' : '📢';

      toast(data.message, {
        duration: data.priority === 'high' ? 10000 : 6000,
        position: 'top-center',
        icon: icon,
        style: {
          background: data.type === 'warning' ? '#f59e0b' : 
                     data.type === 'success' ? '#10b981' : 
                     data.type === 'error' ? '#ef4444' : '#3b82f6',
          color: '#ffffff',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center'
        }
      });
    };

    const handleConnectionStatus = (data) => {
      if (data.connected) {
        toast.success('Connected to server', {
          duration: 2000,
          position: 'bottom-right',
          style: {
            background: '#10b981',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '14px'
          }
        });
      } else {
        toast.error('Connection lost', {
          duration: 3000,
          position: 'bottom-right',
          style: {
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '14px'
          }
        });
      }
    };

    // Listen to socket events
    socket.on('notification', handleNotification);
    socket.on('issue_status_changed', handleIssueStatusChanged);
    socket.on('new_issue_submitted', handleNewIssueSubmitted);
    socket.on('comment_added', handleCommentAdded);
    socket.on('urgent_issue_alert', handleUrgentIssueAlert);
    socket.on('system_announcement', handleSystemAnnouncement);
    socket.on('connection_status', handleConnectionStatus);

    // Cleanup listeners
    return () => {
      socket.off('notification', handleNotification);
      socket.off('issue_status_changed', handleIssueStatusChanged);
      socket.off('new_issue_submitted', handleNewIssueSubmitted);
      socket.off('comment_added', handleCommentAdded);
      socket.off('urgent_issue_alert', handleUrgentIssueAlert);
      socket.off('system_announcement', handleSystemAnnouncement);
      socket.off('connection_status', handleConnectionStatus);
    };
  }, [socket, isConnected]);

  // Listen for custom events from other components
  useEffect(() => {
    const handleCustomToast = (event) => {
      const { type, message, options = {} } = event.detail;
      
      const defaultOptions = {
        duration: 4000,
        position: 'top-right',
        style: {
          borderRadius: '8px',
          background: getBackgroundColor(type),
          color: getTextColor(type)
        }
      };

      const mergedOptions = { ...defaultOptions, ...options };

      switch (type) {
        case 'success':
          toast.success(message, mergedOptions);
          break;
        case 'error':
          toast.error(message, mergedOptions);
          break;
        case 'warning':
          toast(message, { ...mergedOptions, icon: '⚠️' });
          break;
        case 'info':
          toast(message, { ...mergedOptions, icon: 'ℹ️' });
          break;
        default:
          toast(message, mergedOptions);
      }
    };

    window.addEventListener('customToast', handleCustomToast);
    return () => window.removeEventListener('customToast', handleCustomToast);
  }, []);

  // This component doesn't render anything visible
  return null;
};

// Helper functions
const getDefaultIcon = (type) => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '🔔';
  }
};

const getBackgroundColor = (type) => {
  switch (type) {
    case 'success':
      return '#10b981';
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'info':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
};

const getTextColor = (type) => {
  return '#ffffff'; // Always white text for better contrast
};

const getBorderColor = (type) => {
  switch (type) {
    case 'success':
      return '#059669';
    case 'error':
      return '#dc2626';
    case 'warning':
      return '#d97706';
    case 'info':
      return '#2563eb';
    default:
      return '#4b5563';
  }
};

// Custom hook for programmatic toasts
export const useCustomToast = () => {
  const showToast = (type, message, options = {}) => {
    window.dispatchEvent(new CustomEvent('customToast', {
      detail: { type, message, options }
    }));
  };

  return {
    success: (message, options) => showToast('success', message, options),
    error: (message, options) => showToast('error', message, options),
    warning: (message, options) => showToast('warning', message, options),
    info: (message, options) => showToast('info', message, options),
    custom: (message, options) => showToast('custom', message, options)
  };
};

export default NotificationToast;