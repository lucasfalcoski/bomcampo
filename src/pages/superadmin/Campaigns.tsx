import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminCampaigns, Campaign } from '@/hooks/useAdminData';
import { Loader2, Megaphone, RefreshCw, Plus, Pencil, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function SuperadminCampaigns() {
  const { loading, campaigns, createCampaign, updateCampaign, deleteCampaign, refresh } = useAdminCampaigns();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    is_enabled: true,
    start_at: '',
    end_at: '',
    rule_json: '',
    payload_json: '',
  });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      is_enabled: true,
      start_at: new Date().toISOString().slice(0, 16),
      end_at: '',
      rule_json: '{}',
      payload_json: '{"ai_daily_quota": 200}',
    });
    setDialogOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      is_enabled: campaign.is_enabled,
      start_at: campaign.start_at ? campaign.start_at.slice(0, 16) : '',
      end_at: campaign.end_at ? campaign.end_at.slice(0, 16) : '',
      rule_json: campaign.rule_json ? JSON.stringify(campaign.rule_json, null, 2) : '{}',
      payload_json: campaign.payload_json ? JSON.stringify(campaign.payload_json, null, 2) : '{}',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const ruleJson = formData.rule_json ? JSON.parse(formData.rule_json) : null;
      const payloadJson = formData.payload_json ? JSON.parse(formData.payload_json) : null;

      setSaving(true);

      const data = {
        name: formData.name,
        is_enabled: formData.is_enabled,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        rule_json: ruleJson,
        payload_json: payloadJson,
      };

      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, data);
      } else {
        await createCampaign(data);
      }

      setDialogOpen(false);
    } catch {
      toast({ title: 'JSON inválido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (campaign: Campaign) => {
    await updateCampaign(campaign.id, { is_enabled: !campaign.is_enabled });
  };

  const handleDelete = async (campaign: Campaign) => {
    if (confirm(`Tem certeza que deseja remover a campanha "${campaign.name}"?`)) {
      await deleteCampaign(campaign.id);
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (!campaign.is_enabled) {
      return <Badge variant="outline">Desativada</Badge>;
    }

    const now = new Date();
    const start = campaign.start_at ? new Date(campaign.start_at) : null;
    const end = campaign.end_at ? new Date(campaign.end_at) : null;

    if (start && now < start) {
      return <Badge className="bg-yellow-500/10 text-yellow-600">Agendada</Badge>;
    }
    if (end && now > end) {
      return <Badge variant="secondary">Encerrada</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600">Ativa</Badge>;
  };

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campanhas</h1>
            <p className="text-muted-foreground">Gerencie campanhas promocionais e regras temporárias</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Lista de Campanhas
            </CardTitle>
            <CardDescription>{campaigns.length} campanhas cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && campaigns.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Payload</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{getCampaignStatus(campaign)}</TableCell>
                      <TableCell>
                        {campaign.start_at
                          ? new Date(campaign.start_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {campaign.end_at
                          ? new Date(campaign.end_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">
                          {campaign.payload_json
                            ? Object.keys(campaign.payload_json).join(', ')
                            : '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={campaign.is_enabled}
                          onCheckedChange={() => handleToggle(campaign)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(campaign)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {campaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma campanha cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
              </DialogTitle>
              <DialogDescription>
                Configure a campanha e suas regras
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Black Friday 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Fim</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Regras (JSON)</Label>
                <Textarea
                  value={formData.rule_json}
                  onChange={(e) => setFormData({ ...formData, rule_json: e.target.value })}
                  placeholder='{"workspaces": ["uuid1", "uuid2"]}'
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Ex: {`{"workspaces": [...], "created_after": "2024-01-01"}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payload (JSON)</Label>
                <Textarea
                  value={formData.payload_json}
                  onChange={(e) => setFormData({ ...formData, payload_json: e.target.value })}
                  placeholder='{"ai_daily_quota": 200}'
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Valores que serão aplicados como flags
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(v) => setFormData({ ...formData, is_enabled: v })}
                />
                <Label>Campanha ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCampaign ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperadminRoute>
  );
}
