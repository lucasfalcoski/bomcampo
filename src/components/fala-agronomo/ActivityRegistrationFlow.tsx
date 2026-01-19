import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActionFlowField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  value?: unknown;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

interface ActionFlowData {
  type: string;
  title: string;
  fields: ActionFlowField[];
  confirm_label: string;
  cancel_label: string;
}

interface ActivityRegistrationFlowProps {
  flowData: ActionFlowData;
  onComplete: (result: { success: boolean; message: string }) => void;
  onCancel: () => void;
}

export function ActivityRegistrationFlow({ flowData, onComplete, onCancel }: ActivityRegistrationFlowProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    flowData.fields.forEach(field => {
      initial[field.key] = String(field.value || '');
    });
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    for (const field of flowData.fields) {
      if (field.required && !formData[field.key]) {
        toast({
          title: 'Campo obrigatório',
          description: `Preencha o campo "${field.label}"`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activities-create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            plot_id: formData.plot_id,
            tipo: formData.tipo,
            data: formData.data,
            descricao: formData.descricao || undefined,
            observacoes: formData.observacoes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar atividade');
      }

      const result = await response.json();
      
      // Get the tipo label for the success message
      const tipoField = flowData.fields.find(f => f.key === 'tipo');
      const tipoLabel = tipoField?.options?.find(o => o.value === formData.tipo)?.label || formData.tipo;
      const plotField = flowData.fields.find(f => f.key === 'plot_id');
      const plotLabel = plotField?.options?.find(o => o.value === formData.plot_id)?.label || 'Talhão';

      onComplete({
        success: true,
        message: `✅ **Atividade registrada!**\n\n📋 ${tipoLabel} • ${plotLabel} • ${formData.data}`,
      });

    } catch (error) {
      console.error('[ActivityRegistrationFlow] Error:', error);
      toast({
        title: 'Erro ao registrar',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: ActionFlowField) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            value={formData[field.key] || ''}
            onValueChange={(value) => handleFieldChange(field.key, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={formData[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={formData[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.label}
          />
        );
      
      default:
        return field.key === 'observacoes' ? (
          <Textarea
            value={formData[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.label}
            rows={2}
          />
        ) : (
          <Input
            type="text"
            value={formData[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.label}
          />
        );
    }
  };

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          📋 {flowData.title}
        </h4>

        <div className="grid gap-3">
          {flowData.fields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1"
            size="sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {flowData.confirm_label}
              </>
            )}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-2" />
            {flowData.cancel_label}
          </Button>
        </div>
      </div>
    </Card>
  );
}
