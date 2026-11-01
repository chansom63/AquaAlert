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
  /** Show the bottom-left station information card when a location is selected. Default true. */
  showStationCard?: boolean;
  /** Extra highlighted pins drawn above the ward markers (e.g. demo sources that are not part of the 66 wards). */
  highlightSources?: { sourceId: string; name?: string; latitude: number; longitude: number; tone?: 'ok' | 'warn' | 'off' }[] | null;
  selectedHighlightId?: string | null;
  onSelectHighlight?: (sourceId: string) => void;
  /** Fit the map to the highlighted pins the first time they are shown. */
  fitHighlights?: boolean;
}

export declare const MapExplorer: React.FC<MapExplorerProps>;
export default MapExplorer;
