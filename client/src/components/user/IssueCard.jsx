// src/components/user/IssueCard.jsx
import React from 'react'
import { 
  Eye, 
  MessageSquare, 
  ThumbsUp, 
  MapPin, 
  Clock,
  User,
  MoreHorizontal
} from 'lucide-react'
import { formatRelativeTime, getCategoryInfo, getStatusColor } from '../../utils/helpers'

const IssueCard = ({ issue, compact = false, showActions = true }) => {
  const category = getCategoryInfo(issue.category)
  const statusColor = getStatusColor(issue.status)

  const handleUpvote = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Handle upvote logic
    console.log('Upvote issue:', issue.id)
  }

  const handleViewIssue = () => {
    window.location.href = `/issues/${issue.id}`
  }

  if (compact) {
    return (
      <div 
        onClick={handleViewIssue}
        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
      >
        <div className={`w-3 h-3 rounded-full bg-${statusColor}-400`} />
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {issue.title}
          </h3>
          <div className="flex items-center space-x-4 mt-1">
            <span className="text-xs text-gray-500">
              {category.icon} {category.label}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(issue.createdAt)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="flex items-center">
            <ThumbsUp className="w-3 h-3 mr-1" />
            {issue.upvotes || 0}
          </div>
          <div className="flex items-center">
            <MessageSquare className="w-3 h-3 mr-1" />
            {issue.comments || 0}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`w-10 h-10 rounded-lg bg-${category.color}-100 flex items-center justify-center`}>
              <span className="text-xl">{category.icon}</span>
            </div>
            
            <div className="flex-1">
              <h3 
                onClick={handleViewIssue}
                className="text-lg font-medium text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
              >
                {issue.title}
              </h3>
              
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {issue.user?.name || 'Anonymous'}
                </div>
                
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatRelativeTime(issue.createdAt)}
                </div>
                
                {issue.location?.address && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="truncate max-w-xs">
                      {issue.location.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800 capitalize`}>
              {issue.status.replace('_', ' ')}
            </span>
            
            {showActions && (
              <button className="text-gray-400 hover:text-gray-500">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Description */}
        <p className="text-gray-600 mt-4 text-sm leading-relaxed">
          {issue.description.length > 200 
            ? `${issue.description.substring(0, 200)}...` 
            : issue.description
          }
        </p>
        
        {/* Media Preview */}
        {issue.media && issue.media.length > 0 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto">
            {issue.media.slice(0, 4).map((media, index) => (
              <div key={index} className="flex-shrink-0">
                <img
                  src={media.thumbnailUrl || media.url}
                  alt="Issue media"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
              </div>
            ))}
            {issue.media.length > 4 && (
              <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-500">
                  +{issue.media.length - 4}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleUpvote}
            className={`flex items-center space-x-1 text-sm transition-colors ${
              issue.userHasUpvoted 
                ? 'text-primary-600' 
                : 'text-gray-500 hover:text-primary-600'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{issue.upvotes || 0}</span>
          </button>
          
          <button 
            onClick={handleViewIssue}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{issue.comments || 0}</span>
          </button>
          
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            <span>{issue.views || 0}</span>
          </div>
        </div>
        
        <button 
          onClick={handleViewIssue}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

export default IssueCard