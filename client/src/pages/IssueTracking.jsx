// src/pages/IssueTracking.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { 
  Filter,
  Search,
  MapPin,
  Calendar,
  Eye,
  MessageSquare,
  ThumbsUp,
  Share2,
  Flag
} from 'lucide-react'
import { issuesAPI } from '../utils/api'
import { ISSUE_CATEGORIES, ISSUE_STATUS, ISSUE_PRIORITY } from '../utils/constants'
import { formatRelativeTime, getCategoryInfo, getStatusColor, truncate } from '../utils/helpers'
import LoadingButton from '../components/common/Loader'
import { SkeletonLoader } from '../components/common/Loader'
import IssueCard from '../components/user/IssueCard'
import toast from 'react-hot-toast'

const IssueTracking = () => {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [issues, setIssues] = useState([])
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    sortBy: searchParams.get('sortBy') || 'newest'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0
  })

  useEffect(() => {
    if (id) {
      loadIssueDetail(id)
    } else {
      loadIssues()
    }
  }, [id, filters, pagination.page])

  const loadIssues = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sortBy === 'newest' ? '-createdAt' : 
              filters.sortBy === 'oldest' ? 'createdAt' :
              filters.sortBy === 'popular' ? '-upvotes' : '-createdAt',
        ...filters
      }
      
      const response = await issuesAPI.getAll(params)
      setIssues(response.data.issues)
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }))
    } catch (error) {
      console.error('Error loading issues:', error)
      toast.error('Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  const loadIssueDetail = async (issueId) => {
    setDetailLoading(true)
    try {
      const response = await issuesAPI.getById(issueId)
      setSelectedIssue(response.data.issue)
    } catch (error) {
      console.error('Error loading issue detail:', error)
      toast.error('Issue not found')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Update URL
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    setSearchParams(params)
  }

  const handleUpvote = async (issueId) => {
    try {
      await issuesAPI.upvote(issueId)
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => ({
          ...prev,
          upvotes: prev.userHasUpvoted ? prev.upvotes - 1 : prev.upvotes + 1,
          userHasUpvoted: !prev.userHasUpvoted
        }))
      }
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? {
              ...issue,
              upvotes: issue.userHasUpvoted ? issue.upvotes - 1 : issue.upvotes + 1,
              userHasUpvoted: !issue.userHasUpvoted
            }
          : issue
      ))
    } catch (error) {
      console.error('Error upvoting issue:', error)
      toast.error('Failed to upvote issue')
    }
  }

  const handleShare = async (issue) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: issue.title,
          text: issue.description,
          url: window.location.origin + `/issues/${issue.id}`
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying URL
      const url = window.location.origin + `/issues/${issue.id}`
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    }
  }

  // If showing single issue detail
  if (id && selectedIssue) {
    return <IssueDetailPage issue={selectedIssue} onUpvote={handleUpvote} onShare={handleShare} />
  }

  if (id && detailLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <SkeletonLoader lines={10} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Community Issues</h1>
              <p className="text-gray-600 mt-1">
                Browse and track civic issues in your area
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0">
              
               <a href="/report"
                className="btn btn-primary flex items-center"
              >
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
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 form-input w-full"
                />
              </div>
            </div>
            
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="form-select"
            >
              <option value="">All Categories</option>
              {ISSUE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-select"
            >
              <option value="">All Status</option>
              {ISSUE_STATUS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="form-select"
            >
              <option value="">All Priority</option>
              {ISSUE_PRIORITY.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
            
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="form-select"
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
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <SkeletonLoader lines={4} />
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
            <p className="text-gray-600 mb-6">
              {Object.values(filters).some(f => f) 
                ? 'Try adjusting your search filters'
                : 'Be the first to report an issue in your community'
              }
            </p>
            {!Object.values(filters).some(f => f) && (
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
              {issues.map(issue => (
                <IssueCard 
                  key={issue.id} 
                  issue={issue}
                  onUpvote={() => handleUpvote(issue.id)}
                />
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                 Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page * pagination.limit >= pagination.total}
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
    </div>
  )
}


// Issue Detail Page Component
const IssueDetailPage = ({ issue, onUpvote, onShare }) => {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const category = getCategoryInfo(issue.category)
  const statusColor = getStatusColor(issue.status)

  useEffect(() => {
    // Load comments - mock data for now
    setComments([
      {
        id: 1,
        user: { name: 'Admin', role: 'admin' },
        content: 'We have forwarded this issue to the relevant authority. They will start working on it soon.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isOfficial: true
      },
      {
        id: 2,
        user: { name: 'Local Resident' },
        content: 'This has been a problem for weeks. Thank you for reporting it!',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isOfficial: false
      }
    ])
  }, [issue.id])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setCommentLoading(true)
    try {
      await issuesAPI.addComment(issue.id, { content: newComment })
      
      // Add to local state
      const comment = {
        id: Date.now(),
        user: { name: 'You' },
        content: newComment,
        createdAt: new Date(),
        isOfficial: false
      }
      setComments(prev => [...prev, comment])
      setNewComment('')
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setCommentLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="text-primary-600 hover:text-primary-700 flex items-center"
          >
            ← Back to Issues
          </button>
        </div>

        {/* Issue Header */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg bg-${category.color}-100`}>
                <span className="text-2xl">{category.icon}</span>
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {issue.title}
                </h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span>#{issue.id}</span>
                  <span>•</span>
                  <span>Reported {formatRelativeTime(issue.createdAt)}</span>
                  <span>•</span>
                  <span>by {issue.user?.name || 'Anonymous'}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-100 text-${statusColor}-800 capitalize`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${issue.priority === 'urgent' ? 'red' : 'blue'}-100 text-${issue.priority === 'urgent' ? 'red' : 'blue'}-800 capitalize`}>
                    {issue.priority} priority
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onUpvote(issue.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  issue.userHasUpvoted 
                    ? 'bg-primary-50 border-primary-200 text-primary-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{issue.upvotes || 0}</span>
              </button>
              
              <button
                onClick={() => onShare(issue)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Location */}
          {issue.location && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center text-gray-700">
                <MapPin className="w-5 h-5 mr-2" />
                <span>{issue.location.address}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed text-lg">
              {issue.description}
            </p>
          </div>

          {/* Media */}
          {issue.media && issue.media.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issue.media.map((media, index) => (
                  <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={`Issue media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : media.type === 'video' ? (
                      <video
                        src={media.url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-2" />
                          <span className="text-sm text-gray-600">Audio File</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Note */}
          {issue.voiceNote && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Note</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <audio controls className="w-full">
                  <source src={issue.voiceNote.url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Comments ({comments.length})
          </h2>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="form-textarea w-full mb-4"
              placeholder="Add a comment..."
            />
            <div className="flex justify-end">
              <LoadingButton
                loading={commentLoading}
                type="submit"
                disabled={!newComment.trim()}
                className="btn btn-primary"
              >
                Add Comment
              </LoadingButton>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.map(comment => (
              <div key={comment.id} className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {comment.user.name.charAt(0)}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.user.name}</span>
                    {comment.isOfficial && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Official
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {comments.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
              <p className="text-gray-600">Be the first to comment on this issue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IssueTracking