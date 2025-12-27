import { Play, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgroVideo } from '@/hooks/useAgroContent';

interface VideoCardProps {
  video: AgroVideo;
  onClick?: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Play className="h-4 w-4" />
            <span className="text-xs font-medium">Vídeo</span>
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            <Badge variant="outline" className="text-xs">
              {video.theme}
            </Badge>
            {video.culture && (
              <Badge variant="secondary" className="text-xs">
                {video.culture}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base line-clamp-2 mt-2">
          {video.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {video.description}
          </p>
        )}
        {video.duration_seconds && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(video.duration_seconds)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
