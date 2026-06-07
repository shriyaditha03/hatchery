import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CloudSun, Calendar, Info, Users, IndianRupee, Activity } from 'lucide-react';
import ImageUpload from '@/modules/shared/components/ImageUpload';

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
  'Sunny (Normal)',
  'Scorching',
  'Sunny Cloudy',
  'Cloudy',
  'Drizzle',
  'Rain',
  'Thunderstorm'
];

interface SampleEntry {
  id: number;
  weight: string;
  unit: 'gms' | 'Kgs';
  count: string;
  abw: number;
}

export const HarvestForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false
}: HarvestFormProps) => {

  // Initialize samples list if missing
  const samples: SampleEntry[] = data.samples || [{ id: 1, weight: '', unit: 'gms', count: '', abw: 0 }];

  // Calculations
  const preharvestPop = parseFloat(data.preharvestPopulationEstimate || '0');
  const preharvestBiomass = parseFloat(data.preharvestEstimatedBiomass || '0');
  const harvestedBiomassVal = parseFloat(data.harvestedBiomass || '0');
  const agreedPriceVal = parseFloat(data.agreedPrice || '0');
  const receivedAmountVal = parseFloat(data.receivedAmount || '0');

  useEffect(() => {
    // 1. Calculate individual sample ABWs
    let updated = false;
    const computedSamples = samples.map((s: SampleEntry) => {
      const w = parseFloat(s.weight || '0');
      const c = parseFloat(s.count || '0');
      let calculatedAbw = 0;
      if (w > 0 && c > 0) {
        calculatedAbw = s.unit === 'Kgs' ? (w * 1000) / c : w / c;
      }
      if (calculatedAbw !== s.abw) {
        updated = true;
        return { ...s, abw: calculatedAbw };
      }
      return s;
    });

    // 2. Average ABW
    const filledAbws = computedSamples.map((s: SampleEntry) => s.abw || 0).filter((val: number) => val > 0);
    const avgAbw = filledAbws.length > 0 ? filledAbws.reduce((a: number, b: number) => a + b, 0) / filledAbws.length : 0;

    // 3. Harvested Count (per Kg)
    const countPerKg = avgAbw > 0 ? 1000 / avgAbw : 0;

    // 4. Harvested Population
    const harvestedPopulation = Math.round(countPerKg * harvestedBiomassVal);

    // 5. Postharvest Balances
    let popBalance = 0;
    let biomassBalance = 0;
    
    if (data.harvestType === 'Complete') {
      popBalance = 0;
      biomassBalance = 0;
    } else {
      popBalance = Math.max(0, preharvestPop - harvestedPopulation);
      biomassBalance = Math.max(0, preharvestBiomass - harvestedBiomassVal);
    }

    // 6. Finances
    const totalDue = agreedPriceVal * harvestedBiomassVal;
    const balanceAmt = totalDue - receivedAmountVal;

    // Trigger update if anything changed
    const needsUpdate = 
      updated || 
      data.harvestedABW !== parseFloat(avgAbw.toFixed(2)) ||
      data.harvestedCountPerKg !== Math.round(countPerKg) ||
      data.harvestedPopulation !== harvestedPopulation ||
      (!data.isAfterPopulationManuallyEdited && data.populationAfterHarvest !== popBalance.toString()) ||
      (!data.isAfterBiomassManuallyEdited && data.biomassAfterHarvest !== parseFloat(biomassBalance.toFixed(2)).toString()) ||
      data.totalAmountDue !== parseFloat(totalDue.toFixed(2)) ||
      data.balanceAmount !== parseFloat(balanceAmt.toFixed(2));

    if (needsUpdate) {
      onDataChange({
        ...data,
        samples: computedSamples,
        harvestedABW: parseFloat(avgAbw.toFixed(2)),
        harvestedCountPerKg: Math.round(countPerKg),
        harvestedPopulation: harvestedPopulation,
        populationAfterHarvest: data.isAfterPopulationManuallyEdited ? data.populationAfterHarvest : popBalance.toString(),
        biomassAfterHarvest: data.isAfterBiomassManuallyEdited ? data.biomassAfterHarvest : parseFloat(biomassBalance.toFixed(2)).toString(),
        totalAmountDue: parseFloat(totalDue.toFixed(2)),
        balanceAmount: parseFloat(balanceAmt.toFixed(2))
      });
    }
  }, [
    data.samples,
    data.harvestedBiomass,
    data.harvestType,
    data.preharvestPopulationEstimate,
    data.preharvestEstimatedBiomass,
    data.agreedPrice,
    data.receivedAmount,
    data.isAfterPopulationManuallyEdited,
    data.isAfterBiomassManuallyEdited
  ]);

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  const handleSampleChange = (id: number, key: keyof SampleEntry, value: any) => {
    const updatedSamples = samples.map(s => s.id === id ? { ...s, [key]: value } : s);
    handleChange('samples', updatedSamples);
  };

  const addSample = () => {
    const nextId = samples.length > 0 ? Math.max(...samples.map(s => s.id)) + 1 : 1;
    handleChange('samples', [...samples, { id: nextId, weight: '', unit: 'gms', count: '', abw: 0 }]);
  };

  const removeSample = (id: number) => {
    if (samples.length === 1) {
      handleChange('samples', [{ id: 1, weight: '', unit: 'gms', count: '', abw: 0 }]);
      return;
    }
    handleChange('samples', samples.filter(s => s.id !== id));
  };



  return (
    <div className="space-y-6">
      
      {/* 1. Preharvest Stocking & Population info */}
      <div className="glass-card rounded-2xl p-5 border border-dashed border-primary/20 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-dashed border-primary/10">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Preharvest Stocking Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Stocking Date</span>
            <span className="text-slate-800 text-sm font-bold">{data.stockingDate || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">DOC</span>
            <span className="text-slate-800 text-sm font-bold">{data.doc !== undefined ? `${data.doc} days` : '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Stocking Population</span>
            <span className="text-slate-800 text-sm font-bold">{(parseFloat(data.stockingPopulation) || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Preharvest Population Estimate</span>
            <span className="text-slate-800 text-sm font-bold">{(parseFloat(data.preharvestPopulationEstimate) || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Preharvest ABW</span>
            <span className="text-slate-800 text-sm font-bold">{data.averageBodyWeight ? `${data.averageBodyWeight} g` : '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Preharvest Estimated Biomass</span>
            <span className="text-slate-800 text-sm font-bold">{(parseFloat(data.preharvestEstimatedBiomass) || 0).toLocaleString()} Kg</span>
          </div>
        </div>
      </div>

      {/* 2. Weather & Harvest Type */}
      <div className="glass-card rounded-2xl p-5 border space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b">
          <CloudSun className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Parameters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Weather Report *</Label>
            <Select
              value={data.weatherReport || ''}
              onValueChange={val => handleChange('weatherReport', val)}
            >
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select weather condition" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {WEATHER_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt} className="rounded-lg">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Harvest Type *</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Complete', 'Partial'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange('harvestType', type)}
                  className={`h-11 rounded-xl font-bold text-xs uppercase transition-all flex items-center justify-center border ${
                    data.harvestType === type
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Harvest Details & ABW Sample Calculator */}
      <div className="glass-card rounded-2xl p-5 border space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Harvest Measurements</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Harvested - Actual Biomass in Kgs *</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={data.harvestedBiomass || ''}
            onChange={e => handleChange('harvestedBiomass', e.target.value)}
            placeholder="0.00"
            className="h-11 border-2 border-slate-300 rounded-xl"
          />
        </div>

        {/* Dynamic sample entries */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">ABW Sample Count / Weight Measurements *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSample}
              className="h-8 rounded-lg border-dashed text-xs font-bold flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/5 hover:border-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sample
            </Button>
          </div>

          <div className="space-y-3">
            {samples.map((s, idx) => (
              <div key={s.id} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-100 relative group animate-fade-in-up">
                <div className="absolute top-2 right-2 sm:static shrink-0">
                  <span className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    #{idx + 1}
                  </span>
                </div>
                
                <div className="flex-grow flex-1 w-full flex flex-col sm:flex-row gap-3">
                  <div className="space-y-1 flex-1 sm:flex-[1.3] min-w-[130px]">
                    <Label className="text-[10px] font-semibold text-slate-500 block">Sample Weight *</Label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={s.weight || ''}
                        onChange={e => handleSampleChange(s.id, 'weight', e.target.value)}
                        placeholder="0.00"
                        className="flex-grow flex-1 min-w-0 w-full h-9 border-none shadow-none focus-visible:ring-0 px-2"
                      />
                      <select
                        value={s.unit}
                        onChange={e => handleSampleChange(s.id, 'unit', e.target.value)}
                        className="h-9 border-none bg-slate-100 text-xs font-bold px-1.5 cursor-pointer focus:outline-none w-16 shrink-0"
                      >
                        <option value="gms">gms</option>
                        <option value="Kgs">Kgs</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 flex-1 min-w-[90px]">
                    <Label className="text-[10px] font-semibold text-slate-500 block">Number of Animals *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={s.count || ''}
                      onChange={e => handleSampleChange(s.id, 'count', e.target.value)}
                      placeholder="0"
                      className="h-9 border-slate-200 bg-white rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 flex-1 min-w-[90px]">
                    <Label className="text-[10px] font-semibold text-slate-500 block">Calculated ABW (gms)</Label>
                    <div className="h-9 px-3 bg-muted/20 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-800">
                      {s.abw > 0 ? `${s.abw.toFixed(3)} g` : '—'}
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSample(s.id)}
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculations summary box */}
        <div className="rounded-2xl border bg-primary/5 border-primary/10 p-5 space-y-3 animate-in zoom-in-95">
          <div className="flex items-center gap-1.5 pb-2 border-b border-primary/10">
            <Info className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-black uppercase text-primary tracking-wider">Calculated Totals</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Harvested ABW (Average)</span>
              <span className="text-xl font-black text-primary">{data.harvestedABW ? `${data.harvestedABW} g` : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Harvested Count (per Kg)</span>
              <span className="text-xl font-black text-primary">{data.harvestedCountPerKg ? `${data.harvestedCountPerKg.toLocaleString()}` : '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Harvested - Population (Auto)</span>
              <span className="text-2xl font-black text-primary">{(data.harvestedPopulation || 0).toLocaleString()} animals</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Post-Harvest Estimates (Partial harvest only) */}
      {data.harvestType === 'Partial' && (
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 space-y-4 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2 pb-2 border-b border-amber-500/10">
            <Activity className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Postharvest Estimate Balances</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-slate-700">Population Balance Estimate *</Label>
                {data.isAfterPopulationManuallyEdited && (
                  <span className="text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Manual</span>
                )}
              </div>
              <Input
                type="number"
                value={data.populationAfterHarvest || ''}
                onChange={e => {
                  onDataChange({
                    ...data,
                    populationAfterHarvest: e.target.value,
                    isAfterPopulationManuallyEdited: true
                  });
                }}
                className="h-11 rounded-xl bg-white border-slate-200 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-slate-700">Biomass Balance Estimate (Kg) *</Label>
                {data.isAfterBiomassManuallyEdited && (
                  <span className="text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Manual</span>
                )}
              </div>
              <Input
                type="number"
                step="any"
                value={data.biomassAfterHarvest || ''}
                onChange={e => {
                  onDataChange({
                    ...data,
                    biomassAfterHarvest: e.target.value,
                    isAfterBiomassManuallyEdited: true
                  });
                }}
                className="h-11 rounded-xl bg-white border-slate-200 font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Buyer & Payment Details */}
      <div className="glass-card rounded-2xl p-5 border space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Sale info & Payment</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Buyer Name *</Label>
            <Input
              type="text"
              value={data.buyerName || ''}
              onChange={e => handleChange('buyerName', e.target.value)}
              placeholder="Enter buyer's full name"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Buyer Contact Details (10-Digit Mobile) *</Label>
            <Input
              type="text"
              value={data.buyerContact || ''}
              onChange={e => {
                const numericVal = e.target.value.replace(/\D/g, '');
                handleChange('buyerContact', numericVal.slice(0, 10));
              }}
              placeholder="Enter 10-digit mobile number"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Agreed Price/Kg (₹) *</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.agreedPrice || ''}
              onChange={e => handleChange('agreedPrice', e.target.value)}
              placeholder="0.00"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Received Amount (₹) *</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.receivedAmount || ''}
              onChange={e => handleChange('receivedAmount', e.target.value)}
              placeholder="0.00"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Financial summary box */}
        <div className="rounded-2xl border bg-emerald-500/5 border-emerald-500/10 p-5 space-y-3 animate-in zoom-in-95">
          <div className="flex items-center gap-1.5 pb-2 border-b border-emerald-500/10">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider">Financial Summary</h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Total Amount Due</span>
              <span className="text-lg font-black text-slate-800">₹{(data.totalAmountDue || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Received Amount</span>
              <span className="text-lg font-black text-emerald-600">₹{(receivedAmountVal || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Balance Amount</span>
              <span className={`text-lg font-black ${ (data.balanceAmount || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{(data.balanceAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Photo & Comments Card */}
      <div className="glass-card rounded-2xl p-5 border space-y-5">
        {!isPlanningMode && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Activity Photo (Optional)</Label>
            <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange || (() => {})} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."}
            rows={3}
            className="rounded-xl resize-none border-slate-200"
          />
        </div>
      </div>

    </div>
  );
};

export default HarvestForm;
