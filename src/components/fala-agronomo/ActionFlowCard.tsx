import { useState, useEffect } from 'react';
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
  type: 'text' | 'select' | 'date' | 'number' | 'textarea';
  value?: unknown;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

interface ActionFlowData {
  id: string;
  title: string;
  entity: string;
  fields: ActionFlowField[];
  confirm_label: string;
  cancel_label: string;
  on_confirm: {
    endpoint: string;
    method: 'POST';
    body_map: Record<string, string>;
  };
}

interface ActionFlowCardProps {
  flowData: ActionFlowData;
  workspaceId?: string;
  farmId?: string;
  onComplete: (result: { success: boolean; message: string; entity: string }) => void;
  onCancel: () => void;
}

const ENTITY_ICONS: Record<string, string> = {
  activity: '📋',
  task: '📝',
  occurrence: '🔍',
  planting: '🌱',
  finance: '💰',
};

const SUCCESS_MESSAGES: Record<string, string> = {
  activity: 'Atividade registrada',
  task: 'Tarefa criada',
  occurrence: 'Ocorrência registrada',
  planting: 'Plantio cadastrado',
  finance: 'Lançamento salvo',
};

export function ActionFlowCard({ flowData, workspaceId, farmId, onComplete, onCancel }: ActionFlowCardProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Initialize form data from fields
  useEffect(() => {
    const initial: Record<string, string> = {};
    flowData.fields.forEach(field => {
      initial[field.key] = String(field.value ?? '');
    });
    setFormData(initial);
  }, [flowData.fields]);

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

      // Build request body from body_map
      const body: Record<string, unknown> = {};
      
      // Add workspace_id if needed
      if (flowData.on_confirm.body_map.workspace_id) {
        body.workspace_id = workspaceId;
      }
      
      // Add farm_id if needed
      if (flowData.on_confirm.body_map.farm_id && farmId) {
        body.farm_id = farmId;
      }

      // Map form fields to body
      for (const [bodyKey, formKey] of Object.entries(flowData.on_confirm.body_map)) {
        if (bodyKey === 'workspace_id' || (bodyKey === 'farm_id' && !formData[formKey])) continue;
        const value = formData[formKey];
        if (value !== undefined && value !== '') {
          // Handle numeric fields
          if (flowData.fields.find(f => f.key === formKey)?.type === 'number') {
            body[bodyKey] = parseFloat(value);
          } else {
            body[bodyKey] = value;
          }
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}${flowData.on_confirm.endpoint}`,
        {
          method: flowData.on_confirm.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }

      setCompleted(true);
      
      // Build success message
      const successMsg = SUCCESS_MESSAGES[flowData.entity] || 'Salvo com sucesso';
      const icon = ENTITY_ICONS[flowData.entity] || '✅';
      
      // Get labels for display
      const details: string[] = [];
      
      // Activity specific
      if (flowData.entity === 'activity') {
        const tipoField = flowData.fields.find(f => f.key === 'tipo');
        const tipoLabel = tipoField?.options?.find(o => o.value === formData.tipo)?.label || formData.tipo;
        const plotField = flowData.fields.find(f => f.key === 'plot_id');
        const plotLabel = plotField?.options?.find(o => o.value === formData.plot_id)?.label;
        if (tipoLabel) details.push(tipoLabel);
        if (plotLabel) details.push(plotLabel);
        if (formData.data) details.push(formData.data);
      }
      
      // Task specific
      if (flowData.entity === 'task') {
        if (formData.title) details.push(formData.title);
        if (formData.due_date) details.push(formData.due_date);
      }
      
      // Occurrence specific
      if (flowData.entity === 'occurrence') {
        const catField = flowData.fields.find(f => f.key === 'category');
        const catLabel = catField?.options?.find(o => o.value === formData.category)?.label;
        if (catLabel) details.push(catLabel);
      }
      
      // Finance specific
      if (flowData.entity === 'finance') {
        if (formData.descricao) details.push(formData.descricao);
        if (formData.valor_brl) details.push(`R$ ${formData.valor_brl}`);
      }
      
      // Planting specific
      if (flowData.entity === 'planting') {
        const cropField = flowData.fields.find(f => f.key === 'crop_id');
        const cropLabel = cropField?.options?.find(o => o.value === formData.crop_id)?.label;
        if (cropLabel) details.push(cropLabel);
        if (formData.data_plantio) details.push(formData.data_plantio);
      }

      const message = `${icon} **${successMsg}!**${details.length ? `\n\n${details.join(' • ')}` : ''}`;

      // Delay to show completed state
      setTimeout(() => {
        onComplete({
          success: true,
          message,
          entity: flowData.entity,
        });
      }, 500);

    } catch (error) {
      console.error('[ActionFlowCard] Error:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: ActionFlowField) => {
    const value = formData[field.key] || '';
    
    switch (field.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(v) => handleFieldChange(field.key, v)}
            disabled={completed}
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
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            disabled={completed}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.label}
            disabled={completed}
            step="any"
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.label}
            rows={2}
            disabled={completed}
          />
        );
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.label}
            disabled={completed}
          />
        );
    }
  };

  if (completed) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              {SUCCESS_MESSAGES[flowData.entity] || 'Salvo'}!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Processando...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const icon = ENTITY_ICONS[flowData.entity] || '📋';

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          {icon} {flowData.title}
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
