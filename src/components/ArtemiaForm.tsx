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
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1">
              1. Sample ID * <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={data.sampleId || ''}
                onChange={e => handleChange('sampleId', e.target.value.toUpperCase())}
                placeholder="S1_YYMMDD"
                className="h-11 rounded-xl font-black text-primary bg-primary/5 border-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1">
              2. Weight (gms) * <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.cystWeight || ''}
              onChange={e => handleChange('cystWeight', e.target.value)}
              placeholder="0.00"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder="Any notes about the cyst batch..."
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
              1. Sample ID * <span className="text-destructive">*</span>
            </Label>
            <Select value={data.linkedSampleId || ''} onValueChange={v => handleChange('linkedSampleId', v)}>
              <SelectTrigger className="h-11 rounded-xl border-primary/20 bg-primary/5 font-black text-primary">
                <SelectValue placeholder="Choose from Before Harvest ID's" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availablePreHarvestIds.length > 0 ? (
                    availablePreHarvestIds.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)
                ) : (
                    <div className="p-2 text-xs text-muted-foreground text-center">No recent Pre-Harvest ID's found</div>
                )}
              </SelectContent>
            </Select>
            <p className="text-[9px] text-muted-foreground italic pl-1">Choose from ID created in Before Harvest</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1">
              2. Stage of Artemia * <span className="text-destructive">*</span>
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
                3. Cells Harvested (in million) * <span className="text-destructive">*</span>
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
                4. Harvest in wt (gms) * <span className="text-destructive">*</span>
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
                <Label className="text-xs font-bold">Activity Photo</Label>
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
