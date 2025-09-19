// src/App.jsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Loader from './components/common/Loader';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotificationToast from './components/common/NotificationToast';
import SiteTour from './components/tour/SiteTour';
import IssueDetailPage from './pages/IssueDetailPage';

// Pages - Lazy loaded for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const IssueTracking = React.lazy(() => import('./pages/IssueTracking'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Login = React.lazy(() => import('./components/auth/Login'));
const Register = React.lazy(() => import('./components/auth/Register'));
const ContributionBoard = React.lazy(() => import('./components/leaderboard/ContributorBoard'));
const IssueForm = React.lazy(() => import('./components/user/IssueForm'));
const IssueVerification = React.lazy(() => import('./components/admin/IssueVerification'));
const IssueAnalytics = React.lazy(() => import('./components/admin/AnalyticsDashboard'));
const AuthorityManager = React.lazy(() => import('./components/admin/AuthorityManager'));


// Authority Login and Dashboard (not lazy for login UX)
const AuthorityLogin = React.lazy(() => import('./components/authority/AuthorityLogin'));
const AuthorityDashboard = React.lazy(() => import('./components/authority/AuthorityDashboard'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader size="lg" />
  </div>
);

function App() {
  // Minimal state for authority login session
  const [authoritySession, setAuthoritySession] = React.useState(() => {
    const stored = localStorage.getItem('authoritySession');
    return stored ? JSON.parse(stored) : null;
  });

  const handleAuthorityLogin = (token, authority) => {
    const session = { token, authority };
    setAuthoritySession(session);
    localStorage.setItem('authoritySession', JSON.stringify(session));
  };
  const handleAuthorityLogout = () => {
    setAuthoritySession(null);
    localStorage.removeItem('authoritySession');
  };

  return (
    <AuthProvider>
      <SocketProvider>
        <Router future={{ v7_startTransition: true }}>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'toast-custom',
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff'
                  }
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff'
                  }
                }
              }}
            />

            {/* Global Notification Handler */}
            <NotificationToast />

            {/* Site Tour */}
            {/* <SiteTour /> */}

            {/* Header */}
            <Header />

            {/* Main Content */}
            <main id="main-content" className="flex-1 focus:outline-none">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  {/* Authority Login Route */}
                  <Route
                    path="/authority/login"
                    element={
                      authoritySession ? (
                        <AuthorityDashboard
                          authority={authoritySession.authority}
                          token={authoritySession.token}
                          onLogout={handleAuthorityLogout}
                        />
                      ) : (
                        <AuthorityLogin onLogin={handleAuthorityLogin} />
                      )
                    }
                  />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/issues"
                    element={
                      <ProtectedRoute>
                        <IssueTracking />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/issues/:id"
                    element={
                      <ProtectedRoute>
                        <IssueDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute>
                        <ContributionBoard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/report"
                    element={
                      <ProtectedRoute>
                        <IssueForm />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Admin-only Routes */}
                  <Route
                    path="/admin/verification"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <IssueVerification />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <IssueAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/authorities"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <AuthorityManager />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>

            {/* Footer */}
            <Footer />

            {/* PWA Install Banner */}
            <PWAInstallBanner />

            {/* Offline Banner */}
            <OfflineBanner />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

// 404 Component
const NotFound = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
      <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Page not found
      </h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => window.history.back()}
        className="mt-4 btn-primary"
      >
        Go Back
      </button>
    </div>
  </div>
);

// PWA Install Banner Component
const PWAInstallBanner = () => {
  const [showInstall, setShowInstall] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

  React.useEffect(() => {
    const handleInstallPrompt = (e) => {
      setDeferredPrompt(e.detail.prompt);
      setShowInstall(true);
    };

    window.addEventListener('installprompt', handleInstallPrompt);
    return () => window.removeEventListener('installprompt', handleInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstall(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if dismissed recently (within 7 days)
  React.useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      setShowInstall(false);
    }
  }, []);

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Install Voice2Action
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Install our app for quick access and offline support
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

// Offline Banner Component
const OfflineBanner = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleConnectionChange = (e) => {
      setIsOnline(e.detail.isOnline);
    };

    window.addEventListener('connectionchange', handleConnectionChange);
    return () => window.removeEventListener('connectionchange', handleConnectionChange);
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 z-50 shadow-lg">
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            You're offline
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Some features may be limited. We'll sync when you're back online.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;