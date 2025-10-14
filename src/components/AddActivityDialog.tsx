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
import { useActivityTypes } from '@/hooks/useActivityTypes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Activity {
  id: string;
  tipo: string;
  descricao: string | null;
  data: string;
  custo_estimado: number | null;
  realizado: boolean | null;
  observacoes: string | null;
  planting_id?: string | null;
  responsavel?: string | null;
}

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  plantingId?: string | null;
  activity?: Activity | null;
  onSuccess: () => void;
  suggestedType?: string;
  suggestedReason?: string;
}

export function AddActivityDialog({ 
  open, 
  onOpenChange, 
  plotId, 
  plantingId,
  activity, 
  onSuccess,
  suggestedType,
  suggestedReason 
}: AddActivityDialogProps) {
  const { toast } = useToast();
  const { activityTypes, getTypesByCategory } = useActivityTypes();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: suggestedType || '',
    descricao: suggestedReason || '',
    data: new Date().toISOString().split('T')[0],
    custo_estimado: '',
    realizado: false,
    observacoes: '',
    responsavel: '',
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
        responsavel: activity.responsavel || '',
      });
    } else {
      setFormData({
        tipo: suggestedType || '',
        descricao: suggestedReason || '',
        data: new Date().toISOString().split('T')[0],
        custo_estimado: '',
        realizado: false,
        observacoes: '',
        responsavel: '',
      });
    }
  }, [activity, open, suggestedType, suggestedReason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      plot_id: plotId,
      planting_id: plantingId || null,
      tipo: formData.tipo as any,
      descricao: formData.descricao || null,
      data: formData.data,
      custo_estimado: formData.custo_estimado ? parseFloat(formData.custo_estimado) : null,
      realizado: formData.realizado,
      observacoes: formData.observacoes || null,
      responsavel: formData.responsavel || null,
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

  const typesByCategory = getTypesByCategory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85svh] overflow-y-auto [-webkit-overflow-scrolling:touch]">
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar' : 'Nova'} Atividade</DialogTitle>
          <DialogDescription>
            {activity ? 'Atualize os dados da atividade' : 'Registre uma nova atividade no talhão'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-[env(safe-area-inset-bottom)]">
          {suggestedReason && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-sm">
              <p className="font-medium text-primary mb-1">💡 Sugestão do clima</p>
              <p className="text-muted-foreground">{suggestedReason}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Atividade *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
              <SelectTrigger id="tipo" className="bg-background">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-background max-h-[300px]">
                <ScrollArea className="h-full">
                  {Object.entries(typesByCategory).map(([category, types]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {category}
                      </div>
                      {types.map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.display_name}
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                    </div>
                  ))}
                </ScrollArea>
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
            <Label htmlFor="responsavel">Responsável</Label>
            <Input
              id="responsavel"
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              placeholder="Nome do responsável..."
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

          <div className="sticky bottom-0 inset-x-0 bg-card/95 backdrop-blur-sm border-t pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] -mx-6 px-6 mt-6">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.tipo} className="flex-1">
                {loading ? 'Salvando...' : activity ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
