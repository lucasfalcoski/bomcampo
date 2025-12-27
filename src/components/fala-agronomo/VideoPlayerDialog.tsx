import { Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { AgroVideo } from '@/hooks/useAgroContent';

interface VideoPlayerDialogProps {
  video: AgroVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getEmbedUrl(url: string): string {
  // Convert YouTube URLs to embed format
  if (url.includes('youtube.com/watch')) {
    const videoId = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  // Convert Vimeo URLs to embed format
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return url;
}

export function VideoPlayerDialog({ video, open, onOpenChange }: VideoPlayerDialogProps) {
  if (!video) return null;

  const embedUrl = getEmbedUrl(video.video_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">{video.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{video.theme}</Badge>
            {video.culture && (
              <Badge variant="secondary">{video.culture}</Badge>
            )}
            {video.duration_seconds && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(video.duration_seconds)}</span>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {video.description && (
          <div className="p-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {video.description}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
