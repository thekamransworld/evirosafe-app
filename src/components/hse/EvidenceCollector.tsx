import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Video, Mic, FileText, MapPin,
  X, Upload, ZoomIn, RotateCw, Trash2, Eye, Download,
  WifiOff, Battery, Clock
} from 'lucide-react';
import { Evidence, EvidenceType } from '../../types/hse-inspection';

interface EvidenceCollectorProps {
  inspectionId: string;
  onEvidenceCaptured: (evidence: Evidence) => void;
  onEvidenceRemoved: (evidenceId: string) => void;
  existingEvidence: Evidence[];
  maxFiles?: number;
  allowedTypes?: EvidenceType[];
}

export const EvidenceCollector: React.FC<EvidenceCollectorProps> = ({
  inspectionId,
  onEvidenceCaptured,
  onEvidenceRemoved,
  existingEvidence = [],
  maxFiles = 20,
  allowedTypes = ['photograph', 'video_recording', 'audio_note', 'document_scan']
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
        tags: ['uploaded', fileType, 'hse'],
        encrypted: false,
        access_control: []
      };
      
      onEvidenceCaptured(evidence);
    }
    
    setUploading(false);
    event.target.value = '';
  };
  
  const getEvidenceType = (fileType: string): EvidenceType => {
    if (fileType.startsWith('image/')) return 'photograph';
    if (fileType.startsWith('video/')) return 'video_recording';
    if (fileType.startsWith('audio/')) return 'audio_note';
    return 'document_scan';
  };
  
  const renderEvidencePreview = (evidence: Evidence) => {
    const isImage = evidence.type === 'photograph';
    const isVideo = evidence.type === 'video_recording';
    const isAudio = evidence.type === 'audio_note';

    return (
      <div key={evidence.id} className="relative group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          {isImage ? (
            <img src={evidence.url} alt={evidence.title} className="w-full h-full object-cover" />
          ) : isVideo ? (
            <video src={evidence.url} className="w-full h-full object-cover" controls />
          ) : isAudio ? (
            <div className="p-4 text-center">
              <Mic className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <audio src={evidence.url} controls className="w-full" />
            </div>
          ) : (
            <div className="p-4 text-center">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-sm font-medium truncate">{evidence.file_name}</p>
              <p className="text-xs text-gray-500">{(evidence.file_size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => window.open(evidence.url, '_blank')} className="p-2 bg-white rounded-full hover:bg-gray-100" title="View"><Eye className="w-4 h-4" /></button>
          <button onClick={() => onEvidenceRemoved(evidence.id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Evidence Collection</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Capture photos, videos, audio notes, and upload documents</p>
        </div>
        <div className="text-sm text-gray-500">{existingEvidence.length} / {maxFiles} files</div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={capturePhoto} disabled={capturing === 'photo' || existingEvidence.length >= maxFiles} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors flex flex-col items-center gap-2">
            <Camera className="w-10 h-10 text-blue-500" />
            <span className="font-medium dark:text-white">Take Photo</span>
          </button>
          
          <button onClick={capturing === 'video' ? stopVideoRecording : startVideoRecording} disabled={existingEvidence.length >= maxFiles} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors flex flex-col items-center gap-2">
            <Video className={`w-10 h-10 ${capturing === 'video' ? 'text-red-500 animate-pulse' : 'text-red-500'}`} />
            <span className="font-medium dark:text-white">{capturing === 'video' ? 'Stop' : 'Record Video'}</span>
          </button>
          
          <button onClick={capturing === 'audio' ? stopAudioRecording : startAudioRecording} disabled={existingEvidence.length >= maxFiles} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors flex flex-col items-center gap-2">
            <Mic className={`w-10 h-10 ${capturing === 'audio' ? 'text-green-500 animate-pulse' : 'text-green-500'}`} />
            <span className="font-medium dark:text-white">{capturing === 'audio' ? 'Stop' : 'Record Audio'}</span>
          </button>
          
          <label className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-purple-500" />
            <span className="font-medium dark:text-white">Upload Files</span>
            <input type="file" multiple onChange={handleFileUpload} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
          </label>
        </div>
        
        {(capturing === 'photo' || capturing === 'video') && (
          <div className="mt-4 relative">
            <video ref={videoRef} className="w-full h-64 object-cover rounded-lg" autoPlay muted playsInline />
            <div className="absolute top-4 right-4 flex gap-2">
                <button className="p-2 bg-black/50 text-white rounded-full"><ZoomIn className="w-4 h-4" /></button>
                <button className="p-2 bg-black/50 text-white rounded-full"><RotateCw className="w-4 h-4" /></button>
                <button onClick={() => setCapturing(null)} className="p-2 bg-black/50 text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
      
      {existingEvidence.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {existingEvidence.map(renderEvidencePreview)}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No evidence collected yet</p>
        </div>
      )}
    </div>
  );
};