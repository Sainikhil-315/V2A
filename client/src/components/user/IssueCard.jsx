// src/components/user/IssueCard.jsx - Fixed version
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  MessageSquare,
  ThumbsUp,
  MapPin,
  Clock,
  User,
  MoreHorizontal,
  Image,
} from "lucide-react";
import {
  formatRelativeTime,
  getCategoryInfo,
  getStatusColor,
} from "../../utils/helpers";

// Map status to Tailwind color classes
const STATUS_COLOR_CLASSES = {
  open: "bg-blue-500 text-blue-900",
  verified: "bg-green-500 text-green-900",
  resolved: "bg-emerald-500 text-emerald-900",
  rejected: "bg-red-500 text-red-900",
  pending: "bg-yellow-500 text-yellow-900",
};

// Map category color to Tailwind bg classes
const CATEGORY_BG_CLASSES = {
  yellow: "bg-yellow-600",
  blue: "bg-blue-600",
  green: "bg-green-600",
  red: "bg-red-600",
  orange: "bg-orange-600",
  purple: "bg-purple-600",
  pink: "bg-pink-600",
  gray: "bg-gray-600",
};

const IssueCard = ({ issue, compact = false, showActions = true }) => {
  const navigate = useNavigate();
  const category = getCategoryInfo(issue.category);
  const statusColorClass =
    STATUS_COLOR_CLASSES[issue.status?.toLowerCase()] ||
    "bg-gray-100 text-gray-800";
  const categoryBgClass = CATEGORY_BG_CLASSES[category.color] || "bg-gray-100";
  const hasMedia = issue.media && issue.media.length > 0;

  // Get user name - handle different data structures
  const getUserName = () => {
    if (issue.reporter?.name) {
      return issue.reporter.name;
    }
    if (typeof issue.reporter === 'string') {
      return issue.reporter;
    }
    if (issue.reporter && typeof issue.reporter === 'string') {
      return "User"; // You might want to fetch user name by ID
    }
    return "Anonymous";
  };

  const handleUpvote = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Upvote issue:", issue._id);
  };

  const handleViewIssue = () => {
    navigate(`/issues/${issue._id || issue.id}`);
  };

  if (compact) {
    return (
      <div
        onClick={handleViewIssue}
        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors min-w-0"
      >
        <div
          className={`w-3 h-3 flex-shrink-0 rounded-full ${
            statusColorClass.split(" ")[0]
          }`}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {issue.title}
          </h3>
          <div className="flex items-center space-x-4 mt-1 overflow-hidden">
            <span className="text-xs text-gray-500 flex-shrink-0">
              {category.icon} {category.label}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatRelativeTime(issue.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 flex-shrink-0">
          <div className="flex items-center">
            <ThumbsUp className="w-3 h-3 mr-1" />
            {issue.upvotes?.length || issue.upvoteCount || 0}
          </div>
          <div className="flex items-center">
            <MessageSquare className="w-3 h-3 mr-1" />
            <span className="font-medium">
              {Array.isArray(issue.comments)
                ? issue.comments.length
                : issue.commentCount || issue.comments || 0}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
      {console.log(issue)}
      {/* Header */}
      <div className="p-4 sm:p-6 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${categoryBgClass}`}
            >
              <span className="text-lg sm:text-xl">{category.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3
                onClick={handleViewIssue}
                className="text-base sm:text-lg font-medium text-gray-900 cursor-pointer hover:text-primary-600 transition-colors line-clamp-2 break-words mb-2"
              >
                {issue.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center flex-shrink-0">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span className="truncate max-w-24 sm:max-w-32">
                    {getUserName()}
                  </span>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {formatRelativeTime(issue.createdAt)}
                  </span>
                </div>
                {issue.location?.address && (
                  <div className="flex items-center min-w-0">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    <span className="truncate max-w-32 sm:max-w-48">
                      {issue.location.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <span
              className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${statusColorClass}`}
            >
              {issue.status?.replace("_", " ") || "unknown"}
            </span>
            {showActions && (
              <button className="text-gray-400 hover:text-gray-500 p-1">
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section - Always same height */}
      <div className="px-4 sm:px-6 flex-1 flex flex-col">
        {/* Description */}
        <div className="flex-1">
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 break-words">
            {issue.description && issue.description.length > 200
              ? `${issue.description.substring(0, 200)}...`
              : issue.description || "No description provided"}
          </p>
        </div>

        {/* Media/Attachment Indicator - Always present to maintain consistency */}
        <div className="mt-3 pb-4 min-h-[2rem] flex items-center">
          {hasMedia ? (
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {issue.media.slice(0, 2).map((media, index) => (
                  <img
                    key={index}
                    src={media.thumbnailUrl || media.url}
                    alt="Preview"
                    className="w-8 h-8 object-cover rounded border border-gray-200"
                  />
                ))}
              </div>
              {issue.media.length > 2 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  +{issue.media.length - 2} more
                </span>
              )}
              <div className="flex items-center text-xs text-gray-500">
                <Image className="w-3 h-3 mr-1" />
                {issue.media.length} attachment
                {issue.media.length > 1 ? "s" : ""}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              {/* Empty space to maintain consistent height */}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Always same height */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={handleUpvote}
              className={`flex items-center space-x-1 text-xs sm:text-sm transition-colors ${
                issue.userHasUpvoted
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-primary-600"
              }`}
            >
              <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium">{issue.upvotes?.length || issue.upvoteCount || 0}</span>
            </button>
            
            <button
              onClick={handleViewIssue}
              className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500 hover:text-primary-600 transition-colors"
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium">
                {Array.isArray(issue.comments)
                  ? issue.comments.length
                  : issue.commentCount || issue.comments || 0}
              </span>
            </button>
            {/* <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium">{issue.views || 0}</span>
            </div> */}
          </div>

          <button
            onClick={handleViewIssue}
            className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueCard;