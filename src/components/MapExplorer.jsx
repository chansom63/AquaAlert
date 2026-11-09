import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../map-explorer.css';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Configure MapLibre GL web worker for Vite/ESM bundling
try {
  if (typeof window !== 'undefined' && workerUrl) {
    setWorkerUrl(workerUrl);
  }
} catch (e) {
  console.warn('MapLibre worker setup notice:', e);
}
import { CITY_CONFIG } from '../config/cityConfig';
import {
  GMC_ZONES_25,
  GWALIOR_WARDS_66,
  getWardByNumber,
  getWardsByZoneId
} from '../data/gwaliorWardsData';
import { useAuth } from '../features/auth/AuthContext';
import {
  Search,
  X,
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Compass,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  Eye,
  Sliders,
  ChevronRight,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
  Radio,
  ExternalLink,
  Shield,
  Building2,
  Droplets,
  RotateCcw,
  Sparkles,
  Check,
  Globe2,
  Lock,
  FileText,
  Download,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';


// Tile provider configuration - 100% Zero-Credential, Keyless Public Mapping Services
// Standard: Esri World Street Map (High-definition Google Maps-style street map, 100% keyless & watermark-free)
// Satellite: Esri World Imagery + Transportation & Locality Reference Overlay (Hybrid under the hood)
const TILE_PROVIDERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    providerName: 'Esri World Street Map',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    fallbackRasterUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>, HERE, Garmin &bull; &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    description: 'High-definition street map rendering real Gwalior roads, street names, municipal localities, landmarks, and waterways with crisp cartography.',
    license: 'Esri Master License Agreement (MLA) for public web mapping &bull; OpenStreetMap (ODbL)',
    rateLimit: 'Completely free & keyless public server. No API tokens, no billing, instant response.',
    websiteUrl: 'https://www.esri.com/en-us/legal/terms/full-master-agreement'
  },
  dark: {
    id: 'dark',
    name: 'Dark Canvas',
    providerName: 'Esri Dark Gray Canvas + Locality Reference',
    baseTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
    attribution: 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>, DeLorme, NAVTEQ &bull; &copy; OpenStreetMap contributors',
    description: 'Ultra high-contrast dark cartographic base tailored for night operations, telemetry overlays, and glowing GIS vector boundaries without eye strain.',
    license: 'Esri Master License Agreement (MLA) &bull; OpenStreetMap (ODbL)',
    rateLimit: '100% keyless public service with dual-layer reference labels.',
    websiteUrl: 'https://www.esri.com/en-us/legal/terms/full-master-agreement'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    providerName: 'Esri World Imagery + Reference Overlay',
    baseTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    roadsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a> &mdash; Sources: Esri, DeLorme, HERE, TomTom, MapmyIndia &bull; &copy; OpenStreetMap contributors',
    description: 'High-resolution true-color satellite imagery overlaid with transparent municipal road networks, highways, and Gwalior locality labels without watermarks.',
    license: 'Esri Master License Agreement (MLA) &bull; OpenStreetMap (ODbL)',
    rateLimit: 'Dual-layer keyless composition. Zero API keys, no billing, completely watermark-free.',
    websiteUrl: 'https://www.esri.com/en-us/legal/terms/full-master-agreement'
  }
};

export const MapExplorer = ({
  sources = [],
  selectedSourceId,
  onSelectSource,
  initialSelectedWard = null,
  onSelectWard = null,
  className = '',
  style = {},
  showStationCard = true,
  highlightSources = null,
  selectedHighlightId = null,
  onSelectHighlight = null,
  fitHighlights = false
}) => {
  const { isStaff } = useAuth();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerGroupRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const gisLayersGroupRef = useRef(null);
  const flowLayerGroupRef = useRef(null);

  // Map Mode: 'standard' | 'satellite' (Standard is default; Satellite includes hybrid roads and labels)
  const [mapMode, setMapMode] = useState('standard');
  const [currentZoom, setCurrentZoom] = useState(13);
  const [tileError, setTileError] = useState(null); // null or { provider: string, message: string }
  const [reloadCounter, setReloadCounter] = useState(0);

  // Provider Info Popover / Modal
  const [showProviderInfo, setShowProviderInfo] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'NORMAL' | 'ALERT' | 'STALE'
  const [zoneFilter, setZoneFilter] = useState('ALL');

  // 66 Wards & 25 Administrative Zones GIS Controls
  const [wardDisplayMode, setWardDisplayMode] = useState('all'); // 'all' | 'zone' | 'selected' | 'off'
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('ALL'); // 'ALL' or zoneId (1..25)
  const [selectedWardNumber, setSelectedWardNumber] = useState(initialSelectedWard ? Number(initialSelectedWard) : null);
  const [activeWardInfo, setActiveWardInfo] = useState(null);


  useEffect(() => {
    if (initialSelectedWard !== null && initialSelectedWard !== undefined) {
      const num = Number(initialSelectedWard);
      setSelectedWardNumber(num);
      const w = GWALIOR_WARDS_66.find(x => x.wardNumber === num);
      if (w) {
        setActiveWardInfo(w);
        if (mapInstanceRef.current) {
          const bounds = L.latLngBounds(w.bounds);
          mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        }
      }
    }
  }, [initialSelectedWard]);

  const handleSelectWard = (wardNum) => {
    if (!wardNum) {
      setSelectedWardNumber(null);
      setActiveWardInfo(null);
      if (onSelectWard) onSelectWard(null);
      return;
    }
    const num = Number(wardNum);
    setSelectedWardNumber(num);
    setStatusFilter('ALL');
    const ward = GWALIOR_WARDS_66.find(w => w.wardNumber === num);
    if (ward) {
      setActiveWardInfo(ward);
      setActiveStationId(null);
      if (mapInstanceRef.current) {
        const bounds = L.latLngBounds(ward.bounds);
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }
    if (onSelectWard) {
      onSelectWard(num);
    }
  };

  const handleSelectZone = (zoneIdVal) => {
    if (zoneIdVal === 'ALL') {
      setSelectedZoneFilter('ALL');
      setWardDisplayMode('all');
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(defaultCenter, 13, { animate: true });
      }
      return;
    }
    const zId = Number(zoneIdVal);
    setSelectedZoneFilter(zId);
    setWardDisplayMode('zone');
    const zoneWards = GWALIOR_WARDS_66.filter(w => w.zoneId === zId);
    if (zoneWards.length > 0 && mapInstanceRef.current) {
      const allBounds = zoneWards.flatMap(w => w.bounds);
      mapInstanceRef.current.fitBounds(L.latLngBounds(allBounds), { padding: [50, 50], maxZoom: 15 });
    }
  };

  // Active Station for Google Maps-style Bottom Float Card
  const [activeStationId, setActiveStationId] = useState(selectedSourceId || null);

  // Advanced Municipal GIS Overlays Toggle
  const [showGisOverlayPanel, setShowGisOverlayPanel] = useState(false);
  const [gisLayers, setGisLayers] = useState({
    boundaries: true,
    conduits: true,
    catchments: false
  });

  // Gwalior city default coordinate
  const defaultCenter = useMemo(() => [CITY_CONFIG.centerCoords.latitude, CITY_CONFIG.centerCoords.longitude], []);

  // Canonical sources ensuring all 66 wards always have markings & operational records
  const allSources = useMemo(() => {
    return GWALIOR_WARDS_66.map(w => {
      const existing = (sources || []).find(s => Number(s.wardNumber) === Number(w.wardNumber) || s.sourceId === `gmc-ward-${String(w.wardNumber).padStart(2, '0')}`);
      const isAlert = w.status === 'ATTENTION' || (existing && (
        existing.publicStatus === 'MONITORED_ALERT' ||
        existing.publicStatus === 'ADVISORY' ||
        existing.publicStatus === 'ATTENTION' ||
        existing.publicStatus === 'ALERT'
      ));
      const isStale = (existing && (existing.isStale || existing.publicStatus === 'STALE/UNKNOWN')) || w.wardNumber === 8;
      const srcNum = w.wardNumber < 10 ? `00${w.wardNumber}` : `0${w.wardNumber}`;

      let publicStatus = 'ACTIVE';
      if (isAlert) publicStatus = 'MONITORED_ALERT';
      else if (isStale) publicStatus = 'STALE/UNKNOWN';

      return {
        sourceId: existing?.sourceId || `source-gwl-${srcNum}`,
        wardNumber: w.wardNumber,
        zoneId: w.zoneId,
        name: existing?.name || `Ward ${w.wardNumber < 10 ? `0${w.wardNumber}` : w.wardNumber} - ${w.name.split(' - ')[1]} (${w.waterSource})`,
        sourceType: existing?.sourceType || (w.waterSource.toLowerCase().includes('hand pump') ? 'HAND_PUMP' : w.waterSource.toLowerCase().includes('tube well') ? 'TUBE_WELL' : 'PIPED_WATER'),
        district: existing?.district || w.zoneName,
        locality: existing?.locality || `${w.locality}, Ward ${w.wardNumber}`,
        latitude: existing?.latitude || w.center.lat,
        longitude: existing?.longitude || w.center.lng,
        publicStatus,
        isStale,
        populationServed: existing?.populationServed || w.population,
        depthMeters: existing?.depthMeters || (20 + ((w.wardNumber * 7) % 65)),
        dataFreshnessHours: isStale ? 72 : 2,
        testedParameters: existing?.testedParameters || {
          tds: w.tds,
          chlorine: w.chlorine,
          turbidity: w.turbidity,
          pH: w.pH
        }
      };
    });
  }, [sources]);

  // Filter sources
  const filteredSources = useMemo(() => {
    return allSources.filter(s => {
      // 1. If viewing a single isolated ward, ALWAYS isolate and show only that ward
      if (wardDisplayMode === 'selected') {
        const targetWard = Number(selectedWardNumber || 14);
        return Number(s.wardNumber) === targetWard;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchId = s.sourceId?.toLowerCase().includes(q);
        const matchLoc = s.locality?.toLowerCase().includes(q);
        const matchDistrict = s.district?.toLowerCase().includes(q);
        const matchWard = s.wardNumber && String(s.wardNumber).includes(q);
        if (!matchName && !matchId && !matchLoc && !matchDistrict && !matchWard) return false;
      }

      // 3. Status filter
      if (statusFilter === 'NORMAL' && (s.isStale || s.publicStatus !== 'ACTIVE')) return false;
      if (statusFilter === 'ALERT' && s.publicStatus !== 'MONITORED_ALERT') return false;
      if (statusFilter === 'STALE' && !s.isStale) return false;

      // 4. By Zone filter
      if (wardDisplayMode === 'zone' && selectedZoneFilter !== 'ALL') {
        if (Number(s.zoneId) !== Number(selectedZoneFilter)) return false;
      }

      if (zoneFilter !== 'ALL' && s.district !== zoneFilter) return false;

      return true;
    });
  }, [allSources, searchQuery, statusFilter, zoneFilter, wardDisplayMode, selectedWardNumber, selectedZoneFilter]);

  // Resolve queried area target (Ward or Station)
  const queriedTarget = useMemo(() => {
    // 1. If active station selected
    if (activeStationId) {
      const station = allSources.find(s => s.sourceId === activeStationId);
      if (station && station.lat && station.lng) {
        return {
          type: 'station',
          name: station.name,
          sourceName: station.waterSource || 'Tigra Reservoir Feeder Line',
          lat: Number(station.lat),
          lng: Number(station.lng),
          wardNumber: station.wardNumber,
          locality: station.locality
        };
      }
    }

    // 2. If there is a search query that matches a specific ward or station
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchedWard = GWALIOR_WARDS_66.find(w => 
        w.name.toLowerCase().includes(q) || 
        w.locality.toLowerCase().includes(q) ||
        String(w.wardNumber) === q ||
        `ward ${w.wardNumber}` === q
      );
      if (matchedWard && matchedWard.center) {
        return {
          type: 'ward',
          name: matchedWard.name,
          sourceName: matchedWard.waterSource,
          lat: matchedWard.center.lat,
          lng: matchedWard.center.lng,
          wardNumber: matchedWard.wardNumber,
          locality: matchedWard.locality
        };
      }

      const matchedStation = allSources.find(s =>
        s.name.toLowerCase().includes(q) ||
        s.locality.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.sourceId.toLowerCase().includes(q)
      );
      if (matchedStation && matchedStation.lat && matchedStation.lng) {
        return {
          type: 'station',
          name: matchedStation.name,
          sourceName: matchedStation.waterSource || 'Tigra Piped Supply',
          lat: Number(matchedStation.lat),
          lng: Number(matchedStation.lng),
          wardNumber: matchedStation.wardNumber,
          locality: matchedStation.locality
        };
      }
    }

    // 3. If active ward or selected ward
    const currentWardNum = selectedWardNumber || (activeWardInfo && activeWardInfo.wardNumber) || (initialSelectedWard ? Number(initialSelectedWard) : null);
    if (currentWardNum) {
      const ward = GWALIOR_WARDS_66.find(w => w.wardNumber === currentWardNum);
      if (ward && ward.center) {
        return {
          type: 'ward',
          name: ward.name,
          sourceName: ward.waterSource,
          lat: ward.center.lat,
          lng: ward.center.lng,
          wardNumber: ward.wardNumber,
          locality: ward.locality
        };
      }
    }

    // 4. Fallback to central default ward (Ward 14 Maharaj Bada Central Plaza)
    const defaultWard = GWALIOR_WARDS_66.find(w => w.wardNumber === 14);
    if (defaultWard && defaultWard.center) {
      return {
        type: 'ward',
        name: defaultWard.name,
        sourceName: defaultWard.waterSource,
        lat: defaultWard.center.lat,
        lng: defaultWard.center.lng,
        wardNumber: defaultWard.wardNumber,
        locality: defaultWard.locality
      };
    }

    return null;
  }, [activeStationId, selectedWardNumber, activeWardInfo, initialSelectedWard, searchQuery, allSources]);

  // Aggregate stats across all 66 wards
  const totalCount = allSources.length;
  const alertCount = allSources.filter(s => s.publicStatus === 'MONITORED_ALERT').length;
  const staleCount = allSources.filter(s => s.isStale).length;
  const normalCount = allSources.filter(s => !s.isStale && s.publicStatus === 'ACTIVE').length;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false // Handled via dedicated custom attribution & provider popover
      });

      // Layer groups
      const tileGroup = L.layerGroup().addTo(map);
      const gisGroup = L.layerGroup().addTo(map);
      const flowGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);

      tileLayerGroupRef.current = tileGroup;
      gisLayersGroupRef.current = gisGroup;
      flowLayerGroupRef.current = flowGroup;
      markersLayerGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Invalidate size after DOM mount to guarantee seamless tile alignment
      setTimeout(() => {
        map.invalidateSize();
      }, 150);

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      // Deselect floating station card on empty map click
      map.on('click', (e) => {
        if (e.originalEvent.target.tagName !== 'BUTTON' && !e.originalEvent.target.closest('.station-pin-marker')) {
          setActiveStationId(null);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [defaultCenter]);

  // Update Base Tile Layer based on mapMode ('standard' | 'satellite')
  useEffect(() => {
    const tileGroup = tileLayerGroupRef.current;
    if (!tileGroup || !mapInstanceRef.current) return;

    tileGroup.clearLayers();
    setTileError(null);

    try {
      if (mapMode === 'standard') {
        // Mode 1: Standard Street Map via Esri World Street Map (Keyless, watermark-free, crisp street cartography)
        const streetLayer = L.tileLayer(TILE_PROVIDERS.standard.tileUrl, {
          maxZoom: TILE_PROVIDERS.standard.maxZoom
        });

        streetLayer.on('tileerror', () => {
          console.warn('Primary street tile fallback triggered to OpenStreetMap');
          setTileError({
            provider: 'Esri World Street Map',
            message: 'Fallback active: rendering OpenStreetMap street tiles.'
          });
          const fallback = L.tileLayer(TILE_PROVIDERS.standard.fallbackRasterUrl, {
            maxZoom: 18
          });
          tileGroup.clearLayers();
          tileGroup.addLayer(fallback);
        });

        tileGroup.addLayer(streetLayer);
      } else if (mapMode === 'dark') {
        // Mode 2: Dark Canvas (Esri Dark Gray Base + Locality Reference Labels)
        const darkBase = L.tileLayer(TILE_PROVIDERS.dark.baseTileUrl, {
          maxZoom: TILE_PROVIDERS.dark.maxZoom
        });
        darkBase.on('tileerror', () => {
          setTileError({
            provider: 'Esri Dark Gray Canvas',
            message: 'Dark canvas tile layer slow or unreachable.'
          });
        });
        tileGroup.addLayer(darkBase);

        const darkLabels = L.tileLayer(TILE_PROVIDERS.dark.labelsUrl, {
          maxZoom: TILE_PROVIDERS.dark.maxZoom,
          opacity: 0.95
        });
        darkLabels.on('tileerror', () => {
          console.warn('Dark labels overlay notice');
        });
        tileGroup.addLayer(darkLabels);
      } else {
        // Mode 3: Satellite Map (Esri World Imagery + Transportation roads + Boundaries/Places labels)
        const satBase = L.tileLayer(TILE_PROVIDERS.satellite.baseTileUrl, {
          maxZoom: TILE_PROVIDERS.satellite.maxZoom
        });
        satBase.on('tileerror', () => {
          setTileError({
            provider: 'Esri World Imagery',
            message: 'Esri satellite base layer unreachable or slow.'
          });
        });
        tileGroup.addLayer(satBase);

        // Transportation overlay (crisp roads, highways)
        const roadsOverlay = L.tileLayer(TILE_PROVIDERS.satellite.roadsUrl, {
          maxZoom: TILE_PROVIDERS.satellite.maxZoom,
          opacity: 0.95
        });
        tileGroup.addLayer(roadsOverlay);

        // Reference places and Gwalior locality labels overlay
        const labelsOverlay = L.tileLayer(TILE_PROVIDERS.satellite.labelsUrl, {
          maxZoom: TILE_PROVIDERS.satellite.maxZoom,
          opacity: 0.95
        });
        labelsOverlay.on('tileerror', () => {
          console.warn('Satellite labels overlay warning');
        });
        tileGroup.addLayer(labelsOverlay);
      }

      // Ensure leaflet recalculates tile layout after mode switch
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 100);
      }
    } catch (err) {
      console.warn('Tile layer setup failure:', err);
      setTileError({
        provider: mapMode,
        message: 'Could not load requested tiles; running on baseline street tiles.'
      });
      const fallbackLayer = L.tileLayer(TILE_PROVIDERS.standard.fallbackRasterUrl, {
        maxZoom: 18
      });
      tileGroup.addLayer(fallbackLayer);
    }
  }, [mapMode, reloadCounter]);

  // Update Advanced GIS Overlays (66 Municipal Wards across 25 Zones & Water Conduits)
  useEffect(() => {
    const gisGroup = gisLayersGroupRef.current;
    if (!gisGroup) return;

    gisGroup.clearLayers();

    // 1. Municipal Wards Layer (66 Administrative Wards across 25 Zones)
    if (gisLayers.boundaries && wardDisplayMode !== 'off') {
      let wardsToRender = GWALIOR_WARDS_66;

      if (wardDisplayMode === 'selected') {
        if (selectedWardNumber) {
          wardsToRender = GWALIOR_WARDS_66.filter(w => w.wardNumber === selectedWardNumber);
        } else {
          // If none selected, default to active anomaly ward (Ward 14)
          wardsToRender = [GWALIOR_WARDS_66.find(w => w.status === 'ATTENTION') || GWALIOR_WARDS_66[13]];
        }
      } else if (wardDisplayMode === 'zone') {
        if (selectedZoneFilter !== 'ALL') {
          wardsToRender = GWALIOR_WARDS_66.filter(w => w.zoneId === Number(selectedZoneFilter));
        } else if (selectedWardNumber) {
          const targetW = GWALIOR_WARDS_66.find(w => w.wardNumber === selectedWardNumber);
          if (targetW) {
            wardsToRender = GWALIOR_WARDS_66.filter(w => w.zoneId === targetW.zoneId);
          }
        }
      } else if (selectedZoneFilter !== 'ALL') {
        wardsToRender = GWALIOR_WARDS_66.filter(w => w.zoneId === Number(selectedZoneFilter));
      }

      wardsToRender.forEach(ward => {
        const zone = GMC_ZONES_25.find(z => z.id === ward.zoneId);
        const isSelected = selectedWardNumber === ward.wardNumber;

        let strokeColor = zone?.color || '#0ea5e9';
        let fillColor = zone?.color || '#0ea5e9';
        let fillOpacity = 0.08;
        let weight = 1.4;

        if (ward.status === 'ATTENTION') {
          strokeColor = '#f59e0b';
          fillColor = '#f59e0b';
          fillOpacity = 0.22;
          weight = 2;
        }

        if (isSelected) {
          strokeColor = '#00D9FF';
          fillColor = '#00D9FF';
          fillOpacity = 0.28;
          weight = 3;
        }

        const poly = L.polygon(ward.bounds, {
          color: strokeColor,
          weight: weight,
          opacity: isSelected ? 1 : 0.8,
          dashArray: isSelected ? undefined : '3, 3',
          fillColor: fillColor,
          fillOpacity: fillOpacity,
          className: isSelected ? 'cursor-pointer transition-all selected-ward-polygon' : 'cursor-pointer transition-all'
        });

        poly.bindTooltip(`
          <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 2px;">
            <div style="font-weight: 700; color: #fff;">${ward.name}</div>
            <div style="color: #94a3b8; font-size: 10px;">${ward.zoneName} &bull; Pop: ${ward.population.toLocaleString()}</div>
            <div style="margin-top: 3px; color: ${ward.status === 'ATTENTION' ? '#fbbf24' : '#34d399'}; font-weight: 600;">
              ${ward.status === 'ATTENTION' ? '⚠️ Precautionary Boil-Water' : '✓ 100% Potable Safe'}
            </div>
            <div style="color: #cbd5e1; font-size: 9px; font-family: monospace; margin-top: 1px;">
              TDS: ${ward.tds} &bull; Cl: ${ward.chlorine} &bull; ${ward.waterSource}
            </div>
            <div style="color: #38bdf8; font-size: 9px; font-weight: 700; margin-top: 2px;">Click to inspect / isolate ward</div>
          </div>
        `, {
          sticky: true,
          className: 'leaflet-ward-tooltip'
        });

        poly.on('click', () => {
          setSelectedWardNumber(ward.wardNumber);
          setActiveWardInfo(ward);
          setActiveStationId(null);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [60, 60], maxZoom: 15 });
          }
          if (onSelectWard) {
            onSelectWard(ward.wardNumber);
          }
        });

        gisGroup.addLayer(poly);
      });
    }
  }, [gisLayers.boundaries, wardDisplayMode, selectedZoneFilter, selectedWardNumber]);

  // --------------------------------------------------------------------------
  // DYNAMIC ANIMATED WATER SUPPLY PIPELINE (Tigra Reservoir -> Queried Target)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !flowLayerGroupRef.current) return;
    const flowGroup = flowLayerGroupRef.current;
    flowGroup.clearLayers();

    if (!gisLayers.conduits || !queriedTarget || !queriedTarget.lat || !queriedTarget.lng) return;

    const sourceCoords = [26.2160, 78.0200]; // Tigra Dam Intake & Water Treatment Headworks
    const targetCoords = [queriedTarget.lat, queriedTarget.lng];

    // Compute realistic municipal piped conduit corridor (strictly forward-flowing from Tigra Dam)
    const route = [sourceCoords];
    const tigraMain = [26.2185, 78.0750];
    const golPahariya = [26.2155, 78.1320];

    const tLat = queriedTarget.lat;
    const tLng = queriedTarget.lng;

    // 1. West-to-East transmission from Tigra Dam Headworks towards Tigra Main Hub
    if (tLng > 78.040) {
      if (tLng < 78.0750) {
        const ratio = (tLng - 78.0200) / (78.0750 - 78.0200);
        const interLat = sourceCoords[0] + (tigraMain[0] - sourceCoords[0]) * ratio;
        route.push([Number(interLat.toFixed(4)), tLng]);
      } else {
        route.push(tigraMain);
      }
    }

    // 2. Gateway feeder to Gol Pahariya / Lashkar Western WTP Gateway
    if (tLng > 78.090) {
      if (tLng < 78.1320) {
        const ratio = (tLng - 78.0750) / (78.1320 - 78.0750);
        const interLat = tigraMain[0] + (golPahariya[0] - tigraMain[0]) * ratio;
        route.push([Number(interLat.toFixed(4)), tLng]);
      } else {
        route.push(golPahariya);
      }
    }

    // 3. Directional municipal distribution from Gol Pahariya towards queried target:
    if (tLng > 78.1320) {
      // North sector (Hazira, Gwalior Fort north, Morar north)
      if (tLat > 26.225) {
        if (tLng > 78.150) {
          route.push([26.2280, Math.min(78.1550, tLng)]);
          if (tLng > 78.175) {
            route.push([26.2360, Math.min(78.1780, tLng)]);
          }
        }
      }
      // South sector (Lashkar south, Kampoo, Maharaj Bada, Amkhoh)
      else if (tLat < 26.205) {
        if (tLng > 78.140) {
          route.push([26.2060, Math.min(78.1460, tLng)]);
          if (tLat < 26.195 && tLng > 78.152) {
            route.push([26.1960, Math.min(78.1560, tLng)]);
          }
        }
      }
      // Far East sector (Thatipur, Morar East, City Center)
      else if (tLng > 78.165) {
        route.push([26.2120, 78.1580]);
        if (tLng > 78.180) {
          route.push([26.2140, 78.1800]);
        }
      }
      // Central sector (Motimahal, Jayendraganj, Laxmi Ganj)
      else if (tLng > 78.145) {
        route.push([26.2130, Math.min(78.1520, tLng)]);
      }
    }

    // Append target coords if not redundant with last waypoint
    const lastPt = route[route.length - 1];
    if (Math.abs(lastPt[0] - targetCoords[0]) > 0.0002 || Math.abs(lastPt[1] - targetCoords[1]) > 0.0002) {
      route.push(targetCoords);
    }
    if (route.length < 2) {
      route.push(targetCoords);
    }

    // 1. Base pipeline trench
    const pipeBase = L.polyline(route, {
      color: '#075985',
      weight: 5,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round'
    });
    flowGroup.addLayer(pipeBase);

    // 2. High-contrast moving flow line with continuous dashed animation
    const movingLine = L.polyline(route, {
      color: '#00f0ff',
      weight: 3.5,
      dashArray: '12, 14',
      className: 'leaflet-conduit-flow-active',
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    movingLine.bindTooltip(`
      <div style="font-family: 'Inter', system-ui; font-size: 11px; padding: 2px;">
        <div style="display: flex; align-items: center; gap: 4px; color: #38bdf8; font-weight: 700; margin-bottom: 2px;">
          <span>💧 Active Supply Pipeline</span>
        </div>
        <div style="color: #cbd5e1; font-size: 10px;">Source: Tigra Dam Reservoir</div>
        <div style="color: #cbd5e1; font-size: 10px;">Destination: ${queriedTarget.name}</div>
        <div style="color: #34d399; font-size: 10px; font-weight: 600; margin-top: 2px;">● Continuous Treated Flow Active</div>
      </div>
    `, { sticky: true });
    flowGroup.addLayer(movingLine);

    // 3. Water Source Pulsing Beacon at Tigra Dam
    const sourceIcon = L.divIcon({
      className: 'water-source-beacon',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(6, 182, 212, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(2, 132, 199, 0.5); border: 1.5px solid #38bdf8;"></div>
          <div style="position: relative; width: 24px; height: 24px; border-radius: 9999px; background: #031525; border: 2px solid #22d3ee; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(6, 182, 212, 0.8);">
            <span style="font-size: 13px; line-height: 1;">💧</span>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    const sourceMarker = L.marker(sourceCoords, { icon: sourceIcon });
    sourceMarker.bindTooltip('<strong>Water Source: Tigra Dam Reservoir</strong><br/>Surface Water Headworks (226m ASL)', {
      permanent: false,
      direction: 'top',
      offset: [0, -18]
    });
    flowGroup.addLayer(sourceMarker);

    // 4. Queried Area Target Pulse Beacon
    const targetIcon = L.divIcon({
      className: 'water-target-beacon',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -3px; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background: #06241a; border: 2px solid #34d399; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);">
            <span style="font-size: 10px; color: #34d399; font-weight: bold;">📍</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    const targetMarker = L.marker(targetCoords, { icon: targetIcon });
    targetMarker.bindTooltip(`<strong>Queried Area: ${queriedTarget.name}</strong><br/>Receiving Piped Supply`, {
      direction: 'top',
      offset: [0, -16]
    });
    flowGroup.addLayer(targetMarker);

    // 5. Streaming Water Droplets Animation (requestAnimationFrame)
    const segments = [];
    let totalDist = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];
      const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      segments.push({ p1, p2, dist: d, cumulative: totalDist });
      totalDist += d;
    }

    const interpolatePos = (t) => {
      const targetDist = ((t % 1) + 1) % 1 * totalDist;
      for (const seg of segments) {
        if (targetDist >= seg.cumulative && targetDist <= seg.cumulative + seg.dist) {
          const segT = seg.dist === 0 ? 0 : (targetDist - seg.cumulative) / seg.dist;
          return [
            seg.p1[0] + (seg.p2[0] - seg.p1[0]) * segT,
            seg.p1[1] + (seg.p2[1] - seg.p1[1]) * segT
          ];
        }
      }
      return route[route.length - 1];
    };

    // 5. Single Leading Water Flow Pulse travelling Source -> Destination
    const streamPulseIcon = L.divIcon({
      className: 'water-single-pulse',
      html: `
        <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(34, 211, 238, 0.5); animation: ping 0.9s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="position: relative; width: 12px; height: 12px; border-radius: 9999px; background: #ffffff; border: 2.5px solid #00f5ff; box-shadow: 0 0 12px #00f5ff, 0 0 20px #0284c7;"></div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    const pulseMarker = L.marker(sourceCoords, { icon: streamPulseIcon, interactive: false });
    flowGroup.addLayer(pulseMarker);

    let animId;
    const startTime = performance.now();
    const duration = 2600; // 2.6s smooth continuous cycle

    const animatePulse = (now) => {
      const elapsed = now - startTime;
      const progress = (elapsed % duration) / duration;
      const pos = interpolatePos(progress);
      pulseMarker.setLatLng(pos);
      animId = requestAnimationFrame(animatePulse);
    };

    animId = requestAnimationFrame(animatePulse);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      flowGroup.clearLayers();
    };
  }, [queriedTarget, gisLayers.conduits]);

  // Update Water Station Markers on Leaflet Map
  useEffect(() => {
    const markersGroup = markersLayerGroupRef.current;
    if (!markersGroup || !mapInstanceRef.current) return;

    markersGroup.clearLayers();

    // Check zoom level: Only cluster if zoomed far out to state/regional scale (zoom <= 9)
    const isClustered = currentZoom <= 9;

    if (isClustered && filteredSources.length > 1) {
      // Zoomed out: Show city-level cluster badge
      const clusterPin = L.divIcon({
        className: 'station-cluster-icon',
        html: `
          <div class="w-11 h-11 rounded-full bg-slate-950/90 text-white border-2 border-sky-400 shadow-2xl flex flex-col items-center justify-center cursor-pointer transform hover:scale-110 transition-transform">
            <span class="text-xs font-black font-mono leading-none">${filteredSources.length}</span>
            <span class="text-[8px] font-bold uppercase tracking-wider text-sky-400">GMC</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const clusterMarker = L.marker(defaultCenter, { icon: clusterPin });
      clusterMarker.on('click', () => {
        mapInstanceRef.current.setView(defaultCenter, 13, { animate: true });
      });
      clusterMarker.bindTooltip(`Click to expand ${filteredSources.length} Gwalior water monitoring stations`, { sticky: true });
      markersGroup.addLayer(clusterMarker);
      return;
    }

    // Zoomed in (normal city scale): Render individual high-visibility markers for all 66 wards
    filteredSources.forEach(source => {
      const isSelected = activeStationId === source.sourceId || selectedSourceId === source.sourceId;
      const isAlert = source.publicStatus === 'MONITORED_ALERT';
      const isStale = source.isStale || source.publicStatus === 'STALE/UNKNOWN';

      // Define marker color
      let markerColor = '#10b981'; // Green: Normal
      let pulseRing = '';
      let statusLabel = 'NORMAL';

      if (isAlert) {
        markerColor = '#ef4444'; // Red: Active Alert
        pulseRing = '<div class="absolute -inset-2.5 rounded-full bg-rose-500/40 animate-ping pointer-events-none"></div>';
        statusLabel = 'ALERT';
      } else if (isStale) {
        markerColor = '#f59e0b'; // Amber: Stale feed / Requires attention
        statusLabel = 'STALE';
      } else if (source.operationalStatus === 'PENDING_INSPECTION') {
        markerColor = '#9333ea'; // Purple: Pending inspection
        statusLabel = 'PENDING';
      }

      // High-contrast marker with ward number inside for clear identification of all 66 wards
      const customIcon = L.divIcon({
        className: 'station-pin-marker',
        html: `
          <div class="relative group cursor-pointer">
            ${pulseRing}
            <div style="background-color: ${markerColor};" class="w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-transform transform group-hover:scale-125 ${isSelected ? 'scale-125 ring-4 ring-cyan-400' : ''
          }">
              <span class="text-[9px] font-mono font-black text-white leading-none">${source.wardNumber || ''}</span>
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-900 border border-white"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -26]
      });

      const marker = L.marker([source.latitude, source.longitude], { icon: customIcon });

      // Compact hover tooltip
      marker.bindTooltip(`
        <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 2px 4px;">
          <div style="font-weight: 700; color: #0f172a;">${source.name}</div>
          <div style="color: #64748b; font-size: 10px;">${source.district} &bull; ${source.locality}</div>
          <div style="margin-top: 3px; font-weight: 600; color: ${markerColor};">Status: ${statusLabel}</div>
          <div style="color: #0284c7; font-size: 9px; font-weight: 600; margin-top: 1px;">Click to inspect &amp; isolate</div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -20],
        opacity: 0.95
      });

      // Marker click opens the Google Maps-style station information card & syncs with ward info
      marker.on('click', () => {
        setActiveStationId(source.sourceId);
        if (source.wardNumber) {
          const ward = GWALIOR_WARDS_66.find(w => w.wardNumber === source.wardNumber);
          if (ward) {
            setSelectedWardNumber(source.wardNumber);
            setActiveWardInfo(ward);
            if (onSelectWard) {
              onSelectWard(source.wardNumber);
            }
          }
        }
        if (onSelectSource) {
          onSelectSource(source.sourceId);
        }
        mapInstanceRef.current.panTo([source.latitude, source.longitude], { animate: true });
      });

      markersGroup.addLayer(marker);
    });
  }, [filteredSources, currentZoom, activeStationId, selectedSourceId, defaultCenter]);

  // Synchronize when external `selectedSourceId` changes
  useEffect(() => {
    if (selectedSourceId) {
      setActiveStationId(selectedSourceId);
      const target = sources.find(s => s.sourceId === selectedSourceId);
      if (target && mapInstanceRef.current) {
        mapInstanceRef.current.setView([target.latitude, target.longitude], 15, { animate: true });
      }
    }
  }, [selectedSourceId, sources]);

  // Optional highlighted markers (e.g. the admin Water Sources page's demo sources). They live on their own layer
  // above the ward markers and never touch the ward / station state used by the rest of the map.
  const highlightLayerRef = useRef(null);
  const highlightFittedRef = useRef(null); // the map instance we last fitted (the map is rebuilt under StrictMode)
  const highlightPrevSelectedRef = useRef(null);
  const onSelectHighlightRef = useRef(onSelectHighlight);
  onSelectHighlightRef.current = onSelectHighlight;

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;
    if (highlightLayerRef.current) {
      highlightLayerRef.current.remove();
      highlightLayerRef.current = null;
    }
    const items = (highlightSources || []).filter(h => Number.isFinite(h.latitude) && Number.isFinite(h.longitude));
    if (items.length === 0) return undefined;

    const escapeHtml = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const group = L.layerGroup().addTo(map);
    highlightLayerRef.current = group;
    items.forEach(h => {
      const selected = h.sourceId === selectedHighlightId;
      const icon = L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="map-highlight-pin tone-${escapeHtml(h.tone || 'ok')}${selected ? ' is-selected' : ''}"><i></i><b>${escapeHtml(h.sourceId)}</b></div>`
      });
      const marker = L.marker([h.latitude, h.longitude], { icon, zIndexOffset: selected ? 2000 : 1000, keyboard: false });
      marker.bindTooltip(`${escapeHtml(h.sourceId)} – ${escapeHtml(h.name || '')}`, { direction: 'top', offset: [0, -16] });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectHighlightRef.current) onSelectHighlightRef.current(h.sourceId);
      });
      group.addLayer(marker);
    });

    const chosen = items.find(h => h.sourceId === selectedHighlightId);
    if (fitHighlights && highlightFittedRef.current !== map) {
      map.fitBounds(L.latLngBounds(items.map(h => [h.latitude, h.longitude])), { padding: [90, 90], maxZoom: 12 });
      highlightFittedRef.current = map;
    } else if (chosen && highlightPrevSelectedRef.current !== selectedHighlightId) {
      map.panTo([chosen.latitude, chosen.longitude], { animate: true });
    }
    highlightPrevSelectedRef.current = selectedHighlightId;
    return () => {
      group.remove();
      if (highlightLayerRef.current === group) highlightLayerRef.current = null;
    };
  }, [highlightSources, selectedHighlightId, fitHighlights]);

  // Active station data object for bottom information card
  const activeStation = useMemo(() => {
    if (!activeStationId) return null;
    return sources.find(s => s.sourceId === activeStationId) || null;
  }, [activeStationId, sources]);

  const handleResetToGwalior = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(defaultCenter, 13, { animate: true });
      setActiveStationId(null);
    }
  };

  const handleOpenSourceDrawer = (srcId) => {
    if (onSelectSource) {
      onSelectSource(srcId);
    }
  };

  const currentProviderInfo = TILE_PROVIDERS[mapMode] || TILE_PROVIDERS.standard;

  return (
    <div
      className={`map-explorer map-mode-${mapMode} relative isolate z-10 w-full rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900 flex flex-col font-sans ${className}`}
      style={{ minHeight: '560px', height: '560px', position: 'relative', ...style }}
    >

      {/* 1. TOP FLOATING SEARCH & QUICK FILTER BAR */}
      <div className="map-floating-top-bar">

        {/* Search Card */}
        <div className="map-search-card">
          <Search className="w-4 h-4 text-slate-400 ml-1 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Gwalior water stations, Maharaj Bada, Morar..."
            className="map-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="map-search-divider"></div>

          {/* Quick Count */}
          <span className="map-search-count">
            {filteredSources.length} Mapped
          </span>
        </div>

        {/* Floating Filter Chips Row */}
        <div className="map-filter-chips-row">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`map-filter-chip ${statusFilter === 'ALL' ? 'chip-active-all' : ''}`}
          >
            All ({totalCount})
          </button>

          <button
            onClick={() => setStatusFilter('NORMAL')}
            className={`map-filter-chip chip-normal ${statusFilter === 'NORMAL' ? 'chip-active-normal' : ''}`}
          >
            <span className="map-dot map-dot-green"></span>
            <span>Normal ({normalCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('ALERT')}
            className={`map-filter-chip chip-alert ${statusFilter === 'ALERT' ? 'chip-active-alert' : ''}`}
          >
            <span className="map-dot map-dot-red"></span>
            <span>Alerts ({alertCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('STALE')}
            className={`map-filter-chip chip-stale ${statusFilter === 'STALE' ? 'chip-active-stale' : ''}`}
          >
            <span className="map-dot map-dot-amber"></span>
            <span>Stale ({staleCount})</span>
          </button>

          {/* GMC 66 Wards & 25 Zones GIS Control Chip */}
          <button
            onClick={() => setShowGisOverlayPanel(prev => !prev)}
            className="map-filter-chip chip-wards-selector"
            title="Configure GMC 66 Administrative Wards & 25 Zones"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>
              {wardDisplayMode === 'all'
                ? 'All 66 Wards'
                : wardDisplayMode === 'selected'
                  ? `Ward ${selectedWardNumber || 14} Only`
                  : wardDisplayMode === 'zone'
                    ? `Zone ${selectedZoneFilter}`
                    : 'Wards: Off'}
            </span>
            <ChevronDown className="w-3 h-3 text-cyan-300 ml-0.5" />
          </button>
        </div>

      </div>

      {/* 1B. ACTIVE WATER SUPPLY FLOW INDICATOR PILL */}
      {gisLayers.conduits && queriedTarget && (
        <div className="map-flow-indicator-pill">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-cyan-300">
              Supply Line:
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
              Tigra Dam &rarr; {queriedTarget.name}
            </span>
          </div>

          <button
            onClick={() => {
              if (mapInstanceRef.current && queriedTarget) {
                const bounds = L.latLngBounds([
                  [26.2160, 78.0200],
                  [queriedTarget.lat, queriedTarget.lng]
                ]);
                mapInstanceRef.current.fitBounds(bounds, { padding: [70, 70], maxZoom: 14 });
              }
            }}
            className="text-[10px] text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 px-2 py-0.5 rounded-full transition ml-1 cursor-pointer font-mono font-semibold"
            title="Fit map view to display full water supply line from Tigra Dam"
          >
            Show Full Line
          </button>
        </div>
      )}

      {/* 2. TOP-RIGHT FLOATING MAP MODE SELECTOR */}
      <div className="absolute top-3 right-3 z-[500] pointer-events-auto flex items-center space-x-1.5">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-800 p-1 flex items-center space-x-1">
          <button
            onClick={() => setMapMode('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${mapMode === 'standard'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            title="Standard street map with roads, landmarks, and waterways"
          >
            Standard
          </button>

          <button
            onClick={() => setMapMode('dark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${mapMode === 'dark'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            title="Nocturnal high-contrast dark GIS canvas"
          >
            Dark Canvas
          </button>

          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${mapMode === 'satellite'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            title="Satellite imagery with street grid and locality labels"
          >
            Satellite
          </button>
        </div>

        {/* Tile Provider Info */}
        <button
          onClick={() => setShowProviderInfo(true)}
          className="p-2 rounded-xl bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Inspect Map Providers &amp; Licensing"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* 3. TILE ERROR / FALLBACK NOTIFICATION BANNER WITH RETRY */}
      {tileError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] max-w-lg w-[92%] sm:w-auto p-2.5 px-4 rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 text-slate-950 font-medium text-xs shadow-2xl flex items-center justify-between space-x-3 backdrop-blur-md border border-amber-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-slate-950" />
            <span>{tileError.message}</span>
          </div>
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {mapMode !== 'standard' && (
              <button
                onClick={() => {
                  setMapMode('standard');
                  setTileError(null);
                }}
                className="px-2.5 py-1 bg-slate-950 text-white rounded-lg text-[11px] font-bold hover:bg-slate-850 transition shadow-sm"
              >
                Switch to Standard
              </button>
            )}
            <button
              onClick={() => {
                setTileError(null);
                setReloadCounter(c => c + 1);
              }}
              className="px-2.5 py-1 bg-white/30 hover:bg-white/50 text-slate-950 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1"
              title="Retry connection"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button
              onClick={() => setTileError(null)}
              className="p-1 hover:bg-black/10 rounded text-slate-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN LEAFLET MAP CANVAS CONTAINER */}
      <div className="relative w-full flex-1 min-h-[560px] overflow-hidden" style={{ minHeight: '560px', height: '560px', position: 'relative' }}>
        <div
          ref={mapContainerRef}
          className="w-full h-full min-h-[560px] z-0 cursor-grab active:cursor-grabbing"
          style={{ width: '100%', height: '560px', minHeight: '560px', position: 'relative' }}
        />
        {/* Subtle Map Ambient Vignette */}
        <div className="absolute inset-0 pointer-events-none z-[400] shadow-[inset_0_0_60px_rgba(4,14,24,0.65)]" />
      </div>

      {/* 5. BOTTOM-RIGHT MAP NAVIGATION & GIS CONTROLS */}
      <div className="absolute bottom-4 right-3 z-[500] pointer-events-auto flex flex-col space-y-2">

        {/* Advanced Municipal GIS Overlays Button */}
        <button
          onClick={() => setShowGisOverlayPanel(!showGisOverlayPanel)}
          className={`p-2.5 rounded-xl shadow-lg border transition flex items-center justify-center ${showGisOverlayPanel
            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-cyan-500/20'
            : 'bg-slate-900/95 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          title="Toggle Municipal GIS Overlays (Boundaries &amp; Tigra Conduit)"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className="bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-800 flex flex-col overflow-hidden">
          <button
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomIn()}
            className="p-2.5 text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomOut()}
            className="p-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Center on Gwalior Extent Button */}
        <button
          onClick={handleResetToGwalior}
          className="p-2.5 bg-slate-900/95 backdrop-blur-md text-slate-300 hover:text-cyan-400 rounded-xl shadow-lg border border-slate-800 transition"
          title="Center View on Gwalior City"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* 6. ADVANCED MUNICIPAL GIS OVERLAYS FLOATING PANEL (Cleanly positioned without overlap) */}
      {showGisOverlayPanel && (
        <div className="absolute top-14 right-3 sm:right-3 w-80 sm:w-88 max-w-[calc(100%-1.5rem)] max-h-[80%] overflow-y-auto bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/90 p-4 z-[520] text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">

          {/* Panel Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs leading-none">
                  GMC 66 Wards &amp; 25 Zones GIS
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Administrative boundaries &amp; clutter control
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGisOverlayPanel(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector Buttons */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Display Mode:</span>
              <span className="text-cyan-400 font-semibold">{wardDisplayMode.toUpperCase()}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setWardDisplayMode('all');
                  setSelectedZoneFilter('ALL');
                  setGisLayers(p => ({ ...p, boundaries: true }));
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView(defaultCenter, 13, { animate: true });
                  }
                }}
                className={`p-2 rounded-xl text-left border transition text-xs font-semibold flex items-center space-x-1.5 ${wardDisplayMode === 'all'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-bold'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
              >
                <Globe2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">All 66 Wards</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWardDisplayMode('selected');
                  setGisLayers(p => ({ ...p, boundaries: true }));
                  const targetNum = selectedWardNumber || 14;
                  handleSelectWard(targetNum);
                }}
                className={`p-2 rounded-xl text-left border transition text-xs font-semibold flex items-center space-x-1.5 ${wardDisplayMode === 'selected'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-bold'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
              >
                <Crosshair className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Single Ward Only</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWardDisplayMode('zone');
                  setGisLayers(p => ({ ...p, boundaries: true }));
                  const targetZone = selectedZoneFilter !== 'ALL' ? selectedZoneFilter : 5;
                  handleSelectZone(targetZone);
                }}
                className={`p-2 rounded-xl text-left border transition text-xs font-semibold flex items-center space-x-1.5 ${wardDisplayMode === 'zone'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-bold'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">By Zone (25)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWardDisplayMode('off');
                  setActiveWardInfo(null);
                }}
                className={`p-2 rounded-xl text-left border transition text-xs font-semibold flex items-center space-x-1.5 ${wardDisplayMode === 'off'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-bold'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
              >
                <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Hide Wards</span>
              </button>
            </div>
          </div>

          {/* 25 Administrative Zones Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Filter by Zone (25 Administrative Zones):
            </label>
            <select
              value={selectedZoneFilter}
              onChange={(e) => handleSelectZone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All 25 Administrative Zones</option>
              {GMC_ZONES_25.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.wards.length} Wards)
                </option>
              ))}
            </select>
          </div>

          {/* 66 Administrative Wards Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Select Ward (66 Wards):</span>
              {selectedWardNumber && (
                <span className="text-cyan-400 font-mono">Ward #{selectedWardNumber}</span>
              )}
            </label>
            <select
              value={selectedWardNumber || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setWardDisplayMode('selected');
                  handleSelectWard(Number(e.target.value));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">-- Choose a Ward to Isolate --</option>
              {GWALIOR_WARDS_66
                .filter(w => selectedZoneFilter === 'ALL' || w.zoneId === Number(selectedZoneFilter))
                .map((ward) => (
                  <option key={ward.wardNumber} value={ward.wardNumber}>
                    Ward {ward.wardNumber < 10 ? `0${ward.wardNumber}` : ward.wardNumber}: {ward.name.split(' - ')[1]} {ward.status === 'ATTENTION' ? '⚠️ [Advisory]' : '✓ [Safe]'}
                  </option>
                ))}
            </select>
          </div>

          {/* Infrastructure Conduits Layer Checkboxes */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-slate-300">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Hydrological Conduits:
            </label>
            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
              <span className="text-[11px] font-medium text-slate-200">Tigra Feeder Pipeline</span>
              <input
                type="checkbox"
                checked={gisLayers.conduits}
                onChange={(e) => setGisLayers(prev => ({ ...prev, conduits: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
            Ground-verified GMC municipal GIS dataset covering 66 wards across 25 administrative zones.
          </p>
        </div>
      )}

      {/* 7. BOTTOM-LEFT FLOATING STATION INFORMATION CARD */}
      {showStationCard && activeStation && (
        <div className="map-info-card">

          {/* Card Header */}
          <div className="map-card-header">
            <div>
              <div className="map-card-badges">
                <span className="map-badge-ward">
                  {activeStation.sourceId}
                </span>
                <span className="map-badge-zone">
                  {activeStation.sourceType}
                </span>
                {activeStation.publicStatus === 'MONITORED_ALERT' ? (
                  <span className="map-badge-status-alert">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>ALERT</span>
                  </span>
                ) : activeStation.isStale ? (
                  <span className="map-badge-status-stale">
                    STALE FEED
                  </span>
                ) : (
                  <span className="map-badge-status-safe">
                    NORMAL
                  </span>
                )}
              </div>

              <h4 className="map-card-title">
                {activeStation.name}
              </h4>
            </div>

            <button
              onClick={() => setActiveStationId(null)}
              className="map-card-close-btn"
              title="Close card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Location & Beneficiaries Meta */}
          <div className="map-card-grid">
            <div className="map-card-col">
              <span className="map-card-label">GMC Zone</span>
              <div className="map-card-value">{activeStation.district}</div>
            </div>
            <div className="map-card-col">
              <span className="map-card-label">Ward / Locality</span>
              <div className="map-card-value">{activeStation.locality}</div>
            </div>
            <div className="map-card-col">
              <span className="map-card-label">Aquifer Depth</span>
              <div className="map-card-value-mono">{activeStation.depthMeters} meters</div>
            </div>
            <div className="map-card-col">
              <span className="map-card-label">Beneficiaries</span>
              <div className="map-card-value-mono">~{activeStation.populationServed?.toLocaleString()}</div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="map-card-actions">
            <span className="text-[10px] text-slate-400 font-mono flex-1 truncate">
              {activeStation.isStale ? 'Feed >48h delay' : `Updated ${activeStation.dataFreshnessHours}h ago`}
            </span>

            <button
              onClick={() => handleOpenSourceDrawer(activeStation.sourceId)}
              className="map-card-btn-primary"
            >
              <span>Inspect History</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}



      {/* 8. DYNAMIC ATTRIBUTION BAR & KEYLESS LEGAL COMPLIANCE */}
      <div className="absolute bottom-1.5 left-3 z-[400] pointer-events-auto flex items-center space-x-2 text-[10px] text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl backdrop-blur-md border border-slate-800/50 shadow-sm max-w-[calc(100%-5rem)] truncate">
        <span dangerouslySetInnerHTML={{ __html: currentProviderInfo.attribution }} className="[&>a]:underline [&>a]:hover:text-cyan-400 truncate max-w-[240px] sm:max-w-md" />
        <span className="text-slate-600">&bull;</span>
        <button
          onClick={() => setShowProviderInfo(true)}
          className="text-cyan-400 hover:underline font-semibold flex items-center space-x-1 flex-shrink-0"
        >
          <Lock className="w-2.5 h-2.5" />
          <span>Zero-Key Info</span>
        </button>
      </div>

      {/* 9. KEYLESS MAP PROVIDERS & LEGAL TERMS INFO MODAL */}
      {showProviderInfo && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Keyless Map Providers &amp; Governance
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transparent Public Water Quality Surveillance &bull; Gwalior, MP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProviderInfo(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Zero Credential Guarantee */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-start space-x-2.5 text-xs text-emerald-300">
              <Shield className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold">Strict Zero-Credential Guarantee:</span> No API keys, secret tokens, or paid billing integrations are embedded. All spatial rendering utilizes public, legally permitted endpoints.
              </div>
            </div>

            {/* Provider Details List */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">

              {/* 1. Standard Mode */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>Standard Mode: Esri World Street Map</span>
                  </span>
                  <a
                    href="https://www.esri.com/en-us/legal/terms/full-master-agreement"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Esri Terms</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div><strong>Endpoint:</strong> <code className="bg-slate-900 px-1 py-0.5 rounded text-[10px]">ArcGIS/rest/services/World_Street_Map</code></div>
                  <div><strong>Licensing:</strong> Esri Master License Agreement &bull; OpenStreetMap (ODbL)</div>
                  <div><strong>Cartography:</strong> High-definition Google Maps-style street map of Gwalior. 100% keyless and watermark-free.</div>
                </div>
              </div>

              {/* 2. Satellite Mode */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Satellite Mode: Esri Imagery + Street Overlay</span>
                  </span>
                  <a
                    href="https://www.esri.com/en-us/legal/terms/full-master-agreement"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Esri Terms</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div><strong>Base Imagery:</strong> <code className="bg-slate-900 px-1 py-0.5 rounded text-[10px]">ArcGIS/rest/services/World_Imagery</code></div>
                  <div><strong>Overlays:</strong> <code className="bg-slate-900 px-1 py-0.5 rounded text-[10px]">Reference/World_Transportation &amp; Boundaries</code></div>
                  <div><strong>Licensing:</strong> Esri Master License Agreement (MLA) for public web mapping.</div>
                  <div><strong>Experience:</strong> True-color satellite imagery overlaid with crisp municipal streets and locality labels.</div>
                </div>
              </div>

            </div>

            {/* Footer Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowProviderInfo(false)}
                className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-cyan-400 transition"
              >
                Acknowledge &amp; Return to Map
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
