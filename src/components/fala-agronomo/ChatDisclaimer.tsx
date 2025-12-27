import { Info } from 'lucide-react';

interface ChatDisclaimerProps {
  isB2B: boolean;
}

export function ChatDisclaimer({ isB2B }: ChatDisclaimerProps) {
  const text = isB2B
    ? 'As orientações fazem parte de um programa de relacionamento técnico.'
    : 'As orientações são informativas e não substituem assistência técnica local.';

  return (
    <div className="flex items-start gap-2 px-4 py-3 bg-muted/50 border-t border-border">
      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
