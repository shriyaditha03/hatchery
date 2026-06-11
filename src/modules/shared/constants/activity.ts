export const ANIMAL_RATING_FIELDS = [
  { key: 'swimmingActivity', label: 'Swimming Activity', required: true },
  { key: 'homogenousStage', label: 'Homogenous Stage', required: true },
  { key: 'hepatopancreas', label: 'Hepatopancreas', required: true },
  { key: 'intestinalContent', label: 'Intestinal Content', required: true },
  { key: 'fecalStrings', label: 'Fecal Strings', required: true },
  { key: 'necrosis', label: 'Necrosis', required: true },
  { key: 'deformities', label: 'Deformities', required: true },
  { key: 'fouling', label: 'Fouling', required: true },
  { key: 'epibionts', label: 'Epibionts', required: true },
  { key: 'muscleGutRatio', label: 'Muscle Gut Ratio', required: true },
  { key: 'size', label: 'Size', required: true },
  { key: 'nextStageConversion', label: 'Time taken for Next Stage Conversion', required: true },
];

export interface WaterParameter {
  key: string;
  label: string;
  category: 'physical' | 'chemical' | 'plankton' | 'vibrio';
  unit?: string;
  optimal?: string;
  onlyPonds?: boolean;
  isMore?: boolean;
}

export const WATER_PARAMETERS_STRUCTURE: WaterParameter[] = [
  // Physical
  { key: 'Water Colour', label: 'Water Colour', category: 'physical', onlyPonds: true },
  { key: 'Transparency', label: 'Transparency', category: 'physical', unit: 'cm', optimal: '30 - 40 cm', onlyPonds: true },
  { key: 'pH', label: 'pH', category: 'physical', optimal: '7.5 to 8.5' },
  { key: 'Salinity', label: 'Salinity', category: 'physical', unit: 'ppt', optimal: '5 – 30 ppt' },
  { key: 'Temperature', label: 'Temperature', category: 'physical', unit: '°C', optimal: '21 C to 32o C' },
  { key: 'Dissolved Oxygen', label: 'DO (Dissolved Oxygen)', category: 'physical', unit: 'mg/L', optimal: '4-8 mg/L' },
  { key: 'ORP', label: 'ORP (Oxidation-Reduction Potential)', category: 'physical', unit: 'mV', optimal: '+280 to 350mV', isMore: true },
  { key: 'Electrical Conductivity', label: 'Electrical Conductivity', category: 'physical', unit: 'millisiemens/cm', optimal: '10 to 35 millisiemens/cm', isMore: true },
  { key: 'Water Height', label: 'Water Height', category: 'physical', unit: 'ft', isMore: true },
  { key: 'Turbidity', label: 'Turbidity', category: 'physical', unit: 'NTU', optimal: '10-30 NTU', isMore: true },
  { key: 'Other Physical', label: 'Other', category: 'physical', isMore: true },

  // Chemical
  { key: 'Alkalinity', label: 'Alkalinity', category: 'chemical', unit: 'mg/L (ppm)', optimal: '100-150 mg/L' },
  { key: 'Ammonia', label: 'Ammonia (NH3)', category: 'chemical', unit: 'mg/L (ppm)', optimal: '<0.05 mg/L' },
  { key: 'Nitrite', label: 'Nitrite (NO2)', category: 'chemical', unit: 'ppm' },
  { key: 'Carbonate', label: 'Carbonate (CO3)', category: 'chemical', unit: 'ppm' },
  { key: 'Bicarbonate', label: 'Bicarbonate (HCO3)', category: 'chemical', unit: 'ppm' },
  { key: 'Total Hardness', label: 'Total Hardness', category: 'chemical', unit: 'mg/L (ppm)', optimal: '150-300mg/L', isMore: true },
  { key: 'Nitrate', label: 'Nitrate (NO3)', category: 'chemical', unit: 'ppm', optimal: '20- 40 ppm', isMore: true },
  { key: 'Hydrogen Sulphide', label: 'Hydrogen Sulphide (H2S)', category: 'chemical', unit: 'mg/L (ppm)', optimal: '<0.5 mg/L', isMore: true },
  { key: 'Calcium', label: 'Calcium (Ca)', category: 'chemical', unit: 'mg/L (ppm)', optimal: '150 – 250 mg/L ppm', isMore: true },
  { key: 'Magnesium', label: 'Magnesium (Mg)', category: 'chemical', unit: 'mg/L (ppm)', optimal: '600 – 1000 mg/L ppm', isMore: true },
  { key: 'Potassium', label: 'Potassium (K)', category: 'chemical', unit: 'mg/L (ppm)', optimal: '150 – 250 mg/L ppm', isMore: true },
  { key: 'Phosphate', label: 'Phosphate (PO4)', category: 'chemical', unit: 'mg/L (ppm)', optimal: '0.05 – 0.5 mg/L ppm', isMore: true },
  { key: 'Iron', label: 'Iron', category: 'chemical', unit: 'mg/L', optimal: '0.1 to 0.5 mg/L', isMore: true },
  { key: 'Magnesium to Calcium Ratio', label: 'Magnesium to Calcium Ratio', category: 'chemical', optimal: '3.4:1', isMore: true },
  { key: 'Calcium to Potassium Ratio', label: 'Calcium to Potassium Ratio', category: 'chemical', optimal: '1:1', isMore: true },
  { key: 'Ammonium', label: 'Ammonium (NH4)', category: 'chemical', unit: 'ppm', isMore: true },
  { key: 'Total Ammonia Nitrogen TAN', label: 'Total Ammonia Nitrogen TAN', category: 'chemical', unit: 'mg/L (ppm)', optimal: '<1.0 mg/L', isMore: true },
  { key: 'Total Organic Matter', label: 'Total Organic Matter', category: 'chemical', unit: 'ppm', optimal: '< 55 ppm', isMore: true },
  { key: 'Other Chemical', label: 'Other', category: 'chemical', isMore: true },

  // Biological Plankton
  { key: 'Green Algae', label: 'Green Algae', category: 'plankton', unit: 'Cell/ml' },
  { key: 'Blue Green Algae', label: 'Blue Green Algae', category: 'plankton', unit: 'Cell/ml' },
  { key: 'Yellow Green Algae', label: 'Yellow Green Algae', category: 'plankton', unit: 'Cell/ml', isMore: true },
  { key: 'Golden Brown Algae', label: 'Golden Brown Algae', category: 'plankton', unit: 'Cell/ml', isMore: true },
  { key: 'Diatoms', label: 'Diatoms', category: 'plankton', unit: 'Cell/ml', isMore: true },
  { key: 'Dinoflagellate', label: 'Dinoflagellate', category: 'plankton', unit: 'Cell/ml', isMore: true },
  { key: 'Protozoan', label: 'Protozoan', category: 'plankton', unit: 'Cell/ml', isMore: true },
  { key: 'Zooplankton', label: 'Zooplankton', category: 'plankton', unit: 'Cell/ml', isMore: true },
  { key: 'Other Plankton', label: 'Other', category: 'plankton', unit: 'Cell/ml', isMore: true },

  // Biological Vibrio
  { key: 'Yellow Colonies', label: 'Yellow Colonies', category: 'vibrio', unit: 'CFU/ml' },
  { key: 'Green Colonies', label: 'Green Colonies', category: 'vibrio', unit: 'CFU/ml' },
  { key: 'Luminescent Bacteria', label: 'Luminescent Bacteria', category: 'vibrio', unit: 'CFU/ml', isMore: true },
  { key: 'Total Bacteria', label: 'Total Bacteria', category: 'vibrio', unit: 'CFU/ml', isMore: true },
  { key: 'Viral Loads', label: 'Viral Loads', category: 'vibrio', isMore: true },
  { key: 'Other Vibrio', label: 'Other', category: 'vibrio', isMore: true },
];

export const waterFields = WATER_PARAMETERS_STRUCTURE.map(p => p.key);

export const WATER_QUALITY_RANGES: Record<string, string> = {
  'Transparency': '[30 - 40 cm]',
  'pH': '[7.5 - 8.5]',
  'Salinity': '[5 - 30 ppt]',
  'Temperature': '[21 - 32 degC]',
  'Dissolved Oxygen': '[4 - 8 mg/L]',
  'ORP': '[280 - 350 mV]',
  'Electrical Conductivity': '[10 - 35 mS/cm]',
  'Turbidity': '[10 - 30 NTU]',
  'Alkalinity': '[100 - 150 mg/L]',
  'Ammonia': '[< 0.05 mg/L]',
  'Total Hardness': '[150 - 300 mg/L]',
  'Nitrate': '[20 - 40 ppm]',
  'Hydrogen Sulphide': '[< 0.5 mg/L]',
  'Calcium': '[150 - 250 mg/L]',
  'Magnesium': '[600 - 1000 mg/L]',
  'Potassium': '[150 - 250 mg/L]',
  'Phosphate': '[0.05 - 0.5 mg/L]',
  'Iron': '[0.1 - 0.5 mg/L]',
  'Magnesium to Calcium Ratio': '[3.4:1]',
  'Calcium to Potassium Ratio': '[1:1]',
  'Total Ammonia Nitrogen TAN': '[< 1.0 mg/L]',
  'Total Organic Matter': '[< 55 ppm]',
};

export const REQUIRED_WATER_FIELDS = [
  'pH', 'Salinity', 'Temperature', 'Dissolved Oxygen',
  'Alkalinity', 'Ammonia', 'Nitrite', 'Carbonate', 'Bicarbonate',
  'Green Algae', 'Blue Green Algae', 'Yellow Colonies', 'Green Colonies'
];

export const POND_REQUIRED_WATER_FIELDS = [
  'Water Colour', 'Transparency'
];

export function checkWaterParameterCompliance(key: string, valStr: string): boolean | null {
  const value = String(valStr || '').trim();
  if (value === '') return null;

  const scoredKeys = [
    'Transparency', 'pH', 'Salinity', 'Temperature', 'Dissolved Oxygen',
    'ORP', 'Electrical Conductivity', 'Turbidity', 'Alkalinity', 'Ammonia',
    'Total Hardness', 'Nitrate', 'Hydrogen Sulphide', 'Calcium', 'Magnesium',
    'Potassium', 'Phosphate', 'Iron', 'Magnesium to Calcium Ratio',
    'Calcium to Potassium Ratio', 'Total Ammonia Nitrogen TAN', 'Total Organic Matter'
  ];
  if (!scoredKeys.includes(key)) {
    return null;
  }

  let val = parseFloat(value);
  if (key.includes('Ratio')) {
    const parts = value.split(':');
    if (parts.length > 0) {
      val = parseFloat(parts[0]);
    }
  }

  if (isNaN(val)) return true; // non-numeric/text values count as compliant

  switch (key) {
    case 'Transparency': // 30-40 cm
      return val >= 30 && val <= 40;
    case 'pH': // 7.5 to 8.5
      return val >= 7.5 && val <= 8.5;
    case 'Salinity': // 5 – 30 ppt
      return val >= 5 && val <= 30;
    case 'Temperature': // 21 C to 32o C
      return val >= 21 && val <= 32;
    case 'Dissolved Oxygen': // 4-8 mg/L
      return val >= 4 && val <= 8;
    case 'ORP': // +280 to 350mV
      return val >= 280 && val <= 350;
    case 'Electrical Conductivity': // 10 to 35 millisiemens/cm
      return val >= 10 && val <= 35;
    case 'Turbidity': // 10-30 NTU
      return val >= 10 && val <= 30;
    case 'Alkalinity': // 100-150 mg/L
      return val >= 100 && val <= 150;
    case 'Ammonia': // <0.05 mg/L
      return val < 0.05;
    case 'Total Hardness': // 150-300mg/L
      return val >= 150 && val <= 300;
    case 'Nitrate': // 20- 40 ppm
      return val >= 20 && val <= 40;
    case 'Hydrogen Sulphide': // <0.5 mg/L
      return val < 0.5;
    case 'Calcium': // 150 – 250 mg/L
      return val >= 150 && val <= 250;
    case 'Magnesium': // 600 – 1000 mg/L
      return val >= 600 && val <= 1000;
    case 'Potassium': // 150 – 250 mg/L
      return val >= 150 && val <= 250;
    case 'Phosphate': // 0.05 – 0.5 mg/L
      return val >= 0.05 && val <= 0.5;
    case 'Iron': // 0.1 to 0.5 mg/L
      return val >= 0.1 && val <= 0.5;
    case 'Magnesium to Calcium Ratio': // 3.4:1
      return Math.abs(val - 3.4) < 0.05; // allow small tolerance for rounding
    case 'Calcium to Potassium Ratio': // 1:1
      return Math.abs(val - 1.0) < 0.05;
    case 'Total Ammonia Nitrogen TAN': // <1.0 mg/L
      return val < 1.0;
    case 'Total Organic Matter': // < 55 ppm
      return val < 55;
    default:
      return null; // No optimal range defined, not scored
  }
}

