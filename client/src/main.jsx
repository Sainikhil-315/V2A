// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import i18n for internationalization
// import './i18n';

// Error boundary for the entire app
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // In production, you might want to send errors to a logging service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. Please refresh the page and try again.
              </p>
              <div className="mt-4 flex space-x-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-32">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring
function measurePerformance() {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        const metrics = {
          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp: perfData.connectEnd - perfData.connectStart,
          request: perfData.responseStart - perfData.requestStart,
          response: perfData.responseEnd - perfData.responseStart,
          dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          load: perfData.loadEventEnd - perfData.loadEventStart,
          total: perfData.loadEventEnd - perfData.navigationStart
        };
        
        console.log('Performance Metrics:', metrics);
        
        // You could send these metrics to an analytics service
        // sendAnalytics('performance', metrics);
      }, 0);
    });
  }
}

// Initialize performance monitoring
measurePerformance();

// Service Worker registration with update handling
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, prompt user to refresh
              if (confirm('New version available! Refresh to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
        
        // Handle service worker controlling
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Handle online/offline status
function handleConnectionChange() {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    document.body.classList.toggle('online', isOnline);
    
    // Dispatch custom event that components can listen to
    window.dispatchEvent(new CustomEvent('connectionchange', { 
      detail: { isOnline } 
    }));
    
    if (isOnline) {
      console.log('App is back online');
      // Trigger sync of offline data
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          return registration.sync.register('offline-issue-sync');
        });
      }
    } else {
      console.log('App is offline');
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus(); // Set initial status
}

handleConnectionChange();

// Install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Dispatch custom event that components can listen to
  window.dispatchEvent(new CustomEvent('installprompt', { 
    detail: { prompt: deferredPrompt } 
  }));
});

window.addEventListener('appinstalled', () => {
  console.log('Voice2Action PWA was installed');
  deferredPrompt = null;
  
  // Track installation
  // sendAnalytics('pwa_install', { timestamp: Date.now() });
});

// Expose install function globally
window.installPWA = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  }
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K for quick search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('quicksearch'));
  }
  
  // Ctrl/Cmd + Shift + R for quick report
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('quickreport'));
  }
});

// Accessibility enhancements
// function enhanceAccessibility() {
//   // Skip to main content link
//   const skipLink = document.createElement('a');
//   skipLink.href = '#main-content';
//   skipLink.textContent = 'Skip to main content';
//   skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-primary-600 text-white px-4 py-2 z-50';
//   document.body.insertBefore(skipLink, document.body.firstChild);
  
//   // Focus management for modal dialogs
//   document.addEventListener('focusin', (e) => {
//     const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
//     if (modal && !modal.contains(e.target)) {
//       const focusableElements = modal.querySelectorAll(
//         'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
//       );
//       if (focusableElements.length > 0) {
//         focusableElements[0].focus();
//       }
//     }
//   });
// }

// enhanceAccessibility();

// Dark mode detection and handling
function handleColorScheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e) => {
    // Only set system preference if user hasn't manually chosen
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  };
  
  mediaQuery.addListener(handleChange);
  handleChange(mediaQuery); // Set initial state
  
  // Apply saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  }
}

handleColorScheme();

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Development tools
if (process.env.NODE_ENV === 'development') {
  // Enable React Developer Tools
  if (typeof window !== 'undefined') {
    window.React = React;
  }
  
  // Log useful information
  console.log('%c🎯 Voice2Action Frontend Started', 'color: #2563eb; font-weight: bold; font-size: 16px;');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('React version:', React.version);
}

// Register global error handlers for better debugging
window.addEventListener('error', (e) => {
  console.error('Global JavaScript error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  e.preventDefault(); // Prevent the default browser behavior
});