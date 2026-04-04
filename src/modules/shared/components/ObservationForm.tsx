import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RatingScale from './RatingScale';
import ImageUpload from './ImageUpload';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ANIMAL_RATING_FIELDS, waterFields, WATER_QUALITY_RANGES } from '@/modules/shared/constants/activity';
import { useState, useEffect } from 'react';

interface ObservationFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  isPlanningMode?: boolean;
  activeFarmCategory?: string;
  onGoToStocking?: () => void;
}

const ObservationForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false,
  activeFarmCategory = 'LRT',
  onGoToStocking
}: ObservationFormProps) => {
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>(data.animalRatings || {});
  const [observationWaterData, setObservationWaterData] = useState<Record<string, string>>(data.observationWaterData || {});
  const [basePopulationM, setBasePopulationM] = useState<number>(parseFloat(data.presentPopulationM || '0'));
  const [basePopulationF, setBasePopulationF] = useState<number>(parseFloat(data.presentPopulationF || '0'));

  // Sync internal state if data changes from outside (e.g. tank switch)
  useEffect(() => {
    setAnimalRatings(data.animalRatings || {});
    setObservationWaterData(data.observationWaterData || {});
    
    // When the stocking ID or tank changes, reset the base population
    const popM = parseFloat(data.presentPopulationM || '0');
    const popF = parseFloat(data.presentPopulationF || '0');
    setBasePopulationM(popM);
    setBasePopulationF(popF);
  }, [data.stockingId, data.tankId]);

  // Dynamic Mortality Adjustment for Maturation
  useEffect(() => {
    if (activeFarmCategory === 'MATURATION' && !isPlanningMode) {
      const mortM = parseFloat(data.mortalityM || '0');
      const mortF = parseFloat(data.mortalityF || '0');
      
      const newPresentM = Math.max(0, basePopulationM - mortM);
      const newPresentF = Math.max(0, basePopulationF - mortF);
      
      // Update the parent data if the calculated values differ from current
      if (newPresentM.toString() !== data.presentPopulationM || newPresentF.toString() !== data.presentPopulationF) {
        onDataChange({
          ...data,
          presentPopulationM: newPresentM.toString(),
          presentPopulationF: newPresentF.toString()
        });
      }
    }
  }, [data.mortalityM, data.mortalityF, basePopulationM, basePopulationF]);

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  const setRating = (key: string, value: number) => {
    setAnimalRatings(prev => ({ ...prev, [key]: value }));
  };

  // 1. Calculate Animal Quality Score
  const animalValues = ANIMAL_RATING_FIELDS.map(f => animalRatings[f.key] || 0);
  const animalFilledCount = animalValues.filter(v => v > 0).length;
  const animalAvg = animalFilledCount > 0 ? animalValues.reduce((a, b) => a + b, 0) / animalFilledCount : 0;

  // 2. Calculate Water Quality Compliance Score
  const waterValues = waterFields.map(field => {
    const valStr = String(observationWaterData[field] || '').trim();
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

  const waterFilledCount = waterValues.filter(v => v !== null).length;
  const waterAvg = waterFilledCount > 0 
    ? waterValues.filter(v => v !== null).reduce((a, b) => (a || 0) + (b || 0), 0) / waterFilledCount 
    : 0;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-5 animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Observation Details</h2>

      {/* Stocking Hint for all modules */}
      {!isPlanningMode && onGoToStocking && (!data.stockingId && !data.tankStockingNumber) && (
        <div className="mb-4 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full py-6 rounded-xl border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary text-primary transition-all flex flex-col gap-0.5 h-auto text-center cursor-pointer"
            onClick={onGoToStocking}
          >
            <span className="text-xs font-bold uppercase tracking-tight flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              No Stocking Record Found
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">Tap here to Record Stocking for this tank</span>
          </Button>
        </div>
      )}

      {/* 1. Read-only Stocking Stats - Only for LRT/Non-Maturation */}
      {activeFarmCategory !== 'MATURATION' && !isPlanningMode && data.stockingId && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl border border-dashed relative group">
            <div className="space-y-0.5 col-span-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Batch ID (Stocking ID)</p>
              <p className="text-sm font-black text-foreground">{data.stockingId || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Hatchery Source</p>
              <p className="text-sm font-black text-foreground capitalize truncate" title={data.broodstockSource}>{data.broodstockSource || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Hatchery / Section Name</p>
              <p className="text-sm font-black text-foreground capitalize truncate" title={data.hatcheryName}>{data.hatcheryName || '—'}</p>
            </div>
            <div className="space-y-0.5 border-t border-dashed border-muted-foreground/20 pt-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Tank Stocking No.</p>
              <p className="text-sm font-black text-foreground">{data.tankStockingNumber || '—'}</p>
            </div>
            <div className="space-y-0.5 text-right border-t border-dashed border-muted-foreground/20 pt-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Nauplii Stocked (M)</p>
              <p className="text-sm font-black text-foreground">{data.totalMales || data.totalFemales ? '—' : (data.naupliiStocked || data.naupliiStockedMillion || '—')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Present Population - Only visible during recording */}
      {!isPlanningMode && (
        <>
          {activeFarmCategory === 'MATURATION' ? (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-600/80 uppercase" htmlFor="pop-m">Present Population (M) *</Label>
                <div className="relative group/input">
                  <Input
                    id="pop-m"
                    type="number"
                    min="0"
                    value={data.presentPopulationM || ''}
                    onChange={e => handleChange('presentPopulationM', e.target.value)}
                    placeholder="0"
                    className="h-11 font-bold pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600/40 pointer-events-none">M</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-600/80 uppercase" htmlFor="pop-f">Present Population (F) *</Label>
                <div className="relative group/input">
                  <Input
                    id="pop-f"
                    type="number"
                    min="0"
                    value={data.presentPopulationF || ''}
                    onChange={e => handleChange('presentPopulationF', e.target.value)}
                    placeholder="0"
                    className="h-11 font-bold pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600/40 pointer-events-none">F</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-rose-600/80 uppercase" htmlFor="mort-m">Mortality (M)</Label>
                <div className="relative group/input">
                  <Input
                    id="mort-m"
                    type="number"
                    min="0"
                    value={data.mortalityM || ''}
                    onChange={e => handleChange('mortalityM', e.target.value)}
                    placeholder="0"
                    className="h-11 font-bold pl-8 border-rose-100"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-600/40 pointer-events-none">M</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-rose-600/80 uppercase" htmlFor="mort-f">Mortality (F)</Label>
                <div className="relative group/input">
                  <Input
                    id="mort-f"
                    type="number"
                    min="0"
                    value={data.mortalityF || ''}
                    onChange={e => handleChange('mortalityF', e.target.value)}
                    placeholder="0"
                    className="h-11 font-bold pl-8 border-rose-100"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-600/40 pointer-events-none">F</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 pt-4 border-t border-dashed">
              <Label className="text-xs" htmlFor="present-pop">Present Population in the Tank *</Label>
              <Input
                id="present-pop"
                type="number"
                min="0"
                value={data.presentPopulation || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 0) {
                    handleChange('presentPopulation', val);
                  }
                }}
                placeholder="0"
                className="h-11"
              />
            </div>
          )}
        </>
      )}


      {/* 5. Photos & Advanced Metrics for Maturation */}
      {!isPlanningMode && (
        <>
          {activeFarmCategory === 'MATURATION' && (
            <div className="space-y-4 pt-4 border-t border-dashed">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-2">Advanced Biological Metrics</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-amber-600/80 uppercase" htmlFor="moults">Number of Moults</Label>
                  <Input
                    id="moults"
                    type="number"
                    min="0"
                    value={data.moults || ''}
                    onChange={e => handleChange('moults', e.target.value)}
                    placeholder="0"
                    className="h-11 border-amber-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-amber-600/80 uppercase" htmlFor="avg-wt">Avg Animal Weight (g)</Label>
                  <Input
                    id="avg-wt"
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.avgWeight || ''}
                    onChange={e => handleChange('avgWeight', e.target.value)}
                    placeholder="0.00"
                    className="h-11 border-amber-100"
                  />
                </div>
              </div>

              {/* Auto Biomass Calculation */}
              {(() => {
                const popM = parseFloat(data.presentPopulationM || '0');
                const popF = parseFloat(data.presentPopulationF || '0');
                const avgWt = parseFloat(data.avgWeight || '0');
                const totalGrams = (popM + popF) * avgWt;
                const biomassKg = (totalGrams / 1000).toFixed(3);
                
                return (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex justify-between items-center group transition-all hover:bg-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary text-xs shrink-0">
                        KG
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-70 tracking-widest leading-none mb-1">Estimated Tank Biomass</p>
                        <p className="text-sm font-black text-primary uppercase">Calculated Automatically</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-black leading-none text-primary font-mono">{biomassKg}<span className="text-xs ml-1 font-bold opacity-70 uppercase">kg</span></p>
                       <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mt-1">{totalGrams.toLocaleString()} Total Grams</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex justify-between items-center">
              Animal Condition Quality
              {animalAvg > 0 && <span className="text-primary">{animalAvg.toFixed(1)} / 10</span>}
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
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{animalFilledCount} of {ANIMAL_RATING_FIELDS.length} parameters rated</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className={`text-xl font-black leading-none ${animalAvg > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{animalAvg.toFixed(1)}</p>
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
                        <span className="text-3xl font-black text-primary font-montserrat tracking-tight">{animalAvg.toFixed(1)}</span>
                        <span className="text-xs font-bold text-muted-foreground">/ 10</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(animalAvg / 10) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center italic">Calculated average of {animalFilledCount} parameters</p>
                  </div>
                </div>
                <DialogFooter className="p-4 bg-muted/30 border-t sticky bottom-0 z-10">
                   <DialogClose asChild>
                    <Button 
                      className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 ocean-gradient border-none"
                      onClick={() => {
                        onDataChange((prev: any) => ({
                          ...prev,
                          animalQualityScore: parseFloat(animalAvg.toFixed(1)),
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

          <div className="space-y-4 pt-4 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex justify-between items-center">
              Water Condition Quality
              {waterAvg > 0 && <span className="text-primary">{waterAvg.toFixed(1)} / 10</span>}
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
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{waterFilledCount} of {waterFields.length} parameters recorded</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className={`text-xl font-black leading-none ${waterAvg > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{waterAvg.toFixed(1)}</p>
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
                            value={observationWaterData[field] || ''}
                            onChange={e => setObservationWaterData(prev => ({ ...prev, [field]: e.target.value }))}
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
                        <span className="text-3xl font-black text-primary font-montserrat tracking-tight">{waterAvg.toFixed(1)}</span>
                        <span className="text-xs font-bold text-muted-foreground">/ 10</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(waterAvg / 10) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center italic">Compliance average of {waterFilledCount} parameters</p>
                  </div>
                </div>
                <DialogFooter className="p-4 bg-muted/30 border-t sticky bottom-0 z-10">
                   <DialogClose asChild>
                    <Button 
                      className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 ocean-gradient border-none"
                      onClick={() => {
                        onDataChange((prev: any) => ({
                          ...prev,
                          waterQualityScore: parseFloat(waterAvg.toFixed(1)),
                          observationWaterData: observationWaterData
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
        </>
      )}
  
      {/* Activity Photo */}
      {!isPlanningMode && (
        <div className="space-y-1.5">
          <Label className="text-xs">Activity Photo (Optional)</Label>
          <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
        </div>
      )}

      {/* Comments */}
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

export default ObservationForm;
