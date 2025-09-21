// server.js
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');
const { setupSocket } = require('./config/socket');
const NotificationService = require('./services/notificationService');

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://192.168.0.187:3000',
  'http://192.168.0.187:8081',
  'exp://kdn9mau-anonymous-8081.exp.direct'
];

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

setupSocket(io);


// Initialize notification service with socket.io
const notificationService = new NotificationService(io);

// Make notification service available globally
app.set('notificationService', notificationService);
app.set('io', io);

// Scheduled tasks
// Send weekly reports every Sunday at 9 AM
cron.schedule('0 9 * * 0', async () => {
  console.log('Running weekly report task...');
  try {
    const User = require('./models/User');
    const Issue = require('./models/Issue');
    const { sendBulkSMS } = require('./services/smsService');
    
    // Get active users
    const users = await User.find({ 
      'preferences.emailNotifications': true 
    }).limit(100);
    
    // Generate and send weekly reports
    for (const user of users) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const userIssues = await Issue.find({
        reporter: user._id,
        createdAt: { $gte: weekAgo }
      });
      
      const resolvedIssues = await Issue.find({
        reporter: user._id,
        status: 'resolved',
        updatedAt: { $gte: weekAgo }
      });
      
      const stats = {
        issuesReported: userIssues.length,
        issuesResolved: resolvedIssues.length,
        points: (userIssues.length * 2) + (resolvedIssues.length * 5),
        rank: user.stats.contributionScore // This would be calculated properly
      };
      
      // Send weekly summary SMS
      if (user.phone && user.preferences.smsNotifications) {
        await require('./services/smsService').sendWeeklySummarySMS(user, stats);
      }
    }
    
    console.log('Weekly reports sent successfully');
  } catch (error) {
    console.error('Weekly report task error:', error);
  }
});

// Update user contribution scores daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Updating user contribution scores...');
  try {
    const User = require('./models/User');
    const Contribution = require('./models/Contribution');
    
    const users = await User.find({});
    
    for (const user of users) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Calculate monthly points
      const monthlyContributions = await Contribution.aggregate([
        {
          $match: {
            user: user._id,
            month: currentMonth,
            year: currentYear
          }
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$points' }
          }
        }
      ]);
      
      const monthlyPoints = monthlyContributions[0]?.totalPoints || 0;
      
      // Update user stats
      await User.findByIdAndUpdate(user._id, {
        'stats.contributionScore': monthlyPoints,
        'stats.lastUpdated': new Date()
      });
    }
    
    console.log('User contribution scores updated');
  } catch (error) {
    console.error('Contribution score update error:', error);
  }
});

// Clean up old notifications and temporary data weekly
cron.schedule('0 2 * * 1', async () => {
  console.log('Running cleanup task...');
  try {
    const Issue = require('./models/Issue');
    
    // Remove old rejected issues (older than 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const result = await Issue.deleteMany({
      status: 'rejected',
      updatedAt: { $lt: threeMonthsAgo }
    });
    
    console.log(`Cleaned up ${result.deletedCount} old rejected issues`);
    
    // Additional cleanup tasks can be added here
    // - Clean up temporary files
    // - Archive old completed issues
    // - Update authority performance metrics
    
  } catch (error) {
    console.error('Cleanup task error:', error);
  }
});

// Send monthly reports on the 1st of every month at 10 AM
cron.schedule('0 10 1 * *', async () => {
  console.log('Sending monthly reports...');
  try {
    const User = require('./models/User');
    const Contribution = require('./models/Contribution');
    
    const currentDate = new Date();
    const lastMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
    const year = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    
    // Get leaderboard data for last month
    const leaderboardData = await Contribution.getMonthlyLeaderboard(lastMonth, year, 50);
    
    // Get all users who want monthly reports
    const users = await User.find({ 
      'preferences.emailNotifications': true 
    });
    
    // Send monthly reports
    await notificationService.sendMonthlyReports(users, leaderboardData);
    
    console.log('Monthly reports sent successfully');
  } catch (error) {
    console.error('Monthly report task error:', error);
  }
});

// Backup database daily at 3 AM (placeholder for actual backup logic)
cron.schedule('0 3 * * *', async () => {
  console.log('Running database backup...');
  // In production, you would implement actual database backup logic here
  // This could involve:
  // - Creating MongoDB dumps
  // - Uploading to cloud storage
  // - Rotating old backups
  console.log('Database backup completed (placeholder)');
});

// Server startup
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
🚀 Voice2Action Server Started Successfully!

📡 Server running on port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Socket.IO enabled for real-time updates
📅 Scheduled tasks configured
📧 Email service ready
📱 SMS service ready
☁️  Cloudinary integration active

🎯 Ready to accept civic issue reports!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = server;