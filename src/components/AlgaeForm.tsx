import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, getNowLocal } from '@/lib/date-utils';

const CONTAINER_SIZES = ['Mother Culture', '100ml', '250ml', '2ltr', '20ltr', '100ltr', '1ton', '12-15ton'];
const CELL_SIZE_OPTIONS = ['Small', 'Medium', 'Large'];
const CELL_SHAPE_OPTIONS = ['Normal', 'Irregular', 'Fragmented'];
const CELL_COLOUR_OPTIONS = ['Green', 'Yellow-Green', 'Brown', 'Off-colour'];
const CONTAMINATION_OPTIONS = ['None', 'Bacterial', 'Fungal', 'Other'];

interface AlgaeSample {
  id: string;
  sampleId: string;
  isManualId?: boolean;
  inoculumSourceId: string;
  inoculumQuantity: string;
  inoculumUnit: string;
  age: string;
  cellCountPerMl: string;
  cellSize: string;
  cellShape: string;
  cellColour: string;
  contamination: string;
  contaminationNotes: string;
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
    isManualId: false,
    inoculumSourceId: '',
    inoculumQuantity: '',
    inoculumUnit: 'ml',
    age: '',
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
  availableSourceDetails?: any[];
}

const AlgaeForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  isPlanningMode = false,
  availableSourceDetails = [],
}: AlgaeFormProps) => {
  const phase = data.phase || 'new';

  const handlePhaseChange = (p: 'new' | 'verify' | 'discard') => {
    onDataChange({ ...data, phase: p });
  };

  const getAgeDays = (createdAtStr?: string, dateStr?: string) => {
    const targetDate = createdAtStr || dateStr;
    if (!targetDate) return 'Unknown';
    const ageDays = Math.max(0, Math.floor((new Date().getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24)));
    return `${ageDays} day${ageDays !== 1 ? 's' : ''}`;
  };

  // ── NEW CULTURE state ──
  const algaeSpecies: string = data.algaeSpecies || '';
  const containerSize: string = data.containerSize || '';
  const samples: AlgaeSample[] = data.samples || [newSample(0)];
  const isMotherCulture = containerSize === 'Mother Culture';

  // Helper function to figure out the right Sample ID format based on Container Size and Species
  const formatSampleId = (index: number, isMC: boolean, species: string) => {
    const sNum = isMC ? `MC${index + 1}` : `S${index + 1}`;
    const datePart = formatDate(getNowLocal(), 'yyMMdd');
    if (isMC && species) {
      return `${sNum}_${species.replace(/\s+/g, '')}_${datePart}`;
    }
    return `${sNum}_${datePart}`;
  };

  const handleFieldChange = (field: string, value: any) => {
    let newData = { ...data, [field]: value };
    
    // Auto-update sample IDs if Container Size or Species changes
    if (field === 'containerSize' || field === 'algaeSpecies') {
       const isMC = field === 'containerSize' ? value === 'Mother Culture' : isMotherCulture;
       const spec = field === 'algaeSpecies' ? value : algaeSpecies;
       
       const updatedSamples = (newData.samples || samples).map((s: AlgaeSample, i: number) => {
           if (!s.isManualId) {
               return { ...s, sampleId: formatSampleId(i, isMC, spec) };
           }
           return s;
       });
       newData.samples = updatedSamples;
    }
    
    onDataChange(newData);
  };

  const handleSampleCountChange = (countStr: string) => {
    const count = parseInt(countStr) || 1;
    const safeCount = Math.max(1, Math.min(20, count));
    let newSamples = [...samples];
    if (safeCount > samples.length) {
      for (let i = samples.length; i < safeCount; i++) {
        const s = newSample(i);
        s.sampleId = formatSampleId(i, isMotherCulture, algaeSpecies);
        newSamples.push(s);
      }
    } else {
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
    
    let newData = { ...data, samples: updated };
    
    // Auto-populate Species if this is the first sample's inoculum source (and not MC)
    if (field === 'inoculumSourceId' && idx === 0 && !isMotherCulture) {
       const sourceObj = availableSourceDetails.find(d => d.id === value);
       if (sourceObj && sourceObj.species) {
          newData.algaeSpecies = sourceObj.species;
          // Trigger sample ID updates for any non-manual IDs
          newData.samples = newData.samples.map((s: AlgaeSample, i: number) => {
             if (!s.isManualId) {
                 return { ...s, sampleId: formatSampleId(i, isMotherCulture, sourceObj.species) };
             }
             return s;
          });
       }
    }
    
    onDataChange(newData);
  };

  const removeSample = (idx: number) => {
    if (samples.length === 1) return;
    onDataChange({ ...data, samples: samples.filter((_, i) => i !== idx) });
  };

  // ── DISCARD PREVIOUS state ──
  const discardSampleId: string = data.discardSampleId || '';
  const discardReason: string = data.discardReason || '';
  
  // ── VERIFY SAMPLE state ──
  const verifySampleId: string = data.verifySampleId || '';
  const verifyCellCount: string = data.verifyCellCount || '';
  const verifyCellQuality: string = data.verifyCellQuality || '';
  const verifyContamination: string = data.verifyContamination || 'None';
  
  const selectedVerifyDetails = availableSourceDetails.find(d => d.id === verifySampleId);
  
  const availableSourceIds = availableSourceDetails.map(d => d.id);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Algae Details</h2>
      </div>

      {/* Phase Toggle */}
      <div className="flex bg-muted/40 p-1 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => handlePhaseChange('new')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            phase === 'new'
              ? 'bg-white dark:bg-background shadow text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🌱 New Culture
        </button>
        <button
          type="button"
          onClick={() => handlePhaseChange('verify')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            phase === 'verify'
              ? 'bg-blue-500/10 shadow text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🔍 Verify Sample
        </button>
        <button
          type="button"
          onClick={() => handlePhaseChange('discard')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            phase === 'discard'
              ? 'bg-destructive/10 shadow text-destructive'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🗑️ Discard Previous
        </button>
      </div>

      {/* ── VERIFY SAMPLE ── */}
      {phase === 'verify' && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="space-y-1.5 text-blue-600 dark:text-blue-400">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              1. Select Sample to Verify <span className="text-destructive">*</span>
            </Label>
            <Select value={verifySampleId} onValueChange={v => handleFieldChange('verifySampleId', v)}>
              <SelectTrigger className="h-11 rounded-xl font-bold bg-blue-500/5 border-blue-500/20">
                <SelectValue placeholder="Choose past sample ID" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableSourceIds.length > 0 ? (
                  availableSourceIds.map(id => (
                    <SelectItem key={id} value={id}>{id}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-xs text-muted-foreground text-center">No Algae sample IDs found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {!isPlanningMode && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Inoculum Source</Label>
                  <Input value={selectedVerifyDetails?.inoculumSourceId || 'N/A'} disabled className="h-8 text-xs bg-background/50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Inoculum Quantity</Label>
                  <Input value={selectedVerifyDetails?.inoculumQuantity ? `${selectedVerifyDetails.inoculumQuantity} ${selectedVerifyDetails.inoculumUnit || ''}` : 'N/A'} disabled className="h-8 text-xs bg-background/50" />
                </div>
                <div className="space-y-1 col-span-2 lg:col-span-1">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Age</Label>
                  <Input value={getAgeDays(selectedVerifyDetails?.createdAt, selectedVerifyDetails?.date)} disabled className="h-8 text-xs bg-background/50 font-bold text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex gap-1">Cell Count (per ml) <span className="text-destructive">*</span></Label>
                  <Input type="number" min="0" value={verifyCellCount} onChange={e => handleFieldChange('verifyCellCount', e.target.value)} placeholder="e.g. 1000000" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex gap-1">Cell Quality <span className="text-destructive">*</span></Label>
                  <Input value={verifyCellQuality} onChange={e => handleFieldChange('verifyCellQuality', e.target.value)} placeholder="e.g. Good, Intact, etc." className="h-11 rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Contamination</Label>
                <Select value={verifyContamination} onValueChange={v => handleFieldChange('verifyContamination', v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTAMINATION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2 pt-2 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isPlanningMode ? 'Instructions' : 'Verification Notes'}
            </Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder={isPlanningMode ? "Add instructions for sample verification..." : "Any additional observations about this sample..."}
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
      )}

      {/* ── DISCARD PREVIOUS ── */}
      {phase === 'discard' && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="space-y-1.5 text-destructive">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              1. Select Sample to Discard <span className="text-destructive">*</span>
            </Label>
            <Select value={discardSampleId} onValueChange={v => handleFieldChange('discardSampleId', v)}>
              <SelectTrigger className="h-11 rounded-xl border-destructive/20 bg-destructive/5 font-black">
                <SelectValue placeholder="Choose from previous Algae Sample IDs" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableSourceIds.length > 0 ? (
                  availableSourceIds.map(id => (
                    <SelectItem key={id} value={id}>{id}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-xs text-muted-foreground text-center">No previous Algae sample IDs found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {!isPlanningMode && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1">
                2. Reason for Discarding <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={discardReason}
                onChange={e => handleFieldChange('discardReason', e.target.value)}
                placeholder="e.g. Contamination detected, poor growth, colour change..."
                rows={3}
                className="rounded-xl resize-none border-destructive/20 bg-destructive/5"
              />
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions</Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder={isPlanningMode ? "Add instructions for discarding these samples..." : "Any additional observations..."}
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
      )}

      {/* ── NEW CULTURE ── */}
      {phase === 'new' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Container Size */}
            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                1. Container Size <span className="text-destructive">*</span>
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

            {/* Algae Species */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                Algae Species <span className="text-destructive">*</span>
              </Label>
              <Input
                value={algaeSpecies}
                onChange={(e) => handleFieldChange('algaeSpecies', e.target.value)}
                placeholder={isMotherCulture ? "e.g. Chaetoceros" : "Auto-populated from source sample"}
                className={`h-11 rounded-xl ${!isMotherCulture && !isPlanningMode ? 'bg-muted/50 text-muted-foreground' : ''}`}
                disabled={!isMotherCulture && !isPlanningMode}
              />
              {!isMotherCulture && !isPlanningMode && <p className="text-[10px] text-muted-foreground italic pl-1 mt-0.5">Determined by Sample 1's Inoculum Source</p>}
            </div>
          </div>

          {/* 2. Samples Count */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              2. No. of Samples
            </Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl border-border hover:border-primary/50 shrink-0 shadow-sm"
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
                className="h-11 rounded-xl bg-muted/10 font-black border-border text-center text-lg focus:bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl border-border hover:border-primary/50 shrink-0 shadow-sm"
                onClick={() => handleSampleCountChange((samples.length + 1).toString())}
                disabled={samples.length >= 20}
              >
                +
              </Button>
            </div>
          </div>


          {/* Sample Cards */}
          {!isPlanningMode && (
            <div className="space-y-4 pt-4 border-t border-dashed">
              <p className="text-xs font-black text-foreground uppercase tracking-wider">
                Sample Assessments
              </p>

              <div className="space-y-6">
                {(samples || []).map((sample, idx) => (
                  <div
                    key={sample.id}
                    className="relative overflow-hidden border border-border/50 bg-muted/5 rounded-2xl p-4 space-y-4 transition-all hover:border-primary/30"
                  >
                    {/* Sample header */}
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center bg-primary/10 text-primary">
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
                          className="text-destructive/50 hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-all self-end mb-1 text-xs font-bold"
                          title="Remove Sample"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="space-y-4 animate-fade-in-up">
                      {/* 3. Inoculum Source */}
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-xs font-bold">3. Inoculum / Source Sample Id</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSampleChange(idx, 'inoculumSourceId', 'Mother Culture')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                sample.inoculumSourceId === 'Mother Culture'
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
                                onClick={() => handleSampleChange(idx, 'inoculumSourceId', id)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                  sample.inoculumSourceId === id
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'
                                }`}
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                          <Select
                            value={
                              availableSourceIds.includes(sample.inoculumSourceId) ||
                              sample.inoculumSourceId === 'Mother Culture'
                                ? sample.inoculumSourceId
                                : 'manual'
                            }
                            onValueChange={(val) => {
                              if (val !== 'manual') handleSampleChange(idx, 'inoculumSourceId', val);
                            }}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-background border-border">
                              <SelectValue placeholder="Select previous ID or type below" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="manual" className="text-xs font-bold text-primary">Custom / Manual Entry</SelectItem>
                              <SelectItem value="Mother Culture" className="text-xs">🧪 Mother Culture</SelectItem>
                              {availableSourceIds.length > 0
                                ? availableSourceIds.map(id => (
                                    <SelectItem key={id} value={id} className="text-xs">{id}</SelectItem>
                                  ))
                                : <div className="p-2 text-[10px] text-muted-foreground text-center italic">No previous entries found</div>
                              }
                            </SelectContent>
                          </Select>
                          {!availableSourceIds.includes(sample.inoculumSourceId) &&
                            sample.inoculumSourceId !== 'Mother Culture' && (
                              <Input
                                value={sample.inoculumSourceId}
                                onChange={e => handleSampleChange(idx, 'inoculumSourceId', e.target.value)}
                                placeholder="Enter Custom Source ID"
                                className="h-11 rounded-xl animate-in fade-in slide-in-from-top-1"
                              />
                            )}
                        </div>
                      </div>

                      {/* 4. Inoculum Quantity */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold flex items-center gap-1">
                          4. Inoculum Quantity <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={sample.inoculumQuantity}
                            onChange={e => handleSampleChange(idx, 'inoculumQuantity', e.target.value)}
                            placeholder="0.00"
                            className="h-11 rounded-xl flex-1"
                          />
                          <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
                            {['ml', 'Lts'].map(u => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => handleSampleChange(idx, 'inoculumUnit', u)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  sample.inoculumUnit === u ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'
                                }`}
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 5. Age */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">5. AGE (Day 0 – Day 5)</Label>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3, 4, 5].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleSampleChange(idx, 'age', d.toString())}
                              className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${
                                sample.age === d.toString()
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                              }`}
                            >
                              D-{d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 6. Cell Count */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground flex justify-between">
                          6. CELL COUNT (IN MILLION PER ML) <span className="text-destructive">*</span>
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

                      {/* 7. Cell Quality */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                          7. Cell Quality <span className="text-destructive">*</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">Size <span className="text-destructive">*</span></Label>
                            <Select value={sample.cellSize} onValueChange={v => handleSampleChange(idx, 'cellSize', v)}>
                              <SelectTrigger className="h-9 text-[10px] rounded-lg border-border/50"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {CELL_SIZE_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">Shape <span className="text-destructive">*</span></Label>
                            <Select value={sample.cellShape} onValueChange={v => handleSampleChange(idx, 'cellShape', v)}>
                              <SelectTrigger className="h-9 text-[10px] rounded-lg border-border/50"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {CELL_SHAPE_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">Colour <span className="text-destructive">*</span></Label>
                            <Select value={sample.cellColour} onValueChange={v => handleSampleChange(idx, 'cellColour', v)}>
                              <SelectTrigger className="h-9 text-[10px] rounded-lg border-border/50"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {CELL_COLOUR_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* 8. Contamination */}
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">8. Contamination (if any)</Label>
                        <Select value={sample.contamination} onValueChange={v => handleSampleChange(idx, 'contamination', v)}>
                          <SelectTrigger className="h-10 text-xs rounded-xl flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {CONTAMINATION_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2 pt-4 border-t border-dashed">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isPlanningMode ? 'Setup Instructions' : 'Notes'}
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
      )}
    </div>
  );
};

export default AlgaeForm;
