import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRightLeft, Heart, Search, Database, RefreshCw, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { getTodayStr } from '@/lib/date-utils';

interface SourcingMatingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  availableTanks: any[];
  activeSectionId?: string;
  activeTankId?: string;
  tankPopulations?: Record<string, number>;
  isPlanningMode?: boolean;
  farmId?: string;
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
  activeTankId,
  tankPopulations = {},
  isPlanningMode = false,
  farmId,
}: SourcingMatingFormProps) => {
  // Field 1: Source Tanks (Females)
  const [sourceTanks, setSourceTanks] = useState<any[]>(data.sourceTanks || []);
  
  // Field 2: Mating Tanks (Males + Females being added)
  const [matingTanks, setMatingTanks] = useState<any[]>(data.matingTanks || []);
  
  // Field 3: Animals Shifted to
  const [matedDestinations, setMatedDestinations] = useState<any[]>(data.matedDestinations || []);
  const [returnDestinations, setReturnDestinations] = useState<any[]>(data.returnDestinations || []);
  const [batchNumber, setBatchNumber] = useState<string>(data.batchNumber || '');
  const [isBatchIdManuallyEdited, setIsBatchIdManuallyEdited] = useState(data.batchNumber ? true : false);

  // Auto-fill tracking state
  const [editedFields, setEditedFields] = useState<Record<string, boolean>>(data.editedFields || {});

  const generateBatchId = () => {
    const dateStr = getTodayStr().replace(/-/g, '').slice(2); // YYMMDD
    const farmPrefix = farmId ? farmId.slice(0, 4).toUpperCase() : 'BN';
    const serial = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `BATCH-${farmPrefix}-${dateStr}-${serial}`;
  };

  // Auto-generate Batch ID if not present
  useEffect(() => {
    if (!batchNumber && !isBatchIdManuallyEdited) {
      const newId = generateBatchId();
      setBatchNumber(newId);
      onDataChange({ ...data, batchNumber: newId });
    }
  }, [batchNumber, farmId]);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates, batchNumber: updates.batchNumber !== undefined ? updates.batchNumber : batchNumber });
  };

  // 1. Automatically populate Field 1 with all FEMALE tanks from all ANIMAL sections for the SELECTED FARM
  useEffect(() => {
    if (availableTanks.length > 0 && sourceTanks.length === 0) {
      const animalSections = availableTanks.filter(s => s.section_type === 'ANIMAL' && (!farmId || s.farm_id === farmId));
      
      const initialSources: any[] = [];
      animalSections.forEach(section => {
        section.tanks
          .filter((t: any) => t.gender === 'FEMALE')
          .forEach((t: any) => {
            const availableCount = tankPopulations[t.id] || 0;
            initialSources.push({
              id: t.id,
              tankId: t.id,
              tankName: t.name,
              sectionName: section.name,
              available: availableCount,
              femaleCount: t.id === activeTankId ? (availableCount > 0 ? availableCount.toString() : '0') : ''
            });
          });
      });

      if (initialSources.length > 0) {
        setSourceTanks(initialSources);
        const initialTotal = initialSources.reduce((sum, s) => sum + (parseFloat(s.femaleCount) || 0), 0);
        updateData({ sourceTanks: initialSources, totalSourced: initialTotal });
      }
    } else if (sourceTanks.length > 0) {
      // Sync available counts if they change
      const updatedSources = sourceTanks.map(s => ({
        ...s,
        available: tankPopulations[s.tankId] || s.available || 0
      }));
      if (JSON.stringify(updatedSources) !== JSON.stringify(sourceTanks)) {
        setSourceTanks(updatedSources);
      }
    }
  }, [availableTanks, tankPopulations, farmId]);

  const handleSourceChange = (id: string, sourcedCount: string) => {
    const tank = sourceTanks.find(s => s.id === id);
    if (!tank) return;

    const available = tank.available || 0;
    const numValue = parseFloat(sourcedCount);
    
    // Cap at available
    let finalValue = sourcedCount;
    if (!isNaN(numValue) && numValue > available) {
      finalValue = available.toString();
    }

    const newList = sourceTanks.map(s => s.id === id ? { ...s, femaleCount: finalValue } : s);
    setSourceTanks(newList);
    updateData({ sourceTanks: newList });
  };

  // 2. Mating Tanks Logic (Field 2)
  const addMatingTank = () => {
    const newList = [...matingTanks, { 
      id: Date.now().toString(), 
      tankId: '', 
      maleCount: 0, 
      femalesAdded: '', 
      femalesMated: '', 
      balance: 0 
    }];
    setMatingTanks(newList);
    updateData({ matingTanks: newList });
  };

  const removeMatingTank = (id: string) => {
    const newList = matingTanks.filter(t => t.id !== id);
    setMatingTanks(newList);
    updateData({ matingTanks: newList });
  };

  const handleMatingTankChange = (id: string, updates: any, isManual = false) => {
    const newList = matingTanks.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        // Sync male count if tank changes
        if (updates.tankId) {
          updated.maleCount = tankPopulations[updates.tankId] || 0;
        }
        // Auto-calculate balance: femalesAdded - femalesMated
        const added = parseFloat(updated.femalesAdded) || 0;
        const mated = parseFloat(updated.femalesMated) || 0;
        updated.balance = Math.max(0, added - mated);
        return updated;
      }
      return t;
    });
    
    if (isManual) {
       if (updates.femalesAdded !== undefined) setEditedFields(prev => ({ ...prev, [`mating_${id}_added`]: true }));
    }

    setMatingTanks(newList);
    updateData({ matingTanks: newList, editedFields: { ...editedFields, ...(isManual && updates.femalesAdded !== undefined ? { [`mating_${id}_added`]: true } : {}) } });
  };

  // 3. Animals Shifted To (Field 3)
  const addMatedDestination = () => {
    const newList = [...matedDestinations, { id: Date.now().toString(), tankId: '', count: '' }];
    setMatedDestinations(newList);
    updateData({ matedDestinations: newList });
  };

  const removeMatedDestination = (id: string) => {
    const newList = matedDestinations.filter(d => d.id !== id);
    setMatedDestinations(newList);
    updateData({ matedDestinations: newList });
  };

  const handleMatedDestinationChange = (id: string, updates: any, isManual = false) => {
    const newList = matedDestinations.map(d => d.id === id ? { ...d, ...updates } : d);
    if (isManual && updates.count !== undefined) {
      setEditedFields(prev => ({ ...prev, [`mated_dest_${id}`]: true }));
    }
    setMatedDestinations(newList);
    updateData({ matedDestinations: newList, editedFields: { ...editedFields, ...(isManual && updates.count !== undefined ? { [`mated_dest_${id}`]: true } : {}) } });
  };

  const addReturnDestination = () => {
    const newList = [...returnDestinations, { id: Date.now().toString(), tankId: '', count: '' }];
    setReturnDestinations(newList);
    updateData({ returnDestinations: newList });
  };

  const removeReturnDestination = (id: string) => {
    const newList = returnDestinations.filter(d => d.id !== id);
    setReturnDestinations(newList);
    updateData({ returnDestinations: newList });
  };

  const handleReturnDestinationChange = (id: string, updates: any, isManual = false) => {
    const newList = returnDestinations.map(d => d.id === id ? { ...d, ...updates } : d);
    if (isManual && updates.count !== undefined) {
      setEditedFields(prev => ({ ...prev, [`return_dest_${id}`]: true }));
    }
    setReturnDestinations(newList);
    updateData({ returnDestinations: newList, editedFields: { ...editedFields, ...(isManual && updates.count !== undefined ? { [`return_dest_${id}`]: true } : {}) } });
  };

  const totalSourcedFromStep1 = sourceTanks.reduce((sum, s) => sum + (parseFloat(s.femaleCount) || 0), 0);
  const totalFemalesMatedAcrossTanks = matingTanks.reduce((sum, t) => sum + (parseFloat(t.femalesMated) || 0), 0);
  const totalBalanceNonMated = matingTanks.reduce((sum, t) => sum + (t.balance || 0), 0);

  const totalInSpawning = matedDestinations.reduce((sum, d) => sum + (parseFloat(d.count) || 0), 0);
  const totalReturned = returnDestinations.reduce((sum, d) => sum + (parseFloat(d.count) || 0), 0);
  const totalShifted = totalInSpawning + totalReturned;

  // AUTO-ALLOCATION EFFECTS
  // 1. Field 1 (Sourced) -> Field 2 (Mating)
  useEffect(() => {
    if (matingTanks.length === 1 && totalSourcedFromStep1 > 0) {
      const tank = matingTanks[0];
      const fieldKey = `mating_${tank.id}_added`;
      if (!editedFields[fieldKey] && tank.femalesAdded !== totalSourcedFromStep1.toString()) {
        const newList = matingTanks.map(t => t.id === tank.id ? { 
          ...t, 
          femalesAdded: totalSourcedFromStep1.toString(),
          balance: Math.max(0, totalSourcedFromStep1 - (parseFloat(t.femalesMated) || 0))
        } : t);
        setMatingTanks(newList);
        onDataChange({ ...data, matingTanks: newList });
      }
    }
  }, [totalSourcedFromStep1, matingTanks.length]);

  // 2. Field 2 (Mated/Balance) -> Field 3 (Destinations)
  useEffect(() => {
    // a) Mated -> Spawning
    if (matedDestinations.length === 1 && totalFemalesMatedAcrossTanks > 0) {
      const dest = matedDestinations[0];
      const fieldKey = `mated_dest_${dest.id}`;
      if (!editedFields[fieldKey] && dest.count !== totalFemalesMatedAcrossTanks.toString()) {
        const newList = matedDestinations.map(d => d.id === dest.id ? { ...d, count: totalFemalesMatedAcrossTanks.toString() } : d);
        setMatedDestinations(newList);
        onDataChange({ ...data, matedDestinations: newList });
      }
    }
    // b) Balance -> Return
    if (returnDestinations.length === 1 && totalBalanceNonMated > 0) {
      const dest = returnDestinations[0];
      const fieldKey = `return_dest_${dest.id}`;
      if (!editedFields[fieldKey] && dest.count !== totalBalanceNonMated.toString()) {
        const newList = returnDestinations.map(d => d.id === dest.id ? { ...d, count: totalBalanceNonMated.toString() } : d);
        setReturnDestinations(newList);
        onDataChange({ ...data, returnDestinations: newList });
      }
    }
  }, [totalFemalesMatedAcrossTanks, totalBalanceNonMated, matedDestinations.length, returnDestinations.length]);

  // Original summary sync
  useEffect(() => {
    const updates: any = {};
    if (data.totalSourced !== totalSourcedFromStep1) updates.totalSourced = totalSourcedFromStep1;
    if (data.matedCount !== totalFemalesMatedAcrossTanks) updates.matedCount = totalFemalesMatedAcrossTanks;
    if (data.balanceCount !== totalBalanceNonMated) updates.balanceCount = totalBalanceNonMated;
    if (data.totalShifted !== totalShifted) updates.totalShifted = totalShifted;
    
    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  }, [totalSourcedFromStep1, totalFemalesMatedAcrossTanks, totalBalanceNonMated, totalShifted]);

  // Options filtering
  const matingTanksOptions = availableTanks
    .filter(s => !farmId || s.farm_id === farmId)
    .flatMap(s => 
      s.tanks
        .filter((t: any) => t.gender === 'MALE')
        .map((t: any) => ({
          id: t.id,
          label: `${s.name} - ${t.name}`
        }))
    );

  const spawningTanksOptions = availableTanks
    .filter(s => s.section_type === 'SPAWNING' && (!farmId || s.farm_id === farmId))
    .flatMap(s => s.tanks.map((t: any) => ({
      id: t.id,
      label: `${s.name} - ${t.name}`
    })));

  const returnTanksOptions = sourceTanks
    .filter(s => parseFloat(s.femaleCount) > 0)
    .map(s => ({
      id: s.tankId,
      label: s.tankName
    }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* Batch Information */}
        <div className="p-5 bg-primary/5 rounded-[2rem] border border-dashed border-primary/20 space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                 <Database className="w-4 h-4" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Sourcing Batch ID</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  const newId = generateBatchId();
                  setBatchNumber(newId);
                  setIsBatchIdManuallyEdited(true);
                  updateData({ batchNumber: newId });
                }}
                className="h-8 text-[9px] font-black uppercase text-primary/60 hover:text-primary gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </Button>
           </div>
           
           <div className="relative group">
              <Input 
                value={batchNumber}
                onChange={(e) => {
                  setBatchNumber(e.target.value);
                  setIsBatchIdManuallyEdited(true);
                  updateData({ batchNumber: e.target.value });
                }}
                className="h-14 rounded-2xl font-black bg-white/50 border-primary/10 text-xl text-primary tracking-tight shadow-sm text-center uppercase"
                placeholder="BATCH-ID"
              />
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-20">
                 <RefreshCw className="w-5 h-5" />
              </div>
           </div>
           <p className="text-[9px] text-muted-foreground italic text-center px-4">
             Unique identifier used to track this batch lifecycle.
           </p>
        </div>

        {/* FIELD 1: Ripe Females Sourced */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Search className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">1. Ripe Females Sourced</h3>
            </div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md">
              Female Tanks in Animal Sections
            </div>
          </div>

          <div className="space-y-3">
            {sourceTanks.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded-2xl">No female tanks found in Animal sections</p>
            )}
            {sourceTanks.map((source) => (
              <Card key={source.id} className="p-4 bg-muted/20 border-none rounded-2xl relative group overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-foreground">{source.tankName}</p>
                       {source.sectionName && (
                         <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                           {source.sectionName}
                         </span>
                       )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Available:</span>
                      <span className="text-[10px] font-black text-emerald-600">{source.available} F</span>
                    </div>
                  </div>
                  <div className="w-32">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block ml-1">Sourced (F) *</Label>
                    <div className="relative group/input">
                      <Input 
                        type="number" 
                        value={source.femaleCount} 
                        onChange={e => handleSourceChange(source.id, e.target.value)} 
                        className="h-10 rounded-xl text-sm font-bold pr-8 focus:ring-emerald-500/20" 
                        placeholder="0"
                        max={source.available}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600/40 pointer-events-none">F</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalSourcedFromStep1 > 0 && (
            <div className="flex justify-between items-center px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Sourced Pool</span>
              <span className="text-lg font-black">{totalSourcedFromStep1} Females</span>
            </div>
          )}
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* FIELD 2: Mating Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-pink-100 rounded-xl">
                <Heart className="w-4 h-4 text-pink-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">2. Mating Details (Female added to Male Tanks)</h3>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addMatingTank} className="h-8 text-xs font-bold text-pink-600 hover:bg-pink-50">
              <Plus className="w-4 h-4 mr-1" /> Add Mating tank
            </Button>
          </div>

          <div className="space-y-6">
            {matingTanks.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-3xl space-y-2">
                <p className="text-xs text-muted-foreground italic">No mating tanks added yet</p>
                <Button variant="outline" size="sm" onClick={addMatingTank} className="rounded-full h-8 text-[10px] px-4">Click to add</Button>
              </div>
            )}
            {matingTanks.map((mating, idx) => (
              <Card key={mating.id} className="p-5 bg-pink-50/30 border-pink-100/50 rounded-[2rem] space-y-5 relative group shadow-sm transition-all hover:shadow-md">
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => removeMatingTank(mating.id)}
                  className="absolute top-4 right-4 h-8 w-8 text-pink-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-pink-700">Mating Tank (Male) *</Label>
                    <Select value={mating.tankId} onValueChange={val => handleMatingTankChange(mating.id, { tankId: val })}>
                      <SelectTrigger className="h-11 rounded-xl bg-white/80 border-pink-200">
                        <SelectValue placeholder="Select Male Tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {matingTanksOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-pink-700/60 uppercase tracking-wider ml-1">Males in Tank <span className="text-[10px] lowercase font-normal italic">(Auto)</span></Label>
                    <div className="h-11 rounded-xl bg-white/50 border border-dashed border-pink-200 flex items-center px-4">
                      <span className="text-sm font-black text-foreground">{mating.maleCount}</span>
                      <span className="ml-2 text-[10px] font-bold text-muted-foreground uppercase opacity-50">Males</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-white/40 rounded-2xl border border-pink-100">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">a) Females Added *</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={mating.femalesAdded} 
                        onChange={e => handleMatingTankChange(mating.id, { femalesAdded: e.target.value }, true)} 
                        className={cn(
                          "h-10 rounded-xl font-bold bg-white pr-8",
                          !editedFields[`mating_${mating.id}_added`] && mating.femalesAdded && "border-primary/20 bg-primary/5 text-primary"
                        )} 
                        placeholder="0"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {!editedFields[`mating_${mating.id}_added`] && mating.femalesAdded && (
                          <Wand2 className="w-2.5 h-2.5 text-primary opacity-60" />
                        )}
                        <span className="text-[9px] font-black text-pink-400">F</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">b) Females Mated *</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={mating.femalesMated} 
                        onChange={e => handleMatingTankChange(mating.id, { femalesMated: e.target.value })} 
                        className="h-10 rounded-xl font-bold bg-white" 
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-pink-400">F</span>
                    </div>
                  </div>
                  <div className="col-span-2 xl:col-span-1 border-t xl:border-t-0 xl:border-l border-dashed border-pink-200 pt-3 xl:pt-0 xl:pl-4 space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-pink-600">c) Balance Non-Mated</Label>
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-black text-pink-700">{mating.balance}</span>
                       <span className="text-[10px] font-bold text-pink-400 uppercase">Females</span>
                    </div>
                    <p className="text-[8px] text-pink-400 italic">Remaining in tank</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {matingTanks.length > 0 && (
            <div className="flex justify-between items-center px-4 py-4 bg-muted/20 rounded-2xl border border-dashed">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Total Mated</p>
                  <p className="text-lg font-black text-foreground">{totalFemalesMatedAcrossTanks} <span className="text-xs font-normal text-muted-foreground">F</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Total Non-Mated</p>
                  <p className="text-lg font-black text-foreground">{totalBalanceNonMated} <span className="text-xs font-normal text-muted-foreground">F</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* FIELD 3: Animals Shifted To */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">3. Animals Shifted To</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 3a: Spawning Tanks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-blue-700 ml-1">a) Allocation to Spawning Tanks *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addMatedDestination} className="h-7 text-[10px] font-bold text-blue-600 hover:bg-blue-50">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {matedDestinations.map(dest => (
                  <div key={dest.id} className="flex gap-2 items-start group">
                    <div className="flex-1">
                      <Select value={dest.tankId} onValueChange={val => handleMatedDestinationChange(dest.id, { tankId: val })}>
                        <SelectTrigger className="h-10 rounded-xl bg-blue-50/50 border-blue-100 text-xs shadow-none">
                          <SelectValue placeholder="Select Spawning Tank" />
                        </SelectTrigger>
                        <SelectContent>
                          {spawningTanksOptions.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <div className="relative group/input">
                        <Input 
                          type="number" 
                          value={dest.count} 
                          onChange={e => handleMatedDestinationChange(dest.id, { count: e.target.value }, true)} 
                          className={cn(
                            "h-10 rounded-xl font-bold bg-white pr-8",
                            !editedFields[`mated_dest_${dest.id}`] && dest.count && "border-blue-400/30 bg-blue-50/50 text-blue-700"
                          )}
                          placeholder="0"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {!editedFields[`mated_dest_${dest.id}`] && dest.count && (
                            <Wand2 className="w-2 h-2 text-blue-400 opacity-60" />
                          )}
                          <span className="text-[8px] font-bold text-blue-400">F</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => removeMatedDestination(dest.id)}
                      className="h-10 w-10 text-blue-200 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {matedDestinations.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/5 rounded-xl border border-dashed">No spawning tanks allocated</p>
                )}
              </div>
            </div>

            {/* 3b: Return to Source */}
            <div className="space-y-4 pt-6 md:pt-0 border-t md:border-t-0 md:border-l md:pl-6 border-dashed border-blue-100">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-slate-700 ml-1">b) Return to Source Tanks *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addReturnDestination} className="h-7 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {returnDestinations.map(dest => (
                  <div key={dest.id} className="flex gap-2 items-start group">
                    <div className="flex-1">
                      <Select value={dest.tankId} onValueChange={val => handleReturnDestinationChange(dest.id, { tankId: val })}>
                        <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-100 text-xs shadow-none">
                          <SelectValue placeholder="Select Source Tank" />
                        </SelectTrigger>
                        <SelectContent>
                          {returnTanksOptions.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <div className="relative group/input">
                        <Input 
                          type="number" 
                          value={dest.count} 
                          onChange={e => handleReturnDestinationChange(dest.id, { count: e.target.value }, true)} 
                          className={cn(
                            "h-10 rounded-xl font-bold bg-white pr-8",
                            !editedFields[`return_dest_${dest.id}`] && dest.count && "border-slate-400/30 bg-slate-50/50 text-slate-700"
                          )}
                          placeholder="0"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {!editedFields[`return_dest_${dest.id}`] && dest.count && (
                            <Wand2 className="w-2 h-2 text-slate-400 opacity-60" />
                          )}
                          <span className="text-[8px] font-bold text-slate-400">F</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" size="icon" 
                      onClick={() => removeReturnDestination(dest.id)}
                      className="h-10 w-10 text-slate-200 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {returnDestinations.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/5 rounded-xl border border-dashed">No return tanks allocated</p>
                )}
              </div>
            </div>
          </div>

          {/* Validation Status Card */}
          <div className={`mt-4 p-4 rounded-2xl border transition-all duration-500 ${totalShifted === totalSourcedFromStep1 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Females Shifted (a+b)</p>
                <p className={`text-xl font-black ${totalShifted === totalSourcedFromStep1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {totalShifted} / {totalSourcedFromStep1}
                </p>
              </div>
              {totalShifted !== totalSourcedFromStep1 && totalSourcedFromStep1 > 0 && (
                <div className="flex items-center gap-2 text-amber-600 bg-white/50 px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
                  <span className="text-[10px] font-black uppercase">⚠️ Totals do not match</span>
                </div>
              )}
              {totalShifted === totalSourcedFromStep1 && totalSourcedFromStep1 > 0 && (
                <div className="flex items-center gap-2 text-emerald-600 bg-white/50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <span className="text-[10px] font-black uppercase">✅ Allocation Balanced</span>
                </div>
              )}
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
               <div 
                 className={`h-full transition-all duration-1000 ${totalShifted > totalSourcedFromStep1 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                 style={{ width: `${Math.min(100, (totalShifted / (totalSourcedFromStep1 || 1)) * 100)}%` }} 
               />
            </div>
          </div>
        </div>

        {!isPlanningMode && (
          <div className="space-y-1.5 pt-4 border-t border-dashed">
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
