import { Camera, Video, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@components/ui';
import { useCamera } from '@hooks/useCamera';
import { useState } from 'react';

interface CameraPermissionProps {
  onGranted: () => void;
  onDenied: () => void;
}

export function CameraPermission({ onGranted, onDenied }: CameraPermissionProps) {
  const { requestPermission, error } = useCamera();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async () => {
    setIsRequesting(true);
    const granted = await requestPermission();
    setIsRequesting(false);
    if (granted) {
      onGranted();
    } else {
      onDenied();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <Camera className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Camera Access Required</h3>
      <p className="text-gray-500 mb-6 max-w-md">
        This application needs access to your camera to capture photo and video evidence.
        Please grant camera permission to continue.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <Button onClick={handleRequest} loading={isRequesting} className="w-full max-w-xs">
        {isRequesting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Requesting Permission...
          </>
        ) : (
          'Grant Camera Access'
        )}
      </Button>
      <p className="mt-4 text-sm text-gray-500">
        You can change this later in your browser settings.
      </p>
    </div>
  );
}