import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Droplet,
  Edit,
  ExternalLink,
  Layers,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import type { Source } from '../../types/water';
import type { ApiRecord } from '../../api/adminRecords';

// ── TYPES & INTERFACES ────────────────────────────────────────────────────────

export interface RuleItem {
  ruleId: string;
  parameter: string;
  parameterName: string;
  condition: string;
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=' | 'Detected';
  threshold: string;
  numericThreshold?: number;
  unit: string;
  severity: 'Critical' | 'High' | 'Warning' | 'Info';
  version: string;
  status: 'Active' | 'Draft' | 'Inactive';
  effectiveFrom: string;
  standardRef: string;
  standardClause: string;
  category: 'Physical' | 'Chemical' | 'Biological' | 'Disinfection' | 'Heavy Metal';
  publicWording: string;
  rationale: string;
  history: { version: string; desc: string; date: string }[];
}

export interface ThresholdStandard {
  id: string;
  parameter: string;
  chemicalFormula?: string;
  category: 'Physical' | 'Chemical' | 'Biological' | 'Disinfection' | 'Heavy Metal';
  acceptableLimit: string;
  permissibleLimit: string;
  unit: string;
  standardReference: string;
  clause: string;
  sensorMethod: string;
  healthImpact: string;
  surveillanceFrequency: string;
  enforcingRuleIds: string[];
  enforcementStatus: 'Mandatory Legal Limit' | 'Surveillance Baseline' | 'Operational Guideline';
  desirableMin?: number;
  desirableMax?: number;
  permissibleMax?: number;
  description: string;
}

export interface RulesThresholdsViewProps {
  alerts?: ApiRecord[];
  readings?: ApiRecord[];
  sources?: Source[];
  rules?: RuleItem[];
  thresholds?: ThresholdStandard[];
  loading?: boolean;
  initialTab?: 'rules' | 'standards' | 'split';
  onNavigateToTab?: (tab: string) => void;
  onRefresh?: () => Promise<void>;
  onSaveRule?: (rule: RuleItem) => Promise<void> | void;
}

// ── EVALUATION RULES ENGINE DATASET ──────────────────────────────────────────

const INITIAL_RULES: RuleItem[] = [
  {
    ruleId: 'R-PH-001',
    parameter: 'pH',
    parameterName: 'Potential of Hydrogen (Acidity)',
    condition: '< 6.5',
    operator: '<',
    threshold: '6.5',
    numericThreshold: 6.5,
    unit: 'pH',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.1 (Essential Characteristics)',
    category: 'Chemical',
    publicWording: 'Water acidity has breached the safe minimum threshold (pH < 6.5). Elevated risk of metal pipe corrosion and heavy metal leaching.',
    rationale: 'Acidic water dissolves lead and copper from plumbing infrastructure, imparting metallic taste and violating Bureau of Indian Standards potability specs.',
    history: [
      { version: 'v1.3', desc: 'Updated threshold to strict 6.5 minimum (IS 10500:2012 alignment)', date: '24 Oct 2026' },
      { version: 'v1.2', desc: 'Initial baseline calibration on municipal supply lines', date: '10 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-PH-002',
    parameter: 'pH',
    parameterName: 'Potential of Hydrogen (Alkalinity)',
    condition: '> 8.5',
    operator: '>',
    threshold: '8.5',
    numericThreshold: 8.5,
    unit: 'pH',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.1 (Essential Characteristics)',
    category: 'Chemical',
    publicWording: 'Water alkalinity exceeds maximum statutory threshold (pH > 8.5). Disinfection efficiency significantly degraded with mineral taste.',
    rationale: 'High pH reduces hypochlorous acid efficacy in chlorination dosing by >70% and induces rapid mineral encrustation in municipal distribution.',
    history: [
      { version: 'v1.3', desc: 'Aligned with BIS IS 10500:2012 maximum ceiling', date: '24 Oct 2026' },
      { version: 'v1.1', desc: 'Draft threshold review with municipal chemists', date: '05 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TUR-001',
    parameter: 'Turbidity',
    parameterName: 'Suspended Particulate Matter (Clarity)',
    condition: '> 1.0',
    operator: '>',
    threshold: '1.0',
    numericThreshold: 1.0,
    unit: 'NTU',
    severity: 'Warning',
    version: 'v1.2',
    status: 'Active',
    effectiveFrom: '15 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.2 (Desirable Upper Bound)',
    category: 'Physical',
    publicWording: 'Turbidity has exceeded the desirable drinking water baseline of 1.0 NTU. Optical cloudiness detected in municipal line.',
    rationale: 'Elevated suspended colloidal solids compromise aesthetic acceptability and signal initial filtration degradation.',
    history: [
      { version: 'v1.2', desc: 'Seasonal monsoon buffer adjustment', date: '15 Oct 2026' },
      { version: 'v1.0', desc: 'Initial creation from BIS standard table', date: '01 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TUR-002',
    parameter: 'Turbidity',
    parameterName: 'Suspended Particulate Matter (Pathogen Shielding)',
    condition: '> 5.0',
    operator: '>',
    threshold: '5.0',
    numericThreshold: 5.0,
    unit: 'NTU',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.2 (Permissible Maximum)',
    category: 'Physical',
    publicWording: 'Turbidity exceeds maximum permissible statutory limit (5.0 NTU). Pathogens can shield from chlorine disinfection. Boil-water advisory recommended.',
    rationale: 'At >5 NTU, suspended inorganic and organic colloids shelter bacteria, viruses, and protozoa from biocidal chlorine action.',
    history: [
      { version: 'v1.3', desc: 'Critical severity tag & automated boil advisory escalation added', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TDS-001',
    parameter: 'TDS',
    parameterName: 'Total Dissolved Solids (Desirable)',
    condition: '> 500',
    operator: '>',
    threshold: '500',
    numericThreshold: 500,
    unit: 'mg/L',
    severity: 'Warning',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.3 (Desirable Bound)',
    category: 'Chemical',
    publicWording: 'Total Dissolved Solids exceed desirable standard (500 mg/L). Mild mineralization observed.',
    rationale: 'Concentrations above 500 mg/L begin imparting noticeable saline/mineral taste to domestic consumers.',
    history: [
      { version: 'v1.3', desc: 'Refined desirable threshold boundary', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TDS-002',
    parameter: 'TDS',
    parameterName: 'Total Dissolved Solids (Elevated Salinity)',
    condition: '> 1,000',
    operator: '>',
    threshold: '1,000',
    numericThreshold: 1000,
    unit: 'mg/L',
    severity: 'High',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.3 (Sensory Rejection Threshold)',
    category: 'Chemical',
    publicWording: 'Total Dissolved Solids exceed sensory acceptable bound (1,000 mg/L). Saline taste and potential plumbing scaling.',
    rationale: 'Dissolved minerals at this level cause gastrointestinal irritation in unaccustomed consumers and heavy kettle scaling.',
    history: [
      { version: 'v1.3', desc: 'High severity escalation trigger established', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TDS-003',
    parameter: 'TDS',
    parameterName: 'Total Dissolved Solids (Absolute Permissible Limit)',
    condition: '> 2,000',
    operator: '>',
    threshold: '2,000',
    numericThreshold: 2000,
    unit: 'mg/L',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.3 (Permissible Limit Ceiling)',
    category: 'Chemical',
    publicWording: 'Total Dissolved Solids breach the maximum permissible statutory ceiling of 2,000 mg/L. Unfit for potable distribution without desalination.',
    rationale: 'Breaches statutory threshold where no alternate source is permitted. Severe physiological and organoleptic consequences.',
    history: [
      { version: 'v1.3', desc: 'Statutory ceiling rule formalized', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-CHL-001',
    parameter: 'Chlorine',
    parameterName: 'Free Residual Chlorine (Minimum Barrier)',
    condition: '< 0.2',
    operator: '<',
    threshold: '0.2',
    numericThreshold: 0.2,
    unit: 'mg/L',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.11 (Disinfection Residual)',
    category: 'Disinfection',
    publicWording: 'Free residual chlorine has dropped below the statutory disinfection minimum (0.2 mg/L). High vulnerability to bacterial regrowth in pipeline.',
    rationale: 'Without minimum 0.2 mg/L free chlorine, treated water cannot neutralize opportunistic pathogens in long municipal pipe runs.',
    history: [
      { version: 'v1.3', desc: 'Direct critical alert linkage to municipal booster dosers', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-CHL-002',
    parameter: 'Chlorine',
    parameterName: 'Free Residual Chlorine (Maximum Residual)',
    condition: '> 1.0',
    operator: '>',
    threshold: '1.0',
    numericThreshold: 1.0,
    unit: 'mg/L',
    severity: 'High',
    version: 'v1.2',
    status: 'Active',
    effectiveFrom: '15 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.11 (Permissible Disinfection)',
    category: 'Disinfection',
    publicWording: 'Free residual chlorine exceeds permissible limit (1.0 mg/L). Potential pungent odor, mucosal irritation, and disinfection byproduct risk.',
    rationale: 'Over-chlorination generates trihalomethanes (THMs) and generates acute consumer odor complaints.',
    history: [
      { version: 'v1.2', desc: 'Over-dosing protection limit enabled', date: '15 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-BAC-001',
    parameter: 'Bacteria',
    parameterName: 'Coliform / E. Coli Microbial Presence',
    condition: 'Detected',
    operator: 'Detected',
    threshold: 'Shall not be detectable',
    unit: 'MPN/100 mL',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Biological Specifications (Zero Tolerance)',
    category: 'Biological',
    publicWording: 'Microbial or coliform bacteria detected in sample! Water is UNSAFE for direct consumption. Immediate boil-water notice and lab verification dispatched.',
    rationale: 'Any detectable coliform indicates fecal or wastewater ingress into the drinking supply network, risking waterborne epidemic outbreak.',
    history: [
      { version: 'v1.3', desc: 'Zero-tolerance automatic emergency dispatch integration', date: '24 Oct 2026' },
      { version: 'v1.0', desc: 'Initial bacteriological rule baseline', date: '01 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-NIT-001',
    parameter: 'Nitrate',
    parameterName: 'Nitrate (as NO3)',
    condition: '> 45.0',
    operator: '>',
    threshold: '45.0',
    numericThreshold: 45.0,
    unit: 'mg/L',
    severity: 'Critical',
    version: 'v1.1',
    status: 'Active',
    effectiveFrom: '01 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.6 (No Relaxation Standard)',
    category: 'Chemical',
    publicWording: 'Nitrate concentration exceeds statutory limit (45 mg/L). High risk of methemoglobinemia (Blue Baby Syndrome) in infants.',
    rationale: 'Nitrates convert to nitrites in the digestive tract, impairing oxygen-carrying hemoglobin capacity with zero relaxation permitted.',
    history: [
      { version: 'v1.1', desc: 'Strict statutory no-relaxation lock configured', date: '01 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-FLU-001',
    parameter: 'Fluoride',
    parameterName: 'Fluoride (as F)',
    condition: '> 1.5',
    operator: '>',
    threshold: '1.5',
    numericThreshold: 1.5,
    unit: 'mg/L',
    severity: 'High',
    version: 'v1.2',
    status: 'Active',
    effectiveFrom: '15 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.5 (Permissible Bound)',
    category: 'Chemical',
    publicWording: 'Fluoride exceeds maximum permissible threshold of 1.5 mg/L. Chronic exposure causes dental mottling and skeletal fluorosis.',
    rationale: 'Endemic groundwater fluoride in central India requires rapid detection to prevent irreversible bone embrittlement.',
    history: [
      { version: 'v1.2', desc: 'Groundwater surveillance calibration', date: '15 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-HRD-001',
    parameter: 'Hardness',
    parameterName: 'Total Hardness (as CaCO3)',
    condition: '> 600',
    operator: '>',
    threshold: '600',
    numericThreshold: 600,
    unit: 'mg/L',
    severity: 'Warning',
    version: 'v1.1',
    status: 'Active',
    effectiveFrom: '01 Oct 2026',
    standardRef: 'BIS IS 10500:2012',
    standardClause: 'Table 1, Cl. 4.4 (Permissible Bound)',
    category: 'Chemical',
    publicWording: 'Total Hardness exceeds maximum permissible standard (600 mg/L). Heavy scale precipitation and soap curdling.',
    rationale: 'Excessive calcium and magnesium bicarbonates precipitate in heating conduits and pipelines, causing blockages.',
    history: [
      { version: 'v1.1', desc: 'Initial baseline limit set', date: '01 Oct 2026' },
    ],
  },
];

// ── STATUTORY THRESHOLDS DATASET (BIS IS 10500:2012) ─────────────────────────

const STATUTORY_THRESHOLDS: ThresholdStandard[] = [
  {
    id: 'TH-PH',
    parameter: 'pH Value',
    chemicalFormula: '-log[H+]',
    category: 'Physical',
    acceptableLimit: '6.5 – 8.5',
    permissibleLimit: 'No relaxation',
    unit: 'pH',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.1, Table 1',
    sensorMethod: 'Electrometric (Glass Electrode IS 3025 Pt 11)',
    healthImpact: 'Corrosiveness of distribution conduits, dissolution of heavy metals (<6.5); mucosal irritation and chlorination impairment (>8.5).',
    surveillanceFrequency: 'Continuous Telemetry / 2x Daily Grab',
    enforcingRuleIds: ['R-PH-001', 'R-PH-002'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 6.5,
    desirableMax: 8.5,
    permissibleMax: 8.5,
    description: 'Master chemical balance indicator governing disinfection kinetics, coagulation behavior, and distribution pipe corrosion.',
  },
  {
    id: 'TH-TUR',
    parameter: 'Turbidity',
    chemicalFormula: 'Colloidal Suspensions',
    category: 'Physical',
    acceptableLimit: '1.0 NTU',
    permissibleLimit: '5.0 NTU',
    unit: 'NTU',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.2, Table 1',
    sensorMethod: 'Nephelometric Method (IS 3025 Pt 10)',
    healthImpact: 'Suspended clay, silt, and microorganisms shield viruses and cysts from chemical disinfection, increasing waterborne infection risk.',
    surveillanceFrequency: 'Continuous Telemetry / 4-Hourly',
    enforcingRuleIds: ['R-TUR-001', 'R-TUR-002'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0,
    desirableMax: 1.0,
    permissibleMax: 5.0,
    description: 'Optical clarity indicator measuring the scattering of light by insoluble suspended particles.',
  },
  {
    id: 'TH-TDS',
    parameter: 'Total Dissolved Solids (TDS)',
    chemicalFormula: 'Dissolved Minerals & Salts',
    category: 'Chemical',
    acceptableLimit: '500 mg/L',
    permissibleLimit: '2,000 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.3, Table 1',
    sensorMethod: 'Gravimetric Dried at 180°C / Conductivity Probe',
    healthImpact: 'Gastrointestinal irritation in sensitive populations, severe scaling of industrial and domestic fixtures, unpalatable taste.',
    surveillanceFrequency: 'Daily Telemetry / Weekly Lab Gravimetric',
    enforcingRuleIds: ['R-TDS-001', 'R-TDS-002', 'R-TDS-003'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0,
    desirableMax: 500,
    permissibleMax: 2000,
    description: 'Total concentration of dissolved inorganic cations (Ca, Mg, Na, K) and anions (carbonate, bicarbonate, chloride, sulfate).',
  },
  {
    id: 'TH-CHL',
    parameter: 'Free Residual Chlorine',
    chemicalFormula: 'HOCl + OCl-',
    category: 'Disinfection',
    acceptableLimit: 'Min 0.2 mg/L',
    permissibleLimit: 'Max 1.0 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.11, Table 1',
    sensorMethod: 'DPD Colorimetric / Amperometric Titration',
    healthImpact: '<0.2 mg/L allows bacterial biofilm re-growth in transmission pipes; >1.0 mg/L causes mucosal irritation and trihalomethane accumulation.',
    surveillanceFrequency: 'Continuous Pipeline Sensor / Twice Daily Delivery Endpoints',
    enforcingRuleIds: ['R-CHL-001', 'R-CHL-002'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0.2,
    desirableMax: 0.5,
    permissibleMax: 1.0,
    description: 'Active biocidal residual required to safeguard treated water against cross-contamination during transit through the urban piping network.',
  },
  {
    id: 'TH-BAC',
    parameter: 'Total Coliform / E. Coli',
    chemicalFormula: 'Thermotolerant Bacteria',
    category: 'Biological',
    acceptableLimit: 'Shall not be detectable (0)',
    permissibleLimit: 'No relaxation (0)',
    unit: 'MPN/100 mL',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Table 1, Biological Specification',
    sensorMethod: 'Membrane Filtration (IS 1622) / Defined Substrate (Colilert)',
    healthImpact: 'Direct indicator of sewage/fecal contamination. Immediate vector for cholera, typhoid fever, bacillary dysentery, and viral hepatitis.',
    surveillanceFrequency: 'Daily Municipal Ward Sampling / Immediate Lab Inoculation',
    enforcingRuleIds: ['R-BAC-001'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0,
    desirableMax: 0,
    permissibleMax: 0,
    description: 'Primary microbiological safety standard requiring complete absence of indicator organisms in all 100 mL potable samples.',
  },
  {
    id: 'TH-NIT',
    parameter: 'Nitrate (as NO3)',
    chemicalFormula: 'NO3-',
    category: 'Chemical',
    acceptableLimit: '45 mg/L',
    permissibleLimit: 'No relaxation',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.6, Table 1',
    sensorMethod: 'UV Spectrophotometric Screening / Ion Chromatography',
    healthImpact: 'Infantile methemoglobinemia (Blue Baby Syndrome) in bottle-fed infants; chronic gastric nitrosamine formation.',
    surveillanceFrequency: 'Fortnightly Laboratory Spectrophotometry',
    enforcingRuleIds: ['R-NIT-001'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0,
    desirableMax: 45,
    permissibleMax: 45,
    description: 'Common contaminant from agricultural synthetic fertilizers and subterranean septic leachates.',
  },
  {
    id: 'TH-FLU',
    parameter: 'Fluoride (as F)',
    chemicalFormula: 'F-',
    category: 'Chemical',
    acceptableLimit: '1.0 mg/L',
    permissibleLimit: '1.5 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.5, Table 1',
    sensorMethod: 'SPADNS Photometric / Ion Selective Electrode (IS 3025 Pt 23)',
    healthImpact: '>1.0 mg/L causes dental fluorosis (enamel mottling); >1.5 mg/L causes crippling skeletal fluorosis and joint calcification.',
    surveillanceFrequency: 'Fortnightly Laboratory Assay',
    enforcingRuleIds: ['R-FLU-001'],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0.6,
    desirableMax: 1.0,
    permissibleMax: 1.5,
    description: 'Naturally occurring halogen ion with narrow therapeutic window: prevents dental caries at ~0.8 mg/L but toxic above 1.5 mg/L.',
  },
  {
    id: 'TH-HRD',
    parameter: 'Total Hardness (as CaCO3)',
    chemicalFormula: 'Ca2+ + Mg2+',
    category: 'Chemical',
    acceptableLimit: '200 mg/L',
    permissibleLimit: '600 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.4, Table 1',
    sensorMethod: 'EDTA Titrimetric Method (IS 3025 Pt 21)',
    healthImpact: 'Excessive soap consumption, scaling of domestic hot water appliances and distribution mains; poor textile washing.',
    surveillanceFrequency: 'Monthly Accredited Lab Assay',
    enforcingRuleIds: ['R-HRD-001'],
    enforcementStatus: 'Surveillance Baseline',
    desirableMin: 0,
    desirableMax: 200,
    permissibleMax: 600,
    description: 'Capacity of water to precipitate soap, driven by multivalent metallic cations dominated by calcium and magnesium.',
  },
  {
    id: 'TH-ALK',
    parameter: 'Total Alkalinity (as CaCO3)',
    chemicalFormula: 'HCO3- + CO3(2-) + OH-',
    category: 'Chemical',
    acceptableLimit: '200 mg/L',
    permissibleLimit: '600 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.7, Table 1',
    sensorMethod: 'Titration with 0.02 N H2SO4 to pH 4.5 End Point',
    healthImpact: 'Unpleasant alkaline taste, reaction with natural coagulants reducing clarification efficiency in treatment plants.',
    surveillanceFrequency: 'Monthly Accredited Lab Assay',
    enforcingRuleIds: [],
    enforcementStatus: 'Surveillance Baseline',
    desirableMin: 0,
    desirableMax: 200,
    permissibleMax: 600,
    description: 'Acid-neutralizing capacity of water, serving as the essential buffer system against sudden pH fluctuations.',
  },
  {
    id: 'TH-FE',
    parameter: 'Iron (as Fe)',
    chemicalFormula: 'Fe2+ / Fe3+',
    category: 'Heavy Metal',
    acceptableLimit: '0.3 mg/L',
    permissibleLimit: '1.0 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Cl. 4.8, Table 1',
    sensorMethod: 'Phenanthroline Spectrophotometric (IS 3025 Pt 53)',
    healthImpact: 'Staining of laundry, sanitary fixtures; astringent metallic taste; stimulates biofouling iron bacteria in mains.',
    surveillanceFrequency: 'Monthly Accredited Lab Assay',
    enforcingRuleIds: [],
    enforcementStatus: 'Surveillance Baseline',
    desirableMin: 0,
    desirableMax: 0.3,
    permissibleMax: 1.0,
    description: 'Common metallic constituent dissolved from geological formations or rusted galvanized transmission pipes.',
  },
  {
    id: 'TH-DO',
    parameter: 'Dissolved Oxygen (DO)',
    chemicalFormula: 'O2 (aq)',
    category: 'Physical',
    acceptableLimit: 'Min 5.0 mg/L',
    permissibleLimit: 'Min 4.0 mg/L',
    unit: 'mg/L',
    standardReference: 'CPCB / IS 10500:2012 Correlated',
    clause: 'Water Quality Guidelines Annexure B',
    sensorMethod: 'Luminescent Optical Sensor / Azide Winkler Titration',
    healthImpact: '<4.0 mg/L signals biological septic decay and anaerobic sulfide generation, causing offensive rotten-egg odors.',
    surveillanceFrequency: 'Continuous Intake Telemetry / Daily',
    enforcingRuleIds: [],
    enforcementStatus: 'Operational Guideline',
    desirableMin: 5.0,
    desirableMax: 12.0,
    permissibleMax: 4.0,
    description: 'Vital indicator of fresh water health, aeration efficacy, and biochemical stability in raw reservoir intakes.',
  },
  {
    id: 'TH-EC',
    parameter: 'Electrical Conductivity',
    chemicalFormula: 'Ionic Mobility',
    category: 'Physical',
    acceptableLimit: '750 µS/cm',
    permissibleLimit: '2,250 µS/cm',
    unit: 'µS/cm',
    standardReference: 'BIS IS 10500:2012 / CPCB',
    clause: 'Cl. 4.3 Correlated Reference',
    sensorMethod: 'Conductivity Cell with Automated 25°C Temperature Comp',
    healthImpact: 'Direct digital proxy for total ionic salinity. Spikes indicate illicit industrial effluent discharges or saline intrusion.',
    surveillanceFrequency: 'Continuous Telemetry Sensor',
    enforcingRuleIds: [],
    enforcementStatus: 'Operational Guideline',
    desirableMin: 0,
    desirableMax: 750,
    permissibleMax: 2250,
    description: 'Real-time electro-chemical measurement of water ability to conduct electrical current.',
  },
  {
    id: 'TH-PB',
    parameter: 'Lead (as Pb)',
    chemicalFormula: 'Pb2+',
    category: 'Heavy Metal',
    acceptableLimit: '0.01 mg/L',
    permissibleLimit: 'No relaxation',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Table 2, Toxic Substances Specification',
    sensorMethod: 'Atomic Absorption Spectrophotometry (AAS) / ICP-MS',
    healthImpact: 'Severe cumulative neurotoxin. Causes irreversible cognitive decline, learning disabilities in children, and renal failure.',
    surveillanceFrequency: 'Quarterly NABL Accredited Laboratory Testing',
    enforcingRuleIds: [],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0,
    desirableMax: 0.01,
    permissibleMax: 0.01,
    description: 'High-toxicity heavy metal banned from drinking water with strict zero relaxation under BIS specifications.',
  },
  {
    id: 'TH-AS',
    parameter: 'Arsenic (as As)',
    chemicalFormula: 'As3+ / As5+',
    category: 'Heavy Metal',
    acceptableLimit: '0.01 mg/L',
    permissibleLimit: '0.05 mg/L',
    unit: 'mg/L',
    standardReference: 'BIS IS 10500:2012',
    clause: 'Table 2, Toxic Substances Specification',
    sensorMethod: 'Hydride Generation AAS / ICP-MS (IS 3025 Pt 37)',
    healthImpact: 'Group 1 human carcinogen. Causes chronic arsenicosis, melanosis, hyperkeratosis, and peripheral vascular gangrene.',
    surveillanceFrequency: 'Quarterly NABL Accredited Laboratory Testing',
    enforcingRuleIds: [],
    enforcementStatus: 'Mandatory Legal Limit',
    desirableMin: 0,
    desirableMax: 0.01,
    permissibleMax: 0.05,
    description: 'Geogenic contaminant prevalent in alluvial aquifers requiring rigorous laboratory spectroscopic certification.',
  },
];

// ── SEVERITY & CATEGORY COLOR UTILITIES ───────────────────────────────────────

const SEVERITY_BADGES: Record<string, string> = {
  Critical: 'bg-rose-950/80 text-rose-300 border border-rose-700/60',
  High: 'bg-orange-950/80 text-orange-300 border border-orange-700/60',
  Warning: 'bg-amber-950/80 text-amber-300 border border-amber-700/60',
  Info: 'bg-blue-950/80 text-blue-300 border border-blue-700/60',
};

const CATEGORY_BADGES: Record<string, string> = {
  Physical: 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60',
  Chemical: 'bg-blue-950/70 text-blue-300 border border-blue-800/60',
  Biological: 'bg-rose-950/70 text-rose-300 border border-rose-800/60',
  Disinfection: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
  'Heavy Metal': 'bg-purple-950/70 text-purple-300 border border-purple-800/60',
};

// ── COMPONENT IMPLEMENTATION ──────────────────────────────────────────────────

export const RulesThresholdsView: FC<RulesThresholdsViewProps> = ({
  alerts = [],
  readings = [],
  rules: propRules,
  thresholds: propThresholds,
  loading = false,
  initialTab = 'rules',
  onNavigateToTab,
  onRefresh,
  onSaveRule,
}) => {
  // Main view navigation: 'rules' (Rules Table) | 'standards' (Thresholds Table) | 'split' (Both)
  const [activeTab, setActiveTab] = useState<'rules' | 'standards' | 'split'>(initialTab);

  // Rules Table State
  const [rules, setRules] = useState<RuleItem[]>(() => (propRules && propRules.length > 0 ? propRules : INITIAL_RULES));
  const [selectedRuleId, setSelectedRuleId] = useState<string>('R-PH-001');
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleParamFilter, setRuleParamFilter] = useState('All Parameters');
  const [ruleSeverityFilter, setRuleSeverityFilter] = useState('All Severities');
  const [ruleStatusFilter, setRuleStatusFilter] = useState('All Statuses');
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState('All Categories');

  // Thresholds Table State
  const [thresholds, setThresholds] = useState<ThresholdStandard[]>(() => (propThresholds && propThresholds.length > 0 ? propThresholds : STATUTORY_THRESHOLDS));
  const [selectedThresholdId, setSelectedThresholdId] = useState<string>('TH-PH');
  const [thresholdSearch, setThresholdSearch] = useState('');
  const [thresholdCategoryFilter, setThresholdCategoryFilter] = useState('All Categories');
  const [thresholdStatusFilter, setThresholdStatusFilter] = useState('All Enforcements');

  // Sync with live DynamoDB data when loaded
  useEffect(() => {
    if (propRules && propRules.length > 0) {
      setRules(propRules);
    }
  }, [propRules]);

  useEffect(() => {
    if (propThresholds && propThresholds.length > 0) {
      setThresholds(propThresholds);
    }
  }, [propThresholds]);

  // Interactive UI state
  const [publicWordingEnabled, setPublicWordingEnabled] = useState(true);
  const [editingRule, setEditingRule] = useState<RuleItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Selected records
  const selectedRule = useMemo(() => {
    return rules.find(r => r.ruleId === selectedRuleId) ?? rules[0];
  }, [rules, selectedRuleId]);

  const selectedThreshold = useMemo(() => {
    return thresholds.find(t => t.id === selectedThresholdId) ?? thresholds[0];
  }, [thresholds, selectedThresholdId]);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Toggle active status of a rule
  const toggleRuleStatus = (ruleId: string) => {
    setRules(prev =>
      prev.map(r => {
        if (r.ruleId === ruleId) {
          const nextStatus = r.status === 'Active' ? 'Inactive' : 'Active';
          showToast(`Rule ${r.ruleId} status changed to ${nextStatus}.`);
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  // Save edited rule
  const handleSaveRuleEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRule) return;

    const form = new FormData(event.currentTarget);
    const updatedThreshold = String(form.get('threshold') || editingRule.threshold);
    const updatedSeverity = String(form.get('severity') || editingRule.severity) as RuleItem['severity'];
    const updatedStatus = String(form.get('status') || editingRule.status) as RuleItem['status'];
    const updatedWording = String(form.get('publicWording') || editingRule.publicWording);

    const nextRule: RuleItem = {
      ...editingRule,
      threshold: updatedThreshold,
      severity: updatedSeverity,
      status: updatedStatus,
      publicWording: updatedWording,
      version: `${editingRule.version.split('.')[0]}.${Number(editingRule.version.split('.')[1] || 0) + 1}`,
      history: [
        {
          version: `${editingRule.version.split('.')[0]}.${Number(editingRule.version.split('.')[1] || 0) + 1}`,
          desc: `Updated threshold to ${updatedThreshold} (${updatedSeverity})`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
        ...editingRule.history,
      ],
    };

    setRules(prev =>
      prev.map(r => (r.ruleId === editingRule.ruleId ? nextRule : r))
    );

    if (onSaveRule) {
      void onSaveRule(nextRule);
    }

    showToast(`Rule ${editingRule.ruleId} successfully updated and re-calibrated!`);
    setEditingRule(null);
  };

  // Jump from threshold standard to its enforcing rule
  const handleJumpToRule = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    setActiveTab('rules');
    showToast(`Navigated to active evaluation rule ${ruleId}`);
  };

  // Jump from rule to its statutory threshold
  const handleJumpToStandard = (paramName: string) => {
    const found = thresholds.find(t => t.parameter.toLowerCase().includes(paramName.toLowerCase()));
    if (found) {
      setSelectedThresholdId(found.id);
      setActiveTab('standards');
      showToast(`Viewing BIS IS 10500 standard specification for ${found.parameter}`);
    }
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    const q = ruleSearch.toLowerCase().trim();
    return rules.filter(r => {
      const matchSearch =
        !q ||
        r.ruleId.toLowerCase().includes(q) ||
        r.parameter.toLowerCase().includes(q) ||
        r.parameterName.toLowerCase().includes(q) ||
        r.publicWording.toLowerCase().includes(q) ||
        r.standardRef.toLowerCase().includes(q);
      const matchParam = ruleParamFilter === 'All Parameters' || r.parameter === ruleParamFilter;
      const matchSev = ruleSeverityFilter === 'All Severities' || r.severity === ruleSeverityFilter;
      const matchStatus = ruleStatusFilter === 'All Statuses' || r.status === ruleStatusFilter;
      const matchCat = ruleCategoryFilter === 'All Categories' || r.category === ruleCategoryFilter;
      return matchSearch && matchParam && matchSev && matchStatus && matchCat;
    });
  }, [rules, ruleSearch, ruleParamFilter, ruleSeverityFilter, ruleStatusFilter, ruleCategoryFilter]);

  // Filtered Threshold Standards
  const filteredThresholds = useMemo(() => {
    const q = thresholdSearch.toLowerCase().trim();
    return thresholds.filter(t => {
      const matchSearch =
        !q ||
        t.parameter.toLowerCase().includes(q) ||
        (t.chemicalFormula && t.chemicalFormula.toLowerCase().includes(q)) ||
        t.healthImpact.toLowerCase().includes(q) ||
        t.clause.toLowerCase().includes(q) ||
        t.sensorMethod.toLowerCase().includes(q);
      const matchCat = thresholdCategoryFilter === 'All Categories' || t.category === thresholdCategoryFilter;
      const matchStatus = thresholdStatusFilter === 'All Enforcements' || t.enforcementStatus === thresholdStatusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [thresholds, thresholdSearch, thresholdCategoryFilter, thresholdStatusFilter]);

  // KPI Calculations
  const activeRulesCount = useMemo(() => rules.filter(r => r.status === 'Active').length, [rules]);
  const totalParametersCovered = useMemo(() => new Set(rules.map(r => r.parameter)).size, [rules]);
  const activeAlertsTriggered = useMemo(() => alerts.filter(a => a.state === 'OPEN').length, [alerts]);

  return (
    <div className="space-y-5 font-sans text-slate-200">
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#132754] border border-cyan-400 text-cyan-200 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ── TOP KPI OVERVIEW CARDS (Resonating with Dark Navy) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <SlidersHorizontal className="w-5 h-5 text-cyan-400" />,
            iconBg: 'bg-cyan-950/80 border border-cyan-800/60',
            label: 'Evaluation Rules Engine',
            value: `${activeRulesCount} Active`,
            sub: `of ${rules.length} configured`,
            subClr: 'text-slate-400',
            desc: 'Real-time telemetry evaluators',
          },
          {
            icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
            iconBg: 'bg-emerald-950/80 border border-emerald-800/60',
            label: 'Statutory Standards',
            value: `${thresholds.length} Parameters`,
            sub: 'BIS IS 10500:2012',
            subClr: 'text-emerald-400',
            desc: 'Indian Drinking Water Specification',
          },
          {
            icon: <Layers className="w-5 h-5 text-sky-400" />,
            iconBg: 'bg-sky-950/80 border border-sky-800/60',
            label: 'Parameters Covered',
            value: `${totalParametersCovered} Key Analytes`,
            sub: 'Physical, Chemical, Bio',
            subClr: 'text-sky-300',
            desc: 'pH, TDS, Turbidity, Cl, Bacteria',
          },
          {
            icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
            iconBg: 'bg-amber-950/80 border border-amber-800/60',
            label: 'Active Threshold Breaches',
            value: `${activeAlertsTriggered} Incidents`,
            sub: activeAlertsTriggered > 0 ? 'Surveillance Active' : 'All Nominal',
            subClr: activeAlertsTriggered > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400',
            desc: readings.length > 0 ? `Across ${readings.length} telemetry readings` : 'Evaluated against live telemetry',
            onClick: onNavigateToTab ? () => onNavigateToTab('Alerts & Incidents') : undefined,
          },
          {
            icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
            iconBg: 'bg-purple-950/80 border border-purple-800/60',
            label: 'Compliance Engine',
            value: 'v1.3 Active',
            sub: 'Published: 24 Oct 2026',
            subClr: 'text-purple-300',
            desc: 'Municipal Public Health Directive',
            onClick: undefined,
          },
        ].map(c => (
          <div
            key={c.label}
            onClick={c.onClick}
            className={`bg-[#0c1938] border border-[#1c295c] hover:border-[#2d438a] transition-all rounded-2xl p-4 shadow-sm ${
              c.onClick ? 'cursor-pointer hover:bg-[#111e47]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
                {c.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-lg font-black text-white">{c.value}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{c.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DYNAMODB TABLES INTEGRATION STATUS BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#091533] border border-[#1c295c] text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">AWS DynamoDB Active:</span>
            <span className="text-white font-bold bg-[#111e47] px-2 py-0.5 rounded border border-[#1e3478]">
              Rules <span className="text-slate-400 font-normal">[ruleId (S)]</span>
            </span>
            <span className="text-white font-bold bg-[#111e47] px-2 py-0.5 rounded border border-[#1e3478]">
              Thresholds <span className="text-slate-400 font-normal">[parameterId (S)]</span>
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono">
            LIVE • ap-south-1
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Syncing DynamoDB...' : 'Sync DynamoDB Tables'}</span>
          </button>
        )}
      </div>

      {/* ── SUB-TABS: SEPARATE TABLES SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c295c] pb-2">
        <div className="flex items-center gap-2">
          {/* Sub-tab 1: Rules Table */}
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#152c66] text-cyan-300 border border-cyan-400/80 shadow-md shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-[#101b44] border border-transparent'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Evaluation Rules Engine</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#091533] text-cyan-300 border border-cyan-700/60">
              {filteredRules.length}
            </span>
          </button>

          {/* Sub-tab 2: Thresholds Standards Table */}
          <button
            onClick={() => setActiveTab('standards')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'standards'
                ? 'bg-[#152c66] text-cyan-300 border border-cyan-400/80 shadow-md shadow-cyan-950/30'
                : 'text-slate-400 hover:text-white hover:bg-[#101b44] border border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Statutory Water Quality Thresholds (BIS IS 10500)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#091533] text-emerald-300 border border-emerald-700/60">
              {filteredThresholds.length}
            </span>
          </button>

          {/* Sub-tab 3: Split / Dual Table View */}
          <button
            onClick={() => setActiveTab('split')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              activeTab === 'split'
                ? 'bg-[#152c66] text-cyan-300 border border-cyan-400/80 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#101b44] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Unified View</span>
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'rules' && (
            <button
              onClick={() => {
                setEditingRule({
                  ruleId: `R-NEW-00${rules.length + 1}`,
                  parameter: 'pH',
                  parameterName: 'Custom Parameter Rule',
                  condition: '> 8.5',
                  operator: '>',
                  threshold: '8.5',
                  unit: '-',
                  severity: 'Warning',
                  version: 'v1.0',
                  status: 'Active',
                  effectiveFrom: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                  standardRef: 'BIS IS 10500:2012',
                  standardClause: 'Table 1 Custom Limit',
                  category: 'Chemical',
                  publicWording: 'Parameter reading has breached the established municipal limit.',
                  rationale: 'Configured by municipal quality officer for localized supply surveillance.',
                  history: [{ version: 'v1.0', desc: 'Initial creation', date: new Date().toLocaleDateString('en-GB') }],
                });
              }}
              className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Rule</span>
            </button>
          )}

          <button
            onClick={() => {
              const exportData = activeTab === 'standards' ? thresholds : rules;
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = activeTab === 'standards' ? 'bis_is_10500_thresholds.json' : 'water_quality_evaluation_rules.json';
              a.click();
              URL.revokeObjectURL(url);
              showToast('Export file downloaded successfully.');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#0e1740] hover:bg-[#162354] text-slate-300 border border-[#1c295c] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Table</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: EVALUATION RULES TABLE                                            */}
      {/* ========================================================================= */}
      {(activeTab === 'rules' || activeTab === 'split') && (
        <div className="space-y-4">
          {/* Section Heading & Subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Operational Evaluation Rules Engine Table
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                {rules.length} Rules Active
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Automatically evaluates sensor feeds &amp; lab results to dispatch alerts
            </span>
          </div>

          {/* Rules Filter Toolbar */}
          <div className="flex flex-wrap items-end gap-2.5 p-3 rounded-2xl bg-[#0c1938] border border-[#1c295c]">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Rule ID, parameter, advisory note..."
                value={ruleSearch}
                onChange={e => setRuleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#080e26] border border-[#1c295c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Parameter Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Parameter</span>
              <select
                value={ruleParamFilter}
                onChange={e => setRuleParamFilter(e.target.value)}
                className="text-xs border border-[#1c295c] rounded-xl px-2.5 py-1.5 bg-[#080e26] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {['All Parameters', 'pH', 'TDS', 'Turbidity', 'Chlorine', 'Bacteria', 'Nitrate', 'Fluoride', 'Hardness'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Severity</span>
              <select
                value={ruleSeverityFilter}
                onChange={e => setRuleSeverityFilter(e.target.value)}
                className="text-xs border border-[#1c295c] rounded-xl px-2.5 py-1.5 bg-[#080e26] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {['All Severities', 'Critical', 'High', 'Warning', 'Info'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Category</span>
              <select
                value={ruleCategoryFilter}
                onChange={e => setRuleCategoryFilter(e.target.value)}
                className="text-xs border border-[#1c295c] rounded-xl px-2.5 py-1.5 bg-[#080e26] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {['All Categories', 'Physical', 'Chemical', 'Biological', 'Disinfection'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Status</span>
              <select
                value={ruleStatusFilter}
                onChange={e => setRuleStatusFilter(e.target.value)}
                className="text-xs border border-[#1c295c] rounded-xl px-2.5 py-1.5 bg-[#080e26] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {['All Statuses', 'Active', 'Draft', 'Inactive'].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setRuleSearch('');
                setRuleParamFilter('All Parameters');
                setRuleSeverityFilter('All Severities');
                setRuleStatusFilter('All Statuses');
                setRuleCategoryFilter('All Categories');
              }}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 py-1.5 px-2 cursor-pointer transition"
            >
              Reset
            </button>
          </div>

          {/* Two-Column Split: Table + Side Inspection Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT: Rules Table (8 cols) */}
            <div className="lg:col-span-8 bg-[#0c1938] rounded-2xl border border-[#1c295c] shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c295c] bg-[#0b1438]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-xs">
                    Evaluation Rules Table ({filteredRules.length} matching)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Engine Version: v1.3
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0b1438] text-slate-400 border-b border-[#1c295c]">
                    <tr className="text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Rule ID</th>
                      <th className="py-2.5 px-3">Parameter</th>
                      <th className="py-2.5 px-3">Evaluation Condition</th>
                      <th className="py-2.5 px-3">Threshold Bound</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Statutory Basis</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16224f]">
                    {filteredRules.map(rule => {
                      const isSelected = selectedRuleId === rule.ruleId;
                      return (
                        <tr
                          key={rule.ruleId}
                          onClick={() => setSelectedRuleId(rule.ruleId)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white font-semibold'
                              : 'hover:bg-[#162354] text-slate-300'
                          }`}
                        >
                          {/* Rule ID */}
                          <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold whitespace-nowrap">
                            {rule.ruleId}
                          </td>

                          {/* Parameter */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{rule.parameter}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {rule.parameterName}
                            </div>
                          </td>

                          {/* Condition */}
                          <td className="py-2.5 px-3 font-mono font-medium text-amber-300 whitespace-nowrap">
                            {rule.condition} {rule.unit !== '-' ? rule.unit : ''}
                          </td>

                          {/* Threshold Bound */}
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-300 whitespace-nowrap">
                            {rule.threshold} {rule.unit !== '-' ? rule.unit : ''}
                          </td>

                          {/* Severity Badge */}
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${SEVERITY_BADGES[rule.severity]}`}>
                              {rule.severity}
                            </span>
                          </td>

                          {/* Statutory Reference */}
                          <td className="py-2.5 px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJumpToStandard(rule.parameter);
                              }}
                              className="text-[10px] font-medium text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
                            >
                              <span>{rule.standardRef}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRuleStatus(rule.ruleId);
                              }}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                                rule.status === 'Active'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {rule.status === 'Active' ? <PlayCircle className="w-2.5 h-2.5" /> : <PauseCircle className="w-2.5 h-2.5" />}
                              <span>{rule.status}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingRule(rule);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-[#132754] transition"
                                title="Edit Rule Parameters"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(rule.publicWording, rule.ruleId);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#132754] transition"
                                title="Copy Advisory Wording"
                              >
                                {copyFeedback === rule.ruleId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1c295c] bg-[#0b1438] text-[11px] text-slate-400">
                <span>Showing {filteredRules.length} of {rules.length} operational rules</span>
                <span className="font-mono text-cyan-400">IS 10500:2012 Aligned</span>
              </div>
            </div>

            {/* RIGHT: Selected Rule Inspection & Simulator Panel (4 cols) */}
            <div className="lg:col-span-4 bg-[#0c1938] rounded-2xl border border-[#1c295c] shadow-sm flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c295c] bg-[#0b1438]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-xs">Rule Details: {selectedRule.ruleId}</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedRule.status === 'Active'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}>
                  {selectedRule.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
                {/* Meta Attributes Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#080e26] border border-[#1c295c]">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Target Parameter</span>
                    <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedRule.parameter}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Severity Level</span>
                    <div className="mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${SEVERITY_BADGES[selectedRule.severity]}`}>
                        {selectedRule.severity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Trigger Condition</span>
                    <div className="font-mono font-bold text-amber-300 mt-0.5">
                      {selectedRule.condition} {selectedRule.unit}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Category</span>
                    <div className="mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CATEGORY_BADGES[selectedRule.category]}`}>
                        {selectedRule.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Effective Date</span>
                    <div className="font-medium text-slate-300 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{selectedRule.effectiveFrom}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Engine Version</span>
                    <div className="font-mono text-cyan-300 font-bold mt-0.5">
                      {selectedRule.version}
                    </div>
                  </div>
                </div>

                {/* Statutory Mapping Card */}
                <div className="p-3 rounded-xl bg-[#080e26] border border-[#1c295c] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Statutory Standard Link</span>
                    <button
                      onClick={() => handleJumpToStandard(selectedRule.parameter)}
                      className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Inspect Standard</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="font-semibold text-white text-xs">{selectedRule.standardRef}</div>
                  <div className="text-[11px] text-slate-400">{selectedRule.standardClause}</div>
                </div>

                {/* Engineering Rationale */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Engineering Rationale</span>
                  <p className="text-[11px] text-slate-300 bg-[#080e26] p-2.5 rounded-xl border border-[#1c295c] leading-relaxed">
                    {selectedRule.rationale}
                  </p>
                </div>

                {/* Public Alert Wording & Toggle */}
                <div className="pt-2 border-t border-[#1c295c] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Public Alert Notification Wording</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPublicWordingEnabled(!publicWordingEnabled)}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                        publicWordingEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                          publicWordingEnabled ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-cyan-100 bg-[#132754]/60 p-3 rounded-xl border border-cyan-800/60 leading-relaxed font-sans">
                    "{selectedRule.publicWording}"
                  </p>
                </div>

                {/* Version Audit Log */}
                <div className="space-y-1.5 pt-2 border-t border-[#1c295c]">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Rule Change Audit Trail</span>
                  <div className="space-y-1">
                    {selectedRule.history.map((h, i) => (
                      <div key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <Clock className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-200">{h.version}</span> – {h.desc} ({h.date})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 border-t border-[#1c295c] bg-[#0b1438] flex items-center gap-2">
                <button
                  onClick={() => setEditingRule(selectedRule)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Configure Rule</span>
                </button>
                <button
                  onClick={() => toggleRuleStatus(selectedRule.ruleId)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-[#1c295c] hover:bg-[#162354] text-slate-300 transition cursor-pointer"
                >
                  {selectedRule.status === 'Active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: STATUTORY WATER QUALITY THRESHOLDS TABLE                          */}
      {/* ========================================================================= */}
      {(activeTab === 'standards' || activeTab === 'split') && (
        <div className="space-y-4 pt-2">
          {/* Section Heading & Subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Statutory Water Quality Thresholds Table (BIS IS 10500:2012)
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                {thresholds.length} Mandatory Analytes
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Mandatory Desirable &amp; Permissible Limits for Indian Municipal Water Supplies
            </span>
          </div>

          {/* Thresholds Filter Toolbar */}
          <div className="flex flex-wrap items-end gap-2.5 p-3 rounded-2xl bg-[#0c1938] border border-[#1c295c]">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search parameter, chemical formula, testing method, health impact..."
                value={thresholdSearch}
                onChange={e => setThresholdSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#080e26] border border-[#1c295c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Category</span>
              <select
                value={thresholdCategoryFilter}
                onChange={e => setThresholdCategoryFilter(e.target.value)}
                className="text-xs border border-[#1c295c] rounded-xl px-2.5 py-1.5 bg-[#080e26] text-slate-200 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {['All Categories', 'Physical', 'Chemical', 'Biological', 'Disinfection', 'Heavy Metal'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Enforcement Status Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Enforcement Scope</span>
              <select
                value={thresholdStatusFilter}
                onChange={e => setThresholdStatusFilter(e.target.value)}
                className="text-xs border border-[#1c295c] rounded-xl px-2.5 py-1.5 bg-[#080e26] text-slate-200 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {['All Enforcements', 'Mandatory Legal Limit', 'Surveillance Baseline', 'Operational Guideline'].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setThresholdSearch('');
                setThresholdCategoryFilter('All Categories');
                setThresholdStatusFilter('All Enforcements');
              }}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 py-1.5 px-2 cursor-pointer transition"
            >
              Reset
            </button>
          </div>

          {/* Two-Column Split: Table + Side Standard Inspection Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT: Thresholds Table (8 cols) */}
            <div className="lg:col-span-8 bg-[#0c1938] rounded-2xl border border-[#1c295c] shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c295c] bg-[#0b1438]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">
                    Statutory Water Quality Thresholds Table ({filteredThresholds.length} matching)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Standard: IS 10500:2012 (2nd Rev)
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0b1438] text-slate-400 border-b border-[#1c295c]">
                    <tr className="text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Parameter &amp; Formula</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Desirable Acceptable Limit</th>
                      <th className="py-2.5 px-3">Permissible Limit (Max)</th>
                      <th className="py-2.5 px-3">Statutory Ref</th>
                      <th className="py-2.5 px-3">Enforcing Rule(s)</th>
                      <th className="py-2.5 px-3">Surveillance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16224f]">
                    {filteredThresholds.map(thresh => {
                      const isSelected = selectedThresholdId === thresh.id;
                      return (
                        <tr
                          key={thresh.id}
                          onClick={() => setSelectedThresholdId(thresh.id)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white font-semibold'
                              : 'hover:bg-[#162354] text-slate-300'
                          }`}
                        >
                          {/* Parameter Name & Formula */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{thresh.parameter}</span>
                            </div>
                            {thresh.chemicalFormula && (
                              <div className="text-[10px] font-mono text-cyan-300/80">
                                {thresh.chemicalFormula}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CATEGORY_BADGES[thresh.category]}`}>
                              {thresh.category}
                            </span>
                          </td>

                          {/* Acceptable Limit */}
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-300 whitespace-nowrap">
                            {thresh.acceptableLimit} {thresh.unit !== 'pH' && !thresh.acceptableLimit.includes(thresh.unit) ? thresh.unit : ''}
                          </td>

                          {/* Permissible Limit */}
                          <td className="py-2.5 px-3 font-mono font-semibold text-amber-300 whitespace-nowrap">
                            {thresh.permissibleLimit} {thresh.unit !== 'pH' && !thresh.permissibleLimit.includes('relaxation') && !thresh.permissibleLimit.includes(thresh.unit) ? thresh.unit : ''}
                          </td>

                          {/* Statutory Ref */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="text-[11px] font-medium text-slate-300">{thresh.clause}</div>
                            <div className="text-[10px] text-slate-400">{thresh.standardReference}</div>
                          </td>

                          {/* Enforcing Rule Links */}
                          <td className="py-2.5 px-3">
                            {thresh.enforcingRuleIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {thresh.enforcingRuleIds.map(ruleId => (
                                  <button
                                    key={ruleId}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToRule(ruleId);
                                    }}
                                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#132754] hover:bg-[#1f3f87] text-cyan-300 border border-cyan-700/60 transition cursor-pointer"
                                    title="View automated evaluation rule"
                                  >
                                    {ruleId}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Surveillance Only</span>
                            )}
                          </td>

                          {/* Surveillance Frequency */}
                          <td className="py-2.5 px-3 text-[10px] text-slate-400 truncate max-w-[120px]">
                            {thresh.surveillanceFrequency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1c295c] bg-[#0b1438] text-[11px] text-slate-400">
                <span>Showing {filteredThresholds.length} of {thresholds.length} statutory standards</span>
                <span className="text-emerald-400 font-semibold">Bureau of Indian Standards Compliant</span>
              </div>
            </div>

            {/* RIGHT: Selected Threshold Standard Inspector (4 cols) */}
            <div className="lg:col-span-4 bg-[#0c1938] rounded-2xl border border-[#1c295c] shadow-sm flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c295c] bg-[#0b1438]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-xs">Specification: {selectedThreshold.parameter}</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  {selectedThreshold.enforcementStatus}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
                {/* Visual Tolerance Bar Indicator */}
                <div className="p-3 rounded-xl bg-[#080e26] border border-[#1c295c] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Standard Tolerance Bounds
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300">Unit: {selectedThreshold.unit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60">
                      <div className="text-[10px] font-semibold text-emerald-400 uppercase">Desirable (Acceptable)</div>
                      <div className="text-sm font-black text-emerald-200 font-mono mt-0.5">
                        {selectedThreshold.acceptableLimit}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60">
                      <div className="text-[10px] font-semibold text-amber-400 uppercase">Permissible (No Alt Source)</div>
                      <div className="text-sm font-black text-amber-200 font-mono mt-0.5">
                        {selectedThreshold.permissibleLimit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statutory Reference Specs */}
                <div className="p-3 rounded-xl bg-[#080e26] border border-[#1c295c] space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Statutory Reference</span>
                      <div className="font-bold text-white">{selectedThreshold.standardReference}</div>
                      <div className="text-[11px] text-cyan-300 font-mono">{selectedThreshold.clause}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CATEGORY_BADGES[selectedThreshold.category]}`}>
                      {selectedThreshold.category}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#1c295c]">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Testing &amp; Assay Protocol</span>
                    <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {selectedThreshold.sensorMethod}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1c295c]">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Surveillance Cadence</span>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      {selectedThreshold.surveillanceFrequency}
                    </div>
                  </div>
                </div>

                {/* Health & Sanitary Impact */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Public Health &amp; Sanitary Impact of Breach</span>
                  </span>
                  <p className="text-[11px] text-rose-200/90 bg-rose-950/30 p-2.5 rounded-xl border border-rose-800/50 leading-relaxed">
                    {selectedThreshold.healthImpact}
                  </p>
                </div>

                {/* Enforcing Rules Link */}
                <div className="p-3 rounded-xl bg-[#080e26] border border-[#1c295c] space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Linked Operational Rules Engine
                  </span>
                  {selectedThreshold.enforcingRuleIds.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedThreshold.enforcingRuleIds.map(ruleId => {
                        const ruleObj = rules.find(r => r.ruleId === ruleId);
                        return (
                          <div
                            key={ruleId}
                            onClick={() => handleJumpToRule(ruleId)}
                            className="p-2 rounded-lg bg-[#111e47] hover:bg-[#192b66] border border-[#1e3478] flex items-center justify-between cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-cyan-300 text-xs">{ruleId}</span>
                              <span className="text-[11px] text-slate-300 font-medium">
                                {ruleObj?.condition} ({ruleObj?.severity})
                              </span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      This parameter is monitored via periodic laboratory grab surveillance rather than real-time automated threshold alerts.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 border-t border-[#1c295c] bg-[#0b1438] flex items-center justify-between gap-2">
                {selectedThreshold.enforcingRuleIds.length > 0 ? (
                  <button
                    onClick={() => handleJumpToRule(selectedThreshold.enforcingRuleIds[0])}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Jump to Enforcing Rule</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingRule({
                        ruleId: `R-${selectedThreshold.parameter.substring(0, 3).toUpperCase()}-001`,
                        parameter: selectedThreshold.parameter,
                        parameterName: `${selectedThreshold.parameter} Rule`,
                        condition: `> ${selectedThreshold.acceptableLimit}`,
                        operator: '>',
                        threshold: selectedThreshold.acceptableLimit,
                        unit: selectedThreshold.unit,
                        severity: 'Warning',
                        version: 'v1.0',
                        status: 'Active',
                        effectiveFrom: new Date().toLocaleDateString('en-GB'),
                        standardRef: selectedThreshold.standardReference,
                        standardClause: selectedThreshold.clause,
                        category: selectedThreshold.category,
                        publicWording: `${selectedThreshold.parameter} exceeded the permissible statutory limit.`,
                        rationale: selectedThreshold.healthImpact,
                        history: [{ version: 'v1.0', desc: 'Created from standard table', date: new Date().toLocaleDateString('en-GB') }],
                      });
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Alert Rule for this Analyte</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RULE MODAL ── */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] rounded-2xl border border-[#1c295c] shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c295c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Configure Rule: {editingRule.ruleId}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {editingRule.parameter} &bull; {editingRule.standardRef}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162354] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleEdit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Parameter</label>
                  <input
                    type="text"
                    disabled
                    value={editingRule.parameter}
                    className="w-full rounded-xl border border-[#1c295c] p-2 bg-[#080e26] text-slate-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Measurement Unit</label>
                  <input
                    type="text"
                    disabled
                    value={editingRule.unit}
                    className="w-full rounded-xl border border-[#1c295c] p-2 bg-[#080e26] text-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Threshold Bound Value
                  </label>
                  <input
                    name="threshold"
                    defaultValue={editingRule.threshold}
                    required
                    className="w-full rounded-xl border border-[#1c295c] p-2 bg-[#080e26] text-white font-mono focus:outline-none focus:border-cyan-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assigned Severity</label>
                  <select
                    name="severity"
                    defaultValue={editingRule.severity}
                    className="w-full rounded-xl border border-[#1c295c] p-2 bg-[#080e26] text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Critical">Critical (Immediate Incident &amp; Boil Notice)</option>
                    <option value="High">High (Field Team Dispatch Required)</option>
                    <option value="Warning">Warning (Quality Trend Advisory)</option>
                    <option value="Info">Info (Audit Log Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Evaluation Status</label>
                <select
                  name="status"
                  defaultValue={editingRule.status}
                  className="w-full rounded-xl border border-[#1c295c] p-2 bg-[#080e26] text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Active">Active (Real-time Ingestion Stream Evaluation)</option>
                  <option value="Draft">Draft (Calibration Mode, No External Notices)</option>
                  <option value="Inactive">Inactive (Disabled)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Public Notification Advisory Text
                </label>
                <textarea
                  name="publicWording"
                  rows={3}
                  defaultValue={editingRule.publicWording}
                  required
                  className="w-full rounded-xl border border-[#1c295c] p-2 bg-[#080e26] text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c295c]">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-[#1c295c] rounded-xl text-slate-300 hover:bg-[#162354] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Commit Rule Calibration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
