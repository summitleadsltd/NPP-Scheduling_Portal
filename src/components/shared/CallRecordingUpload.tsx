import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { uploadCallRecording, deleteCallRecording, updateAppointmentRecording } from '@/services/callRecordingService';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Upload, Play, Trash2 } from 'lucide-react';

interface CallRecordingUploadProps {
  appointmentId: string;
  existingRecording?: string;
  onRecordingChange?: (url: string | null) => void;
}

export function CallRecordingUpload({ appointmentId, existingRecording, onRecordingChange }: CallRecordingUploadProps) {
  const { profile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(existingRecording || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type (audio only)
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadCallRecording(file, appointmentId, profile.id);
      await updateAppointmentRecording(appointmentId, url);
      setRecordingUrl(url);
      onRecordingChange?.(url);
      toast.success('Call recording uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload call recording');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!recordingUrl) return;

    try {
      await deleteCallRecording(recordingUrl);
      await updateAppointmentRecording(appointmentId, null);
      setRecordingUrl(null);
      onRecordingChange?.(null);
      toast.success('Call recording deleted');
    } catch (error) {
      toast.error('Failed to delete call recording');
      console.error(error);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <Label className="text-sm font-medium">Call Recording</Label>
        
        {recordingUrl ? (
          <div className="mt-2 space-y-2">
            <audio controls src={recordingUrl} className="w-full h-10" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(recordingUrl, '_blank')}
              >
                <Play className="h-4 w-4 mr-1" />
                Open in New Tab
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <Input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              disabled={uploading}
              id="call-recording"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={uploading}
              onClick={() => document.getElementById('call-recording')?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? 'Uploading...' : 'Upload Recording'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Audio files only, max 10MB
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
