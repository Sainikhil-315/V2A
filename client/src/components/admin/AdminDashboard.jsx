// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  BarChart3,
  Shield,
  Settings,
  Download,
} from "lucide-react";
import { adminAPI, issuesAPI } from "../../utils/api";
import { formatNumber, formatRelativeTime } from "../../utils/helpers";
import { SkeletonLoader, ChartSkeleton } from "../common/Loader";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, pendingResponse, analyticsResponse] =
        await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getPendingIssues({ limit: 5 }),
          adminAPI.getAnalytics({ period: "30d" }),
        ]);

      // Map backend dashboard data to flat structure
      const d = dashboardResponse.data?.data || {};
      const dashboardFlat = {
        totalIssues: d.issues?.total || 0,
        pendingIssues: d.issues?.pending || 0,
        verifiedIssues: d.issues?.verified || 0,
        rejectedIssues: d.issues?.rejected || 0,
        inProgressIssues: d.issues?.inProgress || 0,
        resolvedIssues: d.issues?.resolved || 0,
        newIssuesThisWeek: d.issues?.thisWeek || 0,
        activeUsers: d.users?.total || 0,
        newUsersThisWeek: d.users?.newThisWeek || 0,
        onlineUsers: d.users?.active || 0,
      };

      setDashboardData(dashboardFlat);
      setRecentIssues(pendingResponse.data?.data?.issues || []);

      // Map analytics as in AnalyticsDashboard.jsx, but only keep 5 statuses
      const a = analyticsResponse.data?.data || {};
      const issuesOverTime = (a.trends || []).map(item => {
        const date = item._id?.day !== undefined
          ? `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}-${String(item._id?.day).padStart(2, '0')}`
          : '';
        return {
          date,
          pending: item.pending || 0,
          verified: item.verified || 0,
          rejected: item.rejected || 0,
          in_progress: item.in_progress || 0,
          resolved: item.resolved || 0
        };
      });
      setAnalytics({ issuesOverTime });
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await adminAPI.exportData({ format: "csv" });
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `voice2action-data-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // Only show quick stats for the 5 statuses
  const quickStats = dashboardData
    ? [
        {
          title: "Pending",
          value: dashboardData.pendingIssues,
          icon: Clock,
          color: "yellow",
          change: dashboardData.pendingIssues > 10 ? "Needs attention" : "Under control",
        },
        {
          title: "Verified",
          value: dashboardData.verifiedIssues,
          icon: TrendingUp,
          color: "indigo",
          change: "Verified by admin",
        },
        {
          title: "Rejected",
          value: dashboardData.rejectedIssues,
          icon: AlertCircle,
          color: "red",
          change: "Rejected by admin",
        },
        {
          title: "In Progress",
          value: dashboardData.inProgressIssues,
          icon: BarChart3,
          color: "blue",
          change: "By authority",
        },
        {
          title: "Resolved",
          value: dashboardData.resolvedIssues,
          icon: CheckCircle,
          color: "green",
          change: "By authority",
        },
      ]
    : [];

  // Only show the 5 required statuses
  const pieChartData = dashboardData
    ? [
        {
          name: "Pending",
          value: dashboardData.pendingIssues,
          color: "#f59e0b",
        },
        {
          name: "Verified",
          value: dashboardData.verifiedIssues,
          color: "#6366f1",
        },
        {
          name: "Rejected",
          value: dashboardData.rejectedIssues,
          color: "#ef4444",
        },
        {
          name: "In Progress",
          value: dashboardData.inProgressIssues,
          color: "#3b82f6",
        },
        {
          name: "Resolved",
          value: dashboardData.resolvedIssues,
          color: "#10b981",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <SkeletonLoader lines={2} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <SkeletonLoader lines={3} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-primary-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor and manage civic issues across your community
              </p>
            </div>

            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={handleExportData}
                className="btn btn-outline flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
              <Link href="/admin/verification" className="btn btn-primary flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                Review Issues
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats?.map((stat, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-sm border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatNumber(stat.value)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issues Over Time */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Issues Over Time
                </h2>
              </div>

              <div className="p-6">
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={analytics?.issuesOverTime || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="issues"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Issues Table */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Pending Issues
                  </h2>
                  <a
                    href="/admin/verification"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View all
                  </a>
                </div>
              </div>

              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentIssues?.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {issue.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {issue.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {issue.category?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {issue.user?.name || "Anonymous"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatRelativeTime(issue.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <a
                            href={`/admin/verification?issue=${issue._id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Review
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Issue Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Issue Status
                </h2>
              </div>

              <div className="p-6">
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  {pieChartData?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Quick Actions
                </h2>
              </div>

              <div className="p-6 space-y-3">
                <Link href="/admin/verification" className="w-full btn btn-primary
                flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review Issues
                </Link>
                <a
                  href="/admin/analytics"
                  className="w-full btn btn-outline flex items-center justify-center"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </a>
                <a
                  href="/admin/authorities"
                  className="w-full btn btn-outline flex items-center justify-center"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Authorities
                </a>
                <a
                  href="/admin/settings"
                  className="w-full btn btn-outline flex items-center justify-center"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </a>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  System Health
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Server Status</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    <span className="text-sm font-medium text-green-600">
                      Online
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    <span className="text-sm font-medium text-green-600">
                      Connected
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Storage</span>
                  <span className="text-sm font-medium">68% used</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="text-sm font-medium">
                    {dashboardData?.onlineUsers || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
