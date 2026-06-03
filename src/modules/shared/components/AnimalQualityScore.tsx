import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ANIMAL_QUALITY_FIELDS = [
  {
    key: 'swimmingActivity',
    label: 'Swimming activity',
    options: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']
  },
  {
    key: 'hepatopancreas',
    label: 'Hepatopancreas',
    options: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']
  },
  {
    key: 'phototaxis',
    label: 'Phototaxis (Attraction to Light)',
    options: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']
  },
  {
    key: 'necrosis',
    label: 'Necrosis',
    options: ['None', 'Mild', 'Moderate', 'High', 'Severe']
  },
  {
    key: 'deformities',
    label: 'Deformities',
    options: ['None', 'Mild', 'Moderate', 'High', 'Severe']
  },
  {
    key: 'muscleGutRatio',
    label: 'Muscle Gut Ratio',
    options: ['[4:1]', '[3.5:1]', '[3:1]', '[2:1]', '[1:1]']
  },
  {
    key: 'intestinalContent',
    label: 'Intestinal content',
    options: ['100%', '75%', '50%', '25%', '0%']
  },
  {
    key: 'faecalStrings',
    label: 'Faecal Strings',
    options: ['Continuous - Dark', 'Continuous - Light', 'Fragmented - Pale', 'Stringy Floating - Pale', 'Floating - White']
  },
  {
    key: 'sizeVariation',
    label: 'Size Variation',
    options: ['Excellent [<10%]', 'Good [10% to 15%]', 'Fair [15% to 20%]', 'Poor [20% to 25%]', 'Unacceptable [>25%]']
  },
  {
    key: 'foulingAttachments',
    label: 'Fouling / Attachments',
    options: ['None', 'Mild', 'Moderate', 'High', 'Severe']
  }
];

export const DISEASE_OPTIONS = [
  'None',
  'AHPND',
  'Black Gill',
  'EHP',
  'EMS',
  'IHHNV',
  'IMNV',
  'TSV',
  'WSS',
  'White Faeces',
  'Yellow Head',
  'TPD'
];

interface AnimalQualityScoreProps {
  data: any;
  onDataChange: (val: any) => void;
}

export const AnimalQualityScore = ({ data, onDataChange }: AnimalQualityScoreProps) => {
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>(data.animalRatings || {});
  const [othersText, setOthersText] = useState<string>(data.animalRatingsOthers || '');

  const setRating = (key: string, value: number) => {
    const newRatings = { ...animalRatings, [key]: value };
    setAnimalRatings(newRatings);
  };

  const calculateScore = (ratings: Record<string, number>) => {
    const values = ANIMAL_QUALITY_FIELDS.map(f => ratings[f.key] || 0);
    const filledCount = values.filter(v => v > 0).length;
    return filledCount > 0 ? values.reduce((a, b) => a + b, 0) / filledCount : 0;
  };

  const animalAvg = calculateScore(animalRatings);
  const animalFilledCount = ANIMAL_QUALITY_FIELDS.map(f => animalRatings[f.key] || 0).filter(v => v > 0).length;

  const handleSave = () => {
    onDataChange({
      ...data,
      animalQualityScore: parseFloat(animalAvg.toFixed(1)),
      animalRatings: animalRatings,
      animalRatingsOthers: othersText
    });
  };

  return (
    <div className="space-y-4">
      <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex justify-between items-center">
        Animal Condition Quality *
        {animalAvg > 0 && <span className="text-primary">{animalAvg.toFixed(1)} / 5</span>}
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{animalFilledCount} of {ANIMAL_QUALITY_FIELDS.length} parameters rated</p>
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
              {ANIMAL_QUALITY_FIELDS.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-700">{f.label}</Label>
                  <Select
                    value={animalRatings[f.key]?.toString() || ''}
                    onValueChange={(val) => setRating(f.key, parseInt(val))}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select rating..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                      {f.options.map((opt, idx) => (
                        <SelectItem key={idx + 1} value={(idx + 1).toString()} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-slate-700">{opt}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-700">Others</Label>
                <Input
                  value={othersText}
                  onChange={(e) => setOthersText(e.target.value)}
                  placeholder="Specify any other observations..."
                  className="h-11 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
            </div>
            
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-montserrat">Current Quality Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-primary font-montserrat tracking-tight">{animalAvg.toFixed(1)}</span>
                  <span className="text-xs font-bold text-muted-foreground">/ 5</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(animalAvg / 5) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic">Calculated average of {animalFilledCount} parameters (1 = Best, 5 = Worst)</p>
            </div>
          </div>
          <DialogFooter className="p-4 bg-muted/30 border-t sticky bottom-0 z-10">
            <DialogClose asChild>
              <Button
                className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 ocean-gradient border-none"
                onClick={handleSave}
              >
                Save Quality Score
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
