import { FileText, BookOpen, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgroContent } from '@/hooks/useAgroContent';

interface ContentCardProps {
  content: AgroContent;
  onClick?: () => void;
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

export function ContentCard({ content, onClick }: ContentCardProps) {
  const Icon = typeIcons[content.type] || FileText;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{typeLabels[content.type]}</span>
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            <Badge variant="outline" className="text-xs">
              {content.theme}
            </Badge>
            {content.culture && (
              <Badge variant="secondary" className="text-xs">
                {content.culture}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base line-clamp-2 mt-2">
          {content.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {content.summary}
        </p>
      </CardContent>
    </Card>
  );
}
