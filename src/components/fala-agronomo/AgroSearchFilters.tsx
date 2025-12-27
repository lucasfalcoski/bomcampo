import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AgroSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  themes: string[];
  themeFilter: string | null;
  onThemeChange: (theme: string | null) => void;
  cultures: string[];
  cultureFilter: string | null;
  onCultureChange: (culture: string | null) => void;
}

export function AgroSearchFilters({
  searchQuery,
  onSearchChange,
  themes,
  themeFilter,
  onThemeChange,
  cultures,
  cultureFilter,
  onCultureChange
}: AgroSearchFiltersProps) {
  const hasFilters = searchQuery || themeFilter || cultureFilter;

  const clearFilters = () => {
    onSearchChange('');
    onThemeChange(null);
    onCultureChange(null);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {themes.length > 0 && (
        <Select
          value={themeFilter || 'all'}
          onValueChange={(value) => onThemeChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os temas</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {theme}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {cultures.length > 0 && (
        <Select
          value={cultureFilter || 'all'}
          onValueChange={(value) => onCultureChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Cultura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as culturas</SelectItem>
            {cultures.map((culture) => (
              <SelectItem key={culture} value={culture}>
                {culture}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
