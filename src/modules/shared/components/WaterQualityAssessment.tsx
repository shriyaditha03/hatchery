import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CloudSun, Thermometer, FlaskConical, Bug, 
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Droplets 
} from 'lucide-react';
import { 
  WATER_PARAMETERS_STRUCTURE, 
  WATER_QUALITY_RANGES, 
  checkWaterParameterCompliance,
  REQUIRED_WATER_FIELDS,
  POND_REQUIRED_WATER_FIELDS
} from '../constants/activity';

interface WaterQualityAssessmentProps {
  waterData: Record<string, string>;
  onWaterDataChange: (data: Record<string, string>) => void;
  weatherReport?: string;
  onWeatherReportChange?: (weather: string) => void;
  isFarmModule: boolean;
  showWeather?: boolean;
  onScoreChange?: (score: number) => void;
}

const WEATHER_OPTIONS = [
  'Sunny (Normal)',
  'Scorching',
  'Sunny Cloudy',
  'Cloudy',
  'Drizzle',
  'Rain',
  'Thunderstorm'
];

const WATER_COLOUR_OPTIONS = [
  'Clear', 'Green Yellow', 'Green', 'Dark Green', 'Green Blue', 'Green Brown',
  'Dark Green Brown', 'Light Brown', 'Brown', 'Dark Brown', 'Brown Red', 'Black'
];

export const WaterQualityAssessment: React.FC<WaterQualityAssessmentProps> = ({
  waterData,
  onWaterDataChange,
  weatherReport = '',
  onWeatherReportChange,
  isFarmModule,
  showWeather = false,
  onScoreChange
}) => {
  const [showMorePhysical, setShowMorePhysical] = useState(false);
  const [showMoreChemical, setShowMoreChemical] = useState(false);
  const [showMorePlankton, setShowMorePlankton] = useState(false);
  const [showMoreVibrio, setShowMoreVibrio] = useState(false);

  // Group parameters by category
  const categorizedParams = useMemo(() => {
    const physical = WATER_PARAMETERS_STRUCTURE.filter(p => p.category === 'physical');
    const chemical = WATER_PARAMETERS_STRUCTURE.filter(p => p.category === 'chemical');
    const plankton = WATER_PARAMETERS_STRUCTURE.filter(p => p.category === 'plankton');
    const vibrio = WATER_PARAMETERS_STRUCTURE.filter(p => p.category === 'vibrio');

    return { physical, chemical, plankton, vibrio };
  }, []);

  // Compute compliance values
  const complianceStats = useMemo(() => {
    let totalScoredFilled = 0;
    let compliantCount = 0;

    WATER_PARAMETERS_STRUCTURE.forEach(p => {
      // Skip pond-only fields if we are not in farm/pond module
      if (p.onlyPonds && !isFarmModule) return;

      const valStr = waterData[p.key];
      if (valStr && valStr.trim() !== '') {
        const compliance = checkWaterParameterCompliance(p.key, valStr);
        if (compliance !== null) {
          totalScoredFilled++;
          if (compliance) compliantCount++;
        }
      }
    });

    const score = totalScoredFilled > 0 ? (compliantCount / totalScoredFilled) * 10 : 0;
    return { score, totalScoredFilled, compliantCount };
  }, [waterData, isFarmModule]);

  // Propagate score change to parent
  useEffect(() => {
    if (onScoreChange) {
      onScoreChange(parseFloat(complianceStats.score.toFixed(1)));
    }
  }, [complianceStats.score, onScoreChange]);

  const handleFieldChange = (key: string, value: string) => {
    onWaterDataChange({
      ...waterData,
      [key]: value
    });
  };

  const renderField = (p: typeof WATER_PARAMETERS_STRUCTURE[0]) => {
    // Hide pond-only fields when not in farm module
    if (p.onlyPonds && !isFarmModule) return null;

    const value = waterData[p.key] || '';
    const isRequired = REQUIRED_WATER_FIELDS.includes(p.key) || (isFarmModule && POND_REQUIRED_WATER_FIELDS.includes(p.key));
    const rangeLabel = WATER_QUALITY_RANGES[p.key];
    const compliance = value !== '' ? checkWaterParameterCompliance(p.key, value) : null;

    return (
      <div key={p.key} className="space-y-1 group">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
          <span>
            {p.label} {isRequired && <span className="text-red-500">*</span>}
          </span>
          {rangeLabel && (
            <span className="text-[9px] font-medium text-slate-400 font-mono">
              {rangeLabel}
            </span>
          )}
        </Label>

        <div className="relative flex items-center">
          {p.key === 'Water Colour' ? (
            <Select value={value} onValueChange={(val) => handleFieldChange(p.key, val)}>
              <SelectTrigger className="h-10 text-sm rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select Colour" />
              </SelectTrigger>
              <SelectContent>
                {WATER_COLOUR_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={(p.key.startsWith('Other') || p.key.includes('Ratio')) ? 'text' : 'number'}
              min="0"
              step="any"
              value={value}
              onChange={(e) => handleFieldChange(p.key, e.target.value)}
              placeholder={p.optimal || p.unit ? `${p.unit || ''}` : 'Enter value'}
              className="h-10 text-sm rounded-xl bg-slate-50 border-slate-200 pr-10 focus-visible:ring-primary/20"
            />
          )}

          {/* Compliance Status Indicators */}
          {compliance !== null && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              {compliance ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" title="Optimal" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" title="Out of range" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Weather Section */}
      {showWeather && onWeatherReportChange && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-primary" />
            Weather Condition
          </h3>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Weather Report <span className="text-red-500">*</span>
            </Label>
            <Select value={weatherReport} onValueChange={onWeatherReportChange}>
              <SelectTrigger className="h-11 text-sm rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Select current weather" />
              </SelectTrigger>
              <SelectContent>
                {WEATHER_OPTIONS.map(w => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Physical Parameters Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-sky-500" />
          Physical Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categorizedParams.physical.filter(p => !p.isMore).map(p => renderField(p))}
        </div>

        {/* More Collapsible for Physical */}
        {showMorePhysical ? (
          <div className="pt-2 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categorizedParams.physical.filter(p => p.isMore && !p.key.startsWith('Other')).map(p => renderField(p))}
            </div>
            
            {/* Custom Other Field */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Physical Name</Label>
                <Input
                  type="text"
                  value={waterData['otherPhysicalName'] || ''}
                  onChange={(e) => handleFieldChange('otherPhysicalName', e.target.value)}
                  placeholder="e.g. Wave Height"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Physical Value</Label>
                <Input
                  type="text"
                  value={waterData['otherPhysicalValue'] || ''}
                  onChange={(e) => handleFieldChange('otherPhysicalValue', e.target.value)}
                  placeholder="Value"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <Button 
              type="button" variant="ghost" size="sm" 
              className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-1.5 rounded-xl h-auto"
              onClick={() => setShowMorePhysical(false)}
            >
              <ChevronUp className="w-4 h-4 mr-1" /> Hide More Parameters
            </Button>
          </div>
        ) : (
          <Button 
            type="button" variant="outline" size="sm" 
            className="w-full border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 text-xs font-bold py-2 rounded-xl h-10 transition-colors"
            onClick={() => setShowMorePhysical(true)}
          >
            <ChevronDown className="w-4 h-4 mr-1" /> View More Parameters
          </Button>
        )}
      </div>

      {/* Chemical Parameters Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-emerald-500" />
          Chemical Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categorizedParams.chemical.filter(p => !p.isMore).map(p => renderField(p))}
        </div>

        {/* More Collapsible for Chemical */}
        {showMoreChemical ? (
          <div className="pt-2 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categorizedParams.chemical.filter(p => p.isMore && !p.key.startsWith('Other')).map(p => renderField(p))}
            </div>

            {/* Custom Other Field */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Chemical Name</Label>
                <Input
                  type="text"
                  value={waterData['otherChemicalName'] || ''}
                  onChange={(e) => handleFieldChange('otherChemicalName', e.target.value)}
                  placeholder="e.g. Zinc"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Chemical Value</Label>
                <Input
                  type="text"
                  value={waterData['otherChemicalValue'] || ''}
                  onChange={(e) => handleFieldChange('otherChemicalValue', e.target.value)}
                  placeholder="Value"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <Button 
              type="button" variant="ghost" size="sm" 
              className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-1.5 rounded-xl h-auto"
              onClick={() => setShowMoreChemical(false)}
            >
              <ChevronUp className="w-4 h-4 mr-1" /> Hide More Parameters
            </Button>
          </div>
        ) : (
          <Button 
            type="button" variant="outline" size="sm" 
            className="w-full border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 text-xs font-bold py-2 rounded-xl h-10 transition-colors"
            onClick={() => setShowMoreChemical(true)}
          >
            <ChevronDown className="w-4 h-4 mr-1" /> View More Parameters
          </Button>
        )}
      </div>

      {/* Biological - Plankton Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
          <Droplets className="w-4 h-4 text-teal-500" />
          Biological Parameters - Plankton (Cell/ml)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categorizedParams.plankton.filter(p => !p.isMore).map(p => renderField(p))}
        </div>

        {/* More Collapsible for Plankton */}
        {showMorePlankton ? (
          <div className="pt-2 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categorizedParams.plankton.filter(p => p.isMore && !p.key.startsWith('Other')).map(p => renderField(p))}
            </div>

            {/* Custom Other Field */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Plankton Name</Label>
                <Input
                  type="text"
                  value={waterData['otherPlanktonName'] || ''}
                  onChange={(e) => handleFieldChange('otherPlanktonName', e.target.value)}
                  placeholder="e.g. Red Algae"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Plankton (Cell/ml)</Label>
                <Input
                  type="text"
                  value={waterData['otherPlanktonValue'] || ''}
                  onChange={(e) => handleFieldChange('otherPlanktonValue', e.target.value)}
                  placeholder="Value"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <Button 
              type="button" variant="ghost" size="sm" 
              className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-1.5 rounded-xl h-auto"
              onClick={() => setShowMorePlankton(false)}
            >
              <ChevronUp className="w-4 h-4 mr-1" /> Hide More
            </Button>
          </div>
        ) : (
          <Button 
            type="button" variant="outline" size="sm" 
            className="w-full border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 text-xs font-bold py-2 rounded-xl h-10 transition-colors"
            onClick={() => setShowMorePlankton(true)}
          >
            <ChevronDown className="w-4 h-4 mr-1" /> View More Plankton
          </Button>
        )}
      </div>

      {/* Biological - Vibrio / Viral Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
          <Bug className="w-4 h-4 text-rose-500" />
          Biological Parameters - Vibrio / Viral (CFU/ml)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categorizedParams.vibrio.filter(p => !p.isMore).map(p => renderField(p))}
        </div>

        {/* More Collapsible for Vibrio */}
        {showMoreVibrio ? (
          <div className="pt-2 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categorizedParams.vibrio.filter(p => p.isMore && !p.key.startsWith('Other')).map(p => renderField(p))}
            </div>

            {/* Custom Other Field */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Vibrio Name</Label>
                <Input
                  type="text"
                  value={waterData['otherVibrioName'] || ''}
                  onChange={(e) => handleFieldChange('otherVibrioName', e.target.value)}
                  placeholder="e.g. E. Coli"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Other Vibrio (CFU/ml)</Label>
                <Input
                  type="text"
                  value={waterData['otherVibrioValue'] || ''}
                  onChange={(e) => handleFieldChange('otherVibrioValue', e.target.value)}
                  placeholder="Value"
                  className="h-10 text-sm rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <Button 
              type="button" variant="ghost" size="sm" 
              className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-1.5 rounded-xl h-auto"
              onClick={() => setShowMoreVibrio(false)}
            >
              <ChevronUp className="w-4 h-4 mr-1" /> Hide More
            </Button>
          </div>
        ) : (
          <Button 
            type="button" variant="outline" size="sm" 
            className="w-full border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 text-xs font-bold py-2 rounded-xl h-10 transition-colors"
            onClick={() => setShowMoreVibrio(true)}
          >
            <ChevronDown className="w-4 h-4 mr-1" /> View More Vibrio/Viral
          </Button>
        )}
      </div>

      {/* Compliance Score Summary Card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5 space-y-3 shadow-inner animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Water Quality Score</span>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {complianceStats.totalScoredFilled} of {WATER_PARAMETERS_STRUCTURE.filter(p => !p.onlyPonds || isFarmModule).filter(p => p.optimal).length} optimal parameters recorded
            </p>
          </div>
          <div className="flex items-baseline gap-1 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
            <span className="text-3xl font-black text-primary">{complianceStats.score.toFixed(1)}</span>
            <span className="text-sm font-black text-slate-400">/ 10</span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden border border-slate-200/50">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-sm" 
            style={{ width: `${(complianceStats.score / 10) * 100}%` }} 
          />
        </div>
        <p className="text-[10px] text-slate-500 text-center italic tracking-wide">
          Compliance score is calculated as the ratio of optimal parameters to total entered parameters with optimal ranges.
        </p>
      </div>
    </div>
  );
};
