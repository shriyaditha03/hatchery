import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RatingScale from '@/components/RatingScale';
import ImageUpload from '@/components/ImageUpload';
import { formatDate, getNowLocal } from '@/lib/date-utils';

const ARTEMIA_STAGES = [
  'Nauplii 1', 'Nauplii 2', 'Meta-Nauplii', 'Instar I', 'Instar II', 'Instar III',
  'Juvenile', 'Sub-Adult', 'Adult',
];

const ARTEMIA_RATING_FIELDS = [
  { key: 'swimmingActivity', label: 'Swimming Activity', required: true },
  { key: 'homogenousStage', label: 'Homogenous Stage', required: true },
  { key: 'hepatopancreas', label: 'Hepatopancreas' },
  { key: 'intestinalContent', label: 'Intestinal Content' },
  { key: 'musculature', label: 'Musculature' },
  { key: 'deformities', label: 'Deformities' },
  { key: 'survival', label: 'Survival Rate', required: true },
];

function generateArtemiaSampleId(): string {
  const datePart = formatDate(getNowLocal(), 'yyMMdd');
  return `S1_${datePart}`;
}

interface ArtemiaFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  isPlanningMode?: boolean;
  availablePreHarvestIds?: string[];
}

const ArtemiaForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false,
  availablePreHarvestIds = [],
}: ArtemiaFormProps) => {
  const [phase, setPhase] = useState<'pre' | 'post'>(data.phase || 'pre');

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value, phase });
  };

  const handlePhaseChange = (p: 'pre' | 'post') => {
    setPhase(p);
    // When switching to pre, auto-gen ID if missing
    const newData = { ...data, phase: p };
    if (p === 'pre' && !data.sampleId) {
      newData.sampleId = generateArtemiaSampleId();
    }
    onDataChange(newData);
  };

  // Initial ID generation for pre phase
  useEffect(() => {
    if (phase === 'pre' && !data.sampleId) {
      handleChange('sampleId', generateArtemiaSampleId());
    }
  }, [phase]);

  const ratings = data.ratings || {};
  const setRating = (key: string, val: number) => {
    onDataChange({ ...data, phase, ratings: { ...ratings, [key]: val } });
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Artemia Details</h2>
      </div>

      {/* Phase Toggle */}
      <div className="flex bg-muted/40 p-1 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => handlePhaseChange('pre')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${phase === 'pre' ? 'bg-white dark:bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          🪣 Before Harvest
        </button>
        <button
          type="button"
          onClick={() => handlePhaseChange('post')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${phase === 'post' ? 'bg-white dark:bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          🦐 After Harvest
        </button>
      </div>

      {/* ── Before Harvest ── */}
      {phase === 'pre' && (
        <div className="space-y-5 animate-fade-in-up">
          <div className={`grid grid-cols-1 ${isPlanningMode ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1">
                1. Number of Samples <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={data.numberOfSamples || ''}
                onChange={e => {
                  const num = parseInt(e.target.value) || 0;
                  const currentSamples = data.samples || [];
                  let newSamples = [...currentSamples];
                  const datePart = formatDate(getNowLocal(), 'yyMMdd');

                  if (num > newSamples.length) {
                    for (let i = newSamples.length; i < num; i++) {
                      newSamples.push({
                        sampleId: `S${i + 1}_${datePart}`,
                        quantity: data.commonQuantity || ''
                      });
                    }
                  } else {
                    newSamples = newSamples.slice(0, num);
                  }

                  onDataChange({ 
                    ...data, 
                    numberOfSamples: e.target.value,
                    samples: newSamples,
                    sampleId: newSamples[0]?.sampleId || '',
                    cystWeight: newSamples[0]?.quantity || ''
                  });
                }}
                placeholder="e.g. 3"
                className="h-11 rounded-xl border-primary/20 focus:border-primary"
              />
            </div>

            {isPlanningMode && (
              <div className="space-y-1.5 animate-in slide-in-from-right-2">
                <Label className="text-xs font-bold text-primary flex items-center gap-1">
                  2. Common Quantity (gms)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={data.commonQuantity || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const newSamples = (data.samples || []).map((s: any) => ({ ...s, quantity: val }));
                    onDataChange({ 
                      ...data, 
                      commonQuantity: val, 
                      samples: newSamples,
                      cystWeight: val // Sync for backward compatibility
                    });
                  }}
                  placeholder="Applies to all samples"
                  className="h-11 rounded-xl bg-primary/5 border-primary/30 border-2 font-bold focus:bg-background"
                />
              </div>
            )}
          </div>

          {!isPlanningMode && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Sample ID Reference</Label>
              <Input
                value={data.sampleId || ''}
                onChange={e => handleChange('sampleId', e.target.value.toUpperCase())}
                placeholder="S1_YYMMDD"
                className="h-11 rounded-xl"
              />
            </div>
          )}

          {/* Dynamic Sample Fields */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Sample Details</Label>
            {(data.samples || []).map((sample: any, index: number) => (
              <div key={index} className={`p-4 rounded-2xl border ${isPlanningMode ? 'bg-background border-border shadow-sm' : 'border-dashed border-primary/20 bg-primary/5'} space-y-4 transition-all`}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Sample {index + 1}</p>
                  {isPlanningMode && <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Auto-Generated</span>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sample ID</Label>
                    <Input
                      value={sample.sampleId || ''}
                      readOnly={isPlanningMode}
                      onChange={e => {
                        if (isPlanningMode) return;
                        const newSamples = [...(data.samples || [])];
                        newSamples[index].sampleId = e.target.value.toUpperCase();
                        onDataChange({ 
                          ...data, 
                          samples: newSamples,
                          sampleId: index === 0 ? e.target.value.toUpperCase() : data.sampleId
                        });
                      }}
                      placeholder="S1_YYMMDD"
                      className={`h-10 rounded-xl font-bold ${isPlanningMode ? 'bg-muted/30 border-none text-muted-foreground cursor-default' : 'text-primary bg-background border-primary/10'}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantity (gms)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={sample.quantity || ''}
                      onChange={e => {
                        const newSamples = [...(data.samples || [])];
                        newSamples[index].quantity = e.target.value;
                        onDataChange({ 
                          ...data, 
                          samples: newSamples,
                          cystWeight: index === 0 ? e.target.value : data.cystWeight
                        });
                      }}
                      placeholder="0.00"
                      className={`h-10 rounded-xl bg-background transition-all ${isPlanningMode && data.commonQuantity ? 'border-primary/40 ring-1 ring-primary/20' : 'border-primary/10'}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isPlanningMode ? 'General Instructions' : 'Notes'}
            </Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder={isPlanningMode ? 'Add instructions for workers...' : 'Any notes about the cyst batch...'}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
      )}


      {/* ── After Harvest ── */}
      {phase === 'post' && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1">
              1. Sample IDs (Select multiple) <span className="text-destructive">*</span>
            </Label>
            
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
              {availablePreHarvestIds.length > 0 ? (
                availablePreHarvestIds.map(id => {
                  const isSelected = (data.linkedSampleIds || []).includes(id);
                  return (
                    <div 
                      key={id}
                      onClick={() => {
                        const currentIds = data.linkedSampleIds || [];
                        const newIds = isSelected 
                          ? currentIds.filter((cid: string) => cid !== id)
                          : [...currentIds, id];
                        
                        // Sync backward compatibility format if only 1 is selected
                        const newData = { ...data, linkedSampleIds: newIds, linkedSampleId: newIds.length > 0 ? newIds[0] : '' };
                        onDataChange(newData);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-primary font-bold' 
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </div>
                      <span className="text-xs truncate">{id}</span>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full p-4 border border-dashed rounded-xl text-xs text-muted-foreground text-center">
                  No recent Before Harvest IDs found
                </div>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground italic pl-1 mt-1">Choose one or more IDs created in Before Harvest</p>
          </div>

          {!isPlanningMode && (
            <>
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs font-bold flex items-center gap-1">
                  2. Stage of Artemia <span className="text-destructive">*</span>
                </Label>
                <Select value={data.harvestStage || ''} onValueChange={v => handleChange('harvestStage', v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ARTEMIA_STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    3. Cells Harvested (in million) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={data.cellsHarvested || ''}
                    onChange={e => handleChange('cellsHarvested', e.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    4. Harvest in wt (gms) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={data.harvestWeight || ''}
                    onChange={e => handleChange('harvestWeight', e.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </>
          )}


          {/* Animal Quality Section */}
          {!isPlanningMode && (
            <div className="space-y-4 pt-4 border-t border-dashed">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Animal Quality</p>
              <div className="space-y-4">
                {ARTEMIA_RATING_FIELDS.map(f => (
                  <RatingScale
                    key={f.key}
                    label={f.label}
                    required={f.required}
                    value={ratings[f.key] || 0}
                    onChange={val => setRating(f.key, val)}
                  />
                ))}
              </div>

              {/* Overall Score */}
              {(() => {
                const values = ARTEMIA_RATING_FIELDS.map(f => ratings[f.key] || 0);
                const filled = values.filter(v => v > 0);
                const avg = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
                return (
                  <div className="mt-2 rounded-2xl border bg-primary/5 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Score</span>
                      <span className="text-2xl font-black text-primary">{avg.toFixed(1)} <span className="text-xs font-semibold text-muted-foreground">/ 10</span></span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{filled.length} of {ARTEMIA_RATING_FIELDS.length} parameters rated</p>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Activity Photo (Optional)</Label>
                <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              5. {isPlanningMode ? 'Instructions' : 'Notes'}
            </Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder={isPlanningMode ? 'Add instructions for workers...' : 'Any harvest notes...'}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtemiaForm;
