import { Button } from "@/components/ui/button";
import { FileDown, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onExportCSV: () => void;
  onExportPDF: () => void;
  onSendEmail?: () => void;
}

export function ExportButtons({ onExportCSV, onExportPDF, onSendEmail }: Props) {
  const { toast } = useToast();

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onExportCSV}>
        <FileDown className="h-4 w-4 mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onExportPDF}>
        <FileDown className="h-4 w-4 mr-2" />
        PDF
      </Button>
      {onSendEmail && (
        <Button variant="outline" size="sm" onClick={onSendEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Enviar Email
        </Button>
      )}
    </div>
  );
}
