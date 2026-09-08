import { useState, useRef } from 'react';
import { X, RotateCcw, Check, Download, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@components/ui';

interface CapturePreviewProps {
  file: File;
  onConfirm: () => void;
  onRetake: () => void;
  onRemove?: () => void;
  showActions?: boolean;
}

export function CapturePreview({ file, onConfirm, onRetake, onRemove, showActions = true }: CapturePreviewProps) {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative group border border-gray-200 rounded-xl overflow-hidden bg-gray-100">
      {isVideo ? (
        <video
          ref={videoRef}
          src={url}
          className="w-full h-48 object-cover"
          onClick={togglePlay}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <img src={url} alt="Preview" className="w-full h-48 object-cover" />
      )}

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={togglePlay}
            className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
        </div>
      )}

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRetake}
          className="p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors"
          title="Retake"
        >
          <RotateCcw className="h-4 w-4 text-gray-700" />
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors"
            title="Remove"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        )}
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="px-2 py-1 text-xs font-medium text-white bg-black/70 rounded">
          {isVideo ? 'VIDEO' : 'PHOTO'}
        </span>
        <span className="px-2 py-1 text-xs font-medium text-white bg-black/70 rounded">
          {(file.size / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>

      {showActions && (
        <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-mono">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={file.name}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <Button variant="outline" size="sm" onClick={onRetake}>
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Retake
            </Button>
            <Button size="sm" onClick={onConfirm} className="bg-primary-500 hover:bg-primary-600">
              <Check className="h-3 w-3 mr-1.5" />
              Use
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}