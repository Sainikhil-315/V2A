import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import {
  X,
  Eye,
  MessageSquare,
  ThumbsUp,
  Calendar,
  User,
  MapPin,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { issuesAPI } from "../../utils/api";
import {
  formatRelativeTime,
  getCategoryInfo,
  getStatusColor,
} from "../../utils/helpers";
import { ISSUE_CATEGORIES, ISSUE_STATUS } from "../../utils/constants";

// Create custom marker icon
const createMarkerIcon = (category, status) => {
  const { icon } = getCategoryInfo(category);
  const colorMap = {
    pending: "#f59e0b",
    verified: "#3b82f6",
    in_progress: "#8b5cf6",
    resolved: "#10b981",
    rejected: "#ef4444",
  };

  return L.divIcon({
    html: `<div style="
      background-color: ${colorMap[status] || "#6b7280"};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
    ">${icon}</div>`,
    className: "custom-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// Map centering helper
const MapCenterController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

const IssueMapView = ({ onClose }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [mapCenter, setMapCenter] = useState([17.6868, 83.2185]); // Default center
  const [filters, setFilters] = useState({
    category: "drainage",
    status: "pending",
  });

  useEffect(() => {
    loadMapIssues();
  }, [filters]);

  const loadMapIssues = async () => {
    setLoading(true);
    try {
      const validCategories = ISSUE_CATEGORIES.map((cat) => cat.value);
      const safeFilters = {
        ...filters,
        category: validCategories.includes(filters.category)
          ? filters.category
          : "",
        limit: 100,
      };

      const response = await issuesAPI.getAll(safeFilters);
      console.log("API response:", response.data);
      // Based on your sample response structure: response.data.data.issues
      const issuesWithLocation = response.data.data.issues.filter(
        (issue) => issue.location?.coordinates.lat && issue.location?.coordinates.lng
      );
      console.log("Loaded issues with location:", issuesWithLocation);
      setIssues(issuesWithLocation);

      if (issuesWithLocation.length > 0) {
        const avgLat =
          issuesWithLocation.reduce((sum, i) => sum + i.location.coordinates.lat, 0) /
          issuesWithLocation.length;
        const avgLng =
          issuesWithLocation.reduce((sum, i) => sum + i.location.coordinates.lng, 0) /
          issuesWithLocation.length;
          console.log("Setting map center to:", [avgLat, avgLng]);
        setMapCenter([avgLat, avgLng]);
      }
    } catch (error) {
      console.error("Error loading map issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewIssue = (issueId) => {
    window.open(`/issues/${issueId}`, "_blank");
  };

  const getStatusBadgeClasses = (status) => {
    const classMap = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      verified: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return classMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <MapPin className="text-blue-600 w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Issues Map View</h2>
            <p className="text-sm text-gray-600">
              {loading
                ? "Loading issues..."
                : `${issues.length} issues with location data`}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white border-b flex gap-4 flex-wrap">
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
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
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
        >
          <option value="">All Status</option>
          {ISSUE_STATUS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 140px)' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading issues...</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-10"
          >
            <MapCenterController center={mapCenter} />
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {issues.map((issue) => {
                console.log("Rendering marker for issue:", issue);
              const categoryInfo = getCategoryInfo(issue.category);
              return (
                <Marker
                  key={issue._id}
                  position={[issue.location.coordinates.lat, issue.location.coordinates.lng]}
                  icon={createMarkerIcon(issue.category, issue.status)}
                >
                  <Popup maxWidth={300} className="custom-popup">
                    <div className="p-2 space-y-3 min-w-[280px]">
                      <div className="border-b pb-2">
                        <h3 className="font-semibold text-gray-800 text-base mb-1">
                          {issue.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 flex items-center">
                            {categoryInfo.icon} {categoryInfo.label}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(issue.status)}`}>
                            {issue.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {issue.description}
                      </p>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center text-gray-500">
                          <User className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span>{issue.reporter?.name || "Anonymous"}</span>
                        </div>

                        <div className="flex items-center text-gray-500">
                          <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span>{formatRelativeTime(issue.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center pt-2 border-t">
                        {/* <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            {issue.upvotes || 0}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {issue.comments || 0}
                          </span>
                        </div> */}
                        
                        <button
                          onClick={() => handleViewIssue(issue._id)}
                          className="flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-20 border">
        <h4 className="text-sm font-semibold mb-2">Status Legend</h4>
        <div className="space-y-1">
          {ISSUE_STATUS.map((status) => (
            <div key={status.value} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: {
                  pending: '#f59e0b',
                  verified: '#3b82f6',
                  in_progress: '#8b5cf6',
                  resolved: '#10b981',
                  rejected: '#ef4444',
                }[status.value] || '#6b7280' }}
              ></div>
              <span className="text-gray-700">{status.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IssueMapView;