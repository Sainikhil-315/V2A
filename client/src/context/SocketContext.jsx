// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && token && !socket) {
      initializeSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, token]);

  const initializeSocket = () => {
    const newSocket = io(process.env.VITE_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Join user-specific room
      if (user) {
        newSocket.emit('join_user_room', user.id);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        setTimeout(() => {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            newSocket.connect();
          }
        }, 1000 * reconnectAttempts.current);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Real-time event listeners
    setupEventListeners(newSocket);

    setSocket(newSocket);
  };

  const setupEventListeners = (socket) => {
    // Issue-related events
    socket.on('issue_status_changed', (data) => {
      console.log('Issue status changed:', data);
      toast.success(`Issue "${data.title}" status updated to ${data.newStatus}`);
      
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('issueStatusChanged', { detail: data }));
    });

    socket.on('new_issue_submitted', (data) => {
      console.log('New issue submitted:', data);
      if (user?.role === 'admin') {
        toast(`New issue: ${data.title}`, {
          icon: '🚨',
          duration: 6000
        });
      }
      
      window.dispatchEvent(new CustomEvent('newIssueSubmitted', { detail: data }));
    });

    socket.on('comment_added', (data) => {
      console.log('Comment added:', data);
      if (data.user.name !== user?.name) {
        toast(`${data.user.name} commented on an issue`, {
          icon: '💬'
        });
      }
      
      window.dispatchEvent(new CustomEvent('commentAdded', { detail: data }));
    });

    socket.on('upvote_updated', (data) => {
      console.log('Upvote updated:', data);
      window.dispatchEvent(new CustomEvent('upvoteUpdated', { detail: data }));
    });

    // System events
    socket.on('system_announcement', (data) => {
      console.log('System announcement:', data);
      
      const toastOptions = {
        duration: 8000,
        icon: data.type === 'info' ? 'ℹ️' : 
              data.type === 'warning' ? '⚠️' : 
              data.type === 'success' ? '✅' : '📢'
      };

      if (data.priority === 'high') {
        toast.error(data.message, { ...toastOptions, duration: 10000 });
      } else {
        toast(data.message, toastOptions);
      }
    });

    socket.on('user_typing_comment', (data) => {
      window.dispatchEvent(new CustomEvent('userTypingComment', { detail: data }));
    });

    socket.on('urgent_issue_alert', (data) => {
      console.log('Urgent issue alert:', data);
      if (user?.role === 'admin') {
        toast.error(`Urgent Issue: ${data.title}`, {
          duration: 10000,
          icon: '🚨'
        });
      }
      
      window.dispatchEvent(new CustomEvent('urgentIssueAlert', { detail: data }));
    });

    // Leaderboard updates
    socket.on('leaderboard_updated', (data) => {
      window.dispatchEvent(new CustomEvent('leaderboardUpdated', { detail: data }));
    });

    // Online users
    socket.on('online_users_updated', (users) => {
      setOnlineUsers(users);
    });

    // Notification events
    socket.on('notification', (data) => {
      console.log('Notification received:', data);
      
      const toastOptions = {
        duration: 5000,
        icon: data.icon || '🔔'
      };

      switch (data.type) {
        case 'success':
          toast.success(data.message, toastOptions);
          break;
        case 'error':
          toast.error(data.message, toastOptions);
          break;
        case 'warning':
          toast(data.message, { ...toastOptions, icon: '⚠️' });
          break;
        default:
          toast(data.message, toastOptions);
      }
    });
  };

  // Socket utility functions
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  };

  const joinRoom = (room) => {
    emit('join_room', room);
  };

  const leaveRoom = (room) => {
    emit('leave_room', room);
  };

  const joinIssueRoom = (issueId) => {
    emit('join_issue', issueId);
  };

  const leaveIssueRoom = (issueId) => {
    emit('leave_issue', issueId);
  };

  const joinLocationRoom = (locationData) => {
    emit('join_location', locationData);
  };

  const sendTypingIndicator = (issueId, isTyping) => {
    emit('typing_comment', { issueId, isTyping });
  };

  const sendIssueUpdate = (issueId, updateData) => {
    emit('issue_update', { issueId, ...updateData });
  };

  // Context value
  const value = {
    socket,
    isConnected,
    onlineUsers,
    
    // Utility functions
    emit,
    joinRoom,
    leaveRoom,
    joinIssueRoom,
    leaveIssueRoom,
    joinLocationRoom,
    sendTypingIndicator,
    sendIssueUpdate,
    
    // Connection management
    reconnect: () => {
      if (socket) {
        socket.connect();
      } else {
        initializeSocket();
      }
    },
    
    disconnect: () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;