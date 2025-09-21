// src/pages/IssueDetailPage.jsx - Complete version with integrated delete modal and macOS animation
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { issuesAPI } from "../utils/api";
import {
  getCategoryInfo,
  getStatusColor,
  formatRelativeTime,
} from "../utils/helpers";
import {
  ArrowBigUp,
  Share2,
  MessageSquare,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import LoadingButton from "../components/common/LoadingButton";
import toast from "react-hot-toast";

// YouTube-style Upvote Animation Component
const UpvoteAnimation = ({ triggerElement }) => {
  const animationRef = useRef(null);
  
  useEffect(() => {
    if (triggerElement && animationRef.current) {
      const animation = animationRef.current;
      const triggerRect = triggerElement.getBoundingClientRect();
      
      // Position animation at the center of the trigger button
      const centerX = triggerRect.left + triggerRect.width / 2;
      const centerY = triggerRect.top + triggerRect.height / 2;
      
      animation.style.left = centerX + 'px';
      animation.style.top = centerY + 'px';
      animation.style.transform = 'translate(-50%, -50%)';
    }
  }, [triggerElement]);

  return (
    <div
      ref={animationRef}
      className="fixed z-50 pointer-events-none"
      style={{ 
        animation: 'upvotePopup 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards'
      }}
    >
      {/* Main burst container */}
      <div className="relative">
        {/* Center icon */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-2 shadow-lg animate-bounce">
            <ArrowBigUp className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {/* Curly decorations around the icon */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-30px)`,
              animation: `curlAnimation 0.8s ease-out forwards`,
              animationDelay: `${i * 0.05}s`
            }}
          >
            <div className="text-2xl animate-pulse">
              {i % 4 === 0 ? '' : i % 4 === 1 ? '' : i % 4 === 2 ? '' : ''}
            </div>
          </div>
        ))}
        
        {/* Additional swirl effects */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`swirl-${i}`}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-45px)`,
              animation: `swirlAnimation 0.8s ease-out forwards`,
              animationDelay: `${i * 0.08}s`
            }}
          >
            <div className="text-lg">
              {i % 3 === 0 ? '〰️' : i % 3 === 1 ? '' : ''}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes upvotePopup {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1) translateY(-20px);
            opacity: 0;
          }
        }
        
        @keyframes curlAnimation {
          0% {
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-20px) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-35px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-50px) scale(0.8);
          }
        }
        
        @keyframes swirlAnimation {
          0% {
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-30px) scale(0);
            opacity: 0;
          }
          40% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-50px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-70px) scale(0.5) rotate(180deg);
          }
        }
      `}</style>
    </div>
  );
};

// Delete Confirmation Modal Component with macOS-style animation
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Comment",
  message = "Are you sure you want to delete this comment? This action cannot be undone.",
  isLoading = false,
  triggerElement = null,
}) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && triggerElement && modalRef.current) {
      const modal = modalRef.current;
      const triggerRect = triggerElement.getBoundingClientRect();
      
      // Calculate exact bottom-right corner position of trigger
      const startX = triggerRect.right - 15;
      const startY = triggerRect.bottom - 15;
      
      // Reset any existing transitions
      modal.style.transition = 'none';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'all';
      
      // Set initial position and size - start exactly at bottom-right corner
      modal.style.left = startX + 'px';
      modal.style.top = startY + 'px';
      modal.style.width = '15px';
      modal.style.height = '15px';
      modal.style.borderRadius = '8px';
      modal.style.transformOrigin = 'bottom right';
      modal.style.overflow = 'hidden';
      
      // Force a reflow to ensure initial position is set
      modal.offsetHeight;
      
      // Phase 1: Slow initial growth from corner
      setTimeout(() => {
        modal.style.transition = 'all 0.2s cubic-bezier(0.25, 0.1, 0.25, 0.1)';
        modal.style.left = (startX - 120) + 'px';
        modal.style.top = (startY - 90) + 'px';
        modal.style.width = '120px';
        modal.style.height = '90px';
        modal.style.borderRadius = '12px';
      }, 10);
      
      // Phase 2: Fast expansion to full size
      setTimeout(() => {
        modal.style.transition = 'all 0.3s cubic-bezier(0.1, 0.7, 0.1, 1)';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.width = '32rem'; // max-w-lg equivalent
        modal.style.height = 'auto';
        modal.style.borderRadius = '0.75rem'; // rounded-xl
        modal.style.transformOrigin = 'center';
      }, 220);
    }
  }, [isOpen, triggerElement]);

  const handleClose = () => {
    if (modalRef.current && triggerElement) {
      const modal = modalRef.current;
      const triggerRect = triggerElement.getBoundingClientRect();
      
      // Hide content immediately
      const content = modal.querySelector('.modal-content');
      if (content) {
        content.style.opacity = '0';
      }
      
      // Animate back to trigger position
      modal.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.8, 0.4)';
      modal.style.transform = 'none';
      modal.style.transformOrigin = 'bottom right';
      modal.style.left = triggerRect.right - 15 + 'px';
      modal.style.top = triggerRect.bottom - 15 + 'px';
      modal.style.width = '15px';
      modal.style.height = '15px';
      modal.style.borderRadius = '8px';
      
      setTimeout(() => {
        onClose();
      }, 400);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed bg-white shadow-2xl"
        style={{
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <div className="modal-content p-6 transition-opacity duration-300">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex justify-center items-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Comment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IssueDetailPage = () => {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    commentId: null,
    triggerElement: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Upvote animation state
  const [upvoteAnimation, setUpvoteAnimation] = useState({
    isAnimating: false,
    triggerElement: null,
  });

  // Helper function to get user name
  const getUserName = (issueData) => {
    if (issueData?.user?.name) {
      return issueData.user.name;
    }
    if (typeof issueData?.user === "string") {
      return issueData.user;
    }
    if (issueData?.reporter && typeof issueData.reporter === "string") {
      return "User"; // You might want to fetch user name by ID
    }
    return "Anonymous";
  };

  useEffect(() => {
    const fetchIssue = async () => {
      setLoading(true);
      try {
        const res = await issuesAPI.getById(id);
        console.log("response:", res);

        // Handle different response structures
        let issueData;
        if (res.data?.data?.issue) {
          issueData = res.data.data.issue;
        } else if (res.data?.issue) {
          issueData = res.data.issue;
        } else if (res.data) {
          issueData = res.data;
        }

        setIssue(issueData);

        // Set comments from the issue data
        setComments(issueData?.comments || []);
      } catch (err) {
        console.error("Failed to fetch issue:", err);
        toast.error("Failed to load issue details");
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id]);

  const handleUpvote = async (event) => {
    const triggerElement = event.currentTarget;
    const wasUpvoted = issue.userHasUpvoted;
    
    // Only trigger animation when upvoting (not when removing upvote)
    if (!wasUpvoted) {
      setUpvoteAnimation({
        isAnimating: true,
        triggerElement: triggerElement,
      });
    }
    
    try {
      await issuesAPI.upvote(issue._id);
      setIssue((prev) => {
        const currentUpvotes = prev.upvotes?.length || prev.upvoteCount || 0;
        const newUpvotes = prev.userHasUpvoted
          ? currentUpvotes - 1
          : currentUpvotes + 1;

        return {
          ...prev,
          upvoteCount: newUpvotes,
          upvotes: prev.upvotes
            ? prev.userHasUpvoted
              ? prev.upvotes.slice(0, -1)
              : [...prev.upvotes, { user: "current_user" }]
            : [],
          userHasUpvoted: !prev.userHasUpvoted,
        };
      });
      toast.success(wasUpvoted ? "Upvote removed" : "Issue upvoted");
    } catch (err) {
      toast.error("Failed to upvote");
    }

    // Stop animation after delay (only if it was started)
    if (!wasUpvoted) {
      setTimeout(() => {
        setUpvoteAnimation({
          isAnimating: false,
          triggerElement: null,
        });
      }, 800);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: issue.title,
          text: issue.description,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await issuesAPI.addComment(issue._id, {
        message: newComment,
      });

      // Create optimistic comment object
      const comment = {
        _id: Date.now().toString(),
        user: { name: "You" },
        message: newComment,
        createdAt: new Date().toISOString(),
        isOfficial: false,
      };

      setComments((prev) => [...prev, comment]);
      setNewComment("");

      // Update comment count in issue
      setIssue((prev) => ({
        ...prev,
        commentCount: (prev.commentCount || 0) + 1,
      }));

      toast.success("Comment added successfully");
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // Open delete confirmation modal with animation trigger
  const handleDeleteComment = async (commentId, event) => {
    const triggerElement = event.currentTarget;
    setDeleteModal({ 
      isOpen: true, 
      commentId, 
      triggerElement 
    });
  };

  // Actual delete function
  const confirmDeleteComment = async () => {
    setIsDeleting(true);
    try {
      await issuesAPI.deleteComment(issue._id, deleteModal.commentId);
      setComments((prev) =>
        prev.filter((c) => c._id !== deleteModal.commentId)
      );
      setIssue((prev) => ({
        ...prev,
        commentCount: Math.max((prev.commentCount || 1) - 1, 0),
      }));
      toast.success("Comment deleted");
      setDeleteModal({ isOpen: false, commentId: null, triggerElement: null });
    } catch (err) {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if comment is valid (not empty or just whitespace)
  const isCommentValid = newComment.trim().length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loader mb-4 mx-auto" />
          <p className="text-gray-600">Loading issue details...</p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Issue not found.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const category = getCategoryInfo(issue.category);
  const statusColor = getStatusColor(issue.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => window.history.back()}
          className="text-primary-600 hover:text-primary-700 flex items-center mb-6"
        >
          ← Back to Issues
        </button>

        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              <div
                className={`p-3 rounded-lg bg-${category?.color || "gray"}-100`}
              >
                <span className="text-2xl">{category?.icon || "📋"}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {issue.title || "Untitled Issue"}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span>#{issue._id}</span>
                  <span>•</span>
                  <span>Reported {formatRelativeTime(issue.createdAt)}</span>
                  <span>•</span>
                  <span>by {getUserName(issue)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${
                      statusColor || "gray"
                    }-100 text-${statusColor || "gray"}-800 capitalize`}
                  >
                    {issue.status?.replace("_", " ") || "unknown"}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${
                      issue.priority === "urgent" ? "red" : "blue"
                    }-100 text-${
                      issue.priority === "urgent" ? "red" : "blue"
                    }-800 capitalize`}
                  >
                    {issue.priority || "normal"} priority
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleUpvote}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors relative overflow-visible ${
                  issue.userHasUpvoted
                    ? "bg-primary-50 border-primary-200 text-primary-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ArrowBigUp className="w-4 h-4" />
                <span>{issue.upvotes?.length || issue.upvoteCount || 0}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              {issue.description || "No description provided."}
            </p>
          </div>

          {/* Media preview */}
          {issue.media && issue.media.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Attachments
              </h3>
              <div className="flex space-x-2 overflow-x-auto">
                {issue.media.map((media, idx) => (
                  <img
                    key={idx}
                    src={media.thumbnailUrl || media.url}
                    alt={`Issue media ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(media.url, "_blank")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Comments ({comments.length})
          </h2>

          <form onSubmit={handleAddComment} className="mb-6">
            <textarea
              rows={3}
              className="form-textarea w-full mb-4 text-black font-sans border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <LoadingButton
                loading={commentLoading}
                type="submit"
                disabled={!isCommentValid || commentLoading}
                className={`btn ${
                  isCommentValid 
                    ? 'btn-primary' 
                    : 'btn-disabled bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add Comment
              </LoadingButton>
            </div>
          </form>

          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No comments yet
                </h3>
                <p className="text-gray-600">
                  Be the first to comment on this issue
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment._id || comment.id || Date.now()}
                  className="flex space-x-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {comment.user?.name?.charAt(0) ||
                          comment.author?.name?.charAt(0) ||
                          "?"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {comment.user?.name ||
                            comment.author?.name ||
                            "Anonymous"}
                        </span>
                        {comment.isOfficial && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Official
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteComment(comment._id, e)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                        title="Delete comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-700">{comment.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* YouTube-style Upvote Animation */}
        {upvoteAnimation.isAnimating && <UpvoteAnimation triggerElement={upvoteAnimation.triggerElement} />}

        {/* Delete Confirmation Modal with macOS Animation */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, commentId: null, triggerElement: null })}
          onConfirm={confirmDeleteComment}
          isLoading={isDeleting}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          triggerElement={deleteModal.triggerElement}
        />
      </div>
    </div>
  );
};

export default IssueDetailPage;