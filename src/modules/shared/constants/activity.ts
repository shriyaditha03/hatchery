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

export const waterFields = [
  'Salinity', 'pH', 'Dissolved Oxygen', 'Alkalinity', 'Chlorine Content',
  'Iron Content', 'Turbidity', 'Temperature', 'Hardness', 'Ammonia',
  'Nitrate [NO3]', 'Nitrite [NO2]', 'Vibrio Count', 'Yellow Green Bacteria',
  'Luminescence',
];

export const WATER_QUALITY_RANGES: Record<string, string> = {
  'Salinity': '[10 - 35 ppt]',
  'pH': '[7.5 - 8.5]',
  'Dissolved Oxygen': '[> 4.0 ppm]',
  'Alkalinity': '[80 - 200 ppm]',
  'Chlorine Content': '[< 0.1 ppm]',
  'Iron Content': '[< 0.5 ppm]',
  'Turbidity': '[30 - 45 cm]',
  'Temperature': '[26 - 32 degC]',
  'Hardness': '[> 1000 ppm]',
  'Ammonia': '[< 0.1 ppm]',
  'Nitrate [NO3]': '[< 20 ppm]',
  'Nitrite [NO2]': '[< 0.25 ppm]',
  'Vibrio Count': '[< 1x10^3 CFU/mL]',
  'Yellow Green Bacteria': '[< 1x10^2 CFU/mL]',
  'Luminescence': '[Nil]',
};
