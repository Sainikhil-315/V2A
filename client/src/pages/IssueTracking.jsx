// src/pages/IssueTracking.jsx
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Filter,
  Search,
  MapPin,
  Calendar,
  Eye,
  MessageSquare,
  ThumbsUp,
  Share2,
  Flag,
} from "lucide-react";
import { issuesAPI } from "../utils/api";
import IssueMapView from "../components/user/IssueMapView";
import {
  ISSUE_CATEGORIES,
  ISSUE_STATUS,
  ISSUE_PRIORITY,
} from "../utils/constants";
import {
  formatRelativeTime,
  getCategoryInfo,
  getStatusColor,
  truncate,
} from "../utils/helpers";
import LoadingButton from "../components/common/Loader";
import { SkeletonLoader } from "../components/common/Loader";
import IssueCard from "../components/user/IssueCard";
import toast from "react-hot-toast";
import IssueDetailPage from "./IssueDetailPage";

const IssueTracking = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    sortBy: searchParams.get("sortBy") || "newest",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
  });

  useEffect(() => {
    if (id) {
      loadIssueDetail(id);
    } else {
      loadIssues();
    }
  }, [id, filters, pagination.page]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      // Remove empty string values and ensure 'sortBy' is valid before sending to backend
      const allowedSortBy = ["createdAt", "updatedAt", "priority", "status"];
      // Clean filters and map 'search' to 'q' for backend
      let cleanFilters = Object.fromEntries(
        Object.entries(filters)
          .filter(([k, v]) => v !== "")
          .filter(([k, v]) => k !== "sortBy" || allowedSortBy.includes(v))
      );
      // Map 'search' to 'q' for backend
      if (cleanFilters.search) {
        cleanFilters.q = cleanFilters.search;
        delete cleanFilters.search;
      }
      // Map UI sortBy values to backend-allowed sortBy values
      let sortByValue = cleanFilters.sortBy;
      if (!sortByValue || !allowedSortBy.includes(sortByValue)) {
        sortByValue = undefined;
      }
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sortByValue ? { sortBy: sortByValue } : {}),
        ...Object.fromEntries(
          Object.entries(cleanFilters).filter(([k]) => k !== "sortBy")
        ),
      };
      const response = await issuesAPI.getAll(params);
      setIssues(response.data.data.issues);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total,
      }));
    } catch (error) {
      console.error("Error loading issues:", error);
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const loadIssueDetail = async (issueId) => {
    setDetailLoading(true);
    try {
      const response = await issuesAPI.getById(issueId);
      setSelectedIssue(response.data.issue);
    } catch (error) {
      console.error("Error loading issue detail:", error);
      toast.error("Issue not found");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));

    // Update URL
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleUpvote = async (issueId) => {
    try {
      await issuesAPI.upvote(issueId);
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue((prev) => ({
          ...prev,
          upvotes: prev.userHasUpvoted ? prev.upvotes - 1 : prev.upvotes + 1,
          userHasUpvoted: !prev.userHasUpvoted,
        }));
      }

      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                upvotes: issue.userHasUpvoted
                  ? issue.upvotes - 1
                  : issue.upvotes + 1,
                userHasUpvoted: !issue.userHasUpvoted,
              }
            : issue
        )
      );
    } catch (error) {
      console.error("Error upvoting issue:", error);
      toast.error("Failed to upvote issue");
    }
  };

  const handleShare = async (issue) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: issue.title,
          text: issue.description,
          url: window.location.origin + `/issues/${issue.id}`,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying URL
      const url = window.location.origin + `/issues/${issue.id}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  // If showing single issue detail
  if (id && selectedIssue) {
    return (
      <IssueDetailPage
        issue={selectedIssue}
        onUpvote={handleUpvote}
        onShare={handleShare}
      />
    );
  }

  if (id && detailLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <SkeletonLoader lines={10} />
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
              <h1 className="text-2xl font-bold text-gray-900">
                Community Issues
              </h1>
              <p className="text-gray-600 mt-1">
                Browse and track civic issues in your area
              </p>
            </div>

            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={() => setShowMapView(true)}
                className="btn btn-outline flex items-center"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map View
              </button>
              <a href="/report" className="btn btn-primary flex items-center">
                Report New Issue
              </a>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10 form-input w-full"
                />
              </div>
            </div>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="form-select text-black"
            >
              <option value="">All Categories</option>
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="form-select text-black"
            >
              <option value="">All Status</option>
              {ISSUE_STATUS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
              className="form-select text-black"
            >
              <option value="">All Priority</option>
              {ISSUE_PRIORITY.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="form-select text-black"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <SkeletonLoader lines={4} />
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No issues found
            </h3>
            <p className="text-gray-600 mb-6">
              {Object.values(filters).some((f) => f)
                ? "Try adjusting your search filters"
                : "Be the first to report an issue in your community"}
            </p>
            {!Object.values(filters).some((f) => f) && (
              <a href="/report" className="btn btn-primary">
                Report First Issue
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing {issues.length} of {pagination.total} issues
              </p>
            </div>

            {/* Issues Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {issues.map((issue) => (
                <IssueCard
                  key={issue._id || issue.id}
                  issue={issue}
                  onUpvote={() => handleUpvote(issue._id || issue.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of{" "}
                  {Math.ceil(pagination.total / pagination.limit)}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={
                      pagination.page * pagination.limit >= pagination.total
                    }
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showMapView && <IssueMapView onClose={() => setShowMapView(false)} />}
    </div>
  );
};

export default IssueTracking;
