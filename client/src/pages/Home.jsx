// src/pages/Home.jsx - Enhanced with floating feedback button
import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Play,
  CheckCircle,
  Users,
  TrendingUp,
  Mic,
  Camera,
  MapPin,
  Bell,
  Star,
  Quote,
  MessageCircle,
  X,
  Send,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { issuesAPI, leaderboardAPI, feedbackAPI } from "../utils/api";
import { formatNumber } from "../utils/helpers";
import toast from "react-hot-toast";

// Feedback Modal Component with macOS-style animation
const FeedbackModal = ({ isOpen, onClose, triggerElement }) => {
  const modalRef = useRef(null);
  const [formData, setFormData] = useState({
    message: "",
    rating: 5,
    category: "other",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && triggerElement && modalRef.current) {
      const modal = modalRef.current;
      const triggerRect = triggerElement.getBoundingClientRect();

      // Calculate exact bottom-right corner position of trigger
      const startX = triggerRect.right - 15;
      const startY = triggerRect.top - 15; // Start from top since button is at bottom

      // Reset any existing transitions
      modal.style.transition = "none";
      modal.style.opacity = "1";
      modal.style.pointerEvents = "all";

      // Set initial position and size - start exactly at bottom-right corner
      modal.style.left = startX + "px";
      modal.style.top = startY + "px";
      modal.style.width = "15px";
      modal.style.height = "15px";
      modal.style.borderRadius = "8px";
      modal.style.transformOrigin = "bottom right";
      modal.style.overflow = "hidden";

      // Force a reflow to ensure initial position is set
      modal.offsetHeight;

      // Phase 1: Slow initial growth from corner
      setTimeout(() => {
        modal.style.transition = "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 0.1)";
        modal.style.left = startX - 120 + "px";
        modal.style.top = startY - 90 + "px";
        modal.style.width = "120px";
        modal.style.height = "90px";
        modal.style.borderRadius = "12px";
      }, 10);

      // Phase 2: Fast expansion to full size
      setTimeout(() => {
        modal.style.transition = "all 0.3s cubic-bezier(0.1, 0.7, 0.1, 1)";
        modal.style.left = "50%";
        modal.style.top = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.style.width = "32rem"; // max-w-lg equivalent
        modal.style.height = "auto";
        modal.style.borderRadius = "0.75rem"; // rounded-xl
        modal.style.transformOrigin = "center";
      }, 220);
    }
  }, [isOpen, triggerElement]);

  const handleClose = () => {
    if (modalRef.current && triggerElement) {
      const modal = modalRef.current;
      const triggerRect = triggerElement.getBoundingClientRect();

      // Hide content immediately
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.style.opacity = "0";
      }

      // Animate back to trigger position
      modal.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.8, 0.4)";
      modal.style.transform = "none";
      modal.style.transformOrigin = "bottom right";
      modal.style.left = triggerRect.right - 15 + "px";
      modal.style.top = triggerRect.top - 15 + "px";
      modal.style.width = "15px";
      modal.style.height = "15px";
      modal.style.borderRadius = "8px";

      setTimeout(() => {
        onClose();
        // Reset form
        setFormData({
          message: "",
          rating: 5,
          category: "other",
        });
      }, 400);
    } else {
      onClose();
      setFormData({
        message: "",
        rating: 5,
        category: "other",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await feedbackAPI.submit(formData);

      if (response.data.success) {
        toast.success("Thank you for your feedback!");
        handleClose();
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to submit feedback. Please try again.";
      toast.error(errorMessage);
      console.error("Feedback submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
          pointerEvents: "none",
        }}
      >
        <div className="modal-content p-6 transition-opacity duration-300">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-2">
              Share Your Feedback
            </h3>
            <p className="text-sm text-gray-500">
              Help us improve Voice2Action with your valuable feedback
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border bg-white text-black border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="other">Other</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="improvement">Improvement</option>
                <option value="complaint">Complaint</option>
                <option value="compliment">Compliment</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="rating"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rating
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, rating }))}
                    className={`p-1 rounded transition-colors ${
                      formData.rating >= rating
                        ? "text-yellow-500"
                        : "text-gray-300"
                    }`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
                <span className="text-sm text-gray-500 ml-2">
                  {formData.rating} star{formData.rating !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us about your experience..."
                required
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [topContributors, setTopContributors] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    triggerElement: null,
  });

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    getFeedbacks();
  }, []);

  const getFeedbacks = async () => {
    try {
      const response = await feedbackAPI.getAll();
      console.log("Fetched feedbacks:", response.data.data.feedbacks);
      setFeedbacks(response.data.data.feedbacks);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to get feedbacks. Please try again.";
      toast.error(errorMessage);
      console.error("Feedback submission error:", error);
    }
  };

  const loadHomeData = async () => {
    try {
      const [statsResponse, leaderboardResponse] = await Promise.all([
        issuesAPI.getStats(),
        leaderboardAPI.getMonthly({ limit: 3 }),
      ]);

      setStats(statsResponse.data);
      setTopContributors(leaderboardResponse.data.leaderboard);
    } catch (error) {
      console.error("Error loading home data:", error);
    }
  };

  const handleFeedbackClick = (event) => {
    const triggerElement = event.currentTarget;
    setFeedbackModal({
      isOpen: true,
      triggerElement: triggerElement,
    });
  };

  const features = [
    {
      icon: Camera,
      title: "Multi-Media Reporting",
      description:
        "Report issues with photos, videos, or voice recordings for better clarity",
    },
    {
      icon: MapPin,
      title: "GPS Location Tagging",
      description:
        "Automatically tag locations or select precise spots on the map",
    },
    {
      icon: Bell,
      title: "Real-Time Updates",
      description:
        "Get instant notifications when your issues are being addressed",
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description:
        "Monitor the status of your reports from submission to resolution",
    },
  ];

  // const testimonials = [
  //   {
  //     name: 'Priya Sharma',
  //     role: 'Community Leader',
  //     content: 'Voice2Action has transformed how we handle civic issues in our locality. The response time has improved dramatically!',
  //     avatar: null
  //   },
  //   {
  //     name: 'Rajesh Kumar',
  //     role: 'Local Resident',
  //     content: 'I love how easy it is to report problems and track their progress. The voice recording feature is incredibly convenient.',
  //     avatar: null
  //   },
  //   {
  //     name: 'Municipal Officer',
  //     role: 'Government Official',
  //     content: 'This platform has streamlined our issue management process and improved citizen satisfaction significantly.',
  //     avatar: null
  //   }
  // ]

  const howItWorks = [
    {
      step: 1,
      title: "Report Issue",
      description:
        "Take a photo, record voice note, or write about the civic issue you encountered",
    },
    {
      step: 2,
      title: "Admin Reviews",
      description:
        "Our team verifies the issue and forwards it to the appropriate authority",
    },
    {
      step: 3,
      title: "Authority Acts",
      description:
        "Local authorities receive notification and begin working on the resolution",
    },
    {
      step: 4,
      title: "Track Progress",
      description:
        "Get real-time updates on the status until the issue is completely resolved",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Feedback Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={handleFeedbackClick}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 group"
          title="Give Feedback"
        >
          <MessageCircle className="w-6 h-6" />
          <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Share Feedback
          </div>
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                Voice Your
                <span className="text-yellow-300"> Civic </span>
                Concerns
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Report civic issues with photos, videos, and voice recordings.
                Track progress in real-time and help improve your community.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {!isAuthenticated ? (
                  <>
                    <a
                      href="/register"
                      className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                    <button className="inline-flex items-center px-8 py-4 border-2 border-white hover:bg-white hover:text-primary-600 text-white font-semibold rounded-lg transition-colors">
                      <Play className="mr-2 w-5 h-5" />
                      Watch Demo
                    </button>
                  </>
                ) : (
                  <a
                    href="/report"
                    className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
                  >
                    Report Issue Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                )}
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-blue-400">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">
                      {formatNumber(stats.totalIssues)}
                    </div>
                    <div className="text-blue-200 text-sm">Issues Reported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">
                      {formatNumber(stats.resolvedIssues)}
                    </div>
                    <div className="text-blue-200 text-sm">Issues Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">
                      {stats.totalIssues
                        ? Math.round(
                            (stats.resolvedIssues / stats.totalIssues) * 100
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-blue-200 text-sm">Success Rate</div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
                <h3 className="text-2xl font-bold mb-6">Quick Report</h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg">
                    <Camera className="w-6 h-6 mr-3" />
                    <span>Take a photo of the issue</span>
                  </div>
                  <div className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg">
                    <Mic className="w-6 h-6 mr-3" />
                    <span>Record a voice description</span>
                  </div>
                  <div className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg">
                    <MapPin className="w-6 h-6 mr-3" />
                    <span>Auto-detect location</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How Voice2Action Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, fast, and effective way to report and resolve civic issues
              in your community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>

                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 transform translate-x-1/2">
                    <ArrowRight className="w-6 h-6 text-primary-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Civic Engagement
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to effectively report, track, and resolve
              community issues
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      Road Pothole Report
                    </h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Resolved
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-lg h-32 mb-4 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Large pothole causing traffic issues on Main Street...
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="w-3 h-3 mr-1" />
                    Main Street, Bhimavaram
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Contributors */}
      {topContributors?.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Community Champions
              </h2>
              <p className="text-xl text-gray-600">
                Recognizing our top contributors who are making a difference
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {topContributors.map((contributor, index) => (
                <div
                  key={contributor.id}
                  className="bg-white rounded-xl p-6 text-center shadow-sm border"
                >
                  <div className="relative mb-4">
                    {contributor.avatar ? (
                      <img
                        src={contributor.avatar}
                        alt={contributor.name}
                        className="w-16 h-16 rounded-full mx-auto object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto flex items-center justify-center">
                        <Users className="w-8 h-8 text-primary-600" />
                      </div>
                    )}
                    <div className="absolute -top-2 -right-2">
                      {index === 0 && (
                        <Star className="w-6 h-6 text-yellow-500" />
                      )}
                      {index === 1 && (
                        <Star className="w-6 h-6 text-gray-400" />
                      )}
                      {index === 2 && (
                        <Star className="w-6 h-6 text-amber-600" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {contributor.name}
                  </h3>
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {formatNumber(contributor.points)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {contributor.issueCount} issues reported
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <a
                href="/leaderboard"
                className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
              >
                View Full Leaderboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Community Says
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from real people making a difference
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {feedbacks.map((feedback, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border"
              >
                <Quote className="w-8 h-8 text-primary-200 mb-4" />
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{feedback.message}"
                </p>
                <div className="flex items-center">
                  {feedback ? (
                    <img
                      src={feedback.user.avatar}
                      alt={feedback.user.name}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {feedback.user.name}
                    </div>
                    <div className="flex items-center text-sm">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            feedback.rating >= star
                              ? "text-yellow-500 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-gray-500">
                        ({feedback.rating})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of citizens who are actively improving their
            communities through Voice2Action
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
              >
                Start Reporting Issues
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center px-8 py-4 border-2 border-white hover:bg-white hover:text-primary-600 text-white font-semibold rounded-lg transition-colors"
              >
                Sign In
              </a>
            </div>
          ) : (
            <a
              href="/report"
              className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
            >
              Report Your First Issue
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          )}
        </div>
      </section>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() =>
          setFeedbackModal({ isOpen: false, triggerElement: null })
        }
        triggerElement={feedbackModal.triggerElement}
      />
    </div>
  );
};

export default Home;
