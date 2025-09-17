// src/hooks/useOfflineQueue.js
import { useState, useEffect, useCallback } from 'react';
import { getFromStorage, setToStorage } from '../utils/helpers';
import { issuesAPI } from '../utils/api';
import toast from 'react-hot-toast';

const OFFLINE_QUEUE_KEY = 'offline-queue';
const MAX_QUEUE_SIZE = 50;

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load queue from storage on mount
  useEffect(() => {
    const savedQueue = getFromStorage(OFFLINE_QUEUE_KEY, []);
    setQueue(savedQueue);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleConnectionChange = (e) => {
      setIsOnline(e.detail.isOnline);
      if (e.detail.isOnline) {
        processQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connectionchange', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connectionchange', handleConnectionChange);
    };
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    setToStorage(OFFLINE_QUEUE_KEY, queue);
  }, [queue]);

  // Add item to offline queue
  const addToQueue = useCallback((item) => {
    const queueItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...item
    };

    setQueue(prevQueue => {
      const newQueue = [...prevQueue, queueItem];
      
      // Limit queue size
      if (newQueue.length > MAX_QUEUE_SIZE) {
        newQueue.shift(); // Remove oldest item
      }
      
      return newQueue;
    });

    return queueItem.id;
  }, []);

  // Remove item from queue
  const removeFromQueue = useCallback((id) => {
    setQueue(prevQueue => prevQueue.filter(item => item.id !== id));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // Process offline queue
  const processQueue = useCallback(async () => {
    if (!isOnline || isProcessing || queue.length === 0) {
      return;
    }

    setIsProcessing(true);
    const processedItems = [];
    const failedItems = [];

    for (const item of queue) {
      try {
        await processQueueItem(item);
        processedItems.push(item.id);
      } catch (error) {
        console.error('Failed to process queue item:', error);
        failedItems.push(item.id);
        
        // If it's a client error (4xx), remove from queue as it won't succeed
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          processedItems.push(item.id);
        }
      }
    }

    // Remove processed items from queue
    setQueue(prevQueue => 
      prevQueue.filter(item => !processedItems.includes(item.id))
    );

    // Show success message if items were processed
    if (processedItems.length > 0) {
      toast.success(
        `${processedItems.length} offline ${processedItems.length === 1 ? 'action' : 'actions'} synced successfully`,
        { duration: 3000 }
      );
    }

    // Show warning if some items failed
    if (failedItems.length > 0) {
      toast.error(
        `${failedItems.length} offline ${failedItems.length === 1 ? 'action' : 'actions'} failed to sync`,
        { duration: 5000 }
      );
    }

    setIsProcessing(false);
  }, [isOnline, isProcessing, queue]);

  // Process individual queue item
  const processQueueItem = async (item) => {
    switch (item.type) {
      case 'CREATE_ISSUE':
        return await issuesAPI.create(item.data);
      
      case 'UPDATE_ISSUE':
        return await issuesAPI.update(item.issueId, item.data);
      
      case 'DELETE_ISSUE':
        return await issuesAPI.delete(item.issueId);
      
      case 'ADD_COMMENT':
        return await issuesAPI.addComment(item.issueId, item.data);
      
      case 'UPVOTE_ISSUE':
        return await issuesAPI.upvote(item.issueId);
      
      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  };

  // Queue specific actions
  const queueCreateIssue = useCallback((issueData) => {
    return addToQueue({
      type: 'CREATE_ISSUE',
      data: issueData,
      description: `Create issue: ${issueData.title}`
    });
  }, [addToQueue]);

  const queueUpdateIssue = useCallback((issueId, updateData) => {
    return addToQueue({
      type: 'UPDATE_ISSUE',
      issueId,
      data: updateData,
      description: `Update issue: ${issueId}`
    });
  }, [addToQueue]);

  const queueDeleteIssue = useCallback((issueId, title) => {
    return addToQueue({
      type: 'DELETE_ISSUE',
      issueId,
      description: `Delete issue: ${title || issueId}`
    });
  }, [addToQueue]);

  const queueAddComment = useCallback((issueId, commentData) => {
    return addToQueue({
      type: 'ADD_COMMENT',
      issueId,
      data: commentData,
      description: `Add comment to issue: ${issueId}`
    });
  }, [addToQueue]);

  const queueUpvoteIssue = useCallback((issueId) => {
    return addToQueue({
      type: 'UPVOTE_ISSUE',
      issueId,
      description: `Upvote issue: ${issueId}`
    });
  }, [addToQueue]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const stats = {
      total: queue.length,
      byType: {}
    };

    queue.forEach(item => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
    });

    return stats;
  }, [queue]);

  // Retry failed items
  const retryFailedItems = useCallback(() => {
    if (isOnline && !isProcessing) {
      processQueue();
    }
  }, [isOnline, isProcessing, processQueue]);

  return {
    // State
    queue,
    queueSize: queue.length,
    isProcessing,
    isOnline,

    // Actions
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
    retryFailedItems,

    // Specific queue actions
    queueCreateIssue,
    queueUpdateIssue,
    queueDeleteIssue,
    queueAddComment,
    queueUpvoteIssue,

    // Utils
    getQueueStats
  };
};