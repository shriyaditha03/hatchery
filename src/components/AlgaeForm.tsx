import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { formatDate, getNowLocal } from '@/lib/date-utils';
import { useEffect, useRef } from 'react';

const CONTAINER_SIZES = ['100ml', '250ml', '2ltr', '20ltr', '100ltr', '1ton', '12-15ton'];

const CELL_SIZE_OPTIONS = ['Small', 'Medium', 'Large'];
const CELL_SHAPE_OPTIONS = ['Normal', 'Irregular', 'Fragmented'];
const CELL_COLOUR_OPTIONS = ['Green', 'Yellow-Green', 'Brown', 'Off-colour'];
const CONTAMINATION_OPTIONS = ['None', 'Bacterial', 'Fungal', 'Other'];

interface AlgaeSample {
  id: string;
  sampleId: string;
  cellCountPerMl: string;
  cellSize: string;
  cellShape: string;
  cellColour: string;
  contamination: string;
  contaminationNotes: string;
  isManualId?: boolean;
}

function generateSampleId(index: number): string {
  const sNum = `S${index + 1}`;
  const datePart = formatDate(getNowLocal(), 'yyMMdd');
  return `${sNum}_${datePart}`;
}

function newSample(index: number): AlgaeSample {
  return {
    id: `s-${Date.now()}-${index}`,
    sampleId: generateSampleId(index),
    cellCountPerMl: '',
    cellSize: '',
    cellShape: '',
    cellColour: '',
    contamination: 'None',
    contaminationNotes: '',
    isManualId: false
  };
}

interface AlgaeFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  isPlanningMode?: boolean;
  availableSourceIds?: string[];
}

const AlgaeForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  isPlanningMode = false,
  availableSourceIds = [],
}: AlgaeFormProps) => {
  const algaeSpecies: string = data.algaeSpecies || '';
  const containerSize: string = data.containerSize || '';
  const samples: AlgaeSample[] = data.samples || [newSample(0)];
  
  const inoculumSourceId: string = data.inoculumSourceId || '';
  const inoculumQuantity: string = data.inoculumQuantity || '';
  const inoculumUnit: string = data.inoculumUnit || 'ml';
  const age: string = data.age || '';



  const handleFieldChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  const handleSampleCountChange = (countStr: string) => {
    const count = parseInt(countStr) || 1;
    const safeCount = Math.max(1, Math.min(20, count));
    
    let newSamples = [...samples];
    if (safeCount > samples.length) {
      for (let i = samples.length; i < safeCount; i++) {
        newSamples.push(newSample(i));
      }
    } else if (safeCount < samples.length) {
      newSamples = newSamples.slice(0, safeCount);
    }
    onDataChange({ ...data, samples: newSamples });
  };

  const handleSampleChange = (idx: number, field: keyof AlgaeSample, value: any) => {
    const updated = samples.map((s, i) => {
      if (i === idx) {
        const up = { ...s, [field]: value };
        if (field === 'sampleId') up.isManualId = true;
        return up;
      }
      return s;
    });
    onDataChange({ ...data, samples: updated });
  };

  const removeSample = (idx: number) => {
    if (samples.length === 1) return;
    const updated = samples.filter((_, i) => i !== idx);
    onDataChange({ ...data, samples: updated });
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Algae Details</h2>
      </div>

      <div className="space-y-4">
        {/* Algae Species */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            Algae Species <span className="text-destructive">*</span>
          </Label>
          <Input 
            value={algaeSpecies}
            onChange={(e) => handleFieldChange('algaeSpecies', e.target.value)}
            placeholder="e.g. Chaetoceros"
            className="h-11 rounded-xl"
          />
        </div>

        {/* 1. Container Size */}
        <div className="space-y-2">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            1. Container Size * <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {CONTAINER_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handleFieldChange('containerSize', size)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  containerSize === size
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2 & 3. Samples Info */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5 min-w-[200px]">
          <Label className="text-xs font-bold">2. No. of Samples</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border hover:border-primary/50 shrink-0"
              onClick={() => handleSampleCountChange((samples.length - 1).toString())}
              disabled={samples.length <= 1}
            >
              -
            </Button>
            <Input
              type="number"
              min="1"
              max="20"
              value={samples.length}
              onChange={(e) => handleSampleCountChange(e.target.value)}
              className="h-11 rounded-xl bg-muted/30 font-bold border-border text-center text-lg"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border hover:border-primary/50 shrink-0"
              onClick={() => handleSampleCountChange((samples.length + 1).toString())}
              disabled={samples.length >= 20}
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Inoculum Source */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold">4. Inoculum / Source Sample Id</Label>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 mb-1">
             <button
               type="button"
               onClick={() => handleFieldChange('inoculumSourceId', 'Mother Culture')}
               className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                 inoculumSourceId === 'Mother Culture'
                   ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                   : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'
               }`}
             >
               🧪 Mother Culture
             </button>
             {availableSourceIds.slice(0, 5).map(id => (
               <button
                 key={id}
                 type="button"
                 onClick={() => handleFieldChange('inoculumSourceId', id)}
                 className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                   inoculumSourceId === id
                     ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                     : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'
                 }`}
               >
                 {id}
               </button>
             ))}
          </div>
          
          <div className="relative">
            <Select value={availableSourceIds.includes(inoculumSourceId) || inoculumSourceId === 'Mother Culture' ? inoculumSourceId : 'manual'} onValueChange={(val) => {
              if (val !== 'manual') handleFieldChange('inoculumSourceId', val);
            }}>
              <SelectTrigger className="h-11 rounded-xl bg-background border-border">
                <SelectValue placeholder="Select previous ID or type below" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                 <SelectItem value="manual" className="text-xs font-bold text-primary">Custom / Manual Entry</SelectItem>
                 <SelectItem value="Mother Culture" className="text-xs">🧪 Mother Culture</SelectItem>
                 {availableSourceIds.length > 0 ? (
                    availableSourceIds.map(id => (
                      <SelectItem key={id} value={id} className="text-xs">{id}</SelectItem>
                    ))
                 ) : (
                    <div className="p-2 text-[10px] text-muted-foreground text-center italic">No previous entries found</div>
                 )}
              </SelectContent>
            </Select>
          </div>

          {!availableSourceIds.includes(inoculumSourceId) && inoculumSourceId !== 'Mother Culture' && (
            <Input
              value={inoculumSourceId}
              onChange={e => handleFieldChange('inoculumSourceId', e.target.value)}
              placeholder="Enter Custom Source ID"
              className="h-11 rounded-xl animate-in fade-in slide-in-from-top-1"
            />
          )}
        </div>
      </div>

      {/* 5. Inoculum Quantity & Unit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold flex items-center gap-1">
            5. Inoculum Quantity * <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="any"
              value={inoculumQuantity}
              onChange={e => handleFieldChange('inoculumQuantity', e.target.value)}
              placeholder="0.00"
              className="h-11 rounded-xl flex-1"
            />
            <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
              {['ml', 'Lts'].map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleFieldChange('inoculumUnit', u)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${inoculumUnit === u ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. AGE */}
      <div className="space-y-2">
        <Label className="text-xs font-bold">6. AGE (Day 0 - Day 5)</Label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleFieldChange('age', d.toString())}
              className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${
                age === d.toString()
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              D-{d}
            </button>
          ))}
        </div>
      </div>

      {/* Samples Sections */}
      {!isPlanningMode && (
        <div className="space-y-4 pt-4 border-t border-dashed">
          <p className="text-xs font-black text-foreground uppercase tracking-wider">
            Sample Assessments
          </p>

          <div className="space-y-4">
            {samples.map((sample, idx) => (
              <div key={sample.id} className="relative overflow-hidden group border border-border/50 rounded-2xl p-4 space-y-4 bg-muted/5 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 flex-1">
                      <Label className="text-[9px] text-muted-foreground">Sample ID (Editable)</Label>
                      <Input
                        value={sample.sampleId}
                        onChange={e => handleSampleChange(idx, 'sampleId', e.target.value)}
                        className={`h-8 w-full text-[10px] font-black uppercase rounded-md ${sample.isManualId ? 'bg-orange-50 border-orange-200' : 'bg-primary/5 border-none'}`}
                      />
                    </div>
                  </div>
                  {samples.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSample(idx)}
                      className="text-destructive/50 hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-all self-end mb-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 7. Cell Count */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground flex justify-between">
                    7. CELL COUNT (IN MILLION PER ML) * <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sample.cellCountPerMl}
                    onChange={e => handleSampleChange(idx, 'cellCountPerMl', e.target.value)}
                    placeholder="0.00"
                    className="h-12 text-lg font-black rounded-xl border-primary/20 bg-primary/5 focus:bg-white transition-all pl-4"
                  />
                </div>

                {/* 8. Cell Quality */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">8. Cell Quality</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">Size</Label>
                      <Select value={sample.cellSize} onValueChange={v => handleSampleChange(idx, 'cellSize', v)}>
                        <SelectTrigger className="h-9 text-[10px] rounded-lg border-border/50"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {CELL_SIZE_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">Shape</Label>
                      <Select value={sample.cellShape} onValueChange={v => handleSampleChange(idx, 'cellShape', v)}>
                        <SelectTrigger className="h-9 text-[10px] rounded-lg border-border/50"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {CELL_SHAPE_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-muted-foreground uppercase">Colour</Label>
                      <Select value={sample.cellColour} onValueChange={v => handleSampleChange(idx, 'cellColour', v)}>
                        <SelectTrigger className="h-9 text-[10px] rounded-lg border-border/50"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {CELL_COLOUR_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 9. Contamination */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">9. Contamination (if any)</Label>
                  <div className="flex gap-2">
                    <Select value={sample.contamination} onValueChange={v => handleSampleChange(idx, 'contamination', v)}>
                      <SelectTrigger className="h-10 text-xs rounded-xl flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {CONTAMINATION_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {sample.contamination !== 'None' && (
                    <Input
                      value={sample.contaminationNotes}
                      onChange={e => handleSampleChange(idx, 'contaminationNotes', e.target.value)}
                      placeholder="Describe contamination..."
                      className="h-10 text-xs rounded-xl animate-fade-in"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Notes / Instructions */}
      <div className="space-y-2 pt-4 border-t border-dashed">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          10. {isPlanningMode ? 'Setup Instructions' : 'Notes'}
        </Label>
        <Textarea
          value={comments}
          onChange={e => onCommentsChange(e.target.value)}
          placeholder={isPlanningMode ? 'Add setup instructions for the worker...' : 'Any final observations...'}
          rows={3}
          className="rounded-xl resize-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
    </div>
  );
};

export default AlgaeForm;
