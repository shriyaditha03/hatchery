import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import RatingScale from '@/components/RatingScale';
import ImageUpload from '@/components/ImageUpload';

const ARTEMIA_STAGES = [
  'Nauplii 1', 'Nauplii 2', 'Meta-Nauplii', 'Instar I', 'Instar II', 'Instar III',
  'Juvenile', 'Sub-Adult', 'Adult',
];

const WEIGHT_UNITS = ['gms', 'kg'];
const VOLUME_UNITS = ['ml', 'L', 'gms', 'kg'];

const ARTEMIA_RATING_FIELDS = [
  { key: 'swimmingActivity', label: 'Swimming Activity', required: true },
  { key: 'homogenousStage', label: 'Homogenous Stage', required: true },
  { key: 'hepatopancreas', label: 'Hepatopancreas' },
  { key: 'intestinalContent', label: 'Intestinal Content' },
  { key: 'musculature', label: 'Musculature' },
  { key: 'deformities', label: 'Deformities' },
  { key: 'survival', label: 'Survival Rate', required: true },
];

interface ArtemiaFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  isPlanningMode?: boolean;
}

const ArtemiaForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false,
}: ArtemiaFormProps) => {
  const [phase, setPhase] = useState<'pre' | 'post'>(data.phase || 'pre');

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value, phase });
  };

  const handlePhaseChange = (p: 'pre' | 'post') => {
    setPhase(p);
    onDataChange({ ...data, phase: p });
  };

  // Ratings
  const ratings = data.ratings || {};
  const setRating = (key: string, val: number) => {
    onDataChange({ ...data, phase, ratings: { ...ratings, [key]: val } });
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-5 animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Artemia Details</h2>

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
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Tin / Can ID or Label</Label>
              <Input
                value={data.tinLabel || ''}
                onChange={e => handleChange('tinLabel', e.target.value)}
                placeholder="e.g. Batch A – Tin 3"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cyst Weight *</Label>
              <Input
                type="number"
                min="0"
                value={data.cystWeight || ''}
                onChange={e => handleChange('cystWeight', e.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={data.cystWeightUnit || 'gms'} onValueChange={v => handleChange('cystWeightUnit', v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEIGHT_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder="Any notes about the cyst batch..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* ── After Harvest ── */}
      {phase === 'post' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Stage of Artemia Harvest *</Label>
              <Select value={data.harvestStage || ''} onValueChange={v => handleChange('harvestStage', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {ARTEMIA_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cells Harvested *</Label>
              <Input
                type="number"
                min="0"
                value={data.cellsHarvested || ''}
                onChange={e => handleChange('cellsHarvested', e.target.value)}
                placeholder="Number of cells"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Harvest Weight *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={data.harvestWeight || ''}
                  onChange={e => handleChange('harvestWeight', e.target.value)}
                  placeholder="0"
                  className="h-11 flex-1"
                />
                <Select value={data.harvestWeightUnit || 'gms'} onValueChange={v => handleChange('harvestWeightUnit', v)}>
                  <SelectTrigger className="w-20 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOLUME_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Animal Quality Section */}
          {!isPlanningMode && (
            <>
              <div className="border-t border-dashed pt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Animal Quality</p>
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

                {/* Overall Score - always visible */}
                {(() => {
                  const values = ARTEMIA_RATING_FIELDS.map(f => ratings[f.key] || 0);
                  const filled = values.filter(v => v > 0);
                  const avg = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
                  return (
                    <div className="mt-2 rounded-xl border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Score</span>
                        <span className="text-lg font-black text-foreground">{avg.toFixed(1)} <span className="text-xs font-semibold text-muted-foreground">/ 10</span></span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{filled.length} of {ARTEMIA_RATING_FIELDS.length} parameters rated</p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Additional Observations</Label>
                <Input
                  value={data.additionalObservations || ''}
                  onChange={e => handleChange('additionalObservations', e.target.value)}
                  placeholder="Any other observations"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Activity Photo *</Label>
                <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Notes'}</Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder={isPlanningMode ? 'Add instructions for workers...' : 'Any harvest notes...'}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtemiaForm;
