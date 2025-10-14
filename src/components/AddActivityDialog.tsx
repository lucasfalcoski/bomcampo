import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  tipo: string;
  descricao: string | null;
  data: string;
  custo_estimado: number | null;
  realizado: boolean | null;
  observacoes: string | null;
}

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  activity?: Activity | null;
  onSuccess: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'pulverizacao', label: 'Pulverização' },
  { value: 'irrigacao', label: 'Irrigação' },
  { value: 'adubacao', label: 'Adubação' },
  { value: 'manejo_fitossanitario', label: 'Manejo Fitossanitário' },
  { value: 'colheita', label: 'Colheita' },
  { value: 'outro', label: 'Outro' },
];

export function AddActivityDialog({ open, onOpenChange, plotId, activity, onSuccess }: AddActivityDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    custo_estimado: '',
    realizado: false,
    observacoes: '',
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        tipo: activity.tipo,
        descricao: activity.descricao || '',
        data: activity.data,
        custo_estimado: activity.custo_estimado?.toString() || '',
        realizado: activity.realizado || false,
        observacoes: activity.observacoes || '',
      });
    } else {
      setFormData({
        tipo: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
        custo_estimado: '',
        realizado: false,
        observacoes: '',
      });
    }
  }, [activity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      plot_id: plotId,
      tipo: formData.tipo as 'pulverizacao' | 'irrigacao' | 'adubacao' | 'manejo_fitossanitario' | 'colheita' | 'outro',
      descricao: formData.descricao || null,
      data: formData.data,
      custo_estimado: formData.custo_estimado ? parseFloat(formData.custo_estimado) : null,
      realizado: formData.realizado,
      observacoes: formData.observacoes || null,
    };

    let error;
    if (activity) {
      ({ error } = await supabase.from('activities').update(data).eq('id', activity.id));
    } else {
      ({ error } = await supabase.from('activities').insert([data]));
    }

    setLoading(false);

    if (error) {
      toast({ 
        title: activity ? 'Erro ao atualizar atividade' : 'Erro ao criar atividade', 
        variant: 'destructive' 
      });
      return;
    }

    toast({ title: activity ? 'Atividade atualizada' : 'Atividade criada' });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar' : 'Nova'} Atividade</DialogTitle>
          <DialogDescription>
            {activity ? 'Atualize os dados da atividade' : 'Registre uma nova atividade no talhão'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data *</Label>
            <Input
              id="data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes da atividade..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custo_estimado">Custo Estimado (R$)</Label>
            <Input
              id="custo_estimado"
              type="number"
              step="0.01"
              min="0"
              value={formData.custo_estimado}
              onChange={(e) => setFormData({ ...formData, custo_estimado: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="realizado"
              checked={formData.realizado}
              onCheckedChange={(checked) => setFormData({ ...formData, realizado: checked as boolean })}
            />
            <Label htmlFor="realizado" className="cursor-pointer">
              Atividade já realizada
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.tipo}>
              {loading ? 'Salvando...' : activity ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
