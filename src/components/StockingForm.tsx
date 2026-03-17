import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RatingScale from '@/components/RatingScale';
import ImageUpload from '@/components/ImageUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { ANIMAL_RATING_FIELDS, waterFields, WATER_QUALITY_RANGES } from '../pages/RecordActivity';

interface StockingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  isPlanningMode?: boolean;
}

const StockingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false
}: StockingFormProps) => {
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>(data.animalRatings || {});
  const [stockingWaterData, setStockingWaterData] = useState<Record<string, string>>(data.stockingWaterData || {});
  const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);

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

      {isPlanningMode === false && (
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

      {isPlanningMode === false && (
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



      {isPlanningMode === false && (
        <div className="space-y-1.5 pt-2 border-t border-dashed">
          <Label className="text-xs">Activity Photo *</Label>
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
