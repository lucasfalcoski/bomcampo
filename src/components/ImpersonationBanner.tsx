import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { User, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, endImpersonation, loading } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        <span>
          <strong>Impersonando:</strong> {impersonatedUser?.target_email}
        </span>
        {impersonatedUser?.reason && (
          <span className="text-orange-100">
            — {impersonatedUser.reason}
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-orange-600"
        onClick={endImpersonation}
        disabled={loading}
      >
        <X className="h-4 w-4 mr-1" />
        Encerrar
      </Button>
    </div>
  );
}
