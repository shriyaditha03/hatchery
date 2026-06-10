/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Scale, IndianRupee, FileText, AlertCircle } from 'lucide-react';
import ImageUpload from '@/modules/shared/components/ImageUpload';

interface SampleEntry {
  weight: string;
  weightUnit: 'gms' | 'Kgs';
  count: string;
  abw: number; // Auto calculated: (weight in gms) / count
}

interface HarvestFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl?: string;
  onPhotoUrlChange?: (val: string) => void;
  isPlanningMode?: boolean;
}

const WEATHER_OPTIONS = [
  "Sunny (Normal)",
  "Scorching",
  "Sunny Cloudy",
  "Cloudy",
  "Drizzle",
  "Rain",
  "Thunderstorm"
];

const FarmHarvestForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false
}: HarvestFormProps) => {

  // Initialize samples list
  const [samples, setSamples] = useState<SampleEntry[]>(() => {
    if (data.samples && data.samples.length > 0) {
      return data.samples;
    }
    return [{ weight: '', weightUnit: 'Kgs', count: '', abw: 0 }];
  });

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  // Add a new sample row
  const addSample = () => {
    setSamples([...samples, { weight: '', weightUnit: 'Kgs', count: '', abw: 0 }]);
  };

  // Remove a sample row
  const removeSample = (index: number) => {
    if (samples.length === 1) return; // Keep at least one sample row
    const newSamples = samples.filter((_, i) => i !== index);
    setSamples(newSamples);
  };

  // Update a sample field and recalculate sample ABW
  const updateSampleField = (index: number, field: 'weight' | 'weightUnit' | 'count', value: any) => {
    const updated = [...samples];
    updated[index] = { ...updated[index], [field]: value };

    const weightNum = parseFloat(updated[index].weight || '0');
    const countNum = parseFloat(updated[index].count || '0');

    if (weightNum > 0 && countNum > 0) {
      const weightInGms = updated[index].weightUnit === 'Kgs' ? weightNum * 1000 : weightNum;
      updated[index].abw = parseFloat((weightInGms / countNum).toFixed(2));
    } else {
      updated[index].abw = 0;
    }

    setSamples(updated);
  };

  // Synchronize samples state with parent data and trigger dependent calculations
  useEffect(() => {
    handleChange('samples', samples);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples]);

  // Preharvest info & Calculation of Harvested statistics
  const preharvestPopulation = parseFloat(data.preharvestPopulationEstimate || data.populationBeforeHarvest || '0');
  const abwAutoPopulated = parseFloat(data.averageBodyWeight || '0');
  const preharvestEstimatedBiomass = parseFloat(((preharvestPopulation * abwAutoPopulated) / 1000).toFixed(2));

  // Compute average ABW from all valid samples
  const validSamples = samples.filter(s => s.abw > 0);
  const harvestedAbw = validSamples.length > 0 
    ? parseFloat((validSamples.reduce((sum, s) => sum + s.abw, 0) / validSamples.length).toFixed(2)) 
    : 0;

  // Harvested count per kg (1000 / harvestedAbw)
  const harvestedCount = harvestedAbw > 0 ? parseFloat((1000 / harvestedAbw).toFixed(2)) : 0;

  // Harvested population (harvestedCount * actual harvested biomass)
  const harvestedBiomass = parseFloat(data.harvestedBiomass || '0');
  const harvestedPopulation = parseFloat((harvestedCount * harvestedBiomass).toFixed(0));

  // Payment amounts calculations
  const agreedPrice = parseFloat(data.agreedPrice || '0');
  const receivedAmount = parseFloat(data.receivedAmount || '0');
  const totalAmountDue = parseFloat((agreedPrice * harvestedBiomass).toFixed(2));
  const balanceAmount = parseFloat((totalAmountDue - receivedAmount).toFixed(2));

  // Run all dependency calculations and update parent state once
  useEffect(() => {
    const populationAfterHarvestCalc = Math.max(0, preharvestPopulation - harvestedPopulation);
    const currentPopAfter = data.populationAfterHarvest !== undefined && data.populationAfterHarvest !== ''
      ? parseFloat(data.populationAfterHarvest) || 0
      : populationAfterHarvestCalc;
    const activeAbw = harvestedAbw > 0 ? harvestedAbw : abwAutoPopulated;
    const biomassAfterHarvestCalc = parseFloat(((currentPopAfter * activeAbw) / 1000).toFixed(2));

    onDataChange((prev: any) => {
      // Avoid infinite state update loops by checking if calculations are actually different
      const updates: any = {};
      
      if (prev.preharvestEstimatedBiomass !== preharvestEstimatedBiomass) {
        updates.preharvestEstimatedBiomass = preharvestEstimatedBiomass;
      }
      if (prev.harvestedAbw !== harvestedAbw) {
        updates.harvestedAbw = harvestedAbw;
      }
      if (prev.harvestedCount !== harvestedCount) {
        updates.harvestedCount = harvestedCount;
      }
      if (prev.harvestedPopulation !== harvestedPopulation) {
        updates.harvestedPopulation = harvestedPopulation;
      }
      if (prev.totalAmountDue !== totalAmountDue) {
        updates.totalAmountDue = totalAmountDue;
      }
      if (prev.balanceAmount !== balanceAmount) {
        updates.balanceAmount = balanceAmount;
      }

      // Auto-calculate population balance and biomass balance after harvest if not manually edited yet
      if (!prev.isPopulationAfterHarvestManuallyEdited && prev.populationAfterHarvest !== populationAfterHarvestCalc) {
        updates.populationAfterHarvest = populationAfterHarvestCalc;
      }
      if (!prev.isBiomassAfterHarvestManuallyEdited && prev.biomassAfterHarvest !== biomassAfterHarvestCalc) {
        updates.biomassAfterHarvest = biomassAfterHarvestCalc;
      }

      if (Object.keys(updates).length > 0) {
        return { ...prev, ...updates };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preharvestPopulation,
    abwAutoPopulated,
    preharvestEstimatedBiomass,
    harvestedAbw,
    harvestedCount,
    harvestedBiomass,
    agreedPrice,
    receivedAmount,
    totalAmountDue,
    balanceAmount,
    data.populationAfterHarvest,
    data.isPopulationAfterHarvestManuallyEdited
  ]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. General & Preharvest Section */}
      <div className="glass-card rounded-2xl p-5 border border-sky-100/50 bg-white/70 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 mb-2">
          <div className="bg-sky-500/10 p-2 rounded-xl text-sky-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Harvest General Details</h2>
            <p className="text-[10px] text-muted-foreground">Preharvest telemetry and weather information</p>
          </div>
        </div>

        {/* Read-Only Preharvest info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sky-50/50 p-4 rounded-xl border border-sky-100/30">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-sky-800/60 uppercase">Stocking Date</span>
            <p className="text-sm font-extrabold text-slate-800">{data.stockingDate || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-sky-800/60 uppercase">DOC</span>
            <p className="text-sm font-extrabold text-slate-800">{data.doc !== undefined ? `${data.doc} days` : 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-sky-800/60 uppercase">Stocking Population</span>
            <p className="text-sm font-extrabold text-slate-800">{data.stockingPopulation?.toLocaleString() || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Weather report */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-700">Weather Report *</Label>
            <Select 
              value={data.weatherReport || ''} 
              onValueChange={v => handleChange('weatherReport', v)}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Select Weather" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {WEATHER_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt} className="rounded-lg">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Harvest Type */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-700">Harvest Type *</Label>
            <RadioGroup 
              value={data.harvestType || ''} 
              onValueChange={v => handleChange('harvestType', v)}
              className="grid grid-cols-2 gap-4 h-11 w-full"
            >
              <div className="flex items-center justify-start space-x-1.5 border border-slate-200 rounded-xl h-11 px-2.5 cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                <RadioGroupItem value="Complete" id="ht-complete" />
                <Label htmlFor="ht-complete" className="text-xs font-bold text-slate-700 cursor-pointer w-full">Complete</Label>
              </div>
              <div className="flex items-center justify-start space-x-1.5 border border-slate-200 rounded-xl h-11 px-2.5 cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                <RadioGroupItem value="Partial" id="ht-partial" />
                <Label htmlFor="ht-partial" className="text-xs font-bold text-slate-700 cursor-pointer w-full">Partial</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Auto Populated ABW */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">Sampling ABW (Auto)</Label>
            <Input 
              type="text"
              value={data.averageBodyWeight ? `${data.averageBodyWeight} gms` : '0.0 gms'}
              readOnly
              className="h-11 rounded-xl bg-slate-50 font-bold text-slate-700 border-slate-100 shadow-inner"
            />
          </div>

          {/* Preharvest Population Estimate */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">Preharvest Pop (Auto)</Label>
            <Input 
              type="text"
              value={preharvestPopulation?.toLocaleString() || '0'}
              readOnly
              className="h-11 rounded-xl bg-slate-50 font-bold text-slate-700 border-slate-100 shadow-inner"
            />
          </div>

          {/* Preharvest Estimated Biomass */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">Preharvest Biomass (Auto)</Label>
            <Input 
              type="text"
              value={preharvestEstimatedBiomass ? `${preharvestEstimatedBiomass.toLocaleString()} Kgs` : '0 Kgs'}
              readOnly
              className="h-11 rounded-xl bg-slate-50 font-extrabold text-sky-600 border-slate-100 shadow-inner"
            />
            <p className="text-[8px] text-sky-600/70 font-semibold italic mt-1">Calculated: (Preharvest Population × ABW) / 1000</p>
          </div>
        </div>
      </div>

      {/* 2. Harvest Metrics & Sample assessment */}
      <div className="glass-card rounded-2xl p-5 border border-sky-100/50 bg-white/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-sky-500/10 p-2 rounded-xl text-sky-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Harvest & Sampling Details</h2>
              <p className="text-[10px] text-muted-foreground">Enter actual biomass and samples for accurate metrics</p>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={addSample}
            className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50 h-9 font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Sample
          </Button>
        </div>

        {/* Harvested actual biomass */}
        <div className="space-y-1.5 max-w-md">
          <Label className="text-xs font-bold text-slate-700">Harvested - Actual Biomass in Kgs *</Label>
          <Input 
            type="number"
            value={data.harvestedBiomass || ''}
            onChange={e => handleChange('harvestedBiomass', e.target.value)}
            placeholder="Enter actual weight in Kgs"
            className="h-11 rounded-xl font-bold"
          />
        </div>

        {/* Dynamic sample entries */}
        <div className="space-y-3 pt-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Samples for ABW / Count</span>
          {samples.map((sample, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100 animate-in fade-in duration-200">
              
              {/* Sample Label & Mobile Remove */}
              <div className="md:col-span-1 flex items-center justify-between">
                <span className="text-xs font-black text-slate-500">#{idx + 1}</span>
                {samples.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSample(idx)}
                    className="md:hidden text-destructive hover:bg-destructive/10 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Weight */}
              <div className="md:col-span-5 space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight *</Label>
                <div className="flex gap-1.5 w-full">
                  <Input 
                    type="number" 
                    value={sample.weight} 
                    onChange={e => updateSampleField(idx, 'weight', e.target.value)}
                    className="h-10 rounded-xl bg-white border-slate-200 font-bold flex-1 min-w-0"
                  />
                  <Select 
                    value={sample.weightUnit} 
                    onValueChange={val => updateSampleField(idx, 'weightUnit', val as 'gms' | 'Kgs')}
                  >
                    <SelectTrigger className="w-20 h-10 rounded-xl bg-white border-slate-200 font-bold shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="gms">gms</SelectItem>
                      <SelectItem value="Kgs">Kgs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Count */}
              <div className="md:col-span-3 space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Animals *</Label>
                <Input 
                  type="number" 
                  value={sample.count} 
                  onChange={e => updateSampleField(idx, 'count', e.target.value)}
                  className="h-10 rounded-xl bg-white border-slate-200 font-bold w-full"
                />
              </div>

              {/* ABW Auto calculated */}
              <div className="md:col-span-2 space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ABW (gms)</Label>
                <div className="h-10 flex items-center px-3 rounded-xl border border-slate-200 bg-slate-50 font-extrabold text-slate-700 text-sm shadow-inner w-full">
                  {sample.abw > 0 ? `${sample.abw} gms` : '0.00'}
                </div>
              </div>

              {/* Remove button (Desktop) */}
              {samples.length > 1 && (
                <div className="hidden md:flex md:col-span-1 justify-center pb-0.5">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSample(idx)}
                    className="text-destructive hover:bg-destructive/10 rounded-xl h-10 w-10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Calculated summary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dashed">
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800/70 uppercase">Harvested ABW</span>
            <p className="text-lg font-black text-emerald-800">{harvestedAbw > 0 ? `${harvestedAbw} gms` : '0.0 gms'}</p>
            <p className="text-[8px] text-emerald-600/70">Average of all sample ABWs</p>
          </div>
          <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/50 space-y-1">
            <span className="text-[10px] font-bold text-sky-800/70 uppercase">Harvested Count / Kg</span>
            <p className="text-lg font-black text-sky-800">{harvestedCount > 0 ? `${harvestedCount} / Kg` : '0 / Kg'}</p>
            <p className="text-[8px] text-sky-600/70">Calculated: 1000 / Harvested ABW</p>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50 space-y-1">
            <span className="text-[10px] font-bold text-amber-800/70 uppercase">Harvested Population</span>
            <p className="text-lg font-black text-amber-800">{harvestedPopulation > 0 ? harvestedPopulation.toLocaleString() : '0'}</p>
            <p className="text-[8px] text-amber-600/70">Calculated: Count/Kg * Actual Biomass</p>
          </div>
        </div>

        {/* Partial Harvest Balances */}
        {data.harvestType === 'Partial' && (
          <div className="pt-4 border-t border-dashed animate-in slide-in-from-top-3 duration-300 space-y-4">
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Partial Harvest - Postharvest Balances</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Postharvest population balance estimate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-700">Population Balance Postharvest *</Label>
                  {data.isPopulationAfterHarvestManuallyEdited && (
                    <span className="text-[8px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase border border-amber-200">Modified</span>
                  )}
                </div>
                <Input 
                  type="number"
                  value={data.populationAfterHarvest || ''}
                  onChange={e => {
                    onDataChange((prev: any) => ({
                      ...prev,
                      populationAfterHarvest: e.target.value,
                      isPopulationAfterHarvestManuallyEdited: true
                    }));
                  }}
                  className={`h-11 rounded-xl font-bold ${data.isPopulationAfterHarvestManuallyEdited ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                />
                <p className="text-[9px] text-muted-foreground">Auto-calculated (Preharvest Pop - Harvested Pop) but editable</p>
              </div>

              {/* Postharvest biomass balance estimate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-700">Biomass Balance Postharvest *</Label>
                  {data.isBiomassAfterHarvestManuallyEdited && (
                    <span className="text-[8px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase border border-amber-200">Modified</span>
                  )}
                </div>
                <Input 
                  type="number"
                  value={data.biomassAfterHarvest || ''}
                  onChange={e => {
                    onDataChange((prev: any) => ({
                      ...prev,
                      biomassAfterHarvest: e.target.value,
                      isBiomassAfterHarvestManuallyEdited: true
                    }));
                  }}
                  className={`h-11 rounded-xl font-bold ${data.isBiomassAfterHarvestManuallyEdited ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                />
                <p className="text-[9px] text-muted-foreground">Auto-calculated (Population Balance × ABW / 1000) but editable</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Buyer & Payment Details */}
      <div className="glass-card rounded-2xl p-5 border border-sky-100/50 bg-white/70 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 mb-2">
          <div className="bg-sky-500/10 p-2 rounded-xl text-sky-600">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Buyer & Payment Information</h2>
            <p className="text-[10px] text-muted-foreground">Track financial information and buyer contacts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buyer Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Buyer Name *</Label>
            <Input 
              type="text"
              value={data.buyerName || ''}
              onChange={e => handleChange('buyerName', e.target.value)}
              placeholder="Enter buyer's full name"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Buyer Contact */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Buyer Contact Details (10-digit mobile) *</Label>
            <Input 
              type="text"
              value={data.buyerContact || ''}
              onChange={e => {
                const numericVal = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                handleChange('buyerContact', numericVal);
              }}
              placeholder="e.g. 9876543210"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Agreed Price / Kg */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Agreed Price/Kg (INR) *</Label>
            <Input 
              type="number"
              value={data.agreedPrice || ''}
              onChange={e => handleChange('agreedPrice', e.target.value)}
              placeholder="INR per Kg"
              className="h-11 rounded-xl font-bold"
            />
          </div>

          {/* Received Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Received Amount (INR) *</Label>
            <Input 
              type="number"
              value={data.receivedAmount || ''}
              onChange={e => handleChange('receivedAmount', e.target.value)}
              placeholder="INR received"
              className="h-11 rounded-xl font-bold text-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Amount Due</span>
            <p className="text-xl font-black text-slate-800">₹{totalAmountDue?.toLocaleString() || '0.00'}</p>
            <p className="text-[8px] text-slate-400">Calculated: Price/Kg * Actual Biomass</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Balance Amount</span>
            <p className={`text-xl font-black ${balanceAmount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              ₹{balanceAmount?.toLocaleString() || '0.00'}
            </p>
            <p className="text-[8px] text-slate-400">Calculated: Total Due - Received Amount</p>
          </div>
        </div>
      </div>

      {/* 4. Notes & Media Section */}
      <div className="glass-card rounded-2xl p-5 border border-sky-100/50 bg-white/70 shadow-sm space-y-4">
        
        {/* Upload Files */}
        {!isPlanningMode && onPhotoUrlChange && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Activity Photo (Optional)</Label>
            <ImageUpload 
              value={photoUrl} 
              onUpload={onPhotoUrlChange}
            />
          </div>
        )}

        {/* Notes / Comments */}
        <div className="space-y-1.5 pt-2 border-t border-dashed">
          <Label className="text-xs font-bold text-slate-700">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder={isPlanningMode ? "Add instructions for the harvesting team..." : "Add notes..."}
            rows={4}
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default FarmHarvestForm;
