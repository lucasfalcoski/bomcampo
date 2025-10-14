import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar } from 'lucide-react';

interface FieldNotesProps {
  plot: {
    nome: string;
    area_ha: number | null;
    solo_tipo: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  planting?: {
    crop: { nome: string; variedade: string | null };
    data_plantio: string;
    expectativa_sacas_ha: number | null;
  } | null;
}

export function FieldNotes({ plot, planting }: FieldNotesProps) {
  const daysAfterPlanting = planting
    ? Math.floor(
        (new Date().getTime() - new Date(planting.data_plantio).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const expectedProduction = planting && plot.area_ha && planting.expectativa_sacas_ha
    ? (plot.area_ha * planting.expectativa_sacas_ha).toFixed(1)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {plot.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Área</p>
            <p className="font-medium">{plot.area_ha?.toFixed(2) || '-'} ha</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tipo de Solo</p>
            <p className="font-medium">{plot.solo_tipo || '-'}</p>
          </div>
          {plot.latitude && plot.longitude && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Coordenadas</p>
              <p className="text-sm font-mono">
                {plot.latitude.toFixed(6)}, {plot.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {planting && (
          <>
            <hr className="border-border" />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Plantio Atual</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Cultura</p>
                  <p className="font-medium">
                    {planting.crop.nome}
                    {planting.crop.variedade && ` - ${planting.crop.variedade}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">DAP</p>
                    <Badge variant="secondary">{daysAfterPlanting} dias</Badge>
                  </div>
                  {expectedProduction && (
                    <div>
                      <p className="text-sm text-muted-foreground">Expectativa</p>
                      <p className="font-medium">{expectedProduction} sacas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
