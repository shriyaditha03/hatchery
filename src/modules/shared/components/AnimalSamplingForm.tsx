import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import ImageUpload from './ImageUpload';
import { AnimalQualityScore, DISEASE_OPTIONS } from './AnimalQualityScore';
import { Activity, Plus, TrendingDown, Scale, Trash2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AnimalSamplingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  activeFarmCategory?: string;
  isPlanningMode?: boolean;
  onGoToStocking?: () => void;
}

const WEATHER_OPTIONS = [
  'Sunny (Normal)',
  'Scorching',
  'Sunny Cloudy',
  'Cloudy',
  'Drizzle',
  'Rain',
  'Thunderstorm'
];

const LARVAL_STAGES = [
  'Nauplii', 'Z1', 'Z2', 'Z3', 'M1', 'M2', 'M3', 
  'PL1', 'PL2', 'PL3', 'PL4', 'PL5', 'PL6', 'PL7', 'PL8', 'PL9', 'PL10', 
  'PL11', 'PL12', 'PL13', 'PL14', 'PL15+'
];

export const TRANSITIONS = [
  { id: '1', label: '1) N% _____ Z1 % ____', stage1: 'Nauplii', stage2: 'Z1' },
  { id: '2', label: '2) Z1% _____ Z2 % ____', stage1: 'Z1', stage2: 'Z2' },
  { id: '3', label: '3) Z2% _____ Z3 % ____', stage1: 'Z2', stage2: 'Z3' },
  { id: '4', label: '4) Z3% _____ M1 % ____', stage1: 'Z3', stage2: 'M1' },
  { id: '5', label: '5) M1% _____ M2 % ____', stage1: 'M1', stage2: 'M2' },
  { id: '6', label: '6) M2% _____ M3 % ____', stage1: 'M2', stage2: 'M3' },
  { id: '7', label: '7) M3% _____ PL1 % ____', stage1: 'M3', stage2: 'PL1' }
];

export const AnimalSamplingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  activeFarmCategory = 'LRT',
  isPlanningMode = false,
  onGoToStocking
}: AnimalSamplingFormProps) => {

  const isLRT = activeFarmCategory === 'LRT';
  const isMaturation = activeFarmCategory === 'MATURATION';
  const isFarms = activeFarmCategory === 'FARMS';

  const [samplingMode, setSamplingMode] = useState<'LARVAL_STAGE' | 'CONVERSION' | 'ABW' | 'NET_SAMPLING'>(
    data.samplingMode || (isLRT ? 'LARVAL_STAGE' : 'ABW')
  );

  // Computed Values
  const stockingPop = parseInt(data.stockingPopulation || data.presentPopulationM || data.totalMales || data.naupliiStocked || '0') + 
                      parseInt(data.presentPopulationF || data.totalFemales || '0');
  
  // Actually, we use data.presentPopulation straight from RecordActivity if available. 
  // Let's ensure we use it as base.
  const basePopulation = parseFloat(data.stockingPopulation || data.originalPop || data.naupliiStocked || '0');

  // Handle Mortality & Present Pop
  const handleMortalityChange = (val: string) => {
    const mort = parseFloat(val) || 0;
    // For LRT it's in millions
    const actualMort = isLRT ? mort * 1000000 : mort;
    const calcPop = Math.max(0, basePopulation - actualMort);

    let calcUpdates = {};
    if (samplingMode === 'CONVERSION' && data.selectedTransitionId) {
      const activeTransition = TRANSITIONS.find(t => t.id === data.selectedTransitionId);
      if (activeTransition) {
        const pct1 = parseFloat(data.pct1) || 0;
        const pct2 = parseFloat(data.pct2) || 0;
        const p1 = calcPop * (pct1 / 100);
        const p2 = calcPop * (pct2 / 100);
        calcUpdates = {
          calcPop1: p1 > 0 ? parseFloat(p1.toFixed(3)) : 0,
          calcPop2: p2 > 0 ? parseFloat(p2.toFixed(3)) : 0
        };
      }
    }

    onDataChange({
      ...data,
      mortality: val,
      presentPopulation: calcPop.toString(),
      ...calcUpdates
    });
  };

  const presentPop = parseFloat(data.presentPopulation || basePopulation.toString()) || 0;

  // Sync disease selection
  const handleDiseaseToggle = (disease: string) => {
    let current = data.diseases || [];
    if (disease === 'None') {
      current = ['None'];
    } else {
      current = current.filter((d: string) => d !== 'None');
      if (current.includes(disease)) {
        current = current.filter((d: string) => d !== disease);
      } else {
        current = [...current, disease];
      }
    }
    onDataChange({ ...data, diseases: current });
  };

  const handleTransitionSelect = (id: string) => {
    const activeTransition = TRANSITIONS.find(t => t.id === id);
    if (!activeTransition) return;

    const s1 = activeTransition.stage1;
    const s2 = activeTransition.stage2;
    
    const pct1 = parseFloat(data.pct1) || 0;
    const pct2 = parseFloat(data.pct2) || 0;

    const p1 = (presentPop * (pct1 / 100));
    const p2 = (presentPop * (pct2 / 100));

    onDataChange({
      ...data,
      selectedTransitionId: id,
      calcStage1: s1,
      calcPop1: p1 > 0 ? parseFloat(p1.toFixed(3)) : 0,
      calcStage2: s2,
      calcPop2: p2 > 0 ? parseFloat(p2.toFixed(3)) : 0,
      conversionData: { [s1]: pct1.toString(), [s2]: pct2.toString() }
    });
  };

  const handlePct1Change = (valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const pct1 = Math.max(0, Math.min(100, val));
    const pct2 = 100 - pct1;
    
    const activeTransition = TRANSITIONS.find(t => t.id === data.selectedTransitionId) || TRANSITIONS[0];
    const s1 = activeTransition.stage1;
    const s2 = activeTransition.stage2;

    const p1 = (presentPop * (pct1 / 100));
    const p2 = (presentPop * (pct2 / 100));

    onDataChange({
      ...data,
      pct1: valStr,
      pct2: pct2.toString(),
      calcStage1: s1,
      calcPop1: p1 > 0 ? parseFloat(p1.toFixed(3)) : 0,
      calcStage2: s2,
      calcPop2: p2 > 0 ? parseFloat(p2.toFixed(3)) : 0,
      conversionData: { [s1]: valStr, [s2]: pct2.toString() }
    });
  };

  const handlePct2Change = (valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const pct2 = Math.max(0, Math.min(100, val));
    const pct1 = 100 - pct2;
    
    const activeTransition = TRANSITIONS.find(t => t.id === data.selectedTransitionId) || TRANSITIONS[0];
    const s1 = activeTransition.stage1;
    const s2 = activeTransition.stage2;

    const p1 = (presentPop * (pct1 / 100));
    const p2 = (presentPop * (pct2 / 100));

    onDataChange({
      ...data,
      pct1: pct1.toString(),
      pct2: valStr,
      calcStage1: s1,
      calcPop1: p1 > 0 ? parseFloat(p1.toFixed(3)) : 0,
      calcStage2: s2,
      calcPop2: p2 > 0 ? parseFloat(p2.toFixed(3)) : 0,
      conversionData: { [s1]: pct1.toString(), [s2]: valStr }
    });
  };

  // Net Sampling Grid
  const [nets, setNets] = useState<any[]>(data.nets || []);
  const [numNets, setNumNets] = useState(data.nets?.length?.toString() || '');

  const updateNumNets = (val: string) => {
    setNumNets(val);
    const num = parseInt(val) || 0;
    const newNets = [...nets];
    if (num > nets.length) {
      for (let i = nets.length; i < num; i++) {
        newNets.push({ weight: '', count: '', weightUnit: 'gms' });
      }
    } else if (num < nets.length) {
      newNets.splice(num);
    }
    setNets(newNets);
    calculateOverallAbw(newNets);
  };

  const updateNet = (idx: number, field: string, val: string) => {
    const newNets = [...nets];
    newNets[idx] = { ...newNets[idx], [field]: val };
    setNets(newNets);
    calculateOverallAbw(newNets);
  };

  const calculateOverallAbw = (currentNets: any[]) => {
    let sumAbw = 0;
    let count = 0;
    currentNets.forEach(net => {
      const w = parseFloat(net.weight);
      const c = parseFloat(net.count);
      if (w > 0 && c > 0) {
        const weightGms = net.weightUnit === 'kg' ? w * 1000 : w;
        sumAbw += (weightGms / c);
        count++;
      }
    });
    const avgAbw = count > 0 ? (sumAbw / count) : 0;
    onDataChange({ ...data, nets: currentNets, abw: avgAbw > 0 ? avgAbw.toFixed(3) : '', samplingMode: 'NET_SAMPLING' });
  };

  // Biomass & Count Calcs
  const abw = parseFloat(data.abw || '0');
  const biomass = abw > 0 ? (presentPop * abw / 1000).toFixed(3) : '0';
  const animalsPerKg = abw > 0 ? Math.round(1000 / abw) : 0;

  useEffect(() => {
    if ((isMaturation || isFarms) && abw > 0) {
      onDataChange({ ...data, biomass, animalsPerKg: animalsPerKg.toString() });
    }
  }, [presentPop, abw]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Stocking Info */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        {!isPlanningMode && onGoToStocking && !data.stockingId && (
          <Button
            variant="outline"
            className="w-full py-6 rounded-xl border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary text-primary transition-all flex flex-col gap-0.5 h-auto text-center"
            onClick={onGoToStocking}
          >
            <span className="text-xs font-bold uppercase flex items-center justify-center gap-1.5"><Plus className="w-3.5 h-3.5" /> No Stocking Record</span>
            <span className="text-[10px] text-muted-foreground font-medium">Tap here to Record Stocking for this {isFarms ? 'Pond' : 'Tank'}</span>
          </Button>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Stocking Date</Label>
            <div className="h-10 px-3 flex items-center bg-muted/30 rounded-lg text-sm font-bold">{data.stockingDate || '—'}</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">DOC</Label>
            <div className="h-10 px-3 flex items-center bg-muted/30 rounded-lg text-sm font-bold">{data.doc !== undefined ? data.doc : '—'}</div>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs text-muted-foreground">Stocking Population</Label>
            <div className="h-10 px-3 flex items-center bg-muted/30 rounded-lg text-sm font-bold">{basePopulation.toLocaleString() || '—'}</div>
          </div>
          
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-bold uppercase">Weather Report</Label>
            <Select value={data.weather || ''} onValueChange={(val) => onDataChange({ ...data, weather: val })}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select Weather" /></SelectTrigger>
              <SelectContent>
                {WEATHER_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Sampling Section */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
          <Scale className="w-4 h-4" /> Sampling Data
        </h2>

        {isLRT ? (
          <>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              <Button type="button" variant={samplingMode === 'LARVAL_STAGE' ? 'default' : 'ghost'} className="flex-1 rounded-lg h-9 text-xs" onClick={() => { setSamplingMode('LARVAL_STAGE'); onDataChange({ ...data, samplingMode: 'LARVAL_STAGE' }); }}>Larval Stage</Button>
              <Button type="button" variant={samplingMode === 'CONVERSION' ? 'default' : 'ghost'} className="flex-1 rounded-lg h-9 text-xs" onClick={() => { setSamplingMode('CONVERSION'); onDataChange({ ...data, samplingMode: 'CONVERSION' }); }}>Sampling</Button>
            </div>

            {samplingMode === 'LARVAL_STAGE' ? (
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-bold uppercase">Larval Stage (Nauplii to PL 15+)</Label>
                <Select value={data.larvalStage || ''} onValueChange={(val) => onDataChange({ ...data, larvalStage: val })}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select Stage" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {LARVAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-700">Larval Stage Conversion %</Label>
                  <Select
                    value={data.selectedTransitionId || ''}
                    onValueChange={handleTransitionSelect}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select Transition Stages..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                      {TRANSITIONS.map(t => (
                        <SelectItem key={t.id} value={t.id} className="rounded-lg">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {data.selectedTransitionId && (() => {
                  const activeTransition = TRANSITIONS.find(t => t.id === data.selectedTransitionId);
                  if (!activeTransition) return null;
                  return (
                    <div className="grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/15 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/70">{activeTransition.stage1} %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={data.pct1 !== undefined ? data.pct1 : ''}
                          onChange={(e) => handlePct1Change(e.target.value)}
                          className="h-10 rounded-xl bg-background text-center font-bold border-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary/70">{activeTransition.stage2} %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={data.pct2 !== undefined ? data.pct2 : ''}
                          onChange={(e) => handlePct2Change(e.target.value)}
                          className="h-10 rounded-xl bg-background text-center font-bold border-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5 pt-2 border-t border-dashed">
                  <Label className="text-xs font-bold uppercase">PL Stage Selection</Label>
                  <div className="flex gap-2">
                    <Select value={data.plStageDropdown || ''} onValueChange={(val) => onDataChange({ ...data, plStageDropdown: val })}>
                      <SelectTrigger className="h-11 w-24 rounded-xl"><SelectValue placeholder="PL Stage" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => `PL${i + 1}`).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        <SelectItem value="PL15+">PL15+</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Or enter stage (e.g. 16)" className="h-11 flex-1" value={data.plStageManual || ''} onChange={(e) => onDataChange({ ...data, plStageManual: e.target.value })} />
                  </div>
                </div>

                <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 space-y-2">
                  <Label className="text-xs font-bold uppercase text-primary">Stage & Population Calculation</Label>
                  <p className="text-[10px] text-muted-foreground">Will auto-calculate based on % of present population ({presentPop.toLocaleString()})</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-[10px]">Stage 1</Label><Input value={data.calcStage1 || ''} readOnly className="h-8 bg-muted/40 font-bold cursor-default" /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Pop 1</Label><Input value={data.calcPop1 !== undefined ? data.calcPop1 : ''} readOnly className="h-8 bg-muted/40 font-bold cursor-default" /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Stage 2</Label><Input value={data.calcStage2 || ''} readOnly className="h-8 bg-muted/40 font-bold cursor-default" /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Pop 2</Label><Input value={data.calcPop2 !== undefined ? data.calcPop2 : ''} readOnly className="h-8 bg-muted/40 font-bold cursor-default" /></div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              <Button type="button" variant={samplingMode === 'ABW' ? 'default' : 'ghost'} className="flex-1 rounded-lg h-9 text-xs" onClick={() => { setSamplingMode('ABW'); onDataChange({ ...data, samplingMode: 'ABW' }); }}>Average Body Weight</Button>
              <Button type="button" variant={samplingMode === 'NET_SAMPLING' ? 'default' : 'ghost'} className="flex-1 rounded-lg h-9 text-xs" onClick={() => { setSamplingMode('NET_SAMPLING'); onDataChange({ ...data, samplingMode: 'NET_SAMPLING' }); }}>Sampling</Button>
            </div>

            {samplingMode === 'ABW' ? (
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-bold uppercase">Average Body Weight (ABW) in gms</Label>
                <Input type="number" step="0.01" placeholder="0.00" className="h-11 text-lg font-bold" value={data.abw || ''} onChange={(e) => onDataChange({ ...data, abw: e.target.value })} />
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase">Choose Number of Nets</Label>
                  <Input type="number" min="1" max="10" placeholder="e.g. 3" className="h-11" value={numNets} onChange={(e) => updateNumNets(e.target.value)} />
                </div>
                
                {nets.map((net, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-xl space-y-3 border border-slate-100">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Net {idx + 1}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Weight</Label>
                        <div className="flex">
                          <Input type="number" step="0.01" className="h-8 rounded-r-none" value={net.weight} onChange={(e) => updateNet(idx, 'weight', e.target.value)} />
                          <Select value={net.weightUnit} onValueChange={(val) => updateNet(idx, 'weightUnit', val)}>
                            <SelectTrigger className="h-8 w-16 rounded-l-none border-l-0 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="gms">gms</SelectItem><SelectItem value="kg">kg</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Animals Count</Label>
                        <Input type="number" className="h-8" value={net.count} onChange={(e) => updateNet(idx, 'count', e.target.value)} />
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] font-medium text-muted-foreground mr-2">Calculated ABW:</span>
                        <span className="text-sm font-black text-primary">
                          {(parseFloat(net.weight) > 0 && parseFloat(net.count) > 0) ? 
                            ((net.weightUnit === 'kg' ? parseFloat(net.weight) * 1000 : parseFloat(net.weight)) / parseFloat(net.count)).toFixed(2) + ' g' 
                          : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {nets.length > 0 && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex justify-between items-center">
                    <Label className="text-xs font-black uppercase text-primary">Overall ABW</Label>
                    <span className="text-xl font-black text-primary">{data.abw ? parseFloat(data.abw).toFixed(2) + ' g' : '—'}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Mortality & Biology */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" /> Mortality & Demographics
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-bold uppercase text-rose-700">
              {isLRT ? 'Population drop (in millions)' : 'Number of Animals Lost'}
            </Label>
            <Input type="number" step={isLRT ? "0.01" : "1"} placeholder="0" className="h-11 border-rose-200 bg-rose-50/30 font-bold" value={data.mortality || ''} onChange={(e) => handleMortalityChange(e.target.value)} />
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-bold uppercase text-emerald-700">Present Population</Label>
            <div className="h-11 px-3 flex items-center bg-emerald-50/50 border border-emerald-100 rounded-lg text-lg font-black text-emerald-800">
              {presentPop.toLocaleString()}
            </div>
          </div>

          {isMaturation && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Number of Moults</Label>
              <Input type="number" placeholder="0" className="h-11" value={data.numMoults || ''} onChange={(e) => onDataChange({ ...data, numMoults: e.target.value })} />
            </div>
          )}

          {(isLRT || isFarms) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Moulting observed?</Label>
              <Select value={data.moulting || ''} onValueChange={(val) => onDataChange({ ...data, moulting: val })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase">Animal Length (Avg cm)</Label>
            <Input type="number" step="0.1" placeholder="0.0" className="h-11" value={data.animalLength || ''} onChange={(e) => onDataChange({ ...data, animalLength: e.target.value })} />
          </div>

          {(isMaturation || isFarms) && (
            <>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold uppercase text-blue-700">Estimated Biomass</Label>
                <div className="h-11 px-3 flex items-center bg-blue-50/50 border border-blue-100 rounded-lg text-lg font-black text-blue-800">
                  {biomass} kg
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold uppercase text-indigo-700">Count (per kg)</Label>
                <div className="h-11 px-3 flex items-center bg-indigo-50/50 border border-indigo-100 rounded-lg text-lg font-black text-indigo-800">
                  {animalsPerKg > 0 ? animalsPerKg : '—'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Animal Quality */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <AnimalQualityScore data={data} onDataChange={onDataChange} />
      </div>

      {/* 5. Disease */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Disease Tracking
        </h2>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Disease if any</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-11 justify-between px-3 rounded-xl bg-slate-50 border-slate-200 hover:bg-slate-100 text-left font-normal"
              >
                <span className="truncate text-slate-700">
                  {(data.diseases || []).length === 0
                    ? 'Select Disease...'
                    : (data.diseases || []).join(', ')}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 rounded-2xl shadow-xl max-h-64 overflow-y-auto" align="start">
              <div className="space-y-1">
                {[...DISEASE_OPTIONS, 'Others'].map(disease => (
                  <label
                    key={disease}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 ${
                      (data.diseases || []).includes(disease) ? 'bg-amber-100/50 text-amber-900 font-medium' : 'text-slate-600'
                    }`}
                  >
                    <Checkbox
                      checked={(data.diseases || []).includes(disease)}
                      onCheckedChange={() => handleDiseaseToggle(disease)}
                    />
                    <span className="text-xs">{disease}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {(data.diseases || []).includes('Others') && (
          <Input 
            placeholder="Specify other disease..." 
            value={data.otherDisease || ''}
            onChange={(e) => onDataChange({ ...data, otherDisease: e.target.value })}
            className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200"
          />
        )}
      </div>

      {/* 6. Footer */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <div className="space-y-1.5 pt-2">
          <Label className="text-xs">Upload Files (Lab Reports / Photos)</Label>
          <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder="Add general notes..."
            rows={3}
            className="rounded-xl"
          />
        </div>
      </div>

    </div>
  );
};

export default AnimalSamplingForm;
