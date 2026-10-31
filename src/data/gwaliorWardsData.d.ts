export interface GwaliorWard {
  wardNumber: number; name: string; zoneId: number; zoneName: string; locality: string;
  population: number; status: string; waterSource: string; tds: string; chlorine: string;
  turbidity: string; pH: string; center: { lat: number; lng: number };
}
export interface GwaliorZone { id: number; name: string; region: string; color: string; wards: number[] }
export const GMC_ZONES_25: GwaliorZone[];
export const GWALIOR_WARDS_66: GwaliorWard[];
