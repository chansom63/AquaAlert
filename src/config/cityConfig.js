/**
 * Centralized City & Geospatial Configuration
 * Defines the default operational scope for the Water Quality Alert System.
 * Configured for: Gwalior city, Madhya Pradesh, India.
 */

export const CITY_CONFIG = {
  cityId: "gwalior",
  cityName: "Gwalior",
  cityNameHi: "ग्वालियर",
  stateName: "Madhya Pradesh",
  stateNameHi: "मध्य प्रदेश",
  country: "India",
  countryHi: "भारत",
  
  // Governing authorities
  municipalBody: "Gwalior Municipal Corporation (GMC) & MP Jal Sansthan",
  municipalBodyHi: "ग्वालियर नगर निगम एवं म.प्र. जल संस्थान",
  department: "Public Health Engineering Department (PHED) Gwalior • Jal Jeevan Mission MP",
  departmentHi: "लोक स्वास्थ्य यांत्रिकी विभाग (PHED) ग्वालियर • जल जीवन मिशन म.प्र.",
  stateBoard: "Madhya Pradesh Pollution Control Board (MPPCB) & State Water Quality Authority",
  
  // Water basin & hydrogeology
  basinName: "Chambal-Sindh Basin • Tigra Reservoir & Swarnrekha Catchment",
  basinNameHi: "चंबल-सिंध बेसिन • तिघरा जलाशय एवं स्वर्णरेखा जलक्षेत्र",
  aquiferFormation: "Gwalior Group Sedimentary & Granitic Complex (Vindhyan Supergroup Outliers)",

  // Geospatial coordinate extent for Gwalior urban extent
  centerCoords: {
    latitude: 26.2183,
    longitude: 78.1828
  },
  mapExtent: {
    minLng: 78.110,
    maxLng: 78.255,
    minLat: 26.160,
    maxLat: 26.275
  },

  // City Administrative Zones & Wards (Gwalior Municipal Corporation)
  zones: [
    {
      id: "Lashkar",
      name: "Lashkar Zone",
      nameHi: "लश्कर जोन",
      division: "Gwalior Municipal Corp - Zone 1 & 2",
      headquarters: "Maharaj Bada, Lashkar",
      wards: "Wards 28 to 45 (Maharaj Bada, Jayendraganj, Kampoo, Madhav Ganj)",
      keyAquifer: "Jointed Gwalior Sandstone & Granitic weathered mantle",
      riskProfile: "High municipal density; seasonal TDS elevation and hard mineral accumulation",
      totalPopulationServed: 84500,
      surveillanceCoveragePercent: 89,
      primarySourceType: "HAND_PUMP & TUBE_WELL",
      color: "#0ea5e9",
      center: { lat: 26.196, lng: 78.158 }
    },
    {
      id: "Morar",
      name: "Morar Zone",
      nameHi: "मुरार जोन",
      division: "Gwalior Municipal Corp - Zone 5 & 6",
      headquarters: "Morar Cantonment, Gwalior",
      wards: "Wards 46 to 58 (Morar Cantt, Kalpi Road, Sun Temple, Bada Gaon)",
      keyAquifer: "Alluvial sand-gravel lenses along Morar River corridor",
      riskProfile: "Surface runoff infiltration and localized nitrate elevation from agricultural fringes",
      totalPopulationServed: 62000,
      surveillanceCoveragePercent: 91,
      primarySourceType: "MUNICIPAL_TUBE_WELL",
      color: "#10b981",
      center: { lat: 26.227, lng: 78.228 }
    },
    {
      id: "Thatipur",
      name: "Thatipur Zone",
      nameHi: "थाटीपुर जोन",
      division: "Gwalior Municipal Corp - Zone 4",
      headquarters: "Gandhi Nagar, Thatipur",
      wards: "Wards 19 to 27 (Thatipur, Gandhi Road, Suresh Nagar, Balwant Nagar)",
      keyAquifer: "Shallow sedimentary aquifer connected to Tigra reservoir piped grid",
      riskProfile: "Piped transmission chlorine decay at terminal tail ends",
      totalPopulationServed: 78000,
      surveillanceCoveragePercent: 94,
      primarySourceType: "PIPED_WATER (Tigra Intake)",
      color: "#8b5cf6",
      center: { lat: 26.214, lng: 78.201 }
    },
    {
      id: "City_Center",
      name: "City Center Zone",
      nameHi: "सिटी सेंटर जोन",
      division: "Gwalior Municipal Corp - Zone 3",
      headquarters: "New Collectorate, Patel Nagar",
      wards: "Wards 12 to 18 (Collectorate, University Road, Patel Nagar, Sachin Tendulkar Marg)",
      keyAquifer: "Intercalated sandstone-shale Gwalior Series",
      riskProfile: "Stable institutional piped feed; periodic filter backwash turbidity spikes",
      totalPopulationServed: 54000,
      surveillanceCoveragePercent: 96,
      primarySourceType: "PIPED_DISTRIBUTION_GRID",
      color: "#f59e0b",
      center: { lat: 26.208, lng: 78.189 }
    },
    {
      id: "Hazira_Fort",
      name: "Hazira & Fort Foothills",
      nameHi: "हजीरा एवं किला तलहटी",
      division: "Gwalior Municipal Corp - Zone 7 & 8",
      headquarters: "Hazira Crossing, Tansen Nagar",
      wards: "Wards 01 to 11 (Hazira Industrial, Tansen Nagar, Fort Foothills, Gwalior Old City)",
      keyAquifer: "Dense quartzose sandstone & ferruginous shale fractures",
      riskProfile: "Industrial perimeter runoff and older groundwater telemetry lag",
      totalPopulationServed: 46500,
      surveillanceCoveragePercent: 78,
      primarySourceType: "DEEP_BOREWELL",
      color: "#ec4899",
      center: { lat: 26.242, lng: 78.172 }
    }
  ]
};

/**
 * Returns zone metadata by zone ID or name
 */
export const getZoneById = (idOrName) => {
  if (!idOrName) return CITY_CONFIG.zones[0];
  const normalized = idOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    CITY_CONFIG.zones.find(z => 
      z.id.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized ||
      z.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
    ) || CITY_CONFIG.zones[0]
  );
};
