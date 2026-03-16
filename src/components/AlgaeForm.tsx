import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

const CONTAINER_SIZES = ['100ml', '250ml', '2ltr', '20ltr', '100ltr', '1ton', '12-15ton'];

const CELL_SIZE_OPTIONS = ['Small', 'Medium', 'Large'];
const CELL_SHAPE_OPTIONS = ['Normal', 'Irregular', 'Fragmented'];
const CELL_COLOUR_OPTIONS = ['Green', 'Yellow-Green', 'Brown', 'Off-colour'];
const CONTAMINATION_OPTIONS = ['None', 'Bacterial', 'Fungal', 'Other'];

interface AlgaeSample {
  id: string;
  cellCountPerMl: string;
  cellSize: string;
  cellShape: string;
  cellColour: string;
  contamination: string;
  contaminationNotes: string;
}

function newSample(index: number): AlgaeSample {
  return {
    id: `s-${Date.now()}-${index}`,
    cellCountPerMl: '',
    cellSize: '',
    cellShape: '',
    cellColour: '',
    contamination: 'None',
    contaminationNotes: '',
  };
}

interface AlgaeFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  isPlanningMode?: boolean;
}

const AlgaeForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  isPlanningMode = false,
}: AlgaeFormProps) => {
  const containerSize: string = data.containerSize || '';
  const samples: AlgaeSample[] = data.samples || [newSample(0)];

  const handleFieldChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  const handleSampleChange = (idx: number, field: keyof AlgaeSample, value: string) => {
    const updated = samples.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onDataChange({ ...data, samples: updated });
  };

  const addSample = () => {
    onDataChange({ ...data, samples: [...samples, newSample(samples.length)] });
  };

  const removeSample = (idx: number) => {
    if (samples.length === 1) return;
    onDataChange({ ...data, samples: samples.filter((_, i) => i !== idx) });
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-5 animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Algae Details</h2>

      {/* Container Size */}
      <div className="space-y-1.5">
        <Label className="text-xs">Container Size *</Label>
        <div className="flex flex-wrap gap-2">
          {CONTAINER_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => handleFieldChange('containerSize', size)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                containerSize === size
                  ? 'bg-primary text-primary-foreground border-primary shadow'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Samples */}
      {!isPlanningMode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Samples ({samples.length})
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addSample}
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sample
            </Button>
          </div>

          {samples.map((sample, idx) => (
            <div key={sample.id} className="border rounded-xl p-3 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Sample {idx + 1}</span>
                {samples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSample(idx)}
                    className="text-destructive hover:text-destructive/80 p-1 rounded"
                    title="Remove sample"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cell Count per ml *</Label>
                <Input
                  type="number"
                  min="0"
                  value={sample.cellCountPerMl}
                  onChange={e => handleSampleChange(idx, 'cellCountPerMl', e.target.value)}
                  placeholder="e.g. 150000"
                  className="h-10"
                />
              </div>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-1">Cell Quality</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Size</Label>
                  <Select value={sample.cellSize} onValueChange={v => handleSampleChange(idx, 'cellSize', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {CELL_SIZE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Shape</Label>
                  <Select value={sample.cellShape} onValueChange={v => handleSampleChange(idx, 'cellShape', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {CELL_SHAPE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Colour</Label>
                  <Select value={sample.cellColour} onValueChange={v => handleSampleChange(idx, 'cellColour', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {CELL_COLOUR_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contamination</Label>
                <Select value={sample.contamination} onValueChange={v => handleSampleChange(idx, 'contamination', v)}>
                  <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTAMINATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
                {sample.contamination !== 'None' && (
                  <Input
                    value={sample.contaminationNotes}
                    onChange={e => handleSampleChange(idx, 'contaminationNotes', e.target.value)}
                    placeholder="Describe contamination..."
                    className="h-10 text-xs mt-1"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes / Instructions */}
      <div className="space-y-1.5">
        <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'General Notes'}</Label>
        <Textarea
          value={comments}
          onChange={e => onCommentsChange(e.target.value)}
          placeholder={isPlanningMode ? 'Add instructions for workers...' : 'Any general observations...'}
          rows={3}
        />
      </div>
    </div>
  );
};

export default AlgaeForm;
