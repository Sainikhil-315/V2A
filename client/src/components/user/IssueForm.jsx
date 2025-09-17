"// IssueForm component" 
// src/components/user/IssueForm.jsx
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { issuesAPI } from '../../utils/api';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { ISSUE_CATEGORIES, ISSUE_PRIORITY, FILE_UPLOAD } from '../../utils/constants';
import { formatFileSize } from '../../utils/helpers';
import VoiceRecorder from './VoiceRecorder';
import LocationPicker from './LocationPicker';
import { ButtonLoader } from '../common/Loader';
import toast from 'react-hot-toast';

const IssueForm = ({ onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [location, setLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { queueCreateIssue, isOnline } = useOfflineQueue();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    reset
  } = useForm({
    defaultValues: {
      priority: 'medium',
      visibility: 'public'
    }
  });

  const selectedCategory = watch('category');
  const selectedPriority = watch('priority');

  // File upload handling
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum size is ${formatFileSize(FILE_UPLOAD.maxSize)}`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} is not a supported file type`);
          }
        });
      });
    }

    // Add accepted files
    acceptedFiles.forEach(file => {
      if (files.length < FILE_UPLOAD.maxFiles) {
        const fileWithPreview = Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          id: Date.now() + Math.random()
        });
        setFiles(prev => [...prev, fileWithPreview]);
      } else {
        toast.error(`Maximum ${FILE_UPLOAD.maxFiles} files allowed`);
      }
    });
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': FILE_UPLOAD.acceptedTypes.images,
      'video/*': FILE_UPLOAD.acceptedTypes.videos,
      'audio/*': FILE_UPLOAD.acceptedTypes.audio
    },
    maxSize: FILE_UPLOAD.maxSize,
    maxFiles: FILE_UPLOAD.maxFiles
  });

  const removeFile = (fileId) => {
    setFiles(prev => {
      const updated = prev.filter(file => file.id !== fileId);
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find(file => file.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const handleVoiceRecording = (audioBlob) => {
    const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, {
      type: 'audio/webm'
    });
    audioFile.id = Date.now() + Math.random();
    setFiles(prev => [...prev, audioFile]);
    toast.success('Voice recording added successfully!');
  };

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
    setValue('location', selectedLocation);
  };

  const validateStep = async (step) => {
    switch (step) {
      case 1:
        return await trigger(['title', 'description', 'category']);
      case 2:
        return location !== null;
      case 3:
        return true; // Files are optional
      default:
        return true;
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = async (data) => {
    if (!location) {
      toast.error('Please select a location for the issue');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('priority', data.priority);
      formData.append('visibility', data.visibility);
      formData.append('location', JSON.stringify(location));

      // Add tags if any
      if (data.tags) {
        const tagsArray = data.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagsArray));
      }

      // Add files
      files.forEach((file, index) => {
        formData.append('media', file);
        setUploadProgress(((index + 1) / files.length) * 50); // First 50% for file preparation
      });

      let result;
      if (isOnline) {
        // Submit directly if online
        result = await issuesAPI.create(formData);
        toast.success('Issue reported successfully!');
      } else {
        // Queue for offline submission
        const issueData = {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          visibility: data.visibility,
          location: location,
          tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          files: files // Will be handled by offline queue
        };
        
        queueCreateIssue(issueData);
        toast.success('Issue queued for submission when online!');
      }

      // Reset form
      reset();
      setFiles([]);
      setLocation(null);
      setCurrentStep(1);
      
      if (onSuccess) {
        onSuccess(result?.data || { queued: true });
      }

    } catch (error) {
      console.error('Issue submission error:', error);
      toast.error('Failed to submit issue. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getCategoryIcon = (categoryValue) => {
    const category = ISSUE_CATEGORIES.find(cat => cat.value === categoryValue);
    return category?.icon || '📋';
  };

  const getPriorityColor = (priorityValue) => {
    const priority = ISSUE_PRIORITY.find(p => p.value === priorityValue);
    return priority?.color || 'gray';
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report an Issue</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Step {currentStep} of 4</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-primary-600 h-2 rounded-full"
            initial={{ width: '25%' }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Issue Details</h3>
                <p className="text-gray-600 dark:text-gray-400">Tell us about the issue you'd like to report</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issue Title *
                </label>
                <input
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' },
                    maxLength: { value: 100, message: 'Title cannot exceed 100 characters' }
                  })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Brief description of the issue"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description', {
                    required: 'Description is required',
                    minLength: { value: 10, message: 'Description must be at least 10 characters' },
                    maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
                  })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Provide detailed information about the issue..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ISSUE_CATEGORIES.map((category) => (
                    <label
                      key={category.value}
                      className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedCategory === category.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        {...register('category', { required: 'Please select a category' })}
                        type="radio"
                        value={category.value}
                        className="sr-only"
                      />
                      <span className="text-lg mr-2">{category.icon}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {category.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {ISSUE_PRIORITY.map((priority) => (
                    <label
                      key={priority.value}
                      className={`relative flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedPriority === priority.value
                          ? `border-${priority.color}-500 bg-${priority.color}-50 dark:bg-${priority.color}-900/20`
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        {...register('priority')}
                        type="radio"
                        value={priority.value}
                        className="sr-only"
                      />
                      <div className={`w-3 h-3 rounded-full bg-${priority.color}-500 mb-1`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {priority.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Location</h3>
                <p className="text-gray-600 dark:text-gray-400">Where is this issue located?</p>
              </div>

              <LocationPicker
                onLocationSelect={handleLocationSelect}
                selectedLocation={location}
              />
            </motion.div>
          )}

          {/* Step 3: Media Upload */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Media & Evidence</h3>
                <p className="text-gray-600 dark:text-gray-400">Add photos, videos, or voice recordings (optional)</p>
              </div>

              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input {...getInputProps()} />
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {isDragActive ? (
                  <p className="text-primary-600 dark:text-primary-400">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Images, videos, audio up to {formatFileSize(FILE_UPLOAD.maxSize)} each
                    </p>
                  </div>
                )}
              </div>

              {/* Voice Recorder */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Record Voice Note</h4>
                <VoiceRecorder onRecordingComplete={handleVoiceRecording} />
              </div>

              {/* Uploaded Files */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Uploaded Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="relative flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        {file.preview && (
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded mr-3"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Review & Submit</h3>
                <p className="text-gray-600 dark:text-gray-400">Please review your issue report before submitting</p>
              </div>

              {/* Review Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Title</h4>
                  <p className="text-gray-600 dark:text-gray-400">{watch('title')}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{watch('description')}</p>
                </div>

                <div className="flex items-center space-x-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Category</h4>
                    <div className="flex items-center">
                      <span className="mr-2">{getCategoryIcon(watch('category'))}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {ISSUE_CATEGORIES.find(cat => cat.value === watch('category'))?.label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Priority</h4>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full bg-${getPriorityColor(watch('priority'))}-500 mr-2`} />
                      <span className="text-gray-600 dark:text-gray-400">
                        {ISSUE_PRIORITY.find(p => p.value === watch('priority'))?.label}
                      </span>
                    </div>
                  </div>
                </div>

                {location && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Location</h4>
                    <p className="text-gray-600 dark:text-gray-400">{location.address}</p>
                  </div>
                )}

                {files.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Attachments</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {files.length} file{files.length !== 1 ? 's' : ''} attached
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    {...register('tags')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Separate tags with commas (e.g. urgent, downtown, pothole)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Visibility
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        {...register('visibility')}
                        type="radio"
                        value="public"
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Public</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        {...register('visibility')}
                        type="radio"
                        value="private"
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Private</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isSubmitting && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <ButtonLoader className="mr-2" />
                    {isOnline ? 'Submitting...' : 'Queuing...'}
                  </>
                ) : (
                  <>
                    Submit Issue
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              You're offline. Your issue will be submitted when you're back online.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueForm;