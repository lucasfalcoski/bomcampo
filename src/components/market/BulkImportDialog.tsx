import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Download, Upload, FileSpreadsheet } from "lucide-react";
import { MARKET_CROPS, BRAZILIAN_STATES, type MarketPraca } from "@/hooks/useMarket";

// Crop synonyms mapping
const CROP_SYNONYMS: Record<string, string> = {
  'soja': 'soja',
  'milho': 'milho',
  'feijao': 'feijao',
  'feijão': 'feijao',
  'trigo': 'trigo',
  'sorgo': 'sorgo',
  'cafe': 'cafe',
  'café': 'cafe',
};

// Valid UFs
const VALID_UFS = BRAZILIAN_STATES.map(s => s.value);

export interface ParsedRow {
  lineNumber: number;
  crop: string;
  cropNormalized: string | null;
  praca: string;
  uf: string;
  price: number | null;
  capturedAt: string | null;
  source: string;
  note: string;
  status: 'ok' | 'error';
  errorMessage: string | null;
  pracaId?: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pracas: MarketPraca[];
  onImport: (rows: ParsedRow[], createMissingPracas: boolean) => Promise<{ inserted: number; failed: number }>;
  isImporting: boolean;
}

type FormatType = 'auto' | 'csv-semicolon' | 'tsv';

export function BulkImportDialog({ open, onOpenChange, pracas, onImport, isImporting }: BulkImportDialogProps) {
  const [rawData, setRawData] = useState("");
  const [format, setFormat] = useState<FormatType>("auto");
  const [createMissingPracas, setCreateMissingPracas] = useState(true);
  const [defaultCapturedAt, setDefaultCapturedAt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; failed: number } | null>(null);

  // Create a lookup map for praças
  const pracaLookup = useMemo(() => {
    const map = new Map<string, MarketPraca>();
    pracas.forEach(p => {
      // Store by multiple keys for flexible matching
      const normalizedName = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      map.set(`${normalizedName}|${p.state.toUpperCase()}`, p);
      map.set(`${p.name.toLowerCase()}|${p.state.toUpperCase()}`, p);
    });
    return map;
  }, [pracas]);

  // Find praça by name and state
  const findPraca = (name: string, state: string): MarketPraca | undefined => {
    const normalizedName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const upperState = state.toUpperCase();
    return pracaLookup.get(`${normalizedName}|${upperState}`) || pracaLookup.get(`${name.toLowerCase()}|${upperState}`);
  };

  // Detect separator
  const detectSeparator = (text: string): string => {
    const firstLine = text.split('\n')[0] || '';
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    
    if (tabCount >= 2) return '\t';
    if (semicolonCount >= 2) return ';';
    return ',';
  };

  // Get separator based on format
  const getSeparator = (text: string): string => {
    if (format === 'tsv') return '\t';
    if (format === 'csv-semicolon') return ';';
    return detectSeparator(text);
  };

  // Normalize price (handle comma and dot, remove R$ and spaces)
  const normalizePrice = (value: string): number | null => {
    if (!value) return null;
    let cleaned = value.replace(/R\$\s*/gi, '').replace(/\s/g, '').trim();
    // Handle Brazilian format: 1.234,56 -> 1234.56
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Check if comma is decimal separator (1.234,56)
      const commaIndex = cleaned.lastIndexOf(',');
      const dotIndex = cleaned.lastIndexOf('.');
      if (commaIndex > dotIndex) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 ? null : num;
  };

  // Normalize crop name
  const normalizeCrop = (value: string): string | null => {
    const lower = value.toLowerCase().trim();
    return CROP_SYNONYMS[lower] || null;
  };

  // Validate UF
  const validateUF = (value: string): string | null => {
    const upper = value.toUpperCase().trim();
    return VALID_UFS.includes(upper) ? upper : null;
  };

  // Parse captured_at
  const parseCapturedAt = (value: string): string | null => {
    if (!value || !value.trim()) return null;
    try {
      const date = new Date(value.trim().replace(' ', 'T'));
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  };

  // Parse the raw data
  const parsedRows = useMemo((): ParsedRow[] => {
    if (!rawData.trim()) return [];

    const lines = rawData.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    const separator = getSeparator(rawData);
    
    // Detect if first line is header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('crop') || firstLine.includes('cultura') || 
                      firstLine.includes('praca') || firstLine.includes('praça');
    
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const defaultDate = defaultCapturedAt ? parseCapturedAt(defaultCapturedAt) : null;

    return dataLines.map((line, idx): ParsedRow => {
      const cols = line.split(separator).map(c => c.trim());
      const lineNumber = hasHeader ? idx + 2 : idx + 1;

      // Expected columns: crop, praca, uf, price, captured_at, source, note
      const [cropRaw = '', pracaRaw = '', ufRaw = '', priceRaw = '', capturedAtRaw = '', sourceRaw = '', noteRaw = ''] = cols;

      const cropNormalized = normalizeCrop(cropRaw);
      const ufNormalized = validateUF(ufRaw);
      const priceValue = normalizePrice(priceRaw);
      const capturedAtValue = parseCapturedAt(capturedAtRaw) || defaultDate;
      const source = sourceRaw.trim() || 'manual_admin';
      const note = noteRaw.trim();

      // Validation
      const errors: string[] = [];
      
      if (!cropNormalized) {
        errors.push(`Cultura inválida: "${cropRaw}"`);
      }
      
      if (!ufNormalized) {
        errors.push(`UF inválida: "${ufRaw}"`);
      }
      
      if (priceValue === null) {
        errors.push(`Preço inválido: "${priceRaw}"`);
      }

      // Check praça
      let pracaId: string | undefined;
      if (ufNormalized && pracaRaw) {
        const found = findPraca(pracaRaw, ufNormalized);
        if (found) {
          pracaId = found.id;
        } else if (!createMissingPracas) {
          errors.push(`Praça não encontrada: "${pracaRaw}/${ufNormalized}"`);
        }
      }

      return {
        lineNumber,
        crop: cropRaw,
        cropNormalized,
        praca: pracaRaw,
        uf: ufRaw,
        price: priceValue,
        capturedAt: capturedAtValue,
        source,
        note,
        status: errors.length > 0 ? 'error' : 'ok',
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
        pracaId,
      };
    });
  }, [rawData, format, defaultCapturedAt, createMissingPracas, pracaLookup]);

  const validRows = parsedRows.filter(r => r.status === 'ok');
  const errorRows = parsedRows.filter(r => r.status === 'error');

  const handleValidate = () => {
    setShowPreview(true);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    
    const result = await onImport(validRows, createMissingPracas);
    setImportResult(result);
  };

  const handleReset = () => {
    setRawData("");
    setShowPreview(false);
    setImportResult(null);
    setDefaultCapturedAt("");
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = `crop;praca;uf;price;captured_at;source;note
soja;Ribeirão Preto;SP;132,50;2026-01-19 10:15;manual_admin;Preço de referência
milho;Campinas;SP;76,40;2026-01-19 11:05;manual_admin;
feijao;Londrina;PR;280,00;;;
cafe;Varginha;MG;1250,00;2026-01-19 09:00;cooperativa;Café arábica`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_precos_mercado.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Preços em Massa
          </DialogTitle>
          <DialogDescription>
            Cole os dados do Excel/Sheets ou CSV. Use ponto-e-vírgula ou TAB como separador.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 py-4 flex-1 overflow-auto">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label>Formato</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as FormatType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detectar</SelectItem>
                    <SelectItem value="csv-semicolon">CSV (;)</SelectItem>
                    <SelectItem value="tsv">TSV (Tab)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label>Data/hora padrão (se não informada por linha)</Label>
                <Input
                  type="datetime-local"
                  value={defaultCapturedAt}
                  onChange={(e) => setDefaultCapturedAt(e.target.value)}
                  placeholder="Usar data atual se vazio"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createPracas"
                checked={createMissingPracas}
                onCheckedChange={(checked) => setCreateMissingPracas(checked === true)}
              />
              <Label htmlFor="createPracas" className="cursor-pointer">
                Criar praça automaticamente se não existir
              </Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dados (cole do Excel ou CSV)</Label>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar template
                </Button>
              </div>
              <Textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder={`crop;praca;uf;price;captured_at;source;note
soja;Ribeirão Preto;SP;132,50;2026-01-19 10:15;manual_admin;
milho;Campinas;SP;76,40;2026-01-19 11:05;manual_admin;`}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Colunas: crop, praca, uf, price, captured_at (opcional), source (opcional), note (opcional)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            {importResult ? (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Resultado da Importação</h3>
                <div className="flex gap-4">
                  <Badge variant="default" className="text-sm py-1">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {importResult.inserted} inserido{importResult.inserted !== 1 ? 's' : ''}
                  </Badge>
                  {importResult.failed > 0 && (
                    <Badge variant="destructive" className="text-sm py-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {importResult.failed} falha{importResult.failed !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-4 flex-wrap">
                  <Badge variant="default" className="text-sm py-1">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {validRows.length} válido{validRows.length !== 1 ? 's' : ''}
                  </Badge>
                  {errorRows.length > 0 && (
                    <Badge variant="destructive" className="text-sm py-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errorRows.length} erro{errorRows.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <ScrollArea className="flex-1 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Linha</TableHead>
                        <TableHead>Cultura</TableHead>
                        <TableHead>Praça/UF</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, idx) => (
                        <TableRow key={idx} className={row.status === 'error' ? 'bg-destructive/10' : ''}>
                          <TableCell className="font-mono text-muted-foreground">
                            {row.lineNumber}
                          </TableCell>
                          <TableCell>
                            {row.cropNormalized ? (
                              <Badge variant="outline">
                                {MARKET_CROPS.find(c => c.value === row.cropNormalized)?.label || row.cropNormalized}
                              </Badge>
                            ) : (
                              <span className="text-destructive">{row.crop || '-'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.praca}/{row.uf.toUpperCase() || '?'}
                            {!row.pracaId && row.status === 'ok' && createMissingPracas && (
                              <Badge variant="secondary" className="ml-1 text-xs">nova</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.price !== null ? `R$ ${row.price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.capturedAt 
                              ? new Date(row.capturedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                              : 'agora'
                            }
                          </TableCell>
                          <TableCell>
                            {row.status === 'ok' ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <div className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="text-xs truncate max-w-[200px]" title={row.errorMessage || ''}>
                                  {row.errorMessage}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-shrink-0 gap-2">
          {!showPreview ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleValidate} 
                disabled={!rawData.trim()}
              >
                Validar / Pré-visualizar
              </Button>
            </>
          ) : importResult ? (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Voltar e Editar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validRows.length === 0 || isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importando...' : `Salvar ${validRows.length} preço${validRows.length !== 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
