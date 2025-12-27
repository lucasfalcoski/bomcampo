import { useState } from 'react';
import { Loader2, BookOpen, Play, FileText } from 'lucide-react';
import { useFalaAgronomo } from '@/hooks/useFalaAgronomo';
import { useAgroContent, AgroContent, AgroVideo } from '@/hooks/useAgroContent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ContentCard } from '@/components/fala-agronomo/ContentCard';
import { VideoCard } from '@/components/fala-agronomo/VideoCard';
import { ContentDetailDialog } from '@/components/fala-agronomo/ContentDetailDialog';
import { VideoPlayerDialog } from '@/components/fala-agronomo/VideoPlayerDialog';
import { AgroSearchFilters } from '@/components/fala-agronomo/AgroSearchFilters';
import { ChatSection } from '@/components/fala-agronomo/ChatSection';

export default function FalaAgronomo() {
  const {
    loading: chatLoading,
    sending,
    partner,
    conversation,
    messages,
    isB2B,
    sendMessage
  } = useFalaAgronomo();

  const {
    loading: contentLoading,
    searchQuery,
    setSearchQuery,
    themeFilter,
    setThemeFilter,
    cultureFilter,
    setCultureFilter,
    themes,
    cultures,
    filteredContents,
    filteredVideos
  } = useAgroContent();

  const [selectedContent, setSelectedContent] = useState<AgroContent | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<AgroVideo | null>(null);

  const loading = chatLoading || contentLoading;

  // Dynamic title and description based on B2B status
  const title = isB2B && partner
    ? `Canal Técnico da ${partner.name}`
    : 'Fala Agrônomo';

  const description = isB2B
    ? 'Conteúdo técnico atualizado pelo time de agrônomos da marca.'
    : 'Conteúdos técnicos para apoiar suas decisões no campo.';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasContents = filteredContents.length > 0;
  const hasVideos = filteredVideos.length > 0;
  const hasNoResults = !hasContents && !hasVideos && (searchQuery || themeFilter || cultureFilter);

  return (
    <div className="container max-w-4xl mx-auto py-4 px-4 md:py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-2.5 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <AgroSearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            themes={themes}
            themeFilter={themeFilter}
            onThemeChange={setThemeFilter}
            cultures={cultures}
            cultureFilter={cultureFilter}
            onCultureChange={setCultureFilter}
          />
        </CardContent>
      </Card>

      {/* No results message */}
      {hasNoResults && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum conteúdo encontrado para os filtros selecionados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contents Section */}
      {hasContents && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Conteúdos Recomendados</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onClick={() => setSelectedContent(content)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      {hasVideos && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Vídeos Técnicos</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setSelectedVideo(video)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no content exists at all */}
      {!hasContents && !hasVideos && !hasNoResults && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium mb-2">Conteúdo em breve</p>
            <p className="text-muted-foreground text-sm">
              Estamos preparando conteúdos técnicos para você.
              <br />
              Por enquanto, use o chat abaixo para tirar suas dúvidas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chat Section (collapsible) */}
      <ChatSection
        messages={messages}
        sending={sending}
        onSend={sendMessage}
        isB2B={isB2B}
        conversationReady={!!conversation}
      />

      {/* Dialogs */}
      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
      />

      <VideoPlayerDialog
        video={selectedVideo}
        open={!!selectedVideo}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
      />
    </div>
  );
}
