import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

const STORAGE_KEY = 'bc_hideLatLonHint';

interface LatLonHintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNow: () => void;
}

export function LatLonHintDialog({ open, onOpenChange, onAddNow }: LatLonHintDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleContinue = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onOpenChange(false);
  };

  const handleAddNow = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onOpenChange(false);
    onAddNow();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <DialogTitle>Melhore a precisão</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            Recomendamos informar a latitude/longitude do talhão para melhorar a precisão
            das previsões de vento, chuva e janela de pulverização.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <Label
            htmlFor="dontShowAgain"
            className="text-sm font-normal cursor-pointer"
          >
            Não mostrar novamente
          </Label>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleContinue}>
            Continuar assim
          </Button>
          <Button onClick={handleAddNow}>
            Adicionar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function shouldShowLatLonHint(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
}
