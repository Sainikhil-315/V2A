// src/components/user/VoiceRecorder.jsx
import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react'

const VoiceRecorder = ({ 
  onRecordingComplete, 
  isRecording: externalIsRecording, 
  onRecordingStart, 
  onRecordingStop 
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (externalIsRecording !== undefined) {
      setIsRecording(externalIsRecording)
    }
  }, [externalIsRecording])

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }

    return () => clearInterval(timerRef.current)
  }, [isRecording, isPaused])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      streamRef.current = stream
      audioChunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        setRecordedAudio({
          blob: audioBlob,
          url: audioUrl,
          duration: duration
        })
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, duration)
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)
      setRecordedAudio(null)
      
      if (onRecordingStart) {
        onRecordingStart()
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Unable to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    setIsRecording(false)
    setIsPaused(false)
    
    if (onRecordingStop) {
      onRecordingStop()
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    }
  }

  const playRecording = () => {
    if (recordedAudio && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const resetRecording = () => {
    setRecordedAudio(null)
    setDuration(0)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {!isRecording && !recordedAudio && (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          )}
          
          {isRecording && (
            <div className="flex items-center space-x-2">
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
              
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          
          {recordedAudio && (
            <div className="flex items-center space-x-2">
              <button
                onClick={isPlaying ? pausePlayback : playRecording}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              
              <button
                onClick={resetRecording}
                className="text-red-600 hover:text-red-800 px-3 py-2"
              >
                Reset
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 font-mono">
                {isPaused ? 'PAUSED' : 'RECORDING'}
              </span>
            </div>
          )}
          
          <span className="text-sm font-mono text-gray-600">
            {formatTime(duration)}
          </span>
        </div>
      </div>
      
      {/* Audio playback element */}
      {recordedAudio && (
        <audio
          ref={audioRef}
          src={recordedAudio.url}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      
      {/* Recording visualization */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-1 h-8">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="bg-red-400 rounded-full animate-pulse"
              style={{
                width: '3px',
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center mt-2">
        {!isRecording && !recordedAudio && 'Click to start recording your voice note'}
        {isRecording && !isPaused && 'Recording... Click stop when finished'}
        {isRecording && isPaused && 'Recording paused. Click resume to continue'}
        {recordedAudio && 'Recording complete. Click play to review or reset to record again'}
      </div>
    </div>
  )
}

export default VoiceRecorder