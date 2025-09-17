// src/components/user/IssueForm.jsx
import React, { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  X, 
  MapPin, 
  Camera, 
  Mic, 
  MicOff,
  Image as ImageIcon,
  Video,
  FileAudio
} from 'lucide-react'
import { issuesAPI } from '../../utils/api'
import { ISSUE_CATEGORIES, ISSUE_PRIORITY } from '../../utils/constants'
import LoadingButton from '../common/LoadingButton'
import LocationPicker from './LocationPicker'
import VoiceRecorder from './VoiceRecorder'
import toast from 'react-hot-toast'

const IssueForm = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [location, setLocation] = useState(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(null)
  const [isRecording, setIsRecording] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    defaultValues: {
      priority: 'medium',
      category: ''
    }
  })

  const watchedCategory = watch('category')

  // File upload handler
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('Some files were rejected. Please check file size and format.')
      return
    }

    if (files.length + acceptedFiles.length > 5) {
      toast.error('Maximum 5 files allowed')
      return
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.split('/')[0]
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  })

  // Remove file
  const removeFile = (index) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          address: 'Current Location',
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        })
        toast.success('Location detected!')
      },
      (error) => {
        toast.error('Unable to get your location. Please select manually.')
        setShowLocationPicker(true)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  // Handle voice recording
  const handleVoiceRecording = (audioBlob, duration) => {
    setVoiceRecording({
      blob: audioBlob,
      duration,
      url: URL.createObjectURL(audioBlob)
    })
    setIsRecording(false)
    toast.success(`Voice note recorded (${Math.round(duration)}s)`)
  }

  // Submit form
  const onSubmit = async (data) => {
    if (!location) {
      toast.error('Please select a location for the issue')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      
      // Add form fields
      Object.keys(data).forEach(key => {
        formData.append(key, data[key])
      })

      // Add location
      formData.append('location', JSON.stringify(location))

      // Add files
      files.forEach((fileObj, index) => {
        formData.append('media', fileObj.file)
      })

      // Add voice recording
      if (voiceRecording) {
        formData.append('voice', voiceRecording.blob, `voice-${Date.now()}.wav`)
      }

      const response = await issuesAPI.create(formData)
      
      toast.success('Issue reported successfully!')
      navigate(`/issues/${response.data.issue.id}`)
    } catch (error) {
      console.error('Error creating issue:', error)
      toast.error('Failed to report issue. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Get file type icon
  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <FileAudio className="w-4 h-4" />
      default: return <Upload className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
            <p className="text-gray-600 mt-1">
              Help improve your community by reporting civic issues
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Title *
              </label>
              <input
                {...register('title', {
                  required: 'Title is required',
                  minLength: { value: 5, message: 'Title must be at least 5 characters' },
                  maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                })}
                type="text"
                className="form-input w-full text-black"
                placeholder="Brief description of the issue"
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="form-select w-full text-black"
                >
                  <option value="">Select a category</option>
                  {ISSUE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  {...register('priority')}
                  className="form-select w-full text-black"
                >
                  {ISSUE_PRIORITY.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' }
                })}
                rows={4}
                className="form-textarea w-full text-black"
                placeholder="Provide detailed information about the issue"
              />
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="space-y-3">
                {location ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800">{location.address}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocation(null)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="btn btn-outline flex items-center"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current Location
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="btn btn-outline flex items-center"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Select on Map
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Recording */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Note (Optional)
              </label>
              <div className="space-y-3">
                {voiceRecording ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center">
                      <FileAudio className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-blue-800">
                        Voice note ({Math.round(voiceRecording.duration)}s)
                      </span>
                      <audio controls className="ml-3">
                        <source src={voiceRecording.url} type="audio/wav" />
                      </audio>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(voiceRecording.url)
                        setVoiceRecording(null)
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecording}
                    isRecording={isRecording}
                    onRecordingStart={() => setIsRecording(true)}
                    onRecordingStop={() => setIsRecording(false)}
                  />
                )}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos/Videos (Optional)
              </label>
              
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop files here...'
                    : 'Drag & drop files here, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max 5 files, 10MB each (Images, Videos, Audio)
                </p>
              </div>

              {/* File Preview */}
              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {files.map((fileObj, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {fileObj.type === 'image' ? (
                          <img
                            src={fileObj.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            {getFileIcon(fileObj.type)}
                            <span className="text-xs mt-1 text-gray-600 text-center">
                              {fileObj.file.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anonymous option */}
            <div className="flex items-center">
              <input
                {...register('anonymous')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Report anonymously (your name won't be shown publicly)
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <LoadingButton
                loading={isLoading}
                type="submit"
                className="btn btn-primary"
              >
                Report Issue
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={(loc) => {
            // Ensure loc is always { address, coordinates: { lat, lng } }
            let formattedLoc = loc;
            if (loc && (typeof loc.lat === 'number' && typeof loc.lng === 'number')) {
              formattedLoc = {
                address: loc.address || 'Selected Location',
                coordinates: {
                  lat: loc.lat,
                  lng: loc.lng
                }
              };
            }
            setLocation(formattedLoc)
            setShowLocationPicker(false)
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  )
}

export default IssueForm