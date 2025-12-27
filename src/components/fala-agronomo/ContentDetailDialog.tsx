import { FileText, BookOpen, HelpCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AgroContent } from '@/hooks/useAgroContent';

interface ContentDetailDialogProps {
  content: AgroContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons = {
  article: FileText,
  guide: BookOpen,
  faq: HelpCircle
};

const typeLabels = {
  article: 'Artigo',
  guide: 'Guia',
  faq: 'FAQ'
};

export function ContentDetailDialog({ content, open, onOpenChange }: ContentDetailDialogProps) {
  if (!content) return null;

  const Icon = typeIcons[content.type] || FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{typeLabels[content.type]}</span>
          </div>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{content.theme}</Badge>
            {content.culture && (
              <Badge variant="secondary">{content.culture}</Badge>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-6">
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground font-medium mb-4">
              {content.summary}
            </p>
            <div className="whitespace-pre-wrap">
              {content.body}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
