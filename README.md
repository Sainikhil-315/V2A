# Voice2Action Backend API

A comprehensive Node.js backend for the Voice2Action civic issue reporting platform with real-time notifications, file uploads, and gamification features.

## 🚀 Features

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Issue Management** - CRUD operations with media upload support
- **Real-time Updates** - Socket.IO integration for live notifications  
- **Geospatial Queries** - Location-based issue discovery and authority routing
- **Gamification** - Points system, leaderboards, and achievements
- **Multi-channel Notifications** - Email, SMS, and real-time notifications
- **Admin Dashboard** - Comprehensive analytics and bulk operations
- **File Upload** - Cloudinary integration for images, videos, and audio
- **Data Export** - CSV/JSON export capabilities
- **Scheduled Tasks** - Automated reports and cleanup operations

## 📁 Project Structure

```
server/
├── config/
│   ├── database.js          # MongoDB connection
│   ├── cloudinary.js        # File upload service  
│   └── socket.js            # Real-time communication
├── models/
│   ├── User.js              # User schema with stats
│   ├── Issue.js             # Issue reports with timeline
│   ├── Authority.js         # Government departments
│   └── Contribution.js      # Gamification tracking
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── issues.js            # Issue CRUD operations
│   ├── admin.js             # Admin panel APIs
│   ├── authorities.js       # Authority management
│   └── leaderboard.js       # Gamification APIs
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── roleCheck.js         # Permission checks
│   └── upload.js            # File upload handling
├── services/
│   ├── emailService.js      # Email notifications
│   ├── smsService.js        # SMS integration
│   └── notificationService.js # Unified notifications
├── utils/
│   └── validators.js        # Input validation schemas
├── app.js                   # Express configuration
├── server.js               # Server startup
└── package.json            # Dependencies
```

## 🛠 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- Cloudinary account (free tier)
- Twilio account (optional, for SMS)
- Gmail account (for email notifications)

### 1. Clone and Install
```bash
git clone <repository-url>
cd voice2action/server
npm install
```

### 2. Environment Setup
Create a `.env` file:
```env
# Server
PORT=5000
NODE_ENV=development

# Database  
MONGODB_URI=mongodb://localhost:27017/voice2action

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Cloudinary (Free: 10GB storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key  
CLOUDINARY_API_SECRET=your-api-secret

# Twilio (Free: $15 credit)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Voice2Action <your-email@gmail.com>

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### 3. Database Setup
```bash
# Start MongoDB locally or use MongoDB Atlas
mongod

# Database will be created automatically on first run
```

### 4. Start Development Server
```bash
npm run dev
```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /avatar` - Upload profile picture
- `PUT /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `POST /logout` - Logout user

### Issues (`/api/issues`)
- `GET /` - Get all issues (with filters)
- `GET /nearby` - Get issues near location
- `GET /:id` - Get single issue
- `POST /` - Create new issue (with file upload)
- `PUT /:id` - Update issue
- `DELETE /:id` - Delete issue
- `POST /:id/comments` - Add comment
- `POST /:id/upvote` - Upvote/remove upvote
- `GET /my/issues` - Get user's issues
- `GET /stats/overview` - Issue statistics
- `GET /search/text` - Search issues

### Admin (`/api/admin`)
- `GET /dashboard` - Admin dashboard stats
- `GET /issues/pending` - Pending issues
- `PUT /issues/:id/status` - Update issue status
- `POST /issues/bulk` - Bulk operations
- `GET /analytics` - Detailed analytics
- `GET /users` - User management
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /export` - Export data (CSV/JSON)
- `POST /announcement` - Send announcements

### Authorities (`/api/authorities`)
- `GET /` - Get all authorities
- `GET /:id` - Get single authority
- `POST /` - Create authority (admin)
- `PUT /:id` - Update authority (admin)
- `DELETE /:id` - Delete authority (admin)
- `GET /:id/issues` - Authority's assigned issues
- `PUT /:id/issues/:issueId` - Update issue status
- `GET /:id/metrics` - Authority performance
- `GET /department/:dept` - Get by department
- `POST /find-by-location` - Find authority for location
- `GET /stats/overview` - Authority statistics

### Leaderboard (`/api/leaderboard`)
- `GET /monthly` - Monthly leaderboard
- `GET /yearly` - Yearly leaderboard  
- `GET /category` - Category-wise leaderboard
- `GET /user/:userId` - User contribution history
- `GET /stats` - Leaderboard statistics
- `GET /achievements` - User achievements (private)
- `GET /impact` - Community impact metrics

## 🔐 Authentication & Authorization

### JWT Authentication
All protected routes require a Bearer token:
```javascript
Authorization: Bearer <jwt-token>
```

### Roles
- **citizen** - Can report issues, comment, upvote
- **admin** - Full access to all operations

### Middleware Usage
```javascript
// Protect route (requires login)
router.get('/protected', protect, (req, res) => {});

// Admin only
router.get('/admin-only', protect, adminOnly, (req, res) => {});

// Optional auth (user data if logged in)
router.get('/public', optionalAuth, (req, res) => {});
```

## 📤 File Upload

### Supported Formats
- **Images**: JPEG, PNG, GIF, WebP (max 10MB)
- **Videos**: MP4, AVI, MOV, WebM (max 10MB)  
- **Audio**: MP3, WAV, OGG, M4A (max 10MB)

### Upload Process
1. Files uploaded to memory via Multer
2. Processed and uploaded to Cloudinary
3. URLs stored in database
4. Automatic optimization and format conversion

## 🔄 Real-time Features

### Socket.IO Integration
- User authentication via JWT
- Role-based rooms (`role_citizen`, `role_admin`)
- Issue-specific rooms (`issue_${id}`)
- Location-based rooms (`ward_${ward}`)

### Real-time Events
- `new_issue_submitted` - New issue alerts
- `issue_status_changed` - Status updates
- `comment_added` - New comments
- `upvote_updated` - Upvote changes
- `system_announcement` - Admin announcements

## 📧 Notifications

### Multi-channel System
- **Email** - Welcome, status updates, monthly reports
- **SMS** - Urgent alerts, status updates (optional)
- **Real-time** - Instant notifications via Socket.IO

### Notification Types
- Issue status changes
- New issue assignments (authorities)
- Welcome messages
- Password reset
- Monthly contribution reports
- System announcements

## 🏆 Gamification System

### Points System
- **Report Issue**: 2 points
- **Issue Resolved**: 5 points  
- **Add Comment**: 1 point
- **Upvote Issue**: 1 point

### Achievements
- First Reporter, Active Reporter, Super Reporter
- Problem Solver, Solution Master
- Community Supporter, Communicator
- Monthly Member, Community Veteran

### Leaderboards
- Monthly/Yearly rankings
- Category-specific leaderboards
- Community impact metrics
- Achievement tracking

## 📊 Analytics & Reporting

### Admin Dashboard Metrics
- Issue status breakdown
- User registration trends
- Category performance  
- Response time analytics
- Geographic distribution
- Authority performance metrics

### Export Capabilities
- CSV/JSON format
- Issues, users, contributions data
- Date range filtering
- Automated report generation

## ⚙️ Scheduled Tasks

### Automated Operations
- **Daily**: Update contribution scores
- **Weekly**: Send user summary reports
- **Monthly**: Generate monthly reports
- **Weekly**: Clean up old data
- **Daily**: Database backups (placeholder)

## 🚀 Production Deployment

### Environment Variables
Set all production values in `.env`:
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/voice2action
JWT_SECRET=<strong-production-secret>
# ... other production values
```

### Security Features
- Helmet.js security headers
- CORS configuration
- Rate limiting (100 requests/15min)
- Input validation and sanitization
- JWT token expiration
- File upload restrictions

### Performance Optimizations
- Database indexing
- Response compression
- Image optimization via Cloudinary
- Efficient MongoDB queries
- Connection pooling

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test API endpoints
npm run test:api
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response  
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Pagination
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10, 
      "total": 100,
      "pages": 10
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@voice2action.com or create an issue in the repository.

---

**Voice2Action Backend** - Empowering civic engagement through technology! 🏛️✨