import { geoForward } from './geocode';

export type LocationSource = 'plot_coords' | 'farm_coords' | 'municipality';

export interface ResolvedLocation {
  lat: number;
  lon: number;
  source: LocationSource;
  label: string;
}

interface Plot {
  latitude?: number | null;
  longitude?: number | null;
  municipality_name?: string | null;
  nome: string;
}

interface Farm {
  latitude?: number | null;
  longitude?: number | null;
  municipality_name?: string | null;
  nome: string;
}

export async function resolverLocalizacao(
  plot: Plot | null,
  farm: Farm | null
): Promise<ResolvedLocation | null> {
  // 1) Talhão com coordenadas
  if (plot && isFinite(Number(plot.latitude)) && isFinite(Number(plot.longitude))) {
    return {
      lat: Number(plot.latitude),
      lon: Number(plot.longitude),
      source: 'plot_coords',
      label: plot.nome
    };
  }

  // 2) Fazenda com coordenadas
  if (farm && isFinite(Number(farm.latitude)) && isFinite(Number(farm.longitude))) {
    return {
      lat: Number(farm.latitude),
      lon: Number(farm.longitude),
      source: 'farm_coords',
      label: farm.nome
    };
  }

  // 3) Município (geocoding simples)
  const muni = plot?.municipality_name || farm?.municipality_name;
  if (muni) {
    const geo = await geoForward(muni);
    if (geo) {
      return {
        lat: geo.lat,
        lon: geo.lon,
        source: 'municipality',
        label: muni
      };
    }
  }

  return null; // sem localização
}
