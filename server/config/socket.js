// config/socket.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Issue = require('../models/Issue');

const setupSocket = (io) => {
  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.email})`);
    
    // Join user to their personal room
    socket.join(`user_${socket.user._id}`);
    
    // Join role-based rooms
    socket.join(`role_${socket.user.role}`);
    
    // Handle joining location-based rooms
    socket.on('join_location', (locationData) => {
      if (locationData && locationData.ward) {
        socket.join(`ward_${locationData.ward}`);
      }
      if (locationData && locationData.district) {
        socket.join(`district_${locationData.district}`);
      }
    });

    // Handle joining issue-specific rooms
    socket.on('join_issue', (issueId) => {
      if (issueId) {
        socket.join(`issue_${issueId}`);
      }
    });

    // Handle leaving issue rooms
    socket.on('leave_issue', (issueId) => {
      if (issueId) {
        socket.leave(`issue_${issueId}`);
      }
    });

    // Handle real-time issue updates
    socket.on('issue_update', (data) => {
      // Only admins can broadcast issue updates
      if (socket.user.role === 'admin') {
        socket.to(`issue_${data.issueId}`).emit('issue_status_changed', data);
      }
    });

    // Handle new comment notifications
    socket.on('new_comment', (data) => {
      socket.to(`issue_${data.issueId}`).emit('comment_added', {
        issueId: data.issueId,
        comment: data.comment,
        user: {
          name: socket.user.name,
          avatar: socket.user.avatar
        }
      });
    });

    // Handle upvote notifications
    socket.on('issue_upvoted', (data) => {
      socket.to(`issue_${data.issueId}`).emit('upvote_added', {
        issueId: data.issueId,
        upvotes: data.upvotes,
        user: socket.user.name
      });
    });

    // Handle typing indicators for comments
    socket.on('typing_comment', (data) => {
      socket.to(`issue_${data.issueId}`).emit('user_typing_comment', {
        issueId: data.issueId,
        user: socket.user.name,
        isTyping: data.isTyping
      });
    });

    // Handle admin notifications
    socket.on('admin_notification', (data) => {
      if (socket.user.role === 'admin') {
        io.to('role_admin').emit('admin_alert', data);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user.name} - Reason: ${reason}`);
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('issue:view', async (issueId) => {
      try {
        const issue = await Issue.findByIdAndUpdate(
          issueId,
          { $inc: { views: 1 } },
          { new: true }
        );
        if (issue) {
          // Emit updated view count to all clients viewing this issue
          io.emit(`issue:${issueId}:views`, issue.views);
        }
      } catch (err) {
        console.error('Error incrementing view count:', err);
      }
    });
  });

  return io;
};

// Emit notification to specific user
const emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

// Emit notification to all users with specific role
const emitToRole = (io, role, event, data) => {
  io.to(`role_${role}`).emit(event, data);
};

// Emit notification to users in specific location
const emitToLocation = (io, location, event, data) => {
  if (location.ward) {
    io.to(`ward_${location.ward}`).emit(event, data);
  }
  if (location.district) {
    io.to(`district_${location.district}`).emit(event, data);
  }
};

// Emit notification to users following specific issue
const emitToIssue = (io, issueId, event, data) => {
  io.to(`issue_${issueId}`).emit(event, data);
};

// Broadcast system announcement
const broadcastAnnouncement = (io, announcement) => {
  io.emit('system_announcement', {
    message: announcement.message,
    type: announcement.type || 'info',
    timestamp: new Date(),
    priority: announcement.priority || 'normal'
  });
};

// Send issue status update notifications
const notifyIssueStatusUpdate = (io, issue, oldStatus, newStatus, updatedBy) => {
  const notification = {
    issueId: issue._id,
    title: issue.title,
    oldStatus,
    newStatus,
    updatedBy: updatedBy.name,
    timestamp: new Date()
  };

  // Notify issue reporter
  emitToUser(io, issue.reporter, 'issue_status_updated', notification);

  // Notify issue followers (users who commented or upvoted)
  emitToIssue(io, issue._id, 'issue_status_changed', notification);

  // Notify admins if status change requires attention
  if (newStatus === 'pending' || newStatus === 'urgent') {
    emitToRole(io, 'admin', 'issue_needs_attention', notification);
  }
};

// Send new issue notifications
const notifyNewIssue = (io, issue) => {
  const notification = {
    issueId: issue._id,
    title: issue.title,
    category: issue.category,
    priority: issue.priority,
    reporter: issue.reporter.name,
    location: issue.location,
    timestamp: new Date()
  };

  // Notify all admins
  emitToRole(io, 'admin', 'new_issue_submitted', notification);

  // Notify users in same location if public issue
  if (issue.visibility === 'public') {
    emitToLocation(io, issue.location, 'new_local_issue', notification);
  }
};

module.exports = {
  setupSocket,
  emitToUser,
  emitToRole,
  emitToLocation,
  emitToIssue,
  broadcastAnnouncement,
  notifyIssueStatusUpdate,
  notifyNewIssue
};