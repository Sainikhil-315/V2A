// src/utils/constants.js

// App Configuration
export const APP_CONFIG = {
  name: 'Voice2Action',
  version: '1.0.0',
  description: 'Civic Issue Reporting Platform',
  author: 'Voice2Action Team',
  email: 'support@voice2action.com',
  website: 'https://voice2action.com'
};

// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Issue Categories
export const ISSUE_CATEGORIES = [
  { value: 'road_maintenance', label: 'Road Maintenance', icon: '🚧', color: 'orange' },
  { value: 'waste_management', label: 'Waste Management', icon: '🗑️', color: 'green' },
  { value: 'water_supply', label: 'Water Supply', icon: '💧', color: 'blue' },
  { value: 'electricity', label: 'Electricity', icon: '⚡', color: 'yellow' },
  { value: 'fire_safety', label: 'Fire Safety', icon: '🔥', color: 'red' },
  { value: 'public_transport', label: 'Public Transport', icon: '🚌', color: 'purple' },
  { value: 'parks_recreation', label: 'Parks & Recreation', icon: '🌳', color: 'green' },
  { value: 'street_lighting', label: 'Street Lighting', icon: '💡', color: 'yellow' },
  { value: 'drainage', label: 'Drainage', icon: '🌊', color: 'blue' },
  { value: 'noise_pollution', label: 'Noise Pollution', icon: '🔊', color: 'red' },
  { value: 'illegal_construction', label: 'Illegal Construction', icon: '🏗️', color: 'orange' },
  { value: 'animal_control', label: 'Animal Control', icon: '🐕', color: 'brown' },
  { value: 'other', label: 'Other', icon: '📋', color: 'gray' }
];

// Issue Status
export const ISSUE_STATUS = [
  { value: 'pending', label: 'Pending', color: 'yellow', description: 'Waiting for admin review' },
  { value: 'verified', label: 'Verified', color: 'blue', description: 'Verified by admin' },
  { value: 'rejected', label: 'Rejected', color: 'red', description: 'Rejected by admin' },
  { value: 'assigned', label: 'Assigned', color: 'purple', description: 'Assigned to authority' },
  { value: 'in_progress', label: 'In Progress', color: 'orange', description: 'Being worked on' },
  { value: 'resolved', label: 'Resolved', color: 'green', description: 'Issue resolved' },
  { value: 'closed', label: 'Closed', color: 'gray', description: 'Issue closed' }
];

// Issue Priority
export const ISSUE_PRIORITY = [
  { value: 'low', label: 'Low', color: 'gray', description: 'Non-urgent issue' },
  { value: 'medium', label: 'Medium', color: 'blue', description: 'Standard priority' },
  { value: 'high', label: 'High', color: 'orange', description: 'Important issue' },
  { value: 'urgent', label: 'Urgent', color: 'red', description: 'Requires immediate attention' }
];

// User Roles
export const USER_ROLES = [
  { value: 'citizen', label: 'Citizen', description: 'Regular user who can report issues' },
  { value: 'admin', label: 'Administrator', description: 'Can manage issues and users' }
];

// File Upload Configuration
export const FILE_UPLOAD = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  acceptedTypes: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    videos: ['.mp4', '.avi', '.mov', '.webm'],
    audio: ['.mp3', '.wav', '.ogg', '.m4a']
  },
  mimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/quicktime', 'video/webm'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
  }
};

// Map Configuration
export const MAP_CONFIG = {
  defaultCenter: [17.6868, 83.2185], // Bhimavaram, Andhra Pradesh
  defaultZoom: 13,
  maxZoom: 18,
  minZoom: 5,
  tileLayer: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  searchRadius: 5000 // 5km default radius for nearby search
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Toast Configuration
export const TOAST_CONFIG = {
  position: 'top-right',
  duration: 4000,
  maxToasts: 5,
  style: {
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif'
  }
};

// Pagination Configuration
export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 12,
  pageSizeOptions: [6, 12, 24, 48]
};

// Date Formats
export const DATE_FORMATS = {
  short: 'MMM dd, yyyy',
  medium: 'MMMM dd, yyyy',
  long: 'EEEE, MMMM dd, yyyy',
  time: 'HH:mm',
  datetime: 'MMM dd, yyyy HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
};

// Regex Patterns
export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  url: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/,
  postalCode: /^[0-9]{6}$/
};

// Validation Messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  password: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  minLength: (min) => `Must be at least ${min} characters`,
  maxLength: (max) => `Must not exceed ${max} characters`,
  fileSize: 'File size must not exceed 10MB',
  fileType: 'File type not supported'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  theme: 'theme',
  language: 'language',
  tourCompleted: 'tour-completed',
  installDismissed: 'pwa-install-dismissed',
  offlineQueue: 'offline-queue'
};

// Theme Configuration
export const THEME_CONFIG = {
  default: 'light',
  modes: ['light', 'dark', 'system'],
  storageKey: 'theme'
};

// Language Configuration
export const LANGUAGE_CONFIG = {
  default: 'en',
  supported: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' }
  ]
};

// Animation Configuration
export const ANIMATION_CONFIG = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out'
  }
};

// Social Media Links
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/voice2action',
  twitter: 'https://twitter.com/voice2action',
  instagram: 'https://instagram.com/voice2action',
  linkedin: 'https://linkedin.com/company/voice2action',
  github: 'https://github.com/Sainikhil-315/V2A'
};

// Contact Information
export const CONTACT_INFO = {
  email: 'pushparamagani7@gmail.com',
  phone: '+91-1234567890',
  address: 'Bhimavaram, Andhra Pradesh, India',
  hours: 'Mon-Fri 9:00 AM - 6:00 PM IST'
};

// Feature Flags
export const FEATURES = {
  voiceRecording: true,
  offlineMode: true,
  pushNotifications: true,
  geolocation: true,
  darkMode: true,
  multiLanguage: true,
  socialLogin: false,
  analytics: true,
  feedback: true
};

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ISSUE_CREATED: 'Issue reported successfully!',
  ISSUE_UPDATED: 'Issue updated successfully!',
  ISSUE_DELETED: 'Issue deleted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  EMAIL_SENT: 'Email sent successfully!',
  FILE_UPLOADED: 'File uploaded successfully!'
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  ISSUE_CREATED: 'issue_created',
  ISSUE_UPDATED: 'issue_updated',
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  SEARCH_PERFORMED: 'search_performed',
  FILE_UPLOADED: 'file_uploaded',
  PAGE_VIEW: 'page_view'
};

// Achievement Tiers
export const ACHIEVEMENT_TIERS = {
  BRONZE: { min: 1, max: 9, color: '#cd7f32' },
  SILVER: { min: 10, max: 49, color: '#c0c0c0' },
  GOLD: { min: 50, max: 99, color: '#ffd700' },
  PLATINUM: { min: 100, max: Infinity, color: '#e5e4e2' }
};

// PWA Configuration
export const PWA_CONFIG = {
  name: 'Voice2Action',
  shortName: 'Voice2Action',
  description: 'Civic Issue Reporting Platform',
  themeColor: '#2563eb',
  backgroundColor: '#ffffff',
  display: 'standalone',
  orientation: 'portrait-primary',
  startUrl: '/',
  scope: '/'
};

export default {
  APP_CONFIG,
  API_CONFIG,
  ISSUE_CATEGORIES,
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  USER_ROLES,
  FILE_UPLOAD,
  MAP_CONFIG,
  NOTIFICATION_TYPES,
  TOAST_CONFIG,
  PAGINATION,
  DATE_FORMATS,
  REGEX_PATTERNS,
  VALIDATION_MESSAGES,
  STORAGE_KEYS,
  THEME_CONFIG,
  LANGUAGE_CONFIG,
  ANIMATION_CONFIG,
  SOCIAL_LINKS,
  CONTACT_INFO,
  FEATURES,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  ANALYTICS_EVENTS,
  ACHIEVEMENT_TIERS,
  PWA_CONFIG
};