import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Video, Mic, FileText,
  X, Upload, ZoomIn, RotateCw, Trash2, Eye
} from 'lucide-react';
// FIX: Updated import path
import { Evidence } from '../../types';

// Define locally since it wasn't exported from types
type EvidenceType = 'photograph' | 'video_recording' | 'audio_note' | 'document_scan';

interface EvidenceCollectorProps {
  inspectionId: string;
  onEvidenceCaptured: (evidence: Evidence) => void;
  onEvidenceRemoved: (evidenceId: string) => void;
  existingEvidence: Evidence[];
  maxFiles?: number;
  allowedTypes?: EvidenceType[];
}

export const EvidenceCollector: React.FC<EvidenceCollectorProps> = ({
  inspectionId: _inspectionId, // Prefix with _ to ignore unused
  onEvidenceCaptured,
  onEvidenceRemoved,
  existingEvidence = [],
  maxFiles = 20,
  allowedTypes: _allowedTypes // Prefix with _ to ignore unused
}) => {
  const [capturing, setCapturing] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Get device information
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      // @ts-ignore
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency
    };
    setDeviceInfo(info);
    
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Failed to get location:', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);
  
  // Capture photo using camera
  const capturePhoto = async () => {
    try {
      setCapturing('photo');
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // Wait for stream to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Capture frame
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      if (video) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              // Create evidence object
              const evidence: Evidence = {
                id: `evidence_${Date.now()}`,
                type: 'photograph',
                title: `Photo Evidence - ${new Date().toLocaleString()}`,
                description: 'Photo captured during HSE inspection',
                url: URL.createObjectURL(blob),
                file_name: `photo_${Date.now()}.jpg`,
                file_size: blob.size,
                file_type: 'image/jpeg',
                uploaded_by: 'current_user', 
                uploaded_at: new Date(),
                gps_coordinates: location ? {
                  latitude: location.lat,
                  longitude: location.lng,
                  accuracy: 10
                } : undefined,
                timestamp: new Date(),
                device_info: deviceInfo,
                tags: ['photo', 'onsite', 'hse'],
                encrypted: false,
                access_control: []
              };
              
              onEvidenceCaptured(evidence);
              stream.getTracks().forEach(track => track.stop());
            }
          }, 'image/jpeg', 0.9);
        }
      }
      
    } catch (error) {
      console.error('Failed to capture photo:', error);
      alert('Camera access denied or not available');
    } finally {
      setCapturing(null);
    }
  };
  
  // Record video
  const startVideoRecording = async () => {
    try {
      setCapturing('video');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        
        const evidence: Evidence = {
          id: `evidence_${Date.now()}`,
          type: 'video_recording',
          title: `Video Evidence - ${new Date().toLocaleString()}`,
          description: 'Video recorded during HSE inspection',
          url: URL.createObjectURL(blob),
          file_name: `video_${Date.now()}.mp4`,
          file_size: blob.size,
          file_type: 'video/mp4',
          uploaded_by: 'current_user',
          uploaded_at: new Date(),
          gps_coordinates: location ? { latitude: location.lat, longitude: location.lng, accuracy: 10 } : undefined,
          timestamp: new Date(),
          device_info: deviceInfo,
          tags: ['video', 'onsite', 'hse'],
          encrypted: false,
          access_control: []
        };
        
        onEvidenceCaptured(evidence);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
    } catch (error) {
      console.error('Failed to start video recording:', error);
      setCapturing(null);
    }
  };
  
  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setCapturing(null);
    }
  };
  
  // Record audio
  const startAudioRecording = async () => {
    try {
      setCapturing('audio');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        
        const evidence: Evidence = {
          id: `evidence_${Date.now()}`,
          type: 'audio_note',
          title: `Audio Note - ${new Date().toLocaleString()}`,
          description: 'Audio note recorded during inspection',
          url: URL.createObjectURL(blob),
          file_name: `audio_${Date.now()}.wav`,
          file_size: blob.size,
          file_type: 'audio/wav',
          uploaded_by: 'current_user',
          uploaded_at: new Date(),
          timestamp: new Date(),
          device_info: deviceInfo,
          tags: ['audio', 'note', 'hse'],
          encrypted: false,
          access_control: []
        };
        
        onEvidenceCaptured(evidence);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      setCapturing(null);
    }
  };
  
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setCapturing(null);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    setUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        continue;
      }
      
      const fileType = getEvidenceType(file.type);
      
      const evidence: Evidence = {
        id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: fileType,
        title: file.name,
        description: `Uploaded file: ${file.name}`,
        url: URL.createObjectURL(file),
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: 'current_user',
        uploaded_at: new Date(),
        gps_coordinates: location ? { latitude: location.lat, longitude: location.lng, accuracy: 10 } : undefined,
        timestamp: new Date(),
        device_info: deviceInfo,
        tags: ['uploaded', fileType,