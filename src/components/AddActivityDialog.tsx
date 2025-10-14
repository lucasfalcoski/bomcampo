import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddActivityDialog = ({ open, onOpenChange }: AddActivityDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    area: "",
    activity: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Atividade registrada!",
      description: "Sua atividade foi adicionada ao caderno de campo.",
    });
    onOpenChange(false);
    setFormData({
      area: "",
      activity: "",
      description: "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
          <DialogDescription>
            Registre uma nova atividade no caderno de campo
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="area">Área/Talhão</Label>
            <Select
              value={formData.area}
              onValueChange={(value) => setFormData({ ...formData, area: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="talhao-a">Talhão A - Soja</SelectItem>
                <SelectItem value="talhao-b">Talhão B - Milho</SelectItem>
                <SelectItem value="talhao-c">Talhão C - Trigo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity">Tipo de Atividade</Label>
            <Select
              value={formData.activity}
              onValueChange={(value) => setFormData({ ...formData, activity: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a atividade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plantio">Plantio</SelectItem>
                <SelectItem value="adubacao">Adubação</SelectItem>
                <SelectItem value="irrigacao">Irrigação</SelectItem>
                <SelectItem value="defensivo">Aplicação de Defensivo</SelectItem>
                <SelectItem value="colheita">Colheita</SelectItem>
                <SelectItem value="monitoramento">Monitoramento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              placeholder="Descreva detalhes da atividade..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-primary">
              Salvar Atividade
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
