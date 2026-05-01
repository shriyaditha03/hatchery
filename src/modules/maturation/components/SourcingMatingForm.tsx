import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';

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
  activeBroodstockBatchId?: string | null;
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
  activeBroodstockBatchId,
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
  const [batchNo, setBatchNo] = useState<string>(data.batchNo || 'B1');

  // Auto-fetch next batch number for today
  useEffect(() => {
    const fetchNextBatchNo = async () => {
      // If we already have a batchNo (e.g. from saved data or editing), don't overwrite
      if (data.batchNo || !farmId) return;
      
      try {
        const today = getTodayStr();
        // Get "Sourcing & Mating" records for today at this farm
        // We fetch the data because one submission creates multiple log entries (one per tank + sync logs)
        const { data: logs, error } = await supabase
          .from('activity_logs')
          .select('data')
          .eq('activity_type', 'Sourcing & Mating')
          .eq('farm_id', farmId)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);
        
        if (!error && logs) {
          // Extract unique batch numbers from the logs
          const uniqueBatches = new Set(
            logs.map(log => log.data?.batchNumber || log.data?.naupliiBatchId)
               .filter(Boolean)
          );
          const nextNo = `B${uniqueBatches.size + 1}`;
          setBatchNo(nextNo);
          // We don't call updateData here yet, it will happen in the batch generator effect
        }
      } catch (err) {
        console.error('Error fetching batch count:', err);
      }
    };

    fetchNextBatchNo();
  }, [farmId, data.batchNo]);

  // Auto-fill tracking state
  const [editedFields, setEditedFields] = useState<Record<string, boolean>>(data.editedFields || {});

  const generateBatchId = (totalSourcedCount: number = 0, totalMatedCount: number = 0) => {
    const dateStr = getTodayStr().replace(/-/g, '').slice(2); // YYMMDD
    return `NP_FS${totalSourcedCount}_FM${totalMatedCount}_${dateStr}_${batchNo}`;
  };

  // Auto-generate Batch ID if not present or if totals change
  useEffect(() => {
    const totalSourced = sourceTanks.reduce((sum, s) => sum + (parseFloat(s.femaleCount) || 0), 0);
    const totalMated = matingTanks.reduce((sum, t) => sum + (parseFloat(t.femalesMated) || 0), 0);
    if (!isBatchIdManuallyEdited) {
      const newId = generateBatchId(totalSourced, totalMated);
      if (newId !== batchNumber) {
        setBatchNumber(newId);
        updateData({ batchNumber: newId });
      }
    }
  }, [sourceTanks, matingTanks, farmId]);

  const updateData = (updates: any) => {
    onDataChange({ 
      ...data, 
      ...updates, 
      batchNumber: updates.batchNumber !== undefined ? updates.batchNumber : batchNumber,
      batchNo: updates.batchNo !== undefined ? updates.batchNo : batchNo
    });
  };

  // 1. Automatically populate Field 1 with female tanks from the active Broodstock Batch
  useEffect(() => {
    if (availableTanks.length > 0 && activeBroodstockBatchId) {
      // Re-run if we haven't found tanks yet, in case population data was still loading
      if (sourceTanks.length === 0 || matingTanks.length === 0) {
         fetchInitialData();
      }
    }
  }, [availableTanks, activeBroodstockBatchId, farmId, tankPopulations]);

  const fetchInitialData = async () => {
    let stockedTankIds: string[] = [];
    try {
      // 1. Get the Stocking record for this batch to find specific tanks
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('data, stocking_id')
        .eq('activity_type', 'Stocking')
        .eq('farm_id', farmId)
        .eq('stocking_id', activeBroodstockBatchId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && logs && logs[0]?.data?.allocations) {
         stockedTankIds = Object.keys(logs[0].data.allocations);
      }
    } catch (err) {
      console.warn('Stocking record not found for batch:', activeBroodstockBatchId);
    }

    const initialSources: any[] = [];
    const initialMating: any[] = [];
    const filteredSections = availableTanks;

    filteredSections.forEach(section => {
      // Only source from ANIMAL sections
      const isAnimalSection = section.section_type === 'ANIMAL' || (section.name || '').toUpperCase().includes('ANIMAL');
      
      section.tanks.forEach((t: any) => {
        const availableCount = tankPopulations[t.id] || 0;
        // If we found specific stocking records, use them; otherwise trust the availableTanks (which is already filtered by batch in RecordActivity)
        const isStockedInBatch = stockedTankIds.length === 0 || stockedTankIds.includes(t.id);

        if (!isStockedInBatch) return;

        const genderUpper = (t.gender || '').toUpperCase();
        
        // Field 1: Female Sourcing - Only from ANIMAL sections
        if (isAnimalSection && genderUpper === 'FEMALE' && availableCount > 0) {
          initialSources.push({
            id: t.id,
            tankId: t.id,
            tankName: t.name || t.tank_name || 'Unknown',
            sectionName: section.name,
            available: availableCount,
            femaleCount: ''
          });
        }

        // Field 2: Male Mating - Usually these are in the same batch's ANIMAL sections
        if (isAnimalSection && genderUpper === 'MALE' && availableCount > 0) {
          initialMating.push({
            id: t.id,
            tankId: t.id,
            tankName: t.name || t.tank_name || 'Unknown',
            maleCount: availableCount,
            femalesAdded: '',
            femalesMated: '',
            balance: 0
          });
        }
      });
    });

    if (initialSources.length > 0 && sourceTanks.length === 0) {
      setSourceTanks(initialSources);
      updateData({ sourceTanks: initialSources });
    }
    if (initialMating.length > 0 && matingTanks.length === 0) {
      setMatingTanks(initialMating);
      updateData({ matingTanks: initialMating });
    }
  };

  // Sync populations for mating tanks when they load
  useEffect(() => {
    if (matingTanks.length > 0) {
      const updatedMating = matingTanks.map(m => {
        const currentPop = tankPopulations[m.tankId] || 0;
        if (m.maleCount !== currentPop) {
          return { ...m, maleCount: currentPop };
        }
        return m;
      });
      
      if (JSON.stringify(updatedMating) !== JSON.stringify(matingTanks)) {
        setMatingTanks(updatedMating);
        updateData({ matingTanks: updatedMating });
      }
    }
  }, [tankPopulations]);

  useEffect(() => {
    if (sourceTanks.length > 0) {
      // Sync available counts if they change
      const updatedSources = sourceTanks.map(s => ({
        ...s,
        available: tankPopulations[s.tankId] || s.available || 0
      }));
      if (JSON.stringify(updatedSources) !== JSON.stringify(sourceTanks)) {
        setSourceTanks(updatedSources);
      }
    }
  }, [tankPopulations]);

  const handleSourceChange = (id: string, sourcedCount: string) => {
    const newList = sourceTanks.map(s => s.id === id ? { ...s, femaleCount: sourcedCount } : s);
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
        
        // Auto-calculate balance: femalesAdded - femalesMated
        const added = parseFloat(updated.femalesAdded) || 0;
        const mated = parseFloat(updated.femalesMated) || 0;
        updated.balance = Math.max(0, added - mated);

        // Sync male count if tank changes
        if (updates.tankId) {
          updated.maleCount = tankPopulations[updates.tankId] || 0;
        }
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

  const handleMatedDestinationChange = (idOrTankId: string, updates: any, isManual = false) => {
    const newList = matedDestinations.map(d =>
      (d.id === idOrTankId || d.tankId === idOrTankId) ? { ...d, ...updates } : d
    );
    if (isManual && updates.count !== undefined) {
      setEditedFields(prev => ({ ...prev, [`mated_dest_${idOrTankId}`]: true }));
    }
    setMatedDestinations(newList);
  };

  const addReturnDestination = () => {
    const newList = [...returnDestinations, { id: Date.now().toString(), tankId: '', count: '' }];
    setReturnDestinations(newList);
  };

  const removeReturnDestination = (id: string) => {
    const newList = returnDestinations.filter(d => d.id !== id);
    setReturnDestinations(newList);
  };

  const handleReturnDestinationChange = (idOrTankId: string, updates: any, isManual = false) => {
    const newList = returnDestinations.map(d =>
      (d.id === idOrTankId || d.tankId === idOrTankId) ? { ...d, ...updates } : d
    );
    if (isManual && updates.count !== undefined) {
      setEditedFields(prev => ({ ...prev, [`return_dest_${idOrTankId}`]: true }));
    }
    setReturnDestinations(newList);
  };

  const totalSourcedFromStep1 = sourceTanks.reduce((sum, s) => sum + (parseFloat(s.femaleCount) || 0), 0);
  const totalFemalesAddedAcrossTanks = matingTanks.reduce((sum, t) => sum + (parseFloat(t.femalesAdded) || 0), 0);
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
      }
    }
  }, [totalSourcedFromStep1, matingTanks.length, editedFields]);

  // 2. Field 2 (Mated/Balance) -> Field 3 (Destinations)
  useEffect(() => {
    // a) Mated -> Spawning
    // a) Mated -> Spawning
    if (matedDestinations.length === 1) {
      const dest = matedDestinations[0];
      const fieldKey = `mated_dest_${dest.id}`;
      const targetCount = totalFemalesMatedAcrossTanks.toString();
      if (!editedFields[fieldKey] && dest.count !== targetCount) {
        const newList = matedDestinations.map(d => d.id === dest.id ? { ...d, count: targetCount } : d);
        setMatedDestinations(newList);
      }
    }
    // b) Balance -> Return
    if (returnDestinations.length === 0 && totalBalanceNonMated > 0) {
      // Find the primary source tank to return to
      const mainSource = sourceTanks.find(s => (parseFloat(s.femaleCount) || 0) > 0);
      if (mainSource) {
        const newList = [{ id: Date.now().toString(), tankId: mainSource.tankId, count: totalBalanceNonMated.toString() }];
        setReturnDestinations(newList);
      }
    } else if (returnDestinations.length === 1) {
      const dest = returnDestinations[0];
      const fieldKey = `return_dest_${dest.id}`;
      const targetCount = totalBalanceNonMated.toString();
      if (!editedFields[fieldKey] && dest.count !== targetCount) {
        const newList = returnDestinations.map(d => d.id === dest.id ? { ...d, count: targetCount } : d);
        setReturnDestinations(newList);
      }
    }
  }, [totalFemalesMatedAcrossTanks, totalBalanceNonMated, matedDestinations.length, returnDestinations.length, sourceTanks, editedFields]);

  // 3. MASTER SYNC TO PARENT
  useEffect(() => {
    const nextData = {
      ...data,
      batchNumber,
      sourceTanks,
      matingTanks,
      matedDestinations,
      returnDestinations,
      totalSourced: totalSourcedFromStep1,
      matedCount: totalFemalesMatedAcrossTanks,
      balanceCount: totalBalanceNonMated,
      totalShifted,
      summary: {
        totalSourced: totalSourcedFromStep1,
        totalMated: totalFemalesMatedAcrossTanks,
        totalBalance: totalBalanceNonMated
      }
    };

    if (JSON.stringify(nextData) !== JSON.stringify(data)) {
      onDataChange(nextData);
    }
  }, [batchNumber, sourceTanks, matingTanks, matedDestinations, returnDestinations, totalSourcedFromStep1, totalFemalesMatedAcrossTanks, totalBalanceNonMated, totalShifted]);

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

  const spawningTanksOptions = React.useMemo(() => {
    // Phase 1: Try many keywords
    const matches = availableTanks
      .filter(s => {
        const sType = (s.section_type || '').toUpperCase();
        const sName = (s.name || '').toUpperCase();
        return (sType.includes('SPAWN') || sName.includes('SPAWN') || sName.includes('SPW') || sName.includes('SS') || sName.includes('SP-')) && (!farmId || s.farm_id === farmId);
      });

    // Phase 2: If keywords fail, show ALL Maturation sections that aren't the animal/source ones
    const finalSections = matches.length > 0 ? matches : availableTanks.filter(s => {
      const sName = (s.name || '').toUpperCase();
      return s.farm_category === 'MATURATION' && !sName.includes('ANIMAL') && !sName.includes('BS') && (!farmId || s.farm_id === farmId);
    });

    // Phase 3: Final check - if we STILL have nothing, just show all empty tanks in the entire farm
    const pool = finalSections.length > 0 ? finalSections : availableTanks;

    return pool.flatMap(s => s.tanks
      .filter((t: any) => (tankPopulations[t.id] || 0) === 0)
      .map((t: any) => ({
        id: t.id,
        label: `${s.name} - ${t.name}`
      })));
  }, [availableTanks, farmId, tankPopulations]);

  const returnTanksOptions = React.useMemo(() => {
    return sourceTanks
      .filter(s => parseFloat(s.femaleCount) > 0)
      .map(s => ({
        id: s.tankId,
        label: s.tankName
      }));
  }, [sourceTanks]);

  // Auto-fill Spawning Destinations
  useEffect(() => {
    setMatedDestinations(prev => {
      const existing = new Map(prev.map(p => [p.tankId, p]));
      const nextDests = spawningTanksOptions.map(opt => {
        const ex = existing.get(opt.id) || {};
        return {
          id: ex.id || opt.id,
          tankId: opt.id,
          tankName: opt.label.split(' - ')[1] || opt.label,
          count: ex.count || ''
        };
      });
      if (JSON.stringify(nextDests) !== JSON.stringify(prev)) {
        return nextDests;
      }
      return prev;
    });
  }, [spawningTanksOptions]);

  // Auto-fill Return Destinations
  useEffect(() => {
    setReturnDestinations(prev => {
      const existing = new Map(prev.map(p => [p.tankId, p]));
      const nextReturns = returnTanksOptions.map(opt => {
         const ex = existing.get(opt.id) || {};
         return {
           id: ex.id || opt.id,
           tankId: opt.id,
           tankName: opt.label,
           count: ex.count || ''
         };
      });
      if (JSON.stringify(nextReturns) !== JSON.stringify(prev)) {
         return nextReturns;
      }
      return prev;
    });
  }, [returnTanksOptions]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {activeBroodstockBatchId && activeBroodstockBatchId !== 'new' && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between shadow-sm border-l-4 border-l-red-500">
           <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-xl text-red-600">
                 <Database className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest opacity-70">Active Broodstock Batch</p>
                 <p className="text-sm font-black text-red-900">{activeBroodstockBatchId}</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest opacity-70">Context</p>
              <p className="text-[10px] font-bold text-red-600 italic">Maturation Module</p>
           </div>
        </div>
      )}
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* Batch Information */}
        <div className="p-5 bg-primary/5 rounded-[2rem] border border-dashed border-primary/20 space-y-4">
           <div className="flex items-center gap-2 text-primary">
              <Database className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Nauplii Production Batch ID</h3>
           </div>
           
           <div className="relative">
              <Input 
                value={batchNumber}
                onChange={(e) => {
                  setBatchNumber(e.target.value);
                  setIsBatchIdManuallyEdited(true);
                  updateData({ batchNumber: e.target.value });
                }}
                className="h-14 rounded-2xl font-black bg-white border-primary/10 text-xl text-primary tracking-tight shadow-sm text-center uppercase placeholder:font-medium placeholder:opacity-30"
                placeholder="BATCH-ID"
              />
           </div>
           <p className="text-[9px] text-muted-foreground italic text-center px-4">
             Unique identifier used to track this batch lifecycle.
           </p>
        </div>

        {/* FIELD 1: Ripe Females Sourced */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Search className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Step # 4 Ripe Females Sourced</h3>
            </div>
            <div className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-1 rounded-md">
              Female Tanks in Animal Sections
            </div>
          </div>

          <div className="space-y-3">
            {sourceTanks.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded-2xl">No female tanks found in Animal sections</p>
            )}
            {sourceTanks.map((source) => (
              <Card key={source.id} className="p-4 bg-rose-50/40 border-rose-100/50 rounded-2xl relative group overflow-hidden shadow-sm hover:bg-rose-50/60 transition-colors">
                <div className="space-y-3">
                  {/* Row 1: Tank info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                         <p className="text-sm font-bold text-foreground">{source.tankName}</p>
                         {source.sectionName && (
                           <span className="text-[8px] font-black uppercase text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-sm">
                             {source.sectionName}
                           </span>
                         )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Available:</span>
                        <span className="text-[10px] font-black text-rose-600">{source.available} F</span>
                      </div>
                    </div>
                  </div>
                  {/* Row 2: Sourced input + Balance */}
                  <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <div>
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block ml-1">Sourced (F) *</Label>
                      <div className="relative group/input">
                        <Input 
                          type="number" 
                          value={source.femaleCount} 
                          onChange={e => handleSourceChange(source.id, e.target.value)} 
                          className={cn(
                            "h-10 rounded-xl text-sm font-bold pr-8 focus:ring-rose-500/20 placeholder:font-medium placeholder:opacity-30",
                            (parseFloat(source.femaleCount) || 0) > (source.available || 0) && "border-red-500 bg-red-50 text-red-900 focus:ring-red-500/20"
                          )}
                          placeholder="0"
                          min="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-600/40 pointer-events-none">F</span>
                      </div>
                      {(parseFloat(source.femaleCount) || 0) > (source.available || 0) && (
                        <p className="text-[8px] font-bold text-red-600 mt-1 ml-1 animate-pulse">
                          Cannot exceed available females ({source.available})
                        </p>
                      )}
                    </div>
                    <div className="w-16 flex flex-col items-center justify-center pb-0.5">
                       <Label className="text-[8px] font-bold uppercase text-muted-foreground mb-1 block">Balance</Label>
                       <span className="text-sm font-black text-rose-700/60">
                         {Math.max(0, (source.available || 0) - (parseFloat(source.femaleCount) || 0))}
                       </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalSourcedFromStep1 > 0 && (
            <div className="flex justify-between items-center px-4 py-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-100">
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
              <div className="p-2 bg-blue-100 rounded-xl">
                <Heart className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Step # 5 Mating (Male Tanks)</h3>
            </div>
          </div>
          <div className="px-1 text-[10px] text-muted-foreground italic -mt-2">Enter mating data for each male tank.</div>


          <div className="space-y-4">
            {matingTanks.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-6 border border-dashed rounded-2xl">
                No male tanks with animals found — ensure tanks are stocked.
              </p>
            )}
            {matingTanks.map((mating, idx) => (
              <Card key={mating.id} className="p-4 bg-blue-50/40 border-blue-100 shadow-sm rounded-2xl space-y-4 relative group hover:bg-blue-50/60 transition-colors">
                <div className="flex items-center justify-between border-b border-blue-100/30 pb-3">
                   <div className="flex items-center gap-4">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-indigo-600/70 tracking-widest leading-none">Male Tank</span>
                          <span className="text-base font-black text-indigo-950 mt-0.5 tracking-tight">{mating.tankName}</span>
                       </div>
                      <div className="flex flex-col">
                         <span className="text-[9px] font-black uppercase text-blue-600/70 tracking-widest leading-none">Male Animals</span>
                         <span className="text-base font-black text-blue-950 mt-0.5">{mating.maleCount} (M)</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-blue-900/60 ml-1">Female Added</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={mating.femalesAdded} 
                        onChange={e => handleMatingTankChange(mating.id, { femalesAdded: e.target.value }, true)} 
                        className={cn(
                          "h-11 rounded-xl font-black bg-white border-blue-100 text-blue-950 pr-8 shadow-sm focus:border-blue-500 placeholder:font-medium placeholder:opacity-30",
                          totalFemalesAddedAcrossTanks > totalSourcedFromStep1 && "border-red-500 bg-red-50 text-red-900"
                        )}
                        placeholder="0"
                        min="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400">F</span>
                    </div>
                    {totalFemalesAddedAcrossTanks > totalSourcedFromStep1 && idx === 0 && (
                      <p className="text-[8px] font-bold text-red-600 mt-1 ml-1">Total added exceeds sourced count</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-indigo-900/60 ml-1">(F) Mated</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={mating.femalesMated} 
                        onChange={e => handleMatingTankChange(mating.id, { femalesMated: e.target.value })} 
                        className={cn(
                          "h-11 rounded-xl font-black bg-white border-indigo-100 text-indigo-950 pr-8 shadow-sm focus:border-indigo-500 placeholder:font-medium placeholder:opacity-30",
                          (parseFloat(mating.femalesMated) || 0) > (parseFloat(mating.femalesAdded) || 0) && "border-red-500 bg-red-50 text-red-900"
                        )}
                        placeholder="0"
                        min="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400">F</span>
                    </div>
                    {(parseFloat(mating.femalesMated) || 0) > (parseFloat(mating.femalesAdded) || 0) && (
                      <p className="text-[8px] font-bold text-red-600 mt-1 ml-1">Cannot exceed added count</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dashed border-blue-100">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Balance Non-Mated:</span>
                    <div className="flex items-center gap-1.5">
                       <span className="text-sm font-black text-indigo-700">{mating.balance}</span>
                       <span className="text-[10px] font-bold text-indigo-400 uppercase">F</span>
                    </div>
                </div>
              </Card>
            ))}
          </div>

          {matingTanks.length > 0 && (
            <div className="flex flex-col gap-4 p-4 bg-muted/20 rounded-2xl border border-dashed">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Total Added</p>
                    <p className={`text-lg font-black ${totalFemalesAddedAcrossTanks === totalSourcedFromStep1 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {totalFemalesAddedAcrossTanks} / {totalSourcedFromStep1}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Total Mated</p>
                    <p className="text-lg font-black text-foreground">{totalFemalesMatedAcrossTanks} <span className="text-xs font-normal text-muted-foreground">F</span></p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Total Non-Mated</p>
                    <p className="text-lg font-black text-foreground">{totalBalanceNonMated} <span className="text-xs font-normal text-muted-foreground">F</span></p>
                  </div>
                </div>
                
                {totalFemalesAddedAcrossTanks < totalSourcedFromStep1 && totalSourcedFromStep1 > 0 && (
                  <div className="flex items-center gap-2 text-amber-600 bg-white/50 px-3 py-1.5 rounded-full border border-amber-200 text-[9px] font-black uppercase">
                    <span>⚠️ {totalSourcedFromStep1 - totalFemalesAddedAcrossTanks} Left to add</span>
                  </div>
                )}
                {totalFemalesAddedAcrossTanks > totalSourcedFromStep1 && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 text-[9px] font-black uppercase animate-bounce">
                    <span>❌ {totalFemalesAddedAcrossTanks - totalSourcedFromStep1} Over Sourced</span>
                  </div>
                )}
                {totalFemalesAddedAcrossTanks === totalSourcedFromStep1 && totalSourcedFromStep1 > 0 && (
                  <div className="flex items-center gap-2 text-emerald-600 bg-white/50 px-3 py-1.5 rounded-full border border-emerald-200 text-[9px] font-black uppercase">
                    <span>✅ All Sourced Added</span>
                  </div>
                )}
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
            <h3 className="text-sm font-bold uppercase tracking-wider">Animal Movement After Mating</h3>
          </div>
          <div className="px-1 text-[10px] text-muted-foreground italic -mt-2">Record where mated and non-mated animals are shifted to.</div>

          {/* 3a: Spawning Tanks - Auto-populated */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-violet-100 rounded-lg">
                <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <Label className="text-[10px] font-black uppercase text-violet-700">Mated Animals → Spawning Tanks</Label>
            </div>
            <div className="px-1 text-[8px] text-violet-400 font-bold mb-1">Only empty spawning tanks shown</div>
            {matedDestinations.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-4 border border-dashed rounded-xl">
                No empty spawning tanks available
              </p>
            )}
            {matedDestinations.map(dest => (
              <div key={dest.tankId} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-violet-50/40 border border-violet-100 rounded-xl">
                <div>
                  <p className="text-xs font-black text-violet-900 leading-none">{dest.tankName}</p>
                  <p className="text-[9px] text-violet-400 font-bold uppercase mt-0.5">Spawning Tank</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-24">
                    <Input
                      type="number"
                      min="0"
                      value={dest.count}
                      onChange={e => handleMatedDestinationChange(dest.tankId, { count: e.target.value }, true)}
                      className="h-9 rounded-xl text-center font-bold border-violet-200 bg-white text-violet-900 pr-6 text-sm focus:border-violet-500 shadow-sm placeholder:font-medium placeholder:opacity-30"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-violet-400">F</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-muted-foreground/10" />

          {/* 3b: Return to Female Source Tanks - Auto-populated */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 mb-1">
               <div className="p-1.5 bg-rose-100 rounded-lg">
                 <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
               </div>
               <Label className="text-[10px] font-black uppercase text-rose-700">Non-Mated (Balance) → Return to Source</Label>
             </div>
             {returnDestinations.length === 0 && (
               <p className="text-[10px] text-muted-foreground italic text-center py-4 border border-dashed rounded-xl">
                 No return destinations selected — sourcing data missing.
               </p>
             )}
             {returnDestinations.map(dest => (
               <div key={dest.tankId} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-rose-50/40 border border-rose-100 rounded-xl">
                 <div>
                   <p className="text-xs font-black text-rose-950 leading-none">{dest.tankName}</p>
                   <p className="text-[9px] text-rose-400 font-bold uppercase mt-0.5">Female Source Tank</p>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="relative w-24">
                     <Input
                       type="number"
                       min="0"
                       value={dest.count}
                       onChange={e => handleReturnDestinationChange(dest.tankId, { count: e.target.value }, true)}
                       className="h-9 rounded-xl text-center font-bold border-rose-200 bg-white text-rose-900 pr-6 text-sm focus:border-rose-500 shadow-sm placeholder:font-medium placeholder:opacity-30"
                       placeholder="0"
                     />
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-400">F</span>
                   </div>
                 </div>
               </div>
             ))}
          </div>

          <div className="bg-violet-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-violet-100">
             <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                   <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">Total Allocated</p>
                   <p className="text-lg font-black text-white">{totalShifted} <span className="text-xs opacity-50">Females</span></p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Target</p>
                <p className="text-lg font-black text-white">{totalSourcedFromStep1}</p>
             </div>
          </div>
        </div>

        {/* Photos & Comments */}
        <div className="space-y-6 pt-4 border-t border-dashed">
          <div className="space-y-3">
             <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">Activity Photo (Optional)</Label>
             <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
          </div>

          <div className="space-y-3">
             <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">Comments</Label>
             <Textarea
               value={comments}
               onChange={e => onCommentsChange(e.target.value)}
               placeholder="Add mating notes..."
               rows={3}
               className="rounded-[1.5rem] border-muted-foreground/10 bg-muted/5 font-medium"
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourcingMatingForm;
