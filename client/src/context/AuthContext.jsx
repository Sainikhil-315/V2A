// src/context/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING'
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null
      };
    
    case AUTH_ACTIONS.AUTH_FAILURE:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    default:
      return state;
  }
}

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          dispatch({
            type: AUTH_ACTIONS.AUTH_SUCCESS,
            payload: {
              user: response.data.data.user,
              token
            }
          });
        } catch (error) {
          // Token is invalid
          localStorage.removeItem('token');
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    checkAuth();
  }, []); // ✅ Empty dependency array - only run once on mount

  // ✅ Memoize functions to prevent recreation on every render
  const login = useCallback(async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.AUTH_START });

      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      dispatch({
        type: AUTH_ACTIONS.AUTH_SUCCESS,
        payload: { user, token }
      });

      toast.success(`Welcome back, ${user.name}!`);
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.AUTH_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.AUTH_START });

      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      dispatch({
        type: AUTH_ACTIONS.AUTH_SUCCESS,
        payload: { user, token }
      });

      toast.success(`Welcome to Voice2Action, ${user.name}!`);
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.AUTH_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async (showMessage = true) => {
    try {
      // Call logout endpoint
      await api.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, still logout on client
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      
      // Clear auth state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      if (showMessage) {
        toast.success('Logged out successfully');
      }
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      const updatedUser = response.data.data.user;

      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: updatedUser
      });

      toast.success('Profile updated successfully');
      return { success: true, data: updatedUser };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateAvatar = useCallback(async (avatarFile) => {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { avatar } = response.data.data;

      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: { avatar }
      });

      toast.success('Avatar updated successfully');
      return { success: true, data: avatar };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Avatar update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const changePassword = useCallback(async (passwordData) => {
    try {
      await api.put('/auth/change-password', passwordData);
      toast.success('Password changed successfully');
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset link sent to your email');
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Request failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const hasRole = useCallback((role) => {
    return state.user?.role === role;
  }, [state.user?.role]);

  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // ✅ Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    updateAvatar,
    changePassword,
    forgotPassword,
    clearError,

    // Utilities
    hasRole,
    isAdmin
  }), [
    state.user,
    state.token,
    state.isAuthenticated,
    state.loading,
    state.error,
    login,
    register,
    logout,
    updateProfile,
    updateAvatar,
    changePassword,
    forgotPassword,
    clearError,
    hasRole,
    isAdmin
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;