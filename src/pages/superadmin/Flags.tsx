import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuperadminRoute } from '@/components/SuperadminRoute';
import { useAdminFlags, useAdminWorkspaces, FeatureFlag } from '@/hooks/useAdminData';
import { Loader2, Flag, RefreshCw, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function SuperadminFlags() {
  const { loading, globalFlags, workspaceFlags, updateGlobalFlag, updateWorkspaceFlag, deleteWorkspaceFlag, refresh } = useAdminFlags();
  const { workspaces } = useAdminWorkspaces();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'global' | 'workspace'>('global');
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    workspaceId: '',
  });
  const [saving, setSaving] = useState(false);

  const openGlobalDialog = (flag?: FeatureFlag) => {
    setDialogType('global');
    setEditingFlag(flag || null);
    setFormData({
      key: flag?.key || '',
      value: flag ? JSON.stringify(flag.value_json, null, 2) : '{"enabled": false}',
      workspaceId: '',
    });
    setDialogOpen(true);
  };

  const openWorkspaceDialog = (flag?: FeatureFlag) => {
    setDialogType('workspace');
    setEditingFlag(flag || null);
    setFormData({
      key: flag?.key || '',
      value: flag ? JSON.stringify(flag.value_json, null, 2) : '{"enabled": false}',
      workspaceId: flag?.workspace_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const parsedValue = JSON.parse(formData.value);
      setSaving(true);

      if (dialogType === 'global') {
        await updateGlobalFlag(formData.key, parsedValue);
      } else {
        if (!formData.workspaceId) {
          toast({ title: 'Selecione um workspace', variant: 'destructive' });
          return;
        }
        await updateWorkspaceFlag(formData.workspaceId, formData.key, parsedValue);
      }

      setDialogOpen(false);
    } catch {
      toast({ title: 'JSON inválido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspaceFlag = async (workspaceId: string, key: string) => {
    if (confirm('Tem certeza que deseja remover esta flag?')) {
      await deleteWorkspaceFlag(workspaceId, key);
    }
  };

  const renderFlagValue = (value: unknown) => {
    // Handle primitives (boolean, string, number)
    if (typeof value === 'boolean') {
      return value ? (
        <Badge className="bg-green-500/10 text-green-600">Ativo</Badge>
      ) : (
        <Badge variant="outline">Inativo</Badge>
      );
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return <Badge variant="secondary">{String(value)}</Badge>;
    }
    // Handle null/undefined
    if (value === null || value === undefined) {
      return <Badge variant="outline">null</Badge>;
    }
    // Handle objects
    if (typeof value === 'object') {
      if ('enabled' in value) {
        return (value as Record<string, unknown>).enabled ? (
          <Badge className="bg-green-500/10 text-green-600">Ativo</Badge>
        ) : (
          <Badge variant="outline">Inativo</Badge>
        );
      }
      if ('value' in value) {
        return <Badge variant="secondary">{String((value as Record<string, unknown>).value)}</Badge>;
      }
    }
    return <code className="text-xs">{JSON.stringify(value)}</code>;
  };

  return (
    <SuperadminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Feature Flags</h1>
            <p className="text-muted-foreground">Gerencie flags globais e por workspace</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="global">
          <TabsList>
            <TabsTrigger value="global">Flags Globais</TabsTrigger>
            <TabsTrigger value="workspace">Flags por Workspace</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Flags Globais
                  </CardTitle>
                  <CardDescription>Aplicadas a todos os workspaces</CardDescription>
                </div>
                <Button size="sm" onClick={() => openGlobalDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Flag
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chave</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Atualizado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalFlags.map((flag) => (
                        <TableRow key={flag.key}>
                          <TableCell className="font-mono text-sm">{flag.key}</TableCell>
                          <TableCell>{renderFlagValue(flag.value_json)}</TableCell>
                          <TableCell>
                            {new Date(flag.updated_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openGlobalDialog(flag)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workspace" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Flags por Workspace
                  </CardTitle>
                  <CardDescription>Sobrescrevem flags globais</CardDescription>
                </div>
                <Button size="sm" onClick={() => openWorkspaceDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Flag
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Workspace</TableHead>
                        <TableHead>Chave</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Atualizado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workspaceFlags.map((flag) => (
                        <TableRow key={`${flag.workspace_id}-${flag.key}`}>
                          <TableCell>
                            <Badge variant="outline">
                              {workspaces.find(w => w.id === flag.workspace_id)?.name || flag.workspace_id?.slice(0, 8)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{flag.key}</TableCell>
                          <TableCell>{renderFlagValue(flag.value_json)}</TableCell>
                          <TableCell>
                            {new Date(flag.updated_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openWorkspaceDialog(flag)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteWorkspaceFlag(flag.workspace_id!, flag.key)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {workspaceFlags.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma flag de workspace configurada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFlag ? 'Editar Flag' : 'Nova Flag'}
              </DialogTitle>
              <DialogDescription>
                {dialogType === 'global' ? 'Flag global' : 'Flag de workspace'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {dialogType === 'workspace' && (
                <div className="space-y-2">
                  <Label>Workspace</Label>
                  <Select
                    value={formData.workspaceId}
                    onValueChange={(v) => setFormData({ ...formData, workspaceId: v })}
                    disabled={!!editingFlag}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Chave</Label>
                <Input
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="ai_enabled"
                  disabled={!!editingFlag}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor (JSON)</Label>
                <Textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder='{"enabled": true}'
                  className="font-mono text-sm"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Exemplos: {`{"enabled": true}`} ou {`{"value": 150}`}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.key}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperadminRoute>
  );
}
