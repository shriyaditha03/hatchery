import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RatingScale from './RatingScale';
import ImageUpload from './ImageUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, Database, Layers, CheckCircle2 } from 'lucide-react';
import { ANIMAL_RATING_FIELDS, waterFields, WATER_QUALITY_RANGES } from '@/modules/shared/constants/activity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StockingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  isPlanningMode?: boolean;
  activeFarmCategory?: string;
  selectedTanks?: any[];
  selectionScope?: 'single' | 'all' | 'custom';
  farmId?: string;
  currentDate?: string;
}

const StockingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false,
  activeFarmCategory = 'LRT',
  selectedTanks = [],
  selectionScope = 'single',
  farmId,
  currentDate
}: StockingFormProps) => {
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>(data.animalRatings || {});
  const [stockingWaterData, setStockingWaterData] = useState<Record<string, string>>(data.stockingWaterData || {});
  const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);
  const [todayBatchCount, setTodayBatchCount] = useState(0);

  // Fetch count of batches already created today to determine the B# suffix
  useEffect(() => {
    if (activeFarmCategory === 'MATURATION' && farmId && currentDate) {
      fetchTodayBatchCount();
    }
  }, [farmId, currentDate, activeFarmCategory]);

  const fetchTodayBatchCount = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('data')
        .eq('farm_id', farmId)
        .eq('activity_type', 'Stocking');
      
      if (!error && logs) {
        // Convert YYYY-MM-DD to YYMMDD
        const parts = currentDate?.split('-') || [];
        if (parts.length < 3) return;
        const targetYYMMDD = `${parts[0].slice(-2)}${parts[1]}${parts[2]}`;

        const todaysStockings = logs.filter(l => {
          const sId = l.data?.stockingId || '';
          return sId.includes(`_${targetYYMMDD}_B`);
        });

        // Find max B#
        let maxB = 0;
        todaysStockings.forEach(l => {
          const sId = l.data?.stockingId || '';
          const match = sId.match(/_B(\d+)$/);
          if (match) {
             const bNum = parseInt(match[1]);
             if (bNum > maxB) maxB = bNum;
          }
        });
        setTodayBatchCount(maxB);
      }
    } catch (err) {
      console.error('Error fetching today batch count:', err);
    }
  };
  const [stockingStep, setStockingStep] = useState<1 | 2>(1); // For Maturation two-step flow

  const handleChange = (field: string, value: any) => {
    onDataChange((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'stockingId') {
      setIsIdManuallyEdited(true);
    }
  };

  // Generate Stocking ID: BS_BS-{SUPPLIER}_{VARIANT}_{YYMMDD}
  const generateStockingId = (supplier: string, variant: string) => {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const yymmdd = `${yy}${mm}${dd}`;

    const supplierPrefix = supplier ? supplier.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'SUPPLIER';
    const variantPrefix = variant ? variant.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'VARIANT';

    if (activeFarmCategory === 'MATURATION') {
        const batchSuffix = `_B${todayBatchCount + 1}`;
        return `BS_BS-${supplierPrefix}_${variantPrefix}_${yymmdd}${batchSuffix}`;
    }
    return `BS_${supplierPrefix}_HN_${yymmdd}`; // Fallback for LRT or others
  };

  // Auto-update ID when dependencies change
  useEffect(() => {
    if (!isIdManuallyEdited) {
      const newId = generateStockingId(data.broodstockSource || '', data.broodstockType || '');
      if (data.stockingId !== newId) {
        onDataChange((prev: any) => ({ ...prev, stockingId: newId }));
      }
    }
  }, [data.broodstockSource, data.broodstockType, isIdManuallyEdited, onDataChange]);

  const setRating = (key: string, value: number) => {
    setAnimalRatings(prev => ({ ...prev, [key]: value }));
  };

  // Calculate Average Animal Score
  const values = ANIMAL_RATING_FIELDS.map(f => animalRatings[f.key] || 0);
  const filled = values.filter(v => v > 0);
  const avg = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;

  // Calculate Water Quality Compliance Score
  const waterValues = waterFields.map(field => {
    const valStr = String(stockingWaterData[field] || '').trim();
    if (valStr === '') return null;
    const val = parseFloat(valStr);
    if (isNaN(val)) return 10;

    const range = WATER_QUALITY_RANGES[field] || '';
    let isOk = true;
    
    if (field === 'Vibrio Count') {
      isOk = val < 1000;
    } else if (field === 'Yellow Green Bacteria') {
      isOk = val < 100;
    } else if (range === '[Nil]') {
      isOk = val === 0;
    } else if (range.includes(' - ')) {
      const matches = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (matches) {
        isOk = val >= parseFloat(matches[1]) && val <= parseFloat(matches[2]);
      }
    } else if (range.includes('>')) {
      const matches = range.match(/>\s*(\d+\.?\d*)/);
      if (matches) isOk = val > parseFloat(matches[1]);
    } else if (range.includes('<')) {
      const matches = range.match(/<\s*(\d+\.?\d*)/);
      if (matches) isOk = val < parseFloat(matches[1]);
    }
    return isOk ? 10 : 0;
  });

  const waterFilled = waterValues.filter(v => v !== null).length;
  const waterDataAvg = waterFilled > 0 
    ? waterValues.filter(v => v !== null).reduce((a, b) => (a || 0) + (b || 0), 0) / waterFilled 
    : 0;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-5 animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stocking Details</h2>

      <div className="space-y-1.5 glass-card bg-primary/5 border-primary/20 p-3 rounded-xl mb-4">
        <div className="flex justify-between items-center mb-1">
          <Label className="text-xs font-bold text-primary">Stocking ID *</Label>
          {isIdManuallyEdited && (
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full">
              Manual Edit
            </span>
          )}
          {!isIdManuallyEdited && data.stockingId && (
            <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
              Auto-Generated
            </span>
          )}
        </div>
        <Input
          value={data.stockingId || ''}
          onChange={e => handleChange('stockingId', e.target.value)}
          placeholder="e.g. BS_HN_260317"
          className="h-11 font-mono font-bold text-base"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Format: BS#_HN#_YYMMDD (Broodstock_Hatchery_Date)</p>
      </div>

      {activeFarmCategory === 'MATURATION' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Shared fields for both modes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source of Broodstock (Supplier) *</Label>
            <Input
              value={data.broodstockSource || ''}
              onChange={e => handleChange('broodstockSource', e.target.value)}
              placeholder="Enter supplier name"
              className="h-12 bg-muted/20 border-muted focus:bg-background transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name of Hatchery *</Label>
            <Input
              value={data.hatcheryName || ''}
              onChange={e => handleChange('hatcheryName', e.target.value)}
              placeholder="Enter hatchery name"
              className="h-12 bg-muted/20 border-muted focus:bg-background transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">7) Brood Stock Type / Variant / Line *</Label>
            <Input
              value={data.broodstockType || ''}
              onChange={e => handleChange('broodstockType', e.target.value)}
              placeholder="e.g. Growth / Hardy / Line A"
              className="h-12 bg-muted/20 border-muted focus:bg-background transition-all"
            />
          </div>

          {isPlanningMode ? (
            /* Simplified fields for Instruction Mode */
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">8) Number of the Animals *</Label>
                <Input
                  type="number"
                  min="0"
                  value={data.tankStockingNumber || ''}
                  onChange={e => handleChange('tankStockingNumber', e.target.value)}
                  placeholder="0"
                  className="h-12 bg-muted/20 border-muted focus:bg-background transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">9) Sex of the animals *</Label>
                <select
                  value={data.sex || ''}
                  onChange={e => handleChange('sex', e.target.value)}
                  className="w-full h-12 rounded-lg border border-muted bg-muted/20 px-3 py-2 text-sm focus:bg-background focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </>
          ) : (
            /* Complex fields for Activity Mode — TWO-STEP FLOW */
            <>
              {/* Step Indicator */}
              <div className="relative pt-2 pb-6">
                <div className="flex items-center justify-between mb-2 px-2">
                    <div className="flex flex-col items-center gap-1.5 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shadow-sm ${stockingStep >= 1 ? 'bg-primary text-white scale-110' : 'bg-muted text-muted-foreground'}`}>1</div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${stockingStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>BS Details</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shadow-sm ${stockingStep >= 2 ? 'bg-primary text-white scale-110' : 'bg-muted text-muted-foreground'}`}>2</div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${stockingStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Allocation</span>
                    </div>
                </div>
                {/* Connecting Line */}
                <div className="absolute top-[21px] left-[15%] right-[15%] h-1 bg-muted rounded-full -z-0">
                    <div className={`h-full bg-primary transition-all duration-700 rounded-full ${stockingStep === 1 ? 'w-0' : 'w-full'}`} />
                </div>
              </div>

              {/* STEP 1: Received Broodstock (Fields 6-10) */}
              {stockingStep === 1 && (
                <>
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Row 6: TOTAL BS Received */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-emerald-200 transition-all">
                      <div className="bg-emerald-50/50 px-4 py-2 border-b border-emerald-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                        <Label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">6) TOTAL BS Received / Booked *</Label>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Male (M)</Label>
                          <Input 
                            type="number" value={data.totalMalesReceived || ''} 
                            onChange={e => handleChange('totalMalesReceived', e.target.value)}
                            className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-emerald-500/20 text-center font-bold text-lg" placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Female (F)</Label>
                          <Input 
                            type="number" value={data.totalFemalesReceived || ''} 
                            onChange={e => handleChange('totalFemalesReceived', e.target.value)}
                            className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-emerald-500/20 text-center font-bold text-lg" placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Losses Section - Combined into a subtle grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Row 7: Air Transport Loss */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between group hover:border-red-200 transition-all">
                           <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-red-600 transition-colors">7) Air transport loss</Label>
                                <p className="text-[9px] text-slate-400 italic font-medium">Animals lost during flight</p>
                           </div>
                           <div className="flex gap-2">
                                <div className="relative w-16">
                                    <Input 
                                        type="number" value={data.airLossM || ''} 
                                        onChange={e => handleChange('airLossM', e.target.value)}
                                        className="h-10 pr-4 text-right rounded-lg bg-slate-50 border-slate-200 text-xs font-bold" placeholder="0"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">M</span>
                                </div>
                                <div className="relative w-16">
                                    <Input 
                                        type="number" value={data.airLossF || ''} 
                                        onChange={e => handleChange('airLossF', e.target.value)}
                                        className="h-10 pr-4 text-right rounded-lg bg-slate-50 border-slate-200 text-xs font-bold" placeholder="0"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">F</span>
                                </div>
                           </div>
                        </div>

                        {/* Row 8: AQF Loss */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between group hover:border-orange-200 transition-all">
                           <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-orange-600 transition-colors">8) AQF losses</Label>
                                <p className="text-[9px] text-slate-400 italic font-medium">Animals lost in quarantine</p>
                           </div>
                           <div className="flex gap-2">
                                <div className="relative w-16">
                                    <Input 
                                        type="number" value={data.aqfLossM || ''} 
                                        onChange={e => handleChange('aqfLossM', e.target.value)}
                                        className="h-10 pr-4 text-right rounded-lg bg-slate-50 border-slate-200 text-xs font-bold" placeholder="0"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">M</span>
                                </div>
                                <div className="relative w-16">
                                    <Input 
                                        type="number" value={data.aqfLossF || ''} 
                                        onChange={e => handleChange('aqfLossF', e.target.value)}
                                        className="h-10 pr-4 text-right rounded-lg bg-slate-50 border-slate-200 text-xs font-bold" placeholder="0"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">F</span>
                                </div>
                           </div>
                        </div>

                        {/* Row 9: Transport to Hatchery Loss */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between group hover:border-amber-200 transition-all">
                           <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors">9) Transit to hatchery loss</Label>
                                <p className="text-[9px] text-slate-400 italic font-medium">Losses during final leg</p>
                           </div>
                           <div className="flex gap-2">
                                <div className="relative w-16">
                                    <Input 
                                        type="number" value={data.hatcheryLossM || ''} 
                                        onChange={e => handleChange('hatcheryLossM', e.target.value)}
                                        className="h-10 pr-4 text-right rounded-lg bg-slate-50 border-slate-200 text-xs font-bold" placeholder="0"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">M</span>
                                </div>
                                <div className="relative w-16">
                                    <Input 
                                        type="number" value={data.hatcheryLossF || ''} 
                                        onChange={e => handleChange('hatcheryLossF', e.target.value)}
                                        className="h-10 pr-4 text-right rounded-lg bg-slate-50 border-slate-200 text-xs font-bold" placeholder="0"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">F</span>
                                </div>
                           </div>
                        </div>
                    </div>

                    {/* Row 10: Remaining Stocking Population */}
                    {(() => {
                        const remM = (Number(data.totalMalesReceived) || 0) - (Number(data.airLossM) || 0) - (Number(data.aqfLossM) || 0) - (Number(data.hatcheryLossM) || 0);
                        const remF = (Number(data.totalFemalesReceived) || 0) - (Number(data.airLossF) || 0) - (Number(data.aqfLossF) || 0) - (Number(data.hatcheryLossF) || 0);
                        
                        // Sync with tankStockingNumber (Total) for compatibility
                        const total = remM + remF;
                        if (data.tankStockingNumber !== total.toString()) {
                            setTimeout(() => handleChange('tankStockingNumber', total.toString()), 0);
                        }

                        return (
                            <div className="p-6 rounded-[2rem] ocean-gradient text-white shadow-xl shadow-blue-200/50 space-y-4 border-none relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-4">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">10) Remaining Stocking Population</Label>
                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">Live Auto-Calculation</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="text-center border-r border-white/20">
                                            <p className="text-4xl font-black tracking-tighter">{remM}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">Males (M)</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-4xl font-black tracking-tighter">{remF}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">Females (F)</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Total Population:</span>
                                            <span className="text-xl font-black">{total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Continue to Step 2 Button */}
                    <Button
                        type="button"
                        onClick={() => setStockingStep(2)}
                        className="w-full h-14 rounded-2xl font-black text-base ocean-gradient border-none shadow-xl shadow-primary/30 mt-4 group relative overflow-hidden"
                        disabled={!data.totalMalesReceived && !data.totalFemalesReceived}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Continue to Tank Allocation 
                            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Button>
                  </div>
                </>
              )}

              {/* STEP 2: Tank Allocation */}
              {stockingStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Back Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStockingStep(1)}
                    className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 -mt-2 group transition-all"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Broodstock Details
                  </Button>

                  {/* Remaining Population Summary (compact) */}
                  {(() => {
                    const remM = (Number(data.totalMalesReceived) || 0) - (Number(data.airLossM) || 0) - (Number(data.aqfLossM) || 0) - (Number(data.hatcheryLossM) || 0);
                    const remF = (Number(data.totalFemalesReceived) || 0) - (Number(data.airLossF) || 0) - (Number(data.aqfLossF) || 0) - (Number(data.hatcheryLossF) || 0);
                    return (
                      <div className="p-4 rounded-2xl ocean-gradient text-white flex items-center justify-between shadow-lg shadow-blue-100">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-white/60" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Available for Allocation</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white/60">♂</span>
                            <span className="text-lg font-black">{remM}</span>
                          </div>
                          <div className="flex items-center gap-1.5 border-l border-white/20 pl-4">
                            <span className="text-[10px] font-bold text-white/60">♀</span>
                            <span className="text-lg font-black">{remF}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Row 11: Select TANKS Allocation */}
                  {(selectionScope === 'all' || selectionScope === 'custom' || selectedTanks.length > 0) && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">11) Select TANKS & Allocation</Label>
                        <div className="text-[9px] font-black bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 uppercase tracking-tighter shadow-inner">
                          {selectedTanks.length} Tanks Selected
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Group tanks by gender for easier allocation */}
                        {(() => {
                          const maleTanks = selectedTanks.filter((t: any) => t.gender === 'MALE');
                          const femaleTanks = selectedTanks.filter((t: any) => t.gender === 'FEMALE');
                          const untaggedTanks = selectedTanks.filter((t: any) => !t.gender);
                          
                          const renderTankRow = (tank: any) => (
                            <div key={tank.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group">
                              <div className="flex-1 flex flex-col gap-0.5">
                                <p className="text-sm font-black text-slate-800 tracking-tight">
                                  {tank.name}
                                </p>
                                {tank.gender && (
                                    <span className={`w-fit text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                      tank.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                                    }`}>{tank.gender === 'MALE' ? '♂ Male Tank' : '♀ Female Tank'}</span>
                                )}
                              </div>
                              <div className="flex gap-3 items-center">
                                {/* Show M input only for MALE or untagged tanks */}
                                {(tank.gender === 'MALE' || !tank.gender) && (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="relative group/input">
                                        <Input 
                                          type="number"
                                          placeholder="0"
                                          value={data.allocations?.[tank.id]?.m || ''}
                                          onChange={e => {
                                            const newAllocations = { ...(data.allocations || {}) };
                                            newAllocations[tank.id] = { ...newAllocations[tank.id], m: e.target.value };
                                            handleChange('allocations', newAllocations);
                                          }}
                                          className="w-16 h-10 text-center font-black bg-slate-50 border-slate-200 rounded-xl pr-1 text-blue-600 focus:bg-white focus:ring-blue-500/10"
                                        />
                                        <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">M</span>
                                    </div>
                                  </div>
                                )}
                                {/* Show F input only for FEMALE or untagged tanks */}
                                {(tank.gender === 'FEMALE' || !tank.gender) && (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="relative group/input">
                                        <Input 
                                          type="number"
                                          placeholder="0"
                                          value={data.allocations?.[tank.id]?.f || ''}
                                          onChange={e => {
                                            const newAllocations = { ...(data.allocations || {}) };
                                            newAllocations[tank.id] = { ...newAllocations[tank.id], f: e.target.value };
                                            handleChange('allocations', newAllocations);
                                          }}
                                          className="w-16 h-10 text-center font-black bg-slate-50 border-slate-200 rounded-xl pr-1 text-pink-600 focus:bg-white focus:ring-pink-500/10"
                                        />
                                        <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-pink-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">F</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                          
                          return (
                            <div className="space-y-6">
                              {maleTanks.length > 0 && (
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">♂ Male Tanks ({maleTanks.length})</p>
                                  </div>
                                  {maleTanks.map(renderTankRow)}
                                </div>
                              )}
                              {femaleTanks.length > 0 && (
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-3 bg-pink-500 rounded-full" />
                                    <p className="text-[10px] font-black text-pink-600 uppercase tracking-[0.15em]">♀ Female Tanks ({femaleTanks.length})</p>
                                  </div>
                                  {femaleTanks.map(renderTankRow)}
                                </div>
                              )}
                              {untaggedTanks.length > 0 && (
                                <div className="space-y-2.5">
                                   <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-3 bg-slate-400 rounded-full" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">General Tanks ({untaggedTanks.length})</p>
                                  </div>
                                  {untaggedTanks.map(renderTankRow)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Allocation Validation */}
                      {(() => {
                        const remM = (Number(data.totalMalesReceived) || 0) - (Number(data.airLossM) || 0) - (Number(data.aqfLossM) || 0) - (Number(data.hatcheryLossM) || 0);
                        const remF = (Number(data.totalFemalesReceived) || 0) - (Number(data.airLossF) || 0) - (Number(data.aqfLossF) || 0) - (Number(data.hatcheryLossF) || 0);
                        
                        const allocatedM = Object.values(data.allocations || {}).reduce((acc: number, curr: any) => acc + (Number(curr?.m) || 0), 0);
                        const allocatedF = Object.values(data.allocations || {}).reduce((acc: number, curr: any) => acc + (Number(curr?.f) || 0), 0);
                        
                        const isValid = allocatedM === remM && allocatedF === remF;
                        
                        return (
                          <div className={`p-4 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center gap-1 ${isValid ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800 animate-pulse'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                <p className="text-[10px] font-black uppercase tracking-[0.15em]">
                                  {isValid ? 'Allocation Balanced' : 'Allocation Mismatch'}
                                </p>
                            </div>
                            <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">
                              Males: {String(allocatedM)} / {String(remM)} | Females: {String(allocatedF)} / {String(remF)}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

  {activeFarmCategory !== 'MATURATION' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Source of Broodstock *</Label>
            <Input
              value={data.broodstockSource || ''}
              onChange={e => handleChange('broodstockSource', e.target.value)}
              placeholder="Enter broodstock source"
              className="h-11 border-2 border-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Name of the Hatchery or Section *</Label>
            <Input
              value={data.hatcheryName || ''}
              onChange={e => handleChange('hatcheryName', e.target.value)}
              placeholder="Enter hatchery / section name"
              className="h-11 border-2 border-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tank Stocking Number (Population) *</Label>
            <Input
              type="number"
              min="0"
              value={data.tankStockingNumber || ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || parseFloat(val) >= 0) {
                  handleChange('tankStockingNumber', val);
                }
              }}
              placeholder="0"
              className="h-11 border-2 border-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Number of Nauplii Stocked in Million *</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.naupliiStocked || ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || parseFloat(val) >= 0) {
                  handleChange('naupliiStocked', val);
                }
              }}
              placeholder="0"
              className="h-11 border-2 border-slate-500"
            />
          </div>
        </>
      )}

      {isPlanningMode === false && (activeFarmCategory !== 'MATURATION' || stockingStep === 2) && (
        <div className="space-y-4 pt-2 border-t border-dashed">
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex justify-between items-center">
            Animal Condition Quality *
            {avg > 0 && <span className="text-primary">{avg.toFixed(1)} / 10</span>}
          </Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-14 justify-between px-4 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Record Animal Quality</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{filled.length} of {ANIMAL_RATING_FIELDS.length} parameters rated</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={`text-xl font-black leading-none ${avg > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{avg.toFixed(1)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Avg. Score</p>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-[2rem] gap-0 border-none shadow-2xl">
              <DialogHeader className="p-6 pb-4 bg-muted/30 sticky top-0 z-10 backdrop-blur-md border-b">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Animal Quality Assessment
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto p-6 space-y-6 bg-background custom-scrollbar" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                 <div className="space-y-5">
                  {ANIMAL_RATING_FIELDS.map(f => (
                    <RatingScale
                      key={f.key}
                      label={f.label}
                      required={f.required}
                      value={animalRatings[f.key] || 0}
                      onChange={val => setRating(f.key, val)}
                    />
                  ))}
                </div>
  
                 {/* Result Card */}
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-montserrat">Current Quality Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary font-montserrat tracking-tight">{avg.toFixed(1)}</span>
                      <span className="text-xs font-bold text-muted-foreground">/ 10</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(avg / 10) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center italic">Calculated average of {filled.length} parameters</p>
                </div>
              </div>
              <DialogFooter className="p-4 bg-muted/30 border-t sticky bottom-0 z-10">
                 <DialogClose asChild>
                  <Button 
                    className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 ocean-gradient border-none"
                    onClick={() => {
                      onDataChange((prev: any) => ({
                        ...prev,
                        animalConditionScore: parseFloat(avg.toFixed(1)),
                        animalRatings: animalRatings
                      }));
                    }}
                  >
                    Save Quality Score
                  </Button>
                 </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isPlanningMode === false && (activeFarmCategory !== 'MATURATION' || stockingStep === 2) && (
        <div className="space-y-4 pt-4 border-t border-dashed">
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex justify-between items-center">
            Water Condition Quality *
            {waterDataAvg > 0 && <span className="text-primary">{waterDataAvg.toFixed(1)} / 10</span>}
          </Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-14 justify-between px-4 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Record Water Quality</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{waterFilled} of {waterFields.length} parameters recorded</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={`text-xl font-black leading-none ${waterDataAvg > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{waterDataAvg.toFixed(1)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Compliance Score</p>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-[2rem] gap-0 border-none shadow-2xl">
              <DialogHeader className="p-6 pb-4 bg-muted/30 sticky top-0 z-10 backdrop-blur-md border-b">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Water Quality Assessment
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto p-6 space-y-6 bg-background custom-scrollbar" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                 <div className="grid grid-cols-1 gap-4">
                  {waterFields.map(field => {
                    const rangeLabel = WATER_QUALITY_RANGES[field];
                    return (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-[10px] font-medium flex justify-between uppercase">
                          {field} *
                          {rangeLabel && <span className="text-[9px] text-muted-foreground">{rangeLabel}</span>}
                        </Label>
                        <Input
                          type={field === 'Other' ? 'text' : 'number'}
                          min="0"
                          step="any"
                          value={stockingWaterData[field] || ''}
                          onChange={e => setStockingWaterData(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder=""
                          className="h-10 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
  
                 {/* Compliance Card */}
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-montserrat">Compliance Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary font-montserrat tracking-tight">{waterDataAvg.toFixed(1)}</span>
                      <span className="text-xs font-bold text-muted-foreground">/ 10</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(waterDataAvg / 10) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center italic">Compliance average of {waterFilled} parameters</p>
                </div>
              </div>
              <DialogFooter className="p-4 bg-muted/30 border-t sticky bottom-0 z-10">
                 <DialogClose asChild>
                  <Button 
                    className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 ocean-gradient border-none"
                    onClick={() => {
                      onDataChange((prev: any) => ({
                        ...prev,
                        waterQualityScore: parseFloat(waterDataAvg.toFixed(1)),
                        stockingWaterData: stockingWaterData
                      }));
                    }}
                  >
                    Save Water Quality
                  </Button>
                 </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}



      {isPlanningMode === false && (activeFarmCategory !== 'MATURATION' || stockingStep === 2) && (
        <div className="space-y-1.5 pt-2 border-t border-dashed">
          <Label className="text-xs">Activity Photo (Optional)</Label>
          <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
        </div>
      )}
  
        <div className="space-y-1.5">
          <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."}
            rows={3}
          />
        </div>
    </div>
  );
};

export default StockingForm;
