import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RatingScale from './RatingScale';
import ImageUpload from './ImageUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
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
  selectionScope = 'single'
}: StockingFormProps) => {
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>(data.animalRatings || {});
  const [stockingWaterData, setStockingWaterData] = useState<Record<string, string>>(data.stockingWaterData || {});
  const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);
  const [stockingStep, setStockingStep] = useState<1 | 2>(1); // For Maturation two-step flow

  const handleChange = (field: string, value: any) => {
    onDataChange((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'stockingId') {
      setIsIdManuallyEdited(true);
    }
  };

  // Generate Stocking ID: BS#_HN#_YYMMDD
  const generateStockingId = (bs: string, hn: string) => {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const yymmdd = `${yy}${mm}${dd}`;

    const bsPrefix = bs ? bs.replace(/\s+/g, '').toUpperCase() : 'BS';
    const hnPrefix = hn ? hn.replace(/\s+/g, '').toUpperCase() : 'HN';

    return `${bsPrefix}_${hnPrefix}_${yymmdd}`;
  };

  // Auto-update ID when dependencies change
  useEffect(() => {
    if (!isIdManuallyEdited) {
      const newId = generateStockingId(data.broodstockSource || '', data.hatcheryName || '');
      if (data.stockingId !== newId) {
        onDataChange((prev: any) => ({ ...prev, stockingId: newId }));
      }
    }
  }, [data.broodstockSource, data.hatcheryName, isIdManuallyEdited, onDataChange]);

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
              <div className="flex items-center gap-2 py-2">
                <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${stockingStep >= 1 ? 'bg-blue-600' : 'bg-muted'}`} />
                <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${stockingStep >= 2 ? 'bg-blue-600' : 'bg-muted'}`} />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground -mt-1 mb-2">
                <span className={stockingStep === 1 ? 'text-blue-600' : ''}>Step 1: Received Broodstock</span>
                <span className={stockingStep === 2 ? 'text-blue-600' : ''}>Step 2: Tank Allocation</span>
              </div>

              {/* STEP 1: Received Broodstock (Fields 6-10) */}
              {stockingStep === 1 && (
                <>
                  {/* Population & Losses Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Row 6: TOTAL BS Received */}
                    <div className="glass-card bg-emerald-50/30 border-emerald-100/50 p-4 rounded-2xl space-y-3">
                      <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.1em]">6) TOTAL BS Received / Booked *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-emerald-600/70 uppercase">Male (M)</Label>
                          <Input 
                            type="number" value={data.totalMalesReceived || ''} 
                            onChange={e => handleChange('totalMalesReceived', e.target.value)}
                            className="h-10 border-emerald-200/50 focus:ring-emerald-500" placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-emerald-600/70 uppercase">Female (F)</Label>
                          <Input 
                            type="number" value={data.totalFemalesReceived || ''} 
                            onChange={e => handleChange('totalFemalesReceived', e.target.value)}
                            className="h-10 border-emerald-200/50 focus:ring-emerald-500" placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 7: Air Transport Loss */}
                    <div className="glass-card bg-red-50/30 border-red-100/50 p-4 rounded-2xl space-y-3">
                      <Label className="text-[10px] font-black text-red-700 uppercase tracking-[0.1em]">7) BS Animals lost in Air transport</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-red-600/70 uppercase">Male (M)</Label>
                          <Input 
                            type="number" value={data.airLossM || ''} 
                            onChange={e => handleChange('airLossM', e.target.value)}
                            className="h-10 border-red-200/50 focus:ring-red-500" placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-red-600/70 uppercase">Female (F)</Label>
                          <Input 
                            type="number" value={data.airLossF || ''} 
                            onChange={e => handleChange('airLossF', e.target.value)}
                            className="h-10 border-red-200/50 focus:ring-red-500" placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 8: AQF Loss */}
                    <div className="glass-card bg-orange-50/30 border-orange-100/50 p-4 rounded-2xl space-y-3">
                      <Label className="text-[10px] font-black text-orange-700 uppercase tracking-[0.1em]">8) BS Animals lost in AQF</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-orange-600/70 uppercase">Male (M)</Label>
                          <Input 
                            type="number" value={data.aqfLossM || ''} 
                            onChange={e => handleChange('aqfLossM', e.target.value)}
                            className="h-10 border-orange-200/50 focus:ring-orange-500" placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-orange-600/70 uppercase">Female (F)</Label>
                          <Input 
                            type="number" value={data.aqfLossF || ''} 
                            onChange={e => handleChange('aqfLossF', e.target.value)}
                            className="h-10 border-orange-200/50 focus:ring-orange-500" placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 9: Transport to Hatchery Loss */}
                    <div className="glass-card bg-amber-50/30 border-amber-100/50 p-4 rounded-2xl space-y-3">
                      <Label className="text-[10px] font-black text-amber-700 uppercase tracking-[0.1em]">9) BS Animals lost in Transit to Hatchery</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-amber-600/70 uppercase">Male (M)</Label>
                          <Input 
                            type="number" value={data.hatcheryLossM || ''} 
                            onChange={e => handleChange('hatcheryLossM', e.target.value)}
                            className="h-10 border-amber-200/50 focus:ring-amber-500" placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-amber-600/70 uppercase">Female (F)</Label>
                          <Input 
                            type="number" value={data.hatcheryLossF || ''} 
                            onChange={e => handleChange('hatcheryLossF', e.target.value)}
                            className="h-10 border-amber-200/50 focus:ring-amber-500" placeholder="0"
                          />
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
                      <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 space-y-3 border-none">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">10) Remaining Stocking Population</Label>
                          <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">LIVE CALCULATION</div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center border-r border-white/20">
                            <p className="text-3xl font-black">{remM}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Males (M)</p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-black">{remF}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Females (F)</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Continue to Step 2 Button */}
                  <Button
                    type="button"
                    onClick={() => setStockingStep(2)}
                    className="w-full h-12 rounded-xl font-bold text-base ocean-gradient border-none shadow-lg shadow-primary/20 mt-2"
                    disabled={!data.totalMalesReceived && !data.totalFemalesReceived}
                  >
                    Continue to Tank Allocation →
                  </Button>
                </>
              )}

              {/* STEP 2: Tank Allocation */}
              {stockingStep === 2 && (
                <>
                  {/* Back Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStockingStep(1)}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground -mt-2 mb-2"
                  >
                    ← Back to Broodstock Details
                  </Button>

                  {/* Remaining Population Summary (compact) */}
                  {(() => {
                    const remM = (Number(data.totalMalesReceived) || 0) - (Number(data.airLossM) || 0) - (Number(data.aqfLossM) || 0) - (Number(data.hatcheryLossM) || 0);
                    const remF = (Number(data.totalFemalesReceived) || 0) - (Number(data.airLossF) || 0) - (Number(data.aqfLossF) || 0) - (Number(data.hatcheryLossF) || 0);
                    return (
                      <div className="p-3 rounded-xl bg-blue-600 text-white flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Available BS</span>
                        <div className="flex gap-4 text-sm font-black">
                          <span>♂ {remM}</span>
                          <span>♀ {remF}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Row 11: Select TANKS Allocation */}
                  {(selectionScope === 'all' || selectionScope === 'custom' || selectedTanks.length > 0) && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">11) Select TANKS & Allocation</Label>
                        <div className="text-[10px] font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase">
                          {selectedTanks.length} Tanks Selected
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Group tanks by gender for easier allocation */}
                        {(() => {
                          const maleTanks = selectedTanks.filter((t: any) => t.gender === 'MALE');
                          const femaleTanks = selectedTanks.filter((t: any) => t.gender === 'FEMALE');
                          const untaggedTanks = selectedTanks.filter((t: any) => !t.gender);
                          
                          const renderTankRow = (tank: any) => (
                            <div key={tank.id} className="flex items-center gap-4 bg-muted/10 p-4 rounded-2xl border hover:border-primary/30 transition-all group">
                              <div className="flex-1">
                                <p className="text-sm font-bold text-foreground">
                                  {tank.name}
                                  {tank.gender && (
                                    <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                      tank.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                    }`}>{tank.gender === 'MALE' ? '♂' : '♀'}</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex gap-2 items-center">
                                {/* Show M input only for MALE or untagged tanks */}
                                {(tank.gender === 'MALE' || !tank.gender) && (
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
                                      className="w-20 h-11 text-center font-bold bg-background pr-2"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-400 opacity-70 pointer-events-none">M</span>
                                  </div>
                                )}
                                {/* Show F input only for FEMALE or untagged tanks */}
                                {(tank.gender === 'FEMALE' || !tank.gender) && (
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
                                      className="w-20 h-11 text-center font-bold bg-background pr-2"
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-pink-400 opacity-70 pointer-events-none">F</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                          
                          return (
                            <>
                              {maleTanks.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">♂ Male Tanks ({maleTanks.length})</p>
                                  {maleTanks.map(renderTankRow)}
                                </div>
                              )}
                              {femaleTanks.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider flex items-center gap-1">♀ Female Tanks ({femaleTanks.length})</p>
                                  {femaleTanks.map(renderTankRow)}
                                </div>
                              )}
                              {untaggedTanks.length > 0 && (
                                <div className="space-y-2">
                                  {(maleTanks.length > 0 || femaleTanks.length > 0) && (
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Other Tanks ({untaggedTanks.length})</p>
                                  )}
                                  {untaggedTanks.map(renderTankRow)}
                                </div>
                              )}
                            </>
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
                          <div className={`p-3 rounded-xl border text-center transition-all duration-500 ${isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest">
                              {isValid ? '✅ Allocation Balanced' : '⚠️ Allocation Mismatch'}
                            </p>
                            <p className="text-[9px] font-bold opacity-70">
                              Males: {String(allocatedM)} / {String(remM)} | Females: {String(allocatedF)} / {String(remF)}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
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
              className="h-11"
            />
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
              className="h-11"
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
              className="h-11"
            />
          </div>
        </>
      )}

      {isPlanningMode === false && (activeFarmCategory !== 'MATURATION' || stockingStep === 2) && (
        <div className="space-y-4 pt-2 border-t border-dashed">
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex justify-between items-center">
            Animal Condition Quality
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
            Water Condition Quality
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
