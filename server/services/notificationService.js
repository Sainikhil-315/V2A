// services/notificationService.js
const emailService = require('./emailService');
const smsService = require('./smsService');
const { emitToUser, emitToRole, notifyIssueStatusUpdate } = require('../config/socket');

// Unified notification service
class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Send issue status update notifications
  async notifyIssueStatusChange(issue, oldStatus, newStatus, updatedBy, adminNotes = '') {
    const notifications = [];

    try {
      // Get reporter details
      const reporter = await issue.populate('reporter');
      
      // 1. Real-time notification via Socket.IO
      if (this.io) {
        notifyIssueStatusUpdate(this.io, issue, oldStatus, newStatus, updatedBy);
        notifications.push({ type: 'realtime', success: true });
      }

      // 2. Email notification
      const emailResult = await emailService.sendIssueStatusEmail(
        reporter.reporter, 
        issue, 
        newStatus, 
        adminNotes
      );
      notifications.push({ type: 'email', ...emailResult });

      // 3. SMS notification (if enabled)
      if (reporter.reporter.phone && reporter.reporter.preferences.smsNotifications) {
        const smsResult = await smsService.sendIssueStatusSMS(
          reporter.reporter, 
          issue, 
          newStatus
        );
        notifications.push({ type: 'sms', ...smsResult });
      }

      return {
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          successful: notifications.filter(n => n.success).length,
          failed: notifications.filter(n => !n.success).length
        }
      };

    } catch (error) {
      console.error('Notification service error:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  // Send new issue notifications to authorities
  async notifyNewIssue(issue, authorities) {
    const notifications = [];

    try {
      for (const authority of authorities) {
        // Email notification
        const emailResult = await emailService.sendAuthorityNotificationEmail(
          authority, 
          issue
        );
        notifications.push({ 
          type: 'email', 
          authority: authority.name, 
          ...emailResult 
        });

        // SMS notification
        const smsResult = await smsService.sendAuthorityNotificationSMS(
          authority, 
          issue
        );
        notifications.push({ 
          type: 'sms', 
          authority: authority.name, 
          ...smsResult 
        });
      }

      // Real-time notification to admins
      if (this.io) {
        this.io.to('role_admin').emit('new_issue_submitted', {
          issueId: issue._id,
          title: issue.title,
          category: issue.category,
          priority: issue.priority,
          reporter: issue.reporter.name,
          location: issue.location,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          successful: notifications.filter(n => n.success).length,
          failed: notifications.filter(n => !n.success).length
        }
      };

    } catch (error) {
      console.error('New issue notification error:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  // Send urgent issue alerts
  async sendUrgentAlert(issue, emergencyContacts) {
    const notifications = [];

    try {
      for (const contact of emergencyContacts) {
        // Emergency SMS
        const smsResult = await smsService.sendUrgentIssueAlertSMS(
          contact, 
          issue
        );
        notifications.push({ 
          type: 'urgent_sms', 
          contact: contact.name, 
          ...smsResult 
        });

        // Emergency email
        const emailResult = await emailService.sendAuthorityNotificationEmail(
          contact, 
          issue
        );
        notifications.push({ 
          type: 'urgent_email', 
          contact: contact.name, 
          ...emailResult 
        });
      }

      // Real-time urgent alert
      if (this.io) {
        this.io.emit('urgent_issue_alert', {
          issueId: issue._id,
          title: issue.title,
          location: issue.location,
          priority: issue.priority,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          successful: notifications.filter(n => n.success).length,
          failed: notifications.filter(n => !n.success).length
        }
      };

    } catch (error) {
      console.error('Urgent alert error:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  // Send welcome notification to new users
  async sendWelcomeNotification(user) {
    const notifications = [];

    try {
      // Welcome email
      const emailResult = await emailService.sendWelcomeEmail(user);
      notifications.push({ type: 'welcome_email', ...emailResult });

      // Welcome SMS (optional)
      if (user.phone && user.preferences.smsNotifications) {
        const message = `Welcome to Voice2Action! 🎉 Start reporting issues and help improve your community. Download the app: ${process.env.CLIENT_URL}`;
        const smsResult = await smsService.sendSMS(user.phone, message);
        notifications.push({ type: 'welcome_sms', ...smsResult });
      }

      // Real-time welcome message
      if (this.io) {
        emitToUser(this.io, user._id, 'welcome_message', {
          message: 'Welcome to Voice2Action! Ready to make a difference?',
          type: 'success',
          timestamp: new Date()
        });
      }

      return {
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          successful: notifications.filter(n => n.success).length,
          failed: notifications.filter(n => !n.success).length
        }
      };

    } catch (error) {
      console.error('Welcome notification error:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  // Send monthly reports
  async sendMonthlyReports(users, reportData) {
    const notifications = [];

    try {
      for (const user of users) {
        const userReport = reportData.find(r => r.userId.toString() === user._id.toString());
        
        if (userReport && user.preferences.emailNotifications) {
          const emailResult = await emailService.sendMonthlyReportEmail(user, userReport);
          notifications.push({ 
            type: 'monthly_report', 
            user: user.email, 
            ...emailResult 
          });
        }
      }

      return {
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          successful: notifications.filter(n => n.success).length,
          failed: notifications.filter(n => !n.success).length
        }
      };

    } catch (error) {
      console.error('Monthly report error:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  // Send system announcements
  async sendSystemAnnouncement(announcement, targetUsers = null) {
    const notifications = [];

    try {
      // Real-time announcement
      if (this.io) {
        if (targetUsers) {
          targetUsers.forEach(userId => {
            emitToUser(this.io, userId, 'system_announcement', announcement);
          });
        } else {
          this.io.emit('system_announcement', announcement);
        }
        notifications.push({ type: 'realtime_announcement', success: true });
      }

      // Email announcement (if specified)
      if (announcement.sendEmail && announcement.recipients) {
        for (const recipient of announcement.recipients) {
          const emailResult = await emailService.sendEmail(
            recipient.email,
            announcement.subject,
            announcement.html
          );
          notifications.push({ 
            type: 'announcement_email', 
            recipient: recipient.email, 
            ...emailResult 
          });
        }
      }

      return {
        success: true,
        notifications,
        summary: {
          total: notifications.length,
          successful: notifications.filter(n => n.success).length,
          failed: notifications.filter(n => !n.success).length
        }
      };

    } catch (error) {
      console.error('System announcement error:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }
}

module.exports = NotificationService;