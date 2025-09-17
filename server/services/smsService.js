// services/smsService.js
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send SMS utility
const sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent successfully:', result.sid);
    return { 
      success: true, 
      sid: result.sid,
      status: result.status 
    };
  } catch (error) {
    console.error('SMS send error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Send issue status update SMS
const sendIssueStatusSMS = async (user, issue, newStatus) => {
  const statusMessages = {
    verified: `✅ Your issue "${issue.title}" has been verified and forwarded to authorities.`,
    rejected: `❌ Your issue "${issue.title}" needs more information. Check your email for details.`,
    assigned: `📋 Your issue "${issue.title}" has been assigned to the relevant department.`,
    in_progress: `🔧 Work has started on your issue "${issue.title}".`,
    resolved: `🎉 Great news! Your issue "${issue.title}" has been resolved.`,
    closed: `📁 Your issue "${issue.title}" has been closed.`
  };

  const message = `${statusMessages[newStatus]}\n\nView details: ${process.env.CLIENT_URL}/issues/${issue._id}`;

  // Only send SMS if user has opted in for SMS notifications
  if (user.preferences && user.preferences.smsNotifications) {
    return sendSMS(user.phone, message);
  }

  return { success: true, skipped: true, reason: 'SMS notifications disabled' };
};

// Send authority notification SMS
const sendAuthorityNotificationSMS = async (authority, issue) => {
  const message = `🚨 NEW ISSUE ASSIGNED
${issue.title}

Category: ${issue.category.replace('_', ' ')}
Priority: ${issue.priority}
Location: ${issue.location.address}

View: ${process.env.CLIENT_URL}/authority/issues/${issue._id}`;

  // Check if authority wants SMS notifications and if urgent only filter applies
  const shouldSend = authority.notificationPreferences.smsNotifications && 
    (!authority.notificationPreferences.urgentOnly || issue.priority === 'urgent');

  if (shouldSend) {
    return sendSMS(authority.contact.phone, message);
  }

  return { success: true, skipped: true, reason: 'SMS notifications disabled or not urgent' };
};

// Send urgent issue alert SMS
const sendUrgentIssueAlertSMS = async (authority, issue) => {
  const message = `🚨 URGENT ISSUE ALERT 🚨
${issue.title}

Location: ${issue.location.address}
Reporter: ${issue.reporter.name}

IMMEDIATE ATTENTION REQUIRED

View: ${process.env.CLIENT_URL}/authority/issues/${issue._id}`;

  return sendSMS(authority.contact.phone, message);
};

// Send verification code SMS
const sendVerificationCodeSMS = async (phone, code) => {
  const message = `Your Voice2Action verification code is: ${code}

This code will expire in 10 minutes. Do not share this code with anyone.`;

  return sendSMS(phone, message);
};

// Send password reset code SMS
const sendPasswordResetCodeSMS = async (user, code) => {
  const message = `Your Voice2Action password reset code is: ${code}

This code will expire in 10 minutes. If you didn't request this, please ignore.`;

  return sendSMS(user.phone, message);
};

// Send emergency alert SMS (for critical infrastructure issues)
const sendEmergencyAlertSMS = async (phone, issue) => {
  const message = `🚨 EMERGENCY ALERT 🚨
Critical infrastructure issue reported: ${issue.title}

Location: ${issue.location.address}
Time: ${new Date(issue.createdAt).toLocaleString()}

Immediate response required.

View: ${process.env.CLIENT_URL}/issues/${issue._id}`;

  return sendSMS(phone, message);
};

// Send bulk SMS to multiple recipients
const sendBulkSMS = async (phoneNumbers, message) => {
  const results = [];
  
  for (const phone of phoneNumbers) {
    try {
      const result = await sendSMS(phone, message);
      results.push({ phone, ...result });
    } catch (error) {
      results.push({ 
        phone, 
        success: false, 
        error: error.message 
      });
    }
  }

  return {
    total: phoneNumbers.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
};

// Send weekly summary SMS
const sendWeeklySummarySMS = async (user, stats) => {
  const message = `📊 Voice2Action Weekly Summary

Your Impact:
✅ ${stats.issuesReported} issues reported
🎯 ${stats.issuesResolved} issues resolved  
⭐ ${stats.points} points earned
🏆 Rank #${stats.rank}

Keep making a difference!

View: ${process.env.CLIENT_URL}/dashboard`;

  if (user.preferences && user.preferences.smsNotifications) {
    return sendSMS(user.phone, message);
  }

  return { success: true, skipped: true, reason: 'SMS notifications disabled' };
};

// Send maintenance notification SMS
const sendMaintenanceNotificationSMS = async (phoneNumbers, maintenanceInfo) => {
  const message = `🔧 Voice2Action Maintenance Notice

Scheduled maintenance: ${maintenanceInfo.date} at ${maintenanceInfo.time}
Expected duration: ${maintenanceInfo.duration}

During this time, some features may be temporarily unavailable.

Thank you for your patience!`;

  return sendBulkSMS(phoneNumbers, message);
};

module.exports = {
  sendSMS,
  sendIssueStatusSMS,
  sendAuthorityNotificationSMS,
  sendUrgentIssueAlertSMS,
  sendVerificationCodeSMS,
  sendPasswordResetCodeSMS,
  sendEmergencyAlertSMS,
  sendBulkSMS,
  sendWeeklySummarySMS,
  sendMaintenanceNotificationSMS
};