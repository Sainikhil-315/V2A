// src/pages/Dashboard.jsx
import React from 'react'
import { useAuth } from '../context/AuthContext'
import UserDashboard from '../components/user/UserDashboard'
import AdminDashboard from '../components/admin/AdminDashboard'

const Dashboard = () => {
  const { user } = useAuth()

  // Route to appropriate dashboard based on user role
  if (user?.role === 'admin') {
    return <AdminDashboard />
  }

  return <UserDashboard />
}

export default Dashboard