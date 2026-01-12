import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Video, Mic, FileText,
  X, Upload, ZoomIn, RotateCw, Trash2, Eye
} from 'lucide-react';
import { Evidence } from '../../types';

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
  inspectionId: _inspectionId,
  onEvidenceCaptured,
  onEvidenceRemoved,
  existingEvidence = [],
  maxFiles = 20,
  allowedTypes: _allowedTypes
}) => {
  const [capturing, setCapturing] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine
    });
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Location error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);
  
  const createEvidence = (blob: Blob, type: EvidenceType, ext: string): Evidence => ({
    id: `ev_${Date.now()}`,
    type,
    title: `${type} - ${new Date().toLocaleTimeString()}`,
    description: `Captured via app`,
    url: URL.createObjectURL(blob),
    file_name: `${type}_${Date.now()}.${ext}`,
    file_size: blob.size,
    file_type: blob.type,
    uploaded_by: 'current_user',
    uploaded_at: new Date(),
    gps_coordinates: location ? { latitude: location.lat, longitude: location.lng, accuracy: 10 } : undefined,
    timestamp: new Date(),
    device_info: deviceInfo,
    tags: ['site', type],
    encrypted: false,
    access_control: []
  });

  const capturePhoto = async () => {
    try {
      setCapturing('photo');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // Wait for focus
      await new Promise(r => setTimeout(r, 500));
      
      const canvas = document.createElement('canvas');
      if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob(blob => {
          if (blob) {
            onEvidenceCaptured(createEvidence(blob, 'photograph', 'jpg'));
            stream.getTracks().forEach(t => t.stop());
            setCapturing(null);
          }
        }, 'image/jpeg', 0.8);
      }
    } catch (e) {
      alert('Camera error');
      setCapturing(null);
    }
  };
  
  const startRecording = async (type: 'video' | 'audio') => {
    try {
      setCapturing(type);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video', 
        audio: true 
      });
      
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/mp4' : 'audio/wav' });
        onEvidenceCaptured(createEvidence(blob, type === 'video' ? 'video_recording' : 'audio_note', type === 'video' ? 'mp4' : 'wav'));
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
    } catch (e) {
      console.error(e);
      setCapturing(null);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      setCapturing(null);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    Array.from(e.target.files).forEach(file => {
      const type = file.type.startsWith('image') ? 'photograph' : file.type.startsWith('video') ? 'video_recording' : 'document_scan';
      onEvidenceCaptured(createEvidence(file, type, file.name.split('.').pop() || 'dat'));
    });
    setUploading(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Evidence ({existingEvidence.length}/{maxFiles})</h3>
      </div>
      
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={capturePhoto} disabled={!!capturing} className="p-4 bg-white dark:bg-gray-700 rounded-lg flex flex-col items-center gap-2 hover:bg-blue-50">
            <Camera className="w-8 h-8 text-blue-500" /> <span className="text-sm dark:text-white">Photo</span>
          </button>
          <button onClick={() => capturing === 'video' ? stopRecording() : startRecording('video')} disabled={capturing === 'photo' || capturing === 'audio'} className="p-4 bg-white dark:bg-gray-700 rounded-lg flex flex-col items-center gap-2 hover:bg-red-50">
            <Video className={`w-8 h-8 ${capturing === 'video' ? 'text-red-600 animate-pulse' : 'text-red-500'}`} /> 
            <span className="text-sm dark:text-white">{capturing === 'video' ? 'Stop' : 'Video'}</span>
          </button>
          <button onClick={() => capturing === 'audio' ? stopRecording() : startRecording('audio')} disabled={capturing === 'photo' || capturing === 'video'} className="p-4 bg-white dark:bg-gray-700 rounded-lg flex flex-col items-center gap-2 hover:bg-green-50">
            <Mic className={`w-8 h-8 ${capturing === 'audio' ? 'text-green-600 animate-pulse' : 'text-green-500'}`} />
            <span className="text-sm dark:text-white">{capturing === 'audio' ? 'Stop' : 'Audio'}</span>
          </button>
          <label className="p-4 bg-white dark:bg-gray-700 rounded-lg flex flex-col items-center gap-2 cursor-pointer hover:bg-purple-50">
            <Upload className="w-8 h-8 text-purple-500" /> <span className="text-sm dark:text-white">Upload</span>
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        
        {(capturing === 'photo' || capturing === 'video') && (
          <div className="mt-4 relative bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} className="w-full h-64 object-cover" autoPlay muted playsInline />
            <button onClick={() => setCapturing(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {existingEvidence.map(ev => (
          <div key={ev.id} className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-square border dark:border-gray-700">
            {ev.type === 'photograph' ? (
              <img src={ev.url} alt="evidence" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                {ev.type === 'video_recording' ? <Video className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <a href={ev.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full"><Eye className="w-4 h-4 text-black" /></a>
              <button onClick={() => onEvidenceRemoved(ev.id)} className="p-2 bg-red-500 rounded-full text-white"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};