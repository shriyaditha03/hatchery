import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRightLeft, Heart, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';

interface SourcingMatingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  availableTanks: any[];
  activeSectionId?: string;
  isPlanningMode?: boolean;
}

const SourcingMatingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  availableTanks,
  activeSectionId,
  isPlanningMode = false,
}: SourcingMatingFormProps) => {
  const [sourceTanks, setSourceTanks] = useState<any[]>(data.sourceTanks || []);
  const [matingTank, setMatingTank] = useState<any>(data.matingTank || null);
  const [matedDestinations, setMatedDestinations] = useState<any[]>(data.matedDestinations || []);
  const [returnDestinations, setReturnDestinations] = useState<any[]>(data.returnDestinations || []);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Automatically populate all tanks from the current section if none are listed
  useEffect(() => {
    if (activeSectionId && sourceTanks.length === 0) {
      const activeSection = availableTanks.find(s => s.id === activeSectionId);
      if (activeSection && activeSection.tanks) {
        const initialSources = activeSection.tanks.map((t: any) => ({
          id: t.id,
          sectionId: activeSection.id,
          tankId: t.id,
          tankName: t.name,
          femaleCount: ''
        }));
        setSourceTanks(initialSources);
        updateData({ sourceTanks: initialSources });
      }
    }
  }, [activeSectionId, availableTanks]);

  const addSource = () => {
    const newList = [...sourceTanks, { id: Date.now(), sectionId: '', tankId: '', femaleCount: '' }];
    setSourceTanks(newList);
    updateData({ sourceTanks: newList });
  };

  const removeSource = (id: number) => {
    const newList = sourceTanks.filter(s => s.id !== id);
    setSourceTanks(newList);
    updateData({ sourceTanks: newList });
  };

  const handleSourceChange = (id: number, updates: any) => {
    const newList = sourceTanks.map(s => s.id === id ? { ...s, ...updates } : s);
    setSourceTanks(newList);
    updateData({ sourceTanks: newList });
  };

  const addMatedDest = () => {
    const newList = [...matedDestinations, { id: Date.now(), sectionId: '', tankId: '', count: '' }];
    setMatedDestinations(newList);
    updateData({ matedDestinations: newList });
  };

  const addReturnDest = () => {
    const newList = [...returnDestinations, { id: Date.now(), sectionId: '', tankId: '', count: '' }];
    setReturnDestinations(newList);
    updateData({ returnDestinations: newList });
  };

  const totalSourced = sourceTanks.reduce((sum, s) => sum + (parseFloat(s.femaleCount) || 0), 0);
  const matedCount = parseFloat(data.matedCount) || 0;
  const balanceCount = Math.max(0, totalSourced - matedCount);

  const totalDistributedMated = matedDestinations.reduce((sum, d) => sum + (parseFloat(d.count) || 0), 0);
  const totalDistributedReturn = returnDestinations.reduce((sum, d) => sum + (parseFloat(d.count) || 0), 0);

  useEffect(() => {
    if (data.totalSourced !== totalSourced || data.balanceCount !== balanceCount) {
        updateData({ totalSourced, balanceCount });
    }
  }, [totalSourced, balanceCount]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        {/* 1. Sourcing Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Search className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">1. Ripe Females Sourced</h3>
            </div>
          </div>

          {sourceTanks.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded-2xl">No tanks found in this section</p>
          )}

          <div className="space-y-3">
            {sourceTanks.map((source, index) => (
              <Card key={source.id} className="p-3 bg-muted/20 border-none rounded-2xl relative group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">{source.tankName || 'Unnamed Tank'}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter opacity-70">Source Tank</p>
                  </div>
                  <div className="w-32">
                    <div className="relative group/input">
                      <Input 
                          type="number" 
                          value={source.femaleCount} 
                          onChange={e => handleSourceChange(source.id, { femaleCount: e.target.value })} 
                          className="h-10 rounded-xl text-sm font-bold pr-8" 
                          placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600/40 pointer-events-none">F</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalSourced > 0 && (
            <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Sourced</span>
              <span className="text-sm font-black text-emerald-800">{totalSourced} Females</span>
            </div>
          )}
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 2. Mating Tank */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-pink-100 rounded-xl">
              <Heart className="w-4 h-4 text-pink-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">2. Mating Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Mating Tank *</Label>
              <Select value={data.matingTankId} onValueChange={val => updateData({ matingTankId: val })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select Tank" />
                </SelectTrigger>
                <SelectContent>
                  {availableTanks.flatMap(s => s.tanks.map((t:any) => <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Total Animals (F) <span className="text-[10px] lowercase font-normal italic">(Auto)</span></Label>
              <div className="h-11 rounded-xl bg-muted/50 border border-dashed flex items-center px-4 shadow-inner">
                <span className="text-sm font-black text-foreground">{totalSourced}</span>
                <span className="ml-2 text-[10px] font-bold text-muted-foreground uppercase">Females</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Animals Mated (F) *</Label>
              <Input 
                type="number" 
                value={data.matedCount || ''} 
                onChange={e => updateData({ matedCount: e.target.value })} 
                className="h-11 rounded-xl font-bold" 
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-between items-center px-4 py-3 bg-muted/30 rounded-2xl border border-dashed">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Balance Animals</p>
              <p className="text-[9px] text-muted-foreground mt-1 italic">(Non-Mated to be returned)</p>
            </div>
            <span className="text-xl font-black text-foreground">{balanceCount} <span className="text-[10px] font-bold opacity-50 uppercase ml-1">F</span></span>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 3. Redistribution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">3. Animals Shifted To</h3>
          </div>

          <div className="space-y-6">
            {/* Mated -> Spawning */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">Spawning Tanks (Mated)</span>
                    <span className="text-[9px] text-primary/70 uppercase font-bold">{totalDistributedMated} / {matedCount} Assigned</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={addMatedDest} className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              
              {matedDestinations.map((dest, idx) => (
                <div key={dest.id} className="grid grid-cols-2 gap-2">
                    <Select value={dest.tankId} onValueChange={val => {
                      const newList = matedDestinations.map(d => d.id === dest.id ? { ...d, tankId: val } : d);
                      setMatedDestinations(newList);
                      updateData({ matedDestinations: newList });
                    }}>
                      <SelectTrigger className="h-9 rounded-xl text-[10px] bg-background">
                        <SelectValue placeholder="Tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTanks.flatMap(s => s.tanks.map((t:any) => <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                        <Input 
                            type="number" 
                            value={dest.count} 
                            onChange={e => {
                              const newList = matedDestinations.map(d => d.id === dest.id ? { ...d, count: e.target.value } : d);
                              setMatedDestinations(newList);
                              updateData({ matedDestinations: newList });
                            }} 
                            className="h-9 rounded-xl text-[10px] pr-8" 
                            placeholder="Qty"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold opacity-30">F</span>
                    </div>
                </div>
              ))}
            </div>

            {/* Balance -> Source/Other */}
            <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-amber-700">Source Tanks (Non-Mated)</span>
                    <span className="text-[9px] text-amber-600/70 uppercase font-bold">{totalDistributedReturn} / {balanceCount} Assigned</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={addReturnDest} className="h-7 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>

              {returnDestinations.map((dest, idx) => (
                <div key={dest.id} className="grid grid-cols-2 gap-2">
                    <Select value={dest.tankId} onValueChange={val => {
                      const newList = returnDestinations.map(d => d.id === dest.id ? { ...d, tankId: val } : d);
                      setReturnDestinations(newList);
                      updateData({ returnDestinations: newList });
                    }}>
                      <SelectTrigger className="h-9 rounded-xl text-[10px] bg-background border-amber-200">
                        <SelectValue placeholder="Tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTanks.flatMap(s => s.tanks.map((t:any) => <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                        <Input 
                            type="number" 
                            value={dest.count} 
                            onChange={e => {
                              const newList = returnDestinations.map(d => d.id === dest.id ? { ...d, count: e.target.value } : d);
                              setReturnDestinations(newList);
                              updateData({ returnDestinations: newList });
                            }} 
                            className="h-9 rounded-xl text-[10px] pr-8 border-amber-200" 
                            placeholder="Qty"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold opacity-30">F</span>
                    </div>
                </div>
              ))}
            </div>
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

export default SourcingMatingForm;
