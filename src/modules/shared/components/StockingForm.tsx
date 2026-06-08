import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AnimalQualityScore } from './AnimalQualityScore';
import ImageUpload from './ImageUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, Database, Layers, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { waterFields, WATER_QUALITY_RANGES } from '@/modules/shared/constants/activity';
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
  availableBatches?: string[];
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
  currentDate,
  availableBatches = []
}: StockingFormProps) => {
  const { user } = useAuth();

  const [stockingWaterData, setStockingWaterData] = useState<Record<string, string>>(data.stockingWaterData || {});
  const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);
  const [todayBatchCount, setTodayBatchCount] = useState(0);

  const [vannameiLines, setVannameiLines] = useState<string[]>(['SIS Hardy Line', 'SIS Growth Line', 'Syaqua', 'KonaBay', 'Others']);
  const [tigerLines, setTigerLines] = useState<string[]>(['Moana', 'Unibio', 'Others']);

  useEffect(() => {
    if (user?.hatchery_id) {
      supabase
        .from('genetic_line_types')
        .select('name, species, is_active')
        .eq('hatchery_id', user.hatchery_id)
        .eq('is_active', true)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const vLines = data
              .filter((d: any) => d.species === 'Litopenaeus Vannamei (Vannamei)')
              .map((d: any) => d.name);
            const tLines = data
              .filter((d: any) => d.species === 'Penaeus Monodon (Tiger)')
              .map((d: any) => d.name);

            if (vLines.length > 0) setVannameiLines(vLines);
            if (tLines.length > 0) setTigerLines(tLines);
          }
        });
    }
  }, [user]);

  // Recalculate today's batch count whenever available batches or date changes
  useEffect(() => {
    if (activeFarmCategory === 'MATURATION' && currentDate) {
      calculateTodayBatchCount();
    }
  }, [availableBatches, currentDate, activeFarmCategory]);

  const getYYMMDD = (dateStr: string) => {
    if (!dateStr) return '';
    
    // 1. Primary: Manual regex parsing to avoid timezone shifts
    const m1 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m1) return `${m1[1].slice(-2)}${m1[2]}${m1[3]}`;
    
    const m2 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m2) return `${m2[3].slice(-2)}${m2[1]}${m2[2]}`;

    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const yy = d.getFullYear().toString().slice(-2);
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${yy}${mm}${dd}`;
      }
    } catch (e) {}

    return '';
  };

  const calculateTodayBatchCount = () => {
    if (!currentDate) return;
    try {
      const yymmdd = getYYMMDD(currentDate);
      let maxB = 0;
      
      if (!availableBatches || availableBatches.length === 0) {
        setTodayBatchCount(0);
        return;
      }

      availableBatches.forEach(sId => {
        if (!sId || typeof sId !== 'string') return;
        
        if (sId.includes(yymmdd)) {
           const match = sId.match(/[ _-]B(\d+)/i) || sId.match(/B(\d+)/i);
           if (match) {
             const bNum = parseInt(match[1]);
             if (bNum > maxB) maxB = bNum;
           }
        }
      });
      
      setTodayBatchCount(maxB);
    } catch (err) {
      console.error('Error calculating today batch count:', err);
      setTodayBatchCount(0);
    }
  };

  const [stockingStep, setStockingStep] = useState<1 | 2>(1); // For Maturation two-step flow

  const handleChange = (field: string, value: any) => {
    onDataChange((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'stockingId') {
      setIsIdManuallyEdited(true);
    }
  };

  const cleanIdPart = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\bline\b/gi, '') // Remove word "line"
      .replace(/\([^)]*\)/g, '') // Remove parenthesis and their contents
      .replace(/[^a-zA-Z0-9]/g, '') // Keep only alphanumeric
      .trim();
  };

  const generateStockingId = () => {
    const yymmdd = getYYMMDD(currentDate || '');

    let baseId = '';
    if (activeFarmCategory === 'MATURATION') {
      const supplier = data.broodstockSource || '';
      const variant = data.broodstockType || '';
      const supplierPrefix = supplier ? supplier.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'SUPPLIER';
      const variantPrefix = variant ? variant.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'VARIANT';
      const batchSuffix = `_B${todayBatchCount + 1}`;
      return `BS_BS-${supplierPrefix}_${variantPrefix}_${yymmdd}${batchSuffix}`;
    }

    if (activeFarmCategory === 'FARMS' || activeFarmCategory === 'FARM') {
      const broodstockLine = cleanIdPart(data.seedGeneticLine || '');
      const hatchery = cleanIdPart(data.hatcheryName || '');
      baseId = `${broodstockLine || 'GENETICLINE'}_${hatchery || 'HATCHERY'}_${yymmdd}`;
    } else {
      // LRT / Others
      const broodstockLine = cleanIdPart(data.broodstockSource || '');
      const hatchery = cleanIdPart(data.hatcheryName || '');
      baseId = `${broodstockLine || 'BROODSTOCK'}_${hatchery || 'HATCHERY'}_${yymmdd}`;
    }

    // Append tank suffix dynamically in the UI
    let suffix = '';
    if (selectedTanks && selectedTanks.length === 1) {
      const tnkName = selectedTanks[0].name;
      const cleanTank = tnkName ? tnkName.replace(/[^a-zA-Z0-9]/g, '') : '';
      if (cleanTank) suffix = `_${cleanTank}`;
    } else if (selectedTanks && selectedTanks.length > 1) {
      suffix = `_[TANKS]`;
    }
    
    return `${baseId}${suffix}`;
  };

  const selectedTankIdsKey = selectedTanks ? selectedTanks.map(t => t.id).join(',') : '';

  // Auto-update ID when dependencies change
  useEffect(() => {
    if (!isIdManuallyEdited) {
      const newId = generateStockingId();
      if (data.stockingId !== newId) {
        onDataChange((prev: any) => ({ ...prev, stockingId: newId }));
      }
    }
  }, [
    data.broodstockSource,
    data.broodstockType,
    data.seedGeneticLine,
    data.hatcheryName,
    isIdManuallyEdited,
    onDataChange,
    todayBatchCount,
    currentDate,
    activeFarmCategory,
    selectedTankIdsKey
  ]);



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

      {(activeFarmCategory === 'MATURATION' || activeFarmCategory === 'LRT' || activeFarmCategory === 'FARMS' || activeFarmCategory === 'FARM') && (
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
            placeholder={activeFarmCategory === 'MATURATION' ? "e.g. BS_BS-SUPPLIER_VARIANT_260317_B1" : "e.g. SIShardy_Kgat_260607"}
            className="h-11 font-mono font-bold text-base"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {activeFarmCategory === 'MATURATION' 
              ? "Format: BS_BS-SUPPLIER_VARIANT_YYMMDD_B#" 
              : "Format: BroodstockLine_HatcheryName_YYMMDD"}
          </p>
        </div>
      )}

      {activeFarmCategory === 'MATURATION' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
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
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Broodstock Species *</Label>
            <Select
              value={data.broodstockSpecies || ''}
              onValueChange={val => {
                onDataChange((prev: any) => ({
                  ...prev,
                  broodstockSpecies: val,
                  broodstockType: '' // reset genetic line when species changes
                }));
              }}
            >
              <SelectTrigger className="h-12 bg-muted/20 border-muted focus:bg-background transition-all">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                <SelectItem value="Litopenaeus vannamei" className="rounded-lg italic">Litopenaeus vannamei</SelectItem>
                <SelectItem value="Penaeus monodon" className="rounded-lg italic">Penaeus monodon</SelectItem>
                <SelectItem value="Others" className="rounded-lg">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Genetic Lines *</Label>
            <Select
              value={data.broodstockType || ''}
              onValueChange={val => handleChange('broodstockType', val)}
              disabled={!data.broodstockSpecies}
            >
              <SelectTrigger className="h-12 bg-muted/20 border-muted focus:bg-background transition-all">
                <SelectValue placeholder={data.broodstockSpecies ? 'Select genetic line' : 'Select species first'} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {data.broodstockSpecies === 'Litopenaeus vannamei' ? (
                  <>
                    {vannameiLines.map(line => (
                      <SelectItem key={line} value={line} className="rounded-lg">{line}</SelectItem>
                    ))}
                  </>
                ) : data.broodstockSpecies === 'Penaeus monodon' ? (
                  <>
                    {tigerLines.map(line => (
                      <SelectItem key={line} value={line} className="rounded-lg">{line}</SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value="Others" className="rounded-lg">Others</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {isPlanningMode ? (
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
            <>
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
                <div className="absolute top-[21px] left-[15%] right-[15%] h-1 bg-muted rounded-full -z-0">
                    <div className={`h-full bg-primary transition-all duration-700 rounded-full ${stockingStep === 1 ? 'w-0' : 'w-full'}`} />
                </div>
              </div>

              {stockingStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
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

                    <div className="grid grid-cols-1 gap-4">
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

                    {(() => {
                        const remM = (Number(data.totalMalesReceived) || 0) - (Number(data.airLossM) || 0) - (Number(data.aqfLossM) || 0) - (Number(data.hatcheryLossM) || 0);
                        const remF = (Number(data.totalFemalesReceived) || 0) - (Number(data.airLossF) || 0) - (Number(data.aqfLossF) || 0) - (Number(data.hatcheryLossF) || 0);
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
              )}

              {stockingStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStockingStep(1)}
                    className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 -mt-2 group transition-all"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Broodstock Details
                  </Button>

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

                  {selectedTanks.length > 0 ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">11) Select TANKS & Allocation</Label>
                        <div className="text-[9px] font-black bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 uppercase tracking-tighter shadow-inner">
                          {selectedTanks.length} Tanks Selected
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {(() => {
                          const maleTanks = selectedTanks.filter((t: any) => t.gender === 'MALE');
                          const femaleTanks = selectedTanks.filter((t: any) => t.gender === 'FEMALE');
                          const untaggedTanks = selectedTanks.filter((t: any) => !t.gender);
                          
                          const renderTankRow = (tank: any) => (
                            <div key={tank.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group">
                              <div className="flex-1 flex flex-col gap-0.5">
                                <p className="text-sm font-black text-slate-800 tracking-tight">{tank.name}</p>
                                {tank.gender && (
                                    <span className={`w-fit text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                      tank.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                                    }`}>{tank.gender === 'MALE' ? '♂ Male Tank' : '♀ Female Tank'}</span>
                                )}
                              </div>
                              <div className="flex gap-3 items-center">
                                {(tank.gender === 'MALE' || !tank.gender) && (
                                  <div className="relative">
                                    <Input 
                                      type="number" value={data.allocations?.[tank.id]?.m || ''}
                                      onChange={e => {
                                        const newAllocations = { ...(data.allocations || {}) };
                                        newAllocations[tank.id] = { ...newAllocations[tank.id], m: e.target.value };
                                        handleChange('allocations', newAllocations);
                                      }}
                                      className="w-16 h-10 text-center font-black bg-slate-50 border-slate-200 rounded-xl pr-1 text-blue-600"
                                    />
                                    <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">M</span>
                                  </div>
                                )}
                                {(tank.gender === 'FEMALE' || !tank.gender) && (
                                  <div className="relative">
                                    <Input 
                                      type="number" value={data.allocations?.[tank.id]?.f || ''}
                                      onChange={e => {
                                        const newAllocations = { ...(data.allocations || {}) };
                                        newAllocations[tank.id] = { ...newAllocations[tank.id], f: e.target.value };
                                        handleChange('allocations', newAllocations);
                                      }}
                                      className="w-16 h-10 text-center font-black bg-slate-50 border-slate-200 rounded-xl pr-1 text-pink-600"
                                    />
                                    <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-pink-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">F</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                          
                          return (
                            <div className="space-y-6">
                              {maleTanks.length > 0 && (
                                <div className="space-y-2.5">
                                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] ml-2">♂ Male Tanks ({maleTanks.length})</p>
                                  {maleTanks.map(renderTankRow)}
                                </div>
                              )}
                              {femaleTanks.length > 0 && (
                                <div className="space-y-2.5">
                                  <p className="text-[10px] font-black text-pink-600 uppercase tracking-[0.15em] ml-2">♀ Female Tanks ({femaleTanks.length})</p>
                                  {femaleTanks.map(renderTankRow)}
                                </div>
                              )}
                              {untaggedTanks.length > 0 && (
                                <div className="space-y-2.5">
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-2">General Tanks ({untaggedTanks.length})</p>
                                  {untaggedTanks.map(renderTankRow)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {(() => {
                        const remM = (Number(data.totalMalesReceived) || 0) - (Number(data.airLossM) || 0) - (Number(data.aqfLossM) || 0) - (Number(data.hatcheryLossM) || 0);
                        const remF = (Number(data.totalFemalesReceived) || 0) - (Number(data.airLossF) || 0) - (Number(data.aqfLossF) || 0) - (Number(data.hatcheryLossF) || 0);
                        const allocatedM = Object.values(data.allocations || {}).reduce((acc: number, curr: any) => acc + (Number(curr?.m) || 0), 0);
                        const allocatedF = Object.values(data.allocations || {}).reduce((acc: number, curr: any) => acc + (Number(curr?.f) || 0), 0);
                        const isValid = allocatedM === remM && allocatedF === remF;
                        
                        return (
                          <div className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1 ${isValid ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800 animate-pulse'}`}>
                             <p className="text-[10px] font-black uppercase tracking-[0.15em]">
                               {isValid ? 'Allocation Balanced' : 'Allocation Mismatch'}
                             </p>
                             <p className="text-[9px] font-bold opacity-60">
                               M: {allocatedM}/{remM} | F: {allocatedF}/{remF}
                             </p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-2 border-amber-200 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in zoom-in-95 mt-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-amber-900 uppercase tracking-tight">No Tanks to Allocate</p>
                        <p className="text-[11px] text-amber-700/70 font-medium leading-relaxed max-w-[240px]">
                          There are no empty tanks available in the selected section. Please ensure tanks are cleared before stocking.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeFarmCategory !== 'MATURATION' && activeFarmCategory !== 'FARMS' && activeFarmCategory !== 'FARM' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Select Broodstock Species *</Label>
            <Select
              value={data.broodstockSpecies || ''}
              onValueChange={val => {
                onDataChange((prev: any) => ({
                  ...prev,
                  broodstockSpecies: val,
                  broodstockSource: '' // reset genetic line when species changes
                }));
              }}
            >
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                <SelectItem value="Litopenaeus vannamei" className="rounded-lg italic">Litopenaeus vannamei</SelectItem>
                <SelectItem value="Penaeus monodon" className="rounded-lg italic">Penaeus monodon</SelectItem>
                <SelectItem value="Others" className="rounded-lg">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Select Genetic Lines *</Label>
            <Select
              value={data.broodstockSource || ''}
              onValueChange={val => handleChange('broodstockSource', val)}
              disabled={!data.broodstockSpecies}
            >
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder={data.broodstockSpecies ? 'Select genetic line' : 'Select species first'} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {data.broodstockSpecies === 'Litopenaeus vannamei' ? (
                  <>
                    {vannameiLines.map(line => (
                      <SelectItem key={line} value={line} className="rounded-lg">{line}</SelectItem>
                    ))}
                  </>
                ) : data.broodstockSpecies === 'Penaeus monodon' ? (
                  <>
                    {tigerLines.map(line => (
                      <SelectItem key={line} value={line} className="rounded-lg">{line}</SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value="Others" className="rounded-lg">Others</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Name of the Hatchery or Section *</Label>
            <Input
              value={data.hatcheryName || ''}
              onChange={e => handleChange('hatcheryName', e.target.value)}
              placeholder="Enter hatchery / section name"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Number of Nauplii Stocked in Million *</Label>
            <Input
              type="number" min="0" step="any" value={data.naupliiStocked || ''}
              onChange={e => {
                const val = e.target.value;
                handleChange('naupliiStocked', val);
                // Auto-fill total stocking number (millions → individual count)
                const millions = parseFloat(val);
                handleChange('tankStockingNumber', isNaN(millions) ? '' : String(Math.round(millions * 1_000_000)));
              }}
              placeholder="e.g. 2"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Total Stocking Number (Population) *</Label>
              {data.naupliiStocked && (
                <span className="text-[10px] font-bold text-primary/70 bg-primary/8 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Auto-filled
                </span>
              )}
            </div>
            <Input
              type="number" min="0" value={data.tankStockingNumber || ''}
              onChange={e => handleChange('tankStockingNumber', e.target.value)}
              placeholder="0"
              className={`h-11 ${data.naupliiStocked ? 'bg-primary/5 border-primary/30 font-bold text-primary' : ''}`}
            />
            {data.naupliiStocked && (
              <p className="text-[10px] text-muted-foreground ml-1">
                = {parseFloat(data.naupliiStocked || '0').toLocaleString()} M × 1,000,000
              </p>
            )}
          </div>
        </>
      )}

      {/* ── FARMS Module – Stocking Fields ── */}
      {(activeFarmCategory === 'FARMS' || activeFarmCategory === 'FARM') && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">

          {/* 1. Seed Species */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seed Species *</Label>
            <Select
              value={data.seedSpecies || ''}
              onValueChange={val => {
                handleChange('seedSpecies', val);
                handleChange('seedGeneticLine', ''); // reset genetic line when species changes
              }}
            >
              <SelectTrigger className="h-11 border-muted-foreground/30 focus:border-primary/50">
                <SelectValue placeholder="Select seed species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Litopenaeus vannamei">Litopenaeus vannamei</SelectItem>
                <SelectItem value="Penaeus monodon">Penaeus monodon</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Seed Genetic Line – conditional on species */}
          {data.seedSpecies && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seed Genetic Line *</Label>
              <Select
                value={data.seedGeneticLine || ''}
                onValueChange={val => handleChange('seedGeneticLine', val)}
              >
                <SelectTrigger className="h-11 border-muted-foreground/30 focus:border-primary/50">
                  <SelectValue placeholder="Select genetic line" />
                </SelectTrigger>
                <SelectContent>
                  {data.seedSpecies === 'Litopenaeus vannamei' ? (
                    <>
                      {vannameiLines.map(line => (
                        <SelectItem key={line} value={line}>{line}</SelectItem>
                      ))}
                    </>
                  ) : data.seedSpecies === 'Penaeus monodon' ? (
                    <>
                      {tigerLines.map(line => (
                        <SelectItem key={line} value={line}>{line}</SelectItem>
                      ))}
                    </>
                  ) : (
                    <SelectItem value="Others">Others</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 3. Hatchery Name (Seed Source) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hatchery Name (Seed Source) *</Label>
            <Input
              value={data.hatcheryName || ''}
              onChange={e => handleChange('hatcheryName', e.target.value)}
              placeholder="Enter hatchery / seed source name"
              className="h-11"
            />
          </div>

          {/* 4. Seed Stage */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seed Stage *</Label>
            <Select
              value={data.seedStage || ''}
              onValueChange={val => handleChange('seedStage', val)}
            >
              <SelectTrigger className="h-11 border-muted-foreground/30 focus:border-primary/50">
                <SelectValue placeholder="Select seed stage (PL)" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => `PL-${i + 7}`).map(stage => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Stocking Number (Population) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stocking Number (Population) *</Label>
            <Input
              type="number" min="0"
              value={data.tankStockingNumber || ''}
              onChange={e => handleChange('tankStockingNumber', e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>

        </div>
      )}

      {(activeFarmCategory !== 'MATURATION' || stockingStep === 2) && (
        <div className="space-y-4 pt-2 border-t border-dashed">
          <AnimalQualityScore data={data} onDataChange={onDataChange} />
        </div>
      )}

      {(activeFarmCategory !== 'MATURATION' || stockingStep === 2) && (
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
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Record Water Quality</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{waterFilled} of {waterFields.length} parameters entered</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={`text-xl font-black leading-none ${waterDataAvg > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{waterDataAvg.toFixed(1)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Compliance</p>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-[2rem] gap-0 border-none shadow-2xl">
              <DialogHeader className="p-6 pb-4 bg-muted/30 sticky top-0 z-10 backdrop-blur-md border-b">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Water Quality Assessment
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto p-6 space-y-6 bg-background custom-scrollbar" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                <div className="grid grid-cols-1 gap-5">
                  {waterFields.map(field => (
                    <div key={field} className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{field}</Label>
                        <span className="text-[10px] font-bold text-primary/60">{WATER_QUALITY_RANGES[field] || ''}</span>
                      </div>
                      <Input
                        type="number" step="any"
                        value={stockingWaterData[field] || ''}
                        onChange={e => setStockingWaterData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="h-11 rounded-xl bg-muted/10 border-muted focus:bg-background"
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="p-4 bg-muted/30 border-t sticky bottom-0 z-10">
                 <DialogClose asChild>
                  <Button 
                    className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 ocean-gradient border-none"
                    onClick={() => {
                      onDataChange((prev: any) => ({
                        ...prev,
                        waterComplianceScore: parseFloat(waterDataAvg.toFixed(1)),
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

      <div className="space-y-4 pt-4 border-t border-dashed">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Media Attachment</h3>
        </div>
        <ImageUpload
          value={photoUrl}
          onChange={onPhotoUrlChange}
          folder="stocking"
        />
      </div>
    </div>
  );
};

export default StockingForm;
