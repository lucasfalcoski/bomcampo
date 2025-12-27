import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgroContent {
  id: string;
  title: string;
  summary: string;
  body: string;
  type: 'article' | 'guide' | 'faq';
  culture: string | null;
  theme: string;
  partner_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AgroVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  culture: string | null;
  theme: string;
  partner_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface UseAgroContentReturn {
  contents: AgroContent[];
  videos: AgroVideo[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  themeFilter: string | null;
  setThemeFilter: (theme: string | null) => void;
  cultureFilter: string | null;
  setCultureFilter: (culture: string | null) => void;
  themes: string[];
  cultures: string[];
  filteredContents: AgroContent[];
  filteredVideos: AgroVideo[];
}

export function useAgroContent(): UseAgroContentReturn {
  const { user } = useAuth();
  const [contents, setContents] = useState<AgroContent[]>([]);
  const [videos, setVideos] = useState<AgroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [cultureFilter, setCultureFilter] = useState<string | null>(null);

  // Load content and videos
  useEffect(() => {
    async function loadContent() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Load contents - RLS will automatically filter based on partner_id
      const { data: contentData, error: contentError } = await supabase
        .from('agro_content')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (contentError) {
        console.error('Error loading agro_content:', contentError);
      } else {
        setContents(contentData as AgroContent[] || []);
      }

      // Load videos - RLS will automatically filter based on partner_id
      const { data: videoData, error: videoError } = await supabase
        .from('agro_video')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (videoError) {
        console.error('Error loading agro_video:', videoError);
      } else {
        setVideos(videoData as AgroVideo[] || []);
      }

      setLoading(false);
    }

    loadContent();
  }, [user]);

  // Extract unique themes and cultures
  const themes = [...new Set([
    ...contents.map(c => c.theme),
    ...videos.map(v => v.theme)
  ])].filter(Boolean).sort();

  const cultures = [...new Set([
    ...contents.map(c => c.culture).filter(Boolean),
    ...videos.map(v => v.culture).filter(Boolean)
  ])].sort() as string[];

  // Filter contents
  const filteredContents = contents.filter(content => {
    const matchesSearch = !searchQuery || 
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = !themeFilter || content.theme === themeFilter;
    const matchesCulture = !cultureFilter || content.culture === cultureFilter;
    return matchesSearch && matchesTheme && matchesCulture;
  });

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTheme = !themeFilter || video.theme === themeFilter;
    const matchesCulture = !cultureFilter || video.culture === cultureFilter;
    return matchesSearch && matchesTheme && matchesCulture;
  });

  return {
    contents,
    videos,
    loading,
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
  };
}
