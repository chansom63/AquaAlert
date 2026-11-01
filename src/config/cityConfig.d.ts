export interface ZoneConfig {
  id: string;
  name: string;
  nameHi: string;
  division: string;
  headquarters: string;
  wards: string;
  keyAquifer: string;
  riskProfile: string;
  totalPopulationServed: number;
  surveillanceCoveragePercent: number;
  primarySourceType: string;
  color: string;
  center: { lat: number; lng: number };
}

export interface CityConfig {
  cityId: string;
  cityName: string;
  cityNameHi: string;
  stateName: string;
  stateNameHi: string;
  country: string;
  countryHi: string;
  municipalBody: string;
  municipalBodyHi: string;
  department: string;
  departmentHi: string;
  stateBoard: string;
  basinName: string;
  basinNameHi: string;
  aquiferFormation: string;
  centerCoords: { latitude: number; longitude: number };
  mapExtent: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  zones: ZoneConfig[];
}

export declare const CITY_CONFIG: CityConfig;
export declare const getZoneById: (idOrName?: string) => ZoneConfig;
