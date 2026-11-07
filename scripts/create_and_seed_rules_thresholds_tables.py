#!/usr/bin/env python3
"""
Create and seed DynamoDB tables for Rules and Thresholds in AWS (ap-south-1).
Creates:
  1. 'Rules' (Partition key: ruleId [S])
  2. 'Thresholds' (Partition key: parameterId [S])
  3. 'RulesThresholds' (Partition key: ruleId [S])
Populates with all operational evaluation rules and statutory BIS IS 10500:2012 thresholds.
"""
from __future__ import annotations

import json
import os
import sys
import time
from decimal import Decimal
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get('AWS_REGION', 'ap-south-1')
PROFILE = os.environ.get('AWS_PROFILE', 'aquaalert')

RULES_DATA = [
    {
        "ruleId": "R-PH-001",
        "parameter": "pH",
        "parameterName": "Potential of Hydrogen (Acidity)",
        "condition": "< 6.5",
        "operator": "<",
        "threshold": "6.5",
        "numericThreshold": Decimal("6.5"),
        "unit": "pH",
        "severity": "Critical",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.1 (Essential Characteristics)",
        "category": "Chemical",
        "publicWording": "Water acidity has breached the safe minimum threshold (pH < 6.5). Elevated risk of metal pipe corrosion and heavy metal leaching.",
        "rationale": "Acidic water dissolves lead and copper from plumbing infrastructure, imparting metallic taste and violating Bureau of Indian Standards potability specs.",
        "isDemo": False
    },
    {
        "ruleId": "R-PH-002",
        "parameter": "pH",
        "parameterName": "Potential of Hydrogen (Alkalinity)",
        "condition": "> 8.5",
        "operator": ">",
        "threshold": "8.5",
        "numericThreshold": Decimal("8.5"),
        "unit": "pH",
        "severity": "Critical",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.1 (Essential Characteristics)",
        "category": "Chemical",
        "publicWording": "Water alkalinity exceeds maximum statutory threshold (pH > 8.5). Disinfection efficiency significantly degraded with mineral taste.",
        "rationale": "High pH reduces hypochlorous acid efficacy in chlorination dosing by >70% and induces rapid mineral encrustation in municipal distribution.",
        "isDemo": False
    },
    {
        "ruleId": "R-TUR-001",
        "parameter": "Turbidity",
        "parameterName": "Suspended Particulate Matter (Clarity)",
        "condition": "> 1.0",
        "operator": ">",
        "threshold": "1.0",
        "numericThreshold": Decimal("1.0"),
        "unit": "NTU",
        "severity": "Warning",
        "version": "v1.2",
        "status": "Active",
        "effectiveFrom": "2026-10-15T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.2 (Desirable Upper Bound)",
        "category": "Physical",
        "publicWording": "Turbidity has exceeded the desirable drinking water baseline of 1.0 NTU. Optical cloudiness detected in municipal line.",
        "rationale": "Elevated suspended colloidal solids compromise aesthetic acceptability and signal initial filtration degradation.",
        "isDemo": False
    },
    {
        "ruleId": "R-TUR-002",
        "parameter": "Turbidity",
        "parameterName": "Suspended Particulate Matter (Pathogen Shielding)",
        "condition": "> 5.0",
        "operator": ">",
        "threshold": "5.0",
        "numericThreshold": Decimal("5.0"),
        "unit": "NTU",
        "severity": "Critical",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.2 (Permissible Maximum)",
        "category": "Physical",
        "publicWording": "Turbidity exceeds maximum permissible statutory limit (5.0 NTU). Pathogens can shield from chlorine disinfection. Boil-water advisory recommended.",
        "rationale": "At >5 NTU, suspended inorganic and organic colloids shelter bacteria, viruses, and protozoa from biocidal chlorine action.",
        "isDemo": False
    },
    {
        "ruleId": "R-TDS-001",
        "parameter": "TDS",
        "parameterName": "Total Dissolved Solids (Desirable)",
        "condition": "> 500",
        "operator": ">",
        "threshold": "500",
        "numericThreshold": Decimal("500"),
        "unit": "mg/L",
        "severity": "Warning",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.3 (Desirable Bound)",
        "category": "Chemical",
        "publicWording": "Total Dissolved Solids exceed desirable standard (500 mg/L). Mild mineralization observed.",
        "rationale": "Concentrations above 500 mg/L begin imparting noticeable saline/mineral taste to domestic consumers.",
        "isDemo": False
    },
    {
        "ruleId": "R-TDS-002",
        "parameter": "TDS",
        "parameterName": "Total Dissolved Solids (Elevated Salinity)",
        "condition": "> 1,000",
        "operator": ">",
        "threshold": "1,000",
        "numericThreshold": Decimal("1000"),
        "unit": "mg/L",
        "severity": "High",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.3 (Sensory Rejection Threshold)",
        "category": "Chemical",
        "publicWording": "Total Dissolved Solids exceed sensory acceptable bound (1,000 mg/L). Saline taste and potential plumbing scaling.",
        "rationale": "Dissolved minerals at this level cause gastrointestinal irritation in unaccustomed consumers and heavy kettle scaling.",
        "isDemo": False
    },
    {
        "ruleId": "R-TDS-003",
        "parameter": "TDS",
        "parameterName": "Total Dissolved Solids (Absolute Permissible Limit)",
        "condition": "> 2,000",
        "operator": ">",
        "threshold": "2,000",
        "numericThreshold": Decimal("2000"),
        "unit": "mg/L",
        "severity": "Critical",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.3 (Permissible Limit Ceiling)",
        "category": "Chemical",
        "publicWording": "Total Dissolved Solids breach the maximum permissible statutory ceiling of 2,000 mg/L. Unfit for potable distribution without desalination.",
        "rationale": "Breaches statutory threshold where no alternate source is permitted. Severe physiological and organoleptic consequences.",
        "isDemo": False
    },
    {
        "ruleId": "R-CHL-001",
        "parameter": "Chlorine",
        "parameterName": "Free Residual Chlorine (Minimum Barrier)",
        "condition": "< 0.2",
        "operator": "<",
        "threshold": "0.2",
        "numericThreshold": Decimal("0.2"),
        "unit": "mg/L",
        "severity": "Critical",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.11 (Disinfection Residual)",
        "category": "Disinfection",
        "publicWording": "Free residual chlorine has dropped below the statutory disinfection minimum (0.2 mg/L). High vulnerability to bacterial regrowth in pipeline.",
        "rationale": "Without minimum 0.2 mg/L free chlorine, treated water cannot neutralize opportunistic pathogens in long municipal pipe runs.",
        "isDemo": False
    },
    {
        "ruleId": "R-CHL-002",
        "parameter": "Chlorine",
        "parameterName": "Free Residual Chlorine (Maximum Residual)",
        "condition": "> 1.0",
        "operator": ">",
        "threshold": "1.0",
        "numericThreshold": Decimal("1.0"),
        "unit": "mg/L",
        "severity": "High",
        "version": "v1.2",
        "status": "Active",
        "effectiveFrom": "2026-10-15T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.11 (Permissible Disinfection)",
        "category": "Disinfection",
        "publicWording": "Free residual chlorine exceeds permissible limit (1.0 mg/L). Potential pungent odor, mucosal irritation, and disinfection byproduct risk.",
        "rationale": "Over-chlorination generates trihalomethanes (THMs) and generates acute consumer odor complaints.",
        "isDemo": False
    },
    {
        "ruleId": "R-BAC-001",
        "parameter": "Bacteria",
        "parameterName": "Coliform / E. Coli Microbial Presence",
        "condition": "Detected",
        "operator": "Detected",
        "threshold": "Shall not be detectable",
        "unit": "MPN/100 mL",
        "severity": "Critical",
        "version": "v1.3",
        "status": "Active",
        "effectiveFrom": "2026-10-24T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Biological Specifications (Zero Tolerance)",
        "category": "Biological",
        "publicWording": "Microbial or coliform bacteria detected in sample! Water is UNSAFE for direct consumption. Immediate boil-water notice and lab verification dispatched.",
        "rationale": "Any detectable coliform indicates fecal or wastewater ingress into the drinking supply network, risking waterborne epidemic outbreak.",
        "isDemo": False
    },
    {
        "ruleId": "R-NIT-001",
        "parameter": "Nitrate",
        "parameterName": "Nitrate (as NO3)",
        "condition": "> 45.0",
        "operator": ">",
        "threshold": "45.0",
        "numericThreshold": Decimal("45.0"),
        "unit": "mg/L",
        "severity": "Critical",
        "version": "v1.1",
        "status": "Active",
        "effectiveFrom": "2026-10-01T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.6 (No Relaxation Standard)",
        "category": "Chemical",
        "publicWording": "Nitrate concentration exceeds statutory limit (45 mg/L). High risk of methemoglobinemia (Blue Baby Syndrome) in infants.",
        "rationale": "Nitrates convert to nitrites in the digestive tract, impairing oxygen-carrying hemoglobin capacity with zero relaxation permitted.",
        "isDemo": False
    },
    {
        "ruleId": "R-FLU-001",
        "parameter": "Fluoride",
        "parameterName": "Fluoride (as F)",
        "condition": "> 1.5",
        "operator": ">",
        "threshold": "1.5",
        "numericThreshold": Decimal("1.5"),
        "unit": "mg/L",
        "severity": "High",
        "version": "v1.2",
        "status": "Active",
        "effectiveFrom": "2026-10-15T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.5 (Permissible Bound)",
        "category": "Chemical",
        "publicWording": "Fluoride exceeds maximum permissible threshold of 1.5 mg/L. Chronic exposure causes dental mottling and skeletal fluorosis.",
        "rationale": "Endemic groundwater fluoride in central India requires rapid detection to prevent irreversible bone embrittlement.",
        "isDemo": False
    },
    {
        "ruleId": "R-HRD-001",
        "parameter": "Hardness",
        "parameterName": "Total Hardness (as CaCO3)",
        "condition": "> 600",
        "operator": ">",
        "threshold": "600",
        "numericThreshold": Decimal("600"),
        "unit": "mg/L",
        "severity": "Warning",
        "version": "v1.1",
        "status": "Active",
        "effectiveFrom": "2026-10-01T00:00:00Z",
        "standardRef": "BIS IS 10500:2012",
        "standardClause": "Table 1, Cl. 4.4 (Permissible Bound)",
        "category": "Chemical",
        "publicWording": "Total Hardness exceeds maximum permissible standard (600 mg/L). Heavy scale precipitation and soap curdling.",
        "rationale": "Excessive calcium and magnesium bicarbonates precipitate in heating conduits and pipelines, causing blockages.",
        "isDemo": False
    }
]

THRESHOLDS_DATA = [
    {
        "parameterId": "TH-PH",
        "parameter": "pH Value",
        "chemicalFormula": "-log[H+]",
        "category": "Physical",
        "acceptableLimit": "6.5 – 8.5",
        "permissibleLimit": "No relaxation",
        "unit": "pH",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.1, Table 1",
        "sensorMethod": "Electrometric (Glass Electrode IS 3025 Pt 11)",
        "healthImpact": "Corrosiveness of distribution conduits, dissolution of heavy metals (<6.5); mucosal irritation and chlorination impairment (>8.5).",
        "surveillanceFrequency": "Continuous Telemetry / 2x Daily Grab",
        "enforcingRuleIds": ["R-PH-001", "R-PH-002"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("6.5"),
        "desirableMax": Decimal("8.5"),
        "permissibleMax": Decimal("8.5"),
        "description": "Master chemical balance indicator governing disinfection kinetics, coagulation behavior, and distribution pipe corrosion.",
        "isDemo": False
    },
    {
        "parameterId": "TH-TUR",
        "parameter": "Turbidity",
        "chemicalFormula": "Colloidal Suspensions",
        "category": "Physical",
        "acceptableLimit": "1.0 NTU",
        "permissibleLimit": "5.0 NTU",
        "unit": "NTU",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.2, Table 1",
        "sensorMethod": "Nephelometric Method (IS 3025 Pt 10)",
        "healthImpact": "Suspended clay, silt, and microorganisms shield viruses and cysts from chemical disinfection, increasing waterborne infection risk.",
        "surveillanceFrequency": "Continuous Telemetry / 4-Hourly",
        "enforcingRuleIds": ["R-TUR-001", "R-TUR-002"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("1.0"),
        "permissibleMax": Decimal("5.0"),
        "description": "Optical clarity indicator measuring the scattering of light by insoluble suspended particles.",
        "isDemo": False
    },
    {
        "parameterId": "TH-TDS",
        "parameter": "Total Dissolved Solids (TDS)",
        "chemicalFormula": "Dissolved Minerals & Salts",
        "category": "Chemical",
        "acceptableLimit": "500 mg/L",
        "permissibleLimit": "2,000 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.3, Table 1",
        "sensorMethod": "Gravimetric Dried at 180°C / Conductivity Probe",
        "healthImpact": "Gastrointestinal irritation in sensitive populations, severe scaling of industrial and domestic fixtures, unpalatable taste.",
        "surveillanceFrequency": "Daily Telemetry / Weekly Lab Gravimetric",
        "enforcingRuleIds": ["R-TDS-001", "R-TDS-002", "R-TDS-003"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("500"),
        "permissibleMax": Decimal("2000"),
        "description": "Total concentration of dissolved inorganic cations (Ca, Mg, Na, K) and anions (carbonate, bicarbonate, chloride, sulfate).",
        "isDemo": False
    },
    {
        "parameterId": "TH-CHL",
        "parameter": "Free Residual Chlorine",
        "chemicalFormula": "HOCl + OCl-",
        "category": "Disinfection",
        "acceptableLimit": "Min 0.2 mg/L",
        "permissibleLimit": "Max 1.0 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.11, Table 1",
        "sensorMethod": "DPD Colorimetric / Amperometric Titration",
        "healthImpact": "<0.2 mg/L allows bacterial biofilm re-growth in transmission pipes; >1.0 mg/L causes mucosal irritation and trihalomethane accumulation.",
        "surveillanceFrequency": "Continuous Pipeline Sensor / Twice Daily Delivery Endpoints",
        "enforcingRuleIds": ["R-CHL-001", "R-CHL-002"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0.2"),
        "desirableMax": Decimal("0.5"),
        "permissibleMax": Decimal("1.0"),
        "description": "Active biocidal residual required to safeguard treated water against cross-contamination during transit through the urban piping network.",
        "isDemo": False
    },
    {
        "parameterId": "TH-BAC",
        "parameter": "Total Coliform / E. Coli",
        "chemicalFormula": "Thermotolerant Bacteria",
        "category": "Biological",
        "acceptableLimit": "Shall not be detectable (0)",
        "permissibleLimit": "No relaxation (0)",
        "unit": "MPN/100 mL",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Table 1, Biological Specification",
        "sensorMethod": "Membrane Filtration (IS 1622) / Defined Substrate (Colilert)",
        "healthImpact": "Direct indicator of sewage/fecal contamination. Immediate vector for cholera, typhoid fever, bacillary dysentery, and viral hepatitis.",
        "surveillanceFrequency": "Daily Municipal Ward Sampling / Immediate Lab Inoculation",
        "enforcingRuleIds": ["R-BAC-001"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("0"),
        "permissibleMax": Decimal("0"),
        "description": "Primary microbiological safety standard requiring complete absence of indicator organisms in all 100 mL potable samples.",
        "isDemo": False
    },
    {
        "parameterId": "TH-NIT",
        "parameter": "Nitrate (as NO3)",
        "chemicalFormula": "NO3-",
        "category": "Chemical",
        "acceptableLimit": "45 mg/L",
        "permissibleLimit": "No relaxation",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.6, Table 1",
        "sensorMethod": "UV Spectrophotometric Screening / Ion Chromatography",
        "healthImpact": "Infantile methemoglobinemia (Blue Baby Syndrome) in bottle-fed infants; chronic gastric nitrosamine formation.",
        "surveillanceFrequency": "Fortnightly Laboratory Spectrophotometry",
        "enforcingRuleIds": ["R-NIT-001"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("45"),
        "permissibleMax": Decimal("45"),
        "description": "Common contaminant from agricultural synthetic fertilizers and subterranean septic leachates.",
        "isDemo": False
    },
    {
        "parameterId": "TH-FLU",
        "parameter": "Fluoride (as F)",
        "chemicalFormula": "F-",
        "category": "Chemical",
        "acceptableLimit": "1.0 mg/L",
        "permissibleLimit": "1.5 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.5, Table 1",
        "sensorMethod": "SPADNS Photometric / Ion Selective Electrode (IS 3025 Pt 23)",
        "healthImpact": ">1.0 mg/L causes dental fluorosis (enamel mottling); >1.5 mg/L causes crippling skeletal fluorosis and joint calcification.",
        "surveillanceFrequency": "Fortnightly Laboratory Assay",
        "enforcingRuleIds": ["R-FLU-001"],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0.6"),
        "desirableMax": Decimal("1.0"),
        "permissibleMax": Decimal("1.5"),
        "description": "Naturally occurring halogen ion with narrow therapeutic window: prevents dental caries at ~0.8 mg/L but toxic above 1.5 mg/L.",
        "isDemo": False
    },
    {
        "parameterId": "TH-HRD",
        "parameter": "Total Hardness (as CaCO3)",
        "chemicalFormula": "Ca2+ + Mg2+",
        "category": "Chemical",
        "acceptableLimit": "200 mg/L",
        "permissibleLimit": "600 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.4, Table 1",
        "sensorMethod": "EDTA Titrimetric Method (IS 3025 Pt 21)",
        "healthImpact": "Excessive soap consumption, scaling of domestic hot water appliances and distribution mains; poor textile washing.",
        "surveillanceFrequency": "Monthly Accredited Lab Assay",
        "enforcingRuleIds": ["R-HRD-001"],
        "enforcementStatus": "Surveillance Baseline",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("200"),
        "permissibleMax": Decimal("600"),
        "description": "Capacity of water to precipitate soap, driven by multivalent metallic cations dominated by calcium and magnesium.",
        "isDemo": False
    },
    {
        "parameterId": "TH-ALK",
        "parameter": "Total Alkalinity (as CaCO3)",
        "chemicalFormula": "HCO3- + CO3(2-) + OH-",
        "category": "Chemical",
        "acceptableLimit": "200 mg/L",
        "permissibleLimit": "600 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.7, Table 1",
        "sensorMethod": "Titration with 0.02 N H2SO4 to pH 4.5 End Point",
        "healthImpact": "Unpleasant alkaline taste, reaction with natural coagulants reducing clarification efficiency in treatment plants.",
        "surveillanceFrequency": "Monthly Accredited Lab Assay",
        "enforcingRuleIds": [],
        "enforcementStatus": "Surveillance Baseline",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("200"),
        "permissibleMax": Decimal("600"),
        "description": "Acid-neutralizing capacity of water, serving as the essential buffer system against sudden pH fluctuations.",
        "isDemo": False
    },
    {
        "parameterId": "TH-FE",
        "parameter": "Iron (as Fe)",
        "chemicalFormula": "Fe2+ / Fe3+",
        "category": "Heavy Metal",
        "acceptableLimit": "0.3 mg/L",
        "permissibleLimit": "1.0 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Cl. 4.8, Table 1",
        "sensorMethod": "Phenanthroline Spectrophotometric (IS 3025 Pt 53)",
        "healthImpact": "Staining of laundry, sanitary fixtures; astringent metallic taste; stimulates biofouling iron bacteria in mains.",
        "surveillanceFrequency": "Monthly Accredited Lab Assay",
        "enforcingRuleIds": [],
        "enforcementStatus": "Surveillance Baseline",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("0.3"),
        "permissibleMax": Decimal("1.0"),
        "description": "Common metallic constituent dissolved from geological formations or rusted galvanized transmission pipes.",
        "isDemo": False
    },
    {
        "parameterId": "TH-DO",
        "parameter": "Dissolved Oxygen (DO)",
        "chemicalFormula": "O2 (aq)",
        "category": "Physical",
        "acceptableLimit": "Min 5.0 mg/L",
        "permissibleLimit": "Min 4.0 mg/L",
        "unit": "mg/L",
        "standardReference": "CPCB / IS 10500:2012 Correlated",
        "clause": "Water Quality Guidelines Annexure B",
        "sensorMethod": "Luminescent Optical Sensor / Azide Winkler Titration",
        "healthImpact": "<4.0 mg/L signals biological septic decay and anaerobic sulfide generation, causing offensive rotten-egg odors.",
        "surveillanceFrequency": "Continuous Intake Telemetry / Daily",
        "enforcingRuleIds": [],
        "enforcementStatus": "Operational Guideline",
        "desirableMin": Decimal("5.0"),
        "desirableMax": Decimal("12.0"),
        "permissibleMax": Decimal("4.0"),
        "description": "Vital indicator of fresh water health, aeration efficacy, and biochemical stability in raw reservoir intakes.",
        "isDemo": False
    },
    {
        "parameterId": "TH-EC",
        "parameter": "Electrical Conductivity",
        "chemicalFormula": "Ionic Mobility",
        "category": "Physical",
        "acceptableLimit": "750 µS/cm",
        "permissibleLimit": "2,250 µS/cm",
        "unit": "µS/cm",
        "standardReference": "BIS IS 10500:2012 / CPCB",
        "clause": "Cl. 4.3 Correlated Reference",
        "sensorMethod": "Conductivity Cell with Automated 25°C Temperature Comp",
        "healthImpact": "Direct digital proxy for total ionic salinity. Spikes indicate illicit industrial effluent discharges or saline intrusion.",
        "surveillanceFrequency": "Continuous Telemetry Sensor",
        "enforcingRuleIds": [],
        "enforcementStatus": "Operational Guideline",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("750"),
        "permissibleMax": Decimal("2250"),
        "description": "Real-time electro-chemical measurement of water ability to conduct electrical current.",
        "isDemo": False
    },
    {
        "parameterId": "TH-PB",
        "parameter": "Lead (as Pb)",
        "chemicalFormula": "Pb2+",
        "category": "Heavy Metal",
        "acceptableLimit": "0.01 mg/L",
        "permissibleLimit": "No relaxation",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Table 2, Toxic Substances Specification",
        "sensorMethod": "Atomic Absorption Spectrophotometry (AAS) / ICP-MS",
        "healthImpact": "Severe cumulative neurotoxin. Causes irreversible cognitive decline, learning disabilities in children, and renal failure.",
        "surveillanceFrequency": "Quarterly NABL Accredited Laboratory Testing",
        "enforcingRuleIds": [],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("0.01"),
        "permissibleMax": Decimal("0.01"),
        "description": "High-toxicity heavy metal banned from drinking water with strict zero relaxation under BIS specifications.",
        "isDemo": False
    },
    {
        "parameterId": "TH-AS",
        "parameter": "Arsenic (as As)",
        "chemicalFormula": "As3+ / As5+",
        "category": "Heavy Metal",
        "acceptableLimit": "0.01 mg/L",
        "permissibleLimit": "0.05 mg/L",
        "unit": "mg/L",
        "standardReference": "BIS IS 10500:2012",
        "clause": "Table 2, Toxic Substances Specification",
        "sensorMethod": "Hydride Generation AAS / ICP-MS (IS 3025 Pt 37)",
        "healthImpact": "Group 1 human carcinogen. Causes chronic arsenicosis, melanosis, hyperkeratosis, and peripheral vascular gangrene.",
        "surveillanceFrequency": "Quarterly NABL Accredited Laboratory Testing",
        "enforcingRuleIds": [],
        "enforcementStatus": "Mandatory Legal Limit",
        "desirableMin": Decimal("0"),
        "desirableMax": Decimal("0.01"),
        "permissibleMax": Decimal("0.05"),
        "description": "Geogenic contaminant prevalent in alluvial aquifers requiring rigorous laboratory spectroscopic certification.",
        "isDemo": False
    }
]


def create_table_if_not_exists(dynamodb, table_name: str, key_name: str):
    existing = dynamodb.list_tables()['TableNames']
    if table_name in existing:
        print(f"Table '{table_name}' already exists in DynamoDB.")
        return

    print(f"Creating DynamoDB table '{table_name}' with partition key '{key_name}' (S)...")
    dynamodb.create_table(
        TableName=table_name,
        KeySchema=[{'AttributeName': key_name, 'KeyType': 'HASH'}],
        AttributeDefinitions=[{'AttributeName': key_name, 'AttributeType': 'S'}],
        BillingMode='PAY_PER_REQUEST'
    )

    print(f"Waiting for '{table_name}' to become ACTIVE...")
    waiter = dynamodb.get_waiter('table_exists')
    waiter.wait(TableName=table_name)
    print(f"Table '{table_name}' is now ACTIVE.")


def seed_table(dynamodb_resource, table_name: str, items: list[dict], key_field: str):
    table = dynamodb_resource.Table(table_name)
    print(f"Seeding {len(items)} records into '{table_name}'...")
    count = 0
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
            count += 1
    print(f"Successfully seeded {count} items into '{table_name}'.")


def main():
    print(f"Connecting to AWS DynamoDB (region: {REGION}, profile: {PROFILE})...")
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    client = session.client('dynamodb')
    resource = session.resource('dynamodb')

    # 1. Create table 'Rules'
    create_table_if_not_exists(client, 'Rules', 'ruleId')
    # 2. Create table 'Thresholds'
    create_table_if_not_exists(client, 'Thresholds', 'parameterId')
    # 3. Create table 'RulesThresholds'
    create_table_if_not_exists(client, 'RulesThresholds', 'ruleId')

    # Seed Rules into 'Rules' table
    seed_table(resource, 'Rules', RULES_DATA, 'ruleId')

    # Seed Thresholds into 'Thresholds' table
    seed_table(resource, 'Thresholds', THRESHOLDS_DATA, 'parameterId')

    # Seed both into 'RulesThresholds' table (Rules with ruleId, and Thresholds with ruleId=parameterId)
    combined_items = list(RULES_DATA)
    for t in THRESHOLDS_DATA:
        combined_item = dict(t)
        combined_item['ruleId'] = t['parameterId']  # Allow unified partition key lookup
        combined_items.append(combined_item)
    seed_table(resource, 'RulesThresholds', combined_items, 'ruleId')

    print("\n--- DynamoDB Verification ---")
    current_tables = client.list_tables()['TableNames']
    print(f"All DynamoDB tables now: {current_tables}")
    for t_name in ['Rules', 'Thresholds', 'RulesThresholds']:
        if t_name in current_tables:
            t = resource.Table(t_name)
            print(f" - {t_name}: {t.item_count} items (Scanned count: {t.scan(Select='COUNT')['Count']})")

    print("\nAll Rules and Thresholds tables created and seeded in DynamoDB successfully!")


if __name__ == '__main__':
    main()
