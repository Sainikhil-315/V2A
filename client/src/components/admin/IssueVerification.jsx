// src/components/admin/IssueVerification.jsx
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Check, 
  X, 
  Eye, 
  MapPin, 
  User, 
  Calendar,
  Filter,
  Search,
  ChevronDown,
  AlertTriangle
} from 'lucide-react'
import { adminAPI, issuesAPI } from '../../utils/api'
import { formatRelativeTime, getCategoryInfo, truncate } from '../../utils/helpers'
import { ISSUE_CATEGORIES } from '../../utils/constants'
import LoadingButton from '../common/LoadingButton'
import { SkeletonLoader } from '../common/Loader'
import toast from 'react-hot-toast'

const IssueVerification = () => {
  const [searchParams] = useSearchParams()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Search and filter states
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    search: ''
  })
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0
  })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }))
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [filters])

  // Load issues when filters or page changes
  useEffect(() => {
    loadPendingIssues()
  }, [filters, pagination.page])

  // Handle direct issue link from admin dashboard
  useEffect(() => {
    const issueId = searchParams.get('issue')
    if (issueId && issues.length > 0) {
      const issue = issues.find(i => i._id === issueId)
      if (issue) {
        openIssueModal(issue)
      }
    }
  }, [issues, searchParams])

  const loadPendingIssues = async () => {
    setLoading(true)
    try {
      let response

      if (filters.search) {
        // Use search endpoint for text queries
        const searchParams = {
          q: filters.search.trim(),
          page: pagination.page,
          limit: pagination.limit
        }
        
        response = await issuesAPI.search(searchParams)
        
        // Filter to only show pending issues from search results
        const pendingIssues = response.data.data.issues.filter(issue => 
          issue.status === 'pending'
        )
        
        // Apply additional filters to search results
        let filteredIssues = pendingIssues
        
        if (filters.category) {
          filteredIssues = filteredIssues.filter(issue => 
            issue.category === filters.category
          )
        }
        
        if (filters.priority) {
          filteredIssues = filteredIssues.filter(issue => 
            issue.priority === filters.priority
          )
        }
        
        setIssues(filteredIssues)
        setPagination(prev => ({
          ...prev,
          total: filteredIssues.length
        }))
      } else {
        // Use regular pending issues endpoint
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => key !== 'search' && value !== '')
        )
        
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...cleanFilters
        }
        
        response = await adminAPI.getPendingIssues(params)
        setIssues(response.data.data.issues)
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total
        }))
      }
    } catch (error) {
      console.error('Error loading pending issues:', error)
      toast.error('Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveIssue = async (issueId, assignToAuthority = null) => {
    if (!issueId) {
      toast.error('Invalid issue ID')
      return
    }
    setActionLoading(true)
    try {
      const payload = {
        status: 'verified',
        adminNotes: 'Issue approved by admin'
      }
      if (assignToAuthority && typeof assignToAuthority === 'string' && assignToAuthority.trim() !== '') {
        payload.assignedTo = assignToAuthority
      }
      await adminAPI.updateIssueStatus(issueId, payload)
      toast.success('Issue approved successfully')
      setIssues(prev => prev.filter(issue => issue._id !== issueId))
      setShowModal(false)
      setSelectedIssue(null)
    } catch (error) {
      console.error('Error approving issue:', error)
      toast.error('Failed to approve issue')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectIssue = async (issueId, reason) => {
    setActionLoading(true)
    try {
      await adminAPI.updateIssueStatus(issueId, {
        status: 'rejected',
        adminNotes: reason,
        rejectionReason: reason
      })
      
      toast.success('Issue rejected')
      setIssues(prev => prev.filter(issue => issue._id !== issueId))
      setShowModal(false)
      setSelectedIssue(null)
    } catch (error) {
      console.error('Error rejecting issue:', error)
      toast.error('Failed to reject issue')
    } finally {
      setActionLoading(false)
    }
  }

  const openIssueModal = (issue) => {
    setSelectedIssue(issue)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedIssue(null)
  }

  if (loading && issues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader lines={2} className="mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <SkeletonLoader lines={4} />
              </div>
            ))}
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Issue Verification</h1>
              <p className="text-gray-600 mt-1">
                Review and approve pending civic issues
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {pagination.total} pending issues
              </span>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search issues by title (min 2 characters)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 form-input w-full text-black"
                />
              </div>
              {/* {searchInput.length > 0 && searchInput.length < 2 && (
                <p className="text-xs text-red-500 mt-1">
                  Search requires at least 2 characters
                </p>
              )} */}
            </div>
            
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="form-select w-auto text-black"
            >
              <option value="">All Categories</option>
              {ISSUE_CATEGORIES?.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="form-select w-auto text-black"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {issues?.length === 0 ? (
          <div className="text-center py-12">
            {filters.search ? (
              <>
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pending issues found
                </h3>
                <p className="text-gray-600 mb-4">
                  No pending issues match your search for "{filters.search}"
                </p>
                <button
                  onClick={() => {
                    setSearchInput('')
                    setFilters(prev => ({ ...prev, search: '' }))
                  }}
                  className="btn btn-outline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-600">
                  No pending issues to review at the moment.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Issues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {issues?.map(issue => {
                const category = getCategoryInfo(issue.category)
                
                return (
                  <div key={issue._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    {/* Issue Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                          <span className="text-lg">{category.icon}</span>
                        </div>
                        
                        {issue.priority === 'urgent' && (
                          <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Urgent
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {issue.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4">
                        {truncate(issue.description, 120)}
                      </p>
                      
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {issue.user?.name || issue.reporter?.name || 'Anonymous'}
                        </div>
                        
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatRelativeTime(issue.createdAt)}
                        </div>
                        
                        {issue.location?.address && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span className="truncate">
                              {truncate(issue.location.address, 50)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Media Preview */}
                      {issue?.media && issue.media.length > 0 && (
                        <div className="mt-4 flex space-x-2">
                          {issue?.media.slice(0, 3).map((media, index) => (
                            <img
                              key={index}
                              src={media.thumbnailUrl || media.url}
                              alt="Issue media"
                              className="w-12 h-12 object-cover rounded border"
                            />
                          ))}
                          {issue.media.length > 3 && (
                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                              <span className="text-xs text-gray-500">
                                +{issue.media.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                      <button
                        onClick={() => openIssueModal(issue)}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRejectIssue(issue._id, 'Does not meet community guidelines')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject Issue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleApproveIssue(issue._id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve Issue"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Pagination - Only show if not searching or search has many results */}
            {pagination.total > pagination.limit && !filters.search && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} issues
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

      {/* Issue Detail Modal */}
      {showModal && selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Issue Verification
                  </h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="bg-white px-6 py-6 max-h-96 overflow-y-auto">
                <IssueDetailView 
                  issue={selectedIssue} 
                  onApprove={handleApproveIssue}
                  onReject={handleRejectIssue}
                  loading={actionLoading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Issue Detail View Component
const IssueDetailView = ({ issue, onApprove, onReject, loading }) => {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const category = getCategoryInfo(issue.category)

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    onReject(issue._id, rejectionReason)
  }

  return (
    <div className="space-y-6">
      {/* Issue Header */}
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg bg-${category.color}-100`}>
          <span className="text-2xl">{category.icon}</span>
        </div>
        
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {issue.title}
          </h2>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {issue.user?.name || issue.reporter?.name || 'Anonymous'}
            </div>
            
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatRelativeTime(issue.createdAt)}
            </div>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${issue.priority === 'urgent' ? 'red' : 'blue'}-100 text-${issue.priority === 'urgent' ? 'red' : 'blue'}-800`}>
              {issue.priority} priority
            </span>
          </div>
          
          <p className="text-gray-700 leading-relaxed">
            {issue.description}
          </p>
        </div>
      </div>

      {/* Location */}
      {issue.location && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Location</h3>
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{issue.location.address}</span>
          </div>
          {issue.location.coordinates && (
            <p className="text-sm text-gray-500 mt-1">
              Coordinates: {issue.location.coordinates.lat?.toFixed(6)}, {issue.location.coordinates.lng?.toFixed(6)}
            </p>
          )}
        </div>
      )}

      {/* Media */}
      {issue.media && issue.media.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Attached Media</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {issue?.media.map((media, index) => (
              <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={`Issue media ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => window.open(media.url, '_blank')}
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
                      <div className="w-8 h-8 bg-gray-400 rounded mx-auto mb-2" />
                      <span className="text-xs text-gray-500">Audio File</span>
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
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Voice Note</h3>
          <audio controls className="w-full">
            <source src={issue.voiceNote.url} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Actions */}
      <div className="border-t pt-6">
        {!showRejectForm ? (
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRejectForm(true)}
              className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50"
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Reject Issue
            </button>
            
            <LoadingButton
              loading={loading}
              onClick={() => onApprove(issue._id)}
              className="btn btn-primary"
            >
              <Check className="w-4 h-4 mr-2" />
              Approve Issue
            </LoadingButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="form-textarea w-full"
                placeholder="Please provide a reason for rejecting this issue..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectionReason('')
                }}
                className="btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
              
              <LoadingButton
                loading={loading}
                onClick={handleReject}
                className="btn btn-danger"
              >
                Reject Issue
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IssueVerification