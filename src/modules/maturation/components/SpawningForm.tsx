import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRightLeft, Sparkles, Search, CheckCircle2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';

interface SpawningFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  availableTanks: any[];
  isPlanningMode?: boolean;
  farmId?: string;
}

const SpawningForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  availableTanks,
  activeSectionId,
  tankPopulations = {},
  isPlanningMode = false,
  farmId,
}: SpawningFormProps) => {
  const [returnDestinations, setReturnDestinations] = useState<any[]>(data.returnDestinations || []);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  const spawnedCount = parseFloat(data.spawnedCount) || 0;
  const balanceCount = parseFloat(data.balanceCount) || 0;
  const totalFemales = spawnedCount + balanceCount;

  const availableCount = data.tankId ? (tankPopulations[data.tankId] || 0) : 0;
  const totalDistributed = returnDestinations.reduce((sum, d) => sum + (parseFloat(d.count) || 0), 0);

  const isCleared = totalDistributed === availableCount;
  const matchesPopulation = totalFemales === availableCount;

  // Automatically populate maturation tanks for return if none are listed - ONLY FOR CURRENT FARM
  useEffect(() => {
    if (activeSectionId && returnDestinations.length === 0) {
      const activeSection = availableTanks.find(s => s.id === activeSectionId && (!farmId || s.farm_id === farmId));
      if (activeSection && activeSection.tanks) {
        const initialDestinations = activeSection.tanks.map((t: any) => ({
          id: t.id,
          tankId: t.id,
          tankName: t.name,
          count: ''
        }));
        setReturnDestinations(initialDestinations);
        updateData({ returnDestinations: initialDestinations });
      }
    }
  }, [activeSectionId, availableTanks, farmId]);

  const handleDestChange = (id: string, updates: any) => {
    const newList = returnDestinations.map(d => d.id === id ? { ...d, ...updates } : d);
    setReturnDestinations(newList);
    updateData({ returnDestinations: newList });
  };

  useEffect(() => {
    if (data.totalFemales !== totalFemales) {
      updateData({ totalFemales });
    }
  }, [totalFemales]);

  // Options filtering: ONLY show tanks with population > 0 from CURRENT FARM
  const spawningTanksOptions = availableTanks
    .filter(s => !farmId || s.farm_id === farmId)
    .flatMap(s => 
      s.tanks
        .filter((t: any) => (tankPopulations[t.id] || 0) > 0 || t.id === data.tankId) // Include current if selected
        .map((t:any) => ({
          id: t.id,
          name: t.name,
          sectionName: s.name,
          population: tankPopulations[t.id] || 0
        }))
    );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        {/* 1. Spawning Tank Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">1. Select Spawning Tank</h3>
            </div>
            {data.tankId && (
              <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 animate-fade-in">
                Population: {availableCount} F
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold ml-1 text-muted-foreground uppercase tracking-widest">Tank Number *</Label>
            <Select value={data.tankId} onValueChange={val => updateData({ tankId: val })}>
              <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/20 bg-background/50 text-base font-semibold">
                <SelectValue placeholder="Select Spawning Tank" />
              </SelectTrigger>
              <SelectContent>
                {spawningTanksOptions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">No occupied spawning tanks found</div>
                ) : (
                  spawningTanksOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <div className="flex items-center justify-between w-full gap-8">
                        <span>{opt.sectionName} - {opt.name}</span>
                        <span className="text-[10px] font-black opacity-40">({opt.population} F)</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {spawningTanksOptions.length > 0 && !data.tankId && (
              <p className="text-[9px] text-muted-foreground ml-2 italic">Only showing tanks that have received animals from mating activity.</p>
            )}
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 2. Spawning Results */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">2. No. of Animals Spawned</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold ml-1 text-emerald-600 uppercase tracking-widest">Spawned (F)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={data.spawnedCount || ''} 
                  onChange={e => updateData({ spawnedCount: e.target.value })} 
                  className="h-11 rounded-xl font-bold bg-emerald-50/30 border-emerald-100 focus:border-emerald-500" 
                  placeholder="0"
                />
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold ml-1 text-amber-600 uppercase tracking-widest">Balance (F)</Label>
              <Input 
                type="number" 
                value={data.balanceCount || ''} 
                onChange={e => updateData({ balanceCount: e.target.value })} 
                className="h-11 rounded-xl font-bold bg-amber-50/30 border-amber-100 focus:border-amber-500" 
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-4 py-3 bg-muted/20 rounded-2xl border border-dashed">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none text-primary">Input Total</p>
                <p className="text-[9px] text-muted-foreground mt-1 italic">(Spawned + Balance)</p>
              </div>
              <span className="text-2xl font-black text-foreground">{totalFemales} <span className="text-sm font-bold opacity-30">F</span></span>
            </div>

            {data.tankId && totalFemales > 0 && !matchesPopulation && (
              <div className="flex items-center gap-2 p-2 px-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <p className="text-[10px] font-bold uppercase tracking-tight">Warning: Input total ({totalFemales}) differs from tank population ({availableCount})</p>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 3. Redistribution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">3. Animals Shifted To</h3>
          </div>

          <div className={`space-y-1.5 p-4 rounded-[2rem] border transition-all duration-500 ${isCleared && availableCount > 0 ? 'bg-emerald-50 border-emerald-100' : (totalDistributed > 0 ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100')}`}>
            <div className="flex justify-between items-center mb-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isCleared ? 'text-emerald-700' : (totalDistributed > 0 ? 'text-red-700' : 'text-indigo-700')}`}>
                {isCleared ? 'Tank Cleared' : (totalDistributed > availableCount ? 'Exceeding Population' : 'Clearing Status')}
              </p>
              <p className={`text-[10px] font-black ${isCleared ? 'text-emerald-700' : (totalDistributed > 0 ? 'text-red-700' : 'text-indigo-700')}`}>
                {totalDistributed} / {availableCount} Allocated
              </p>
            </div>
            <div className="w-full bg-white/50 rounded-full h-1.5 mt-1 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isCleared ? 'bg-emerald-500' : (totalDistributed > availableCount ? 'bg-red-500' : 'bg-amber-500')}`}
                style={{ width: `${Math.min(100, (totalDistributed / (availableCount || 1)) * 100)}%` }}
              />
            </div>
            
            {!isCleared && availableCount > 0 && (
              <div className={`flex items-center gap-1.5 mt-2 text-[9px] font-bold uppercase ${totalDistributed > availableCount ? 'text-red-600' : 'text-amber-600'} animate-pulse`}>
                <AlertCircle className="w-3 h-3" />
                <span>{totalDistributed > availableCount ? 'Number exceeds tank population' : 'The number must clear all animals from the spawning tank'}</span>
              </div>
            )}
            {isCleared && availableCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-[9px] font-bold uppercase text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                <span>Balanced: Tank will be fully cleared</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {returnDestinations.map((dest) => (
              <Card key={dest.id} className="p-4 bg-muted/20 border-none rounded-2xl group transition-all hover:bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">{dest.tankName}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter opacity-70">Maturation Tank</p>
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <Input 
                          type="number" 
                          value={dest.count} 
                          onChange={e => handleDestChange(dest.id, { count: e.target.value })} 
                          className="h-10 rounded-xl text-sm font-bold pr-8 border-muted-foreground/20 focus:border-indigo-500" 
                          placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600/40">F</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {!isPlanningMode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Activity Photo (Optional)</Label>
            <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder="Add notes..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default SpawningForm;
