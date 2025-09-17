// services/emailService.js
const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use app password for Gmail
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send email utility
const sendEmail = async (to, subject, html, text = null) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML if no text provided
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Welcome email template
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to Voice2Action!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to Voice2Action! 🎉</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>Thank you for joining Voice2Action - your platform for making your community better!</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">What you can do:</h3>
        <ul style="color: #374151;">
          <li>📸 Report issues with photos, videos, or voice recordings</li>
          <li>📍 Track your reports with real-time updates</li>
          <li>🏆 Earn points and climb the contributor leaderboard</li>
          <li>🤝 Help make your community a better place</li>
        </ul>
      </div>
      
      <p>Ready to get started? <a href="${process.env.CLIENT_URL}/dashboard" style="color: #2563eb; text-decoration: none;">Visit your dashboard</a></p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        Best regards,<br>
        The Voice2Action Team
      </p>
    </div>
  `;

  return sendEmail(user.email, subject, html);
};

// Issue status update email
const sendIssueStatusEmail = async (user, issue, newStatus, adminNotes = '') => {
  const statusMessages = {
    verified: 'Your issue has been verified and forwarded to the appropriate authority.',
    rejected: 'Your issue has been reviewed and requires additional information.',
    assigned: 'Your issue has been assigned to the relevant department.',
    in_progress: 'Work has begun on resolving your issue.',
    resolved: 'Great news! Your issue has been resolved.',
    closed: 'Your issue has been closed.'
  };

  const statusColors = {
    verified: '#10b981',
    rejected: '#ef4444', 
    assigned: '#f59e0b',
    in_progress: '#3b82f6',
    resolved: '#10b981',
    closed: '#6b7280'
  };

  const subject = `Issue Update: ${issue.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Issue Status Update</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>Your issue "<strong>${issue.title}</strong>" has been updated.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <div style="width: 12px; height: 12px; background-color: ${statusColors[newStatus]}; border-radius: 50%; margin-right: 10px;"></div>
          <span style="font-weight: bold; text-transform: capitalize;">${newStatus.replace('_', ' ')}</span>
        </div>
        
        <p style="margin: 0; color: #374151;">${statusMessages[newStatus]}</p>
        
        ${adminNotes ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #e5e7eb; border-radius: 4px;">
            <strong>Additional Notes:</strong><br>
            ${adminNotes}
          </div>
        ` : ''}
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <strong>Issue Details:</strong><br>
        <strong>Location:</strong> ${issue.location.address}<br>
        <strong>Category:</strong> ${issue.category.replace('_', ' ')}<br>
        <strong>Reported:</strong> ${new Date(issue.createdAt).toLocaleDateString()}
      </div>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/issues/${issue._id}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Issue Details
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        Thank you for using Voice2Action to improve your community!<br>
        The Voice2Action Team
      </p>
    </div>
  `;

  return sendEmail(user.email, subject, html);
};

// Authority notification email
const sendAuthorityNotificationEmail = async (authority, issue) => {
  const subject = `New Issue Assigned: ${issue.category.replace('_', ' ')}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">New Issue Alert</h2>
      
      <p>Dear ${authority.name},</p>
      
      <p>A new issue has been assigned to your department for resolution.</p>
      
      <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
        <h3 style="color: #991b1b; margin-top: 0;">${issue.title}</h3>
        
        <p style="margin: 10px 0;"><strong>Description:</strong><br>${issue.description}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
          <div><strong>Category:</strong> ${issue.category.replace('_', ' ')}</div>
          <div><strong>Priority:</strong> ${issue.priority}</div>
          <div><strong>Location:</strong> ${issue.location.address}</div>
          <div><strong>Reported:</strong> ${new Date(issue.createdAt).toLocaleDateString()}</div>
        </div>
        
        ${issue.media && issue.media.length > 0 ? `
          <p><strong>Attachments:</strong> ${issue.media.length} file(s) attached</p>
        ` : ''}
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
        <strong>Reporter Information:</strong><br>
        <strong>Name:</strong> ${issue.reporter.name}<br>
        <strong>Email:</strong> ${issue.reporter.email}<br>
        ${issue.reporter.phone ? `<strong>Phone:</strong> ${issue.reporter.phone}<br>` : ''}
      </div>
      
      <p style="margin-top: 20px;">
        Please review this issue and update its status accordingly. You can access the full details and media files through your authority portal.
      </p>
      
      <p>
        <a href="${process.env.CLIENT_URL}/authority/issues/${issue._id}" 
           style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Issue Details
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated notification from Voice2Action.<br>
        For support, contact: support@voice2action.com
      </p>
    </div>
  `;

  return sendEmail(authority.contact.email, subject, html);
};

// Password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>You requested a password reset for your Voice2Action account.</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="margin: 0;"><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
      </div>
      
      <p>
        <a href="${resetUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Your Password
        </a>
      </p>
      
      <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      
      <p style="color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${resetUrl}
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        Best regards,<br>
        The Voice2Action Team
      </p>
    </div>
  `;

  return sendEmail(user.email, subject, html);
};

// Monthly report email
const sendMonthlyReportEmail = async (user, reportData) => {
  const subject = `Your Monthly Impact Report - ${reportData.month} ${reportData.year}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your Monthly Impact Report 📊</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>Here's your community contribution summary for ${reportData.month} ${reportData.year}:</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 24px;">${reportData.issuesReported}</h3>
          <p style="margin: 0; color: #374151;">Issues Reported</p>
        </div>
        
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 24px;">${reportData.issuesResolved}</h3>
          <p style="margin: 0; color: #374151;">Issues Resolved</p>
        </div>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 24px;">${reportData.points}</h3>
          <p style="margin: 0; color: #374151;">Points Earned</p>
        </div>
        
        <div style="background-color: #e0e7ff; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: #3730a3; margin: 0 0 10px 0; font-size: 24px;">#${reportData.rank}</h3>
          <p style="margin: 0; color: #374151;">Your Rank</p>
        </div>
      </div>
      
      ${reportData.achievements && reportData.achievements.length > 0 ? `
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">🏆 New Achievements</h3>
          <ul style="color: #374151;">
            ${reportData.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <p>Keep up the great work! Every report helps make our community better.</p>
      
      <p>
        <a href="${process.env.CLIENT_URL}/leaderboard" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Full Leaderboard
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        Thank you for being a Voice2Action community champion!<br>
        The Voice2Action Team
      </p>
    </div>
  `;

  return sendEmail(user.email, subject, html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendIssueStatusEmail,
  sendAuthorityNotificationEmail,
  sendPasswordResetEmail,
  sendMonthlyReportEmail
};