import React from 'react';

export interface TileProviderInfo {
  id: string;
  name: string;
  providerName: string;
  tileUrl?: string;
  baseTileUrl?: string;
  roadsUrl?: string;
  labelsUrl?: string;
  maxZoom: number;
  fallbackRasterUrl?: string;
  attribution: string;
  description: string;
  license: string;
  rateLimit: string;
  websiteUrl: string;
}


export interface MapExplorerProps {
  sources?: any[];
  selectedSourceId?: string | null;
  onSelectSource?: (sourceId: string) => void;
  initialSelectedWard?: number | string | null;
  onSelectWard?: (wardNumber: number | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

export declare const MapExplorer: React.FC<MapExplorerProps>;
export default MapExplorer;
