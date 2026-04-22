import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Database, Calculator, CheckCircle2, FlaskConical, Loader2, AlertCircle, ArrowRight, ShieldAlert, PlusCircle, Plus, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface EggCountEntry {
  id: string;
  tankId: string;
  tankName: string;
  spawnedCount: string;
  totalEggsMillions: string;
  fertilizationPercent: string;
  batchNumber?: string;
  isAutoPopulated?: boolean;
}

interface EggCountFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  availableTanks: any[];
  activeSectionId?: string;
  farmId?: string;
  hatcheryId?: string;
  activeBroodstockBatchId?: string | null;
}

const EggCountForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  availableTanks,
  activeSectionId,
  farmId,
  hatcheryId,
  activeBroodstockBatchId,
}: EggCountFormProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<EggCountEntry[]>(data.entries || []);
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [existingEggCounts, setExistingEggCounts] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [totalSpawnedInBatch, setTotalSpawnedInBatch] = useState<number>(data.summary?.totalBatchSpawned || 0);
  const [existingHarvests, setExistingHarvests] = useState<any[]>([]);
  const [existingSales, setExistingSales] = useState<any[]>([]);

  const isSupervisor = user?.role === 'owner' || user?.role === 'supervisor';
  const isEditing = !!searchParams.get('edit') || !!data.id;
  
  // Check if any downstream activity exists (Harvest or Sale)
  const isBatchClosed = useMemo(() => {
    if (!selectedBatchId) return false;
    const hasHarvest = (existingHarvests || []).some(h => (h.data?.selectedBatchId || h.data?.batchId) === selectedBatchId);
    const hasSale = (existingSales || []).some(s => (s.data?.selectedBatchId || s.data?.sourceBatchId) === selectedBatchId);
    return hasHarvest || hasSale;
  }, [existingHarvests, existingSales, selectedBatchId]);

  const canEdit = isSupervisor || (!isEditing && !isBatchClosed);

  const lockedBatchIds = useMemo(() => {
    return (existingEggCounts || []).map(l => 
      l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber || l.data?.displayBatchId
    ).filter(Boolean);
  }, [existingEggCounts]);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch Recent Spawning Batches and existing Egg Counts
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        // 1. Fetch Spawning logs (candidate batches) - ONLY for this broodstock batch
        let spawnQuery = supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Spawning')
          .order('created_at', { ascending: false })
          .limit(100);

        if (activeBroodstockBatchId) {
          spawnQuery = spawnQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const { data: logs, error } = await spawnQuery;

        if (error) throw error;

        // 2. Fetch existing Egg Count logs (to find locked batches) - ONLY for this broodstock batch
        let eggQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Egg Count');
        
        if (activeBroodstockBatchId) {
          eggQuery = eggQuery.eq('stocking_id', activeBroodstockBatchId);
        }
        
        const { data: eggLogs } = await eggQuery;
        setExistingEggCounts(eggLogs || []);

        // 3. Fetch Harvest and Sale logs to check for batch closure
        let harvestCheckQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Harvest');
        
        let saleCheckQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Sale');
        
        if (activeBroodstockBatchId) {
          harvestCheckQuery = harvestCheckQuery.eq('stocking_id', activeBroodstockBatchId);
          saleCheckQuery = saleCheckQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const [{ data: hLogs }, { data: sLogs }] = await Promise.all([
          harvestCheckQuery,
          saleCheckQuery
        ]);

        setExistingHarvests(hLogs || []);
        setExistingSales(sLogs || []);
        
        // Final sanity filter in JS
        const filtered = (logs || []).filter(l => {
          const sId = l.stocking_id || l.stockingId || l.data?.stockingId;
          const bId = l.data?.batchId || l.data?.batchNumber;
          
          return !activeBroodstockBatchId || sId === activeBroodstockBatchId || 
                 (bId && bId.startsWith(activeBroodstockBatchId));
        });
        setBatchLogs(filtered || []);
      } catch (err) {
        console.error('Error fetching batches:', err);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [farmId, activeBroodstockBatchId]);

  // Auto-select batch from dashboard context - ONLY if not locked
  useEffect(() => {
    if (activeBroodstockBatchId && batchLogs.length > 0 && !selectedBatchId) {
      const matches = batchLogs.filter(l => {
        const sId = l.stockingId || l.data?.stockingId;
        const bId = l.data?.batchId || l.data?.batchNumber;
        const matchesBroodstock = sId === activeBroodstockBatchId || (bId && bId.startsWith(activeBroodstockBatchId));
        // Skip if already locked
        return matchesBroodstock && !lockedBatchIds.includes(bId);
      });
      
      if (matches.length > 0) {
        handleBatchSelect(matches[0].data?.batchId || matches[0].data?.batchNumber);
      }
    }
  }, [activeBroodstockBatchId, batchLogs, selectedBatchId, lockedBatchIds]);

  const availableBatches = useMemo(() => {
    const filtered = batchLogs.filter(log => {
      const bId = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      const logStockingId = log.stocking_id || log.data?.stockingId || log.stockingId;

      // Filter by active broodstock batch
      if (activeBroodstockBatchId && logStockingId && logStockingId !== activeBroodstockBatchId) return false;

      // Only show if not locked, OR if it's the currently selected one (for editing)
      return !lockedBatchIds.includes(bId) || bId === selectedBatchId || bId === data.selectedBatchId;
    });

    // De-duplicate by batch ID
    const uniqueMap = new Map();
    filtered.forEach(log => {
      const bn = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      if (bn && !uniqueMap.has(bn)) {
        uniqueMap.set(bn, log);
      }
    });

    return Array.from(uniqueMap.values());
  }, [batchLogs, lockedBatchIds, data.selectedBatchId, selectedBatchId, activeBroodstockBatchId]);

  // When selectedBatchId changes, populate entries from the Spawning log
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (batchId) {
      const log = batchLogs.find(l => l.data?.batchId === batchId || l.data?.batchNumber === batchId);
      if (log && log.data) {
        const spawners = log.data.spawningTanks || [];
        
        // Calculate total spawned animals in this batch for Egg/Animal calculation
        const totalBatchSpawned = spawners.reduce((sum: number, s: any) => sum + (parseFloat(s.spawnedCount) || 0), 0);
        setTotalSpawnedInBatch(totalBatchSpawned);

        const newEntries: EggCountEntry[] = spawners
          .filter((s: any) => (parseFloat(s.spawnedCount) || 0) > 0)
          .map((s: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            tankId: s.tankId,
            tankName: s.tankName,
            spawnedCount: s.spawnedCount,
            totalEggsMillions: '',
            fertilizationPercent: '',
            batchNumber: batchId,
            isAutoPopulated: true
          }));

        setEntries(newEntries);
        onDataChange({ 
          ...data, 
          selectedBatchId: batchId, 
          entries: newEntries,
          summary: { ...data.summary, totalBatchSpawned }
        });
      }
    } else {
      // Clear data if batch is deselected
      setEntries([]);
      setTotalSpawnedInBatch(0);
      onDataChange({ 
        ...data, 
        selectedBatchId: '', 
        entries: [],
        summary: { ...data.summary, totalBatchSpawned: 0, totalEggs: 0, totalFertilized: 0, avgFertilization: 0, eggsPerAnimal: 0 }
      });
    }
  };

  // Perform Consolidated Calculations
  useEffect(() => {
    let totalEggsValue = 0;
    let totalFertilizedValue = 0;

    entries.forEach(entry => {
      const eggs = parseFloat(entry.totalEggsMillions) || 0;
      const fert = parseFloat(entry.fertilizationPercent) || 0;

      totalEggsValue += eggs;
      totalFertilizedValue += (eggs * (fert / 100));
    });

    // Weighted Average Fertilization
    const avgFertilization = totalEggsValue > 0 ? (totalFertilizedValue / totalEggsValue) * 100 : 0;
    
    // Eggs per Animal (Total Eggs / Total Spawned Animals in this batch)
    const eggsPerAnimal = totalSpawnedInBatch > 0 ? (totalEggsValue / totalSpawnedInBatch) : 0;

    const summary = {
      totalEggs: Math.round(totalEggsValue * 100) / 100,
      totalBatchSpawned: totalSpawnedInBatch,
      totalFertilized: Math.round(totalFertilizedValue * 100) / 100,
      avgFertilization: Math.round(avgFertilization * 100) / 100,
      eggsPerAnimal: Math.round(eggsPerAnimal * 100) / 100
    };

    // Only update if summary or entries changed significantly
    if (
      JSON.stringify(data.summary) !== JSON.stringify(summary) || 
      JSON.stringify(data.entries) !== JSON.stringify(entries)
    ) {
      onDataChange({ 
        ...data, 
        entries, 
        summary, 
        selectedBatchId: selectedBatchId,
        displayBatchId: selectedBatchId // Keep original for reference
      });
    }
  }, [entries, totalSpawnedInBatch, selectedBatchId]);





  const updateEntry = (id: string, updates: Partial<EggCountEntry>) => {
    const newList = entries.map(e => {
      if (e.id === id) {
        if (updates.tankId) {
          let foundName = '';
          availableTanks
            .filter(s => !farmId || s.farm_id === farmId)
            .forEach(s => {
              const t = s.tanks.find((t:any) => t.id === updates.tankId);
              if (t) foundName = `${s.name} - ${t.name}`;
            });
          return { ...e, ...updates, tankName: foundName };
        }
        return { ...e, ...updates };
      }
      return e;
    });
    setEntries(newList);
  };

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

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm animate-in zoom-in-95 duration-300">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Read-Only Mode</p>
            <p className="text-[10px] font-medium opacity-80">This {isBatchClosed ? 'finalized' : ''} record can only be edited by a supervisor.</p>
          </div>
        </div>
      )}

      <div className={cn("glass-card rounded-3xl p-6 border shadow-sm space-y-8 relative", !canEdit && "opacity-80 pointer-events-none select-none")}>
        {/* STEP #1: BATCH SELECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <div className="p-2 bg-indigo-100 rounded-xl">
                <Database className="w-4 h-4 text-indigo-600" />
             </div>
             <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1: Choose Nauplii Production Batch</h3>
          </div>

                <Select value={selectedBatchId} onValueChange={handleBatchSelect}>
                   <SelectTrigger className="h-12 rounded-2xl border-indigo-100 bg-background/50 text-sm font-black text-indigo-900 focus:ring-indigo-500">
                     <SelectValue placeholder="Search Batch ID" />
                   </SelectTrigger>
                   <SelectContent>
                     {loadingBatches ? (
                       <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...</div>
                     ) : (
                       availableBatches.map(log => {
                         const bn = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
                         return (
                           <SelectItem key={log.id} value={bn}>
                              <span className="font-bold">{bn}</span>
                           </SelectItem>
                         );
                       })
                     )}
                   </SelectContent>
                </Select>

                {!loadingBatches && availableBatches.length === 0 && (
                  <div className="flex flex-col items-center gap-3 text-amber-600 bg-amber-50 p-6 rounded-3xl border border-amber-100 animate-in fade-in zoom-in-95 w-full mt-4">
                    <div className="p-3 bg-amber-100 rounded-2xl">
                      <AlertCircle className="w-8 h-8 text-amber-600" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-black uppercase tracking-tight">No Spawning Batch Found</p>
                      <p className="text-[11px] text-amber-700/70 font-medium leading-tight max-w-[240px]">
                        Please record a "Spawning" activity first for this broodstock batch.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 w-full mt-2">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase gap-2 w-full"
                        onClick={() => navigate(`${user?.role === 'owner' ? '/owner' : '/user'}/activity/sourcing & mating?farm=${farmId}&category=MATURATION`)}
                       >
                         <PlusCircle className="w-3 h-3" /> Record Sourcing
                       </Button>
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase gap-2 w-full"
                        onClick={() => navigate(`${user?.role === 'owner' ? '/owner' : '/user'}/activity/spawning?farm=${farmId}&category=MATURATION`)}
                       >
                         <PlusCircle className="w-3 h-3" /> Record Spawning
                       </Button>
                    </div>
                  </div>
                )}
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {selectedBatchId ? (
          <>
            {/* STEP #2: EGG COUNT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="p-2 bg-indigo-100 rounded-xl">
                    <FlaskConical className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2: Egg Count Details</h3>
              </div>

              {loadingBatches && entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl border border-dashed text-muted-foreground gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Syncing recent spawning data...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl border border-dashed text-muted-foreground gap-4">
                    <div className="p-3 bg-muted/10 rounded-full">
                      <AlertCircle className="w-5 h-5 opacity-40" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider">No active spawns loaded</p>
                      <p className="text-[10px] opacity-60 mt-1">Please select a Batch ID to automatically load spawning data.</p>
                    </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="p-6 bg-indigo-50/40 border-indigo-100 shadow-sm rounded-[2rem] group transition-all hover:bg-indigo-50/60 relative overflow-hidden">
                      <div className="space-y-6">
                        {/* Header: Tank and Population */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-muted-foreground/10">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 leading-none">Spawning Tank</Label>
                            {entry.tankId && entry.tankName ? (
                              <p className="text-lg font-black text-indigo-950 ml-1">{entry.tankName}</p>
                            ) : (
                              <p className="text-sm font-bold text-muted-foreground italic ml-1">Unknown Tank</p>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <div className="bg-primary/5 px-3 py-1 rounded-xl border border-primary/10 flex items-center gap-2">
                                <Database className="w-3 h-3 text-primary" />
                                <span className="text-[9px] font-black text-primary uppercase">{entry.batchNumber || 'NO BATCH'}</span>
                            </div>
                            <div className="bg-white/50 px-4 py-2 rounded-2xl border flex flex-col items-center justify-center min-w-[120px]">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter mb-0.5">Animals Spawned</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xl font-black text-foreground">{entry.spawnedCount}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase">Females</span>
                                </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none px-1">No. Eggs Spawned (Millions) *</Label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                step="0.01"
                                value={entry.totalEggsMillions} 
                                onChange={e => updateEntry(entry.id, { totalEggsMillions: e.target.value })} 
                                className="h-14 rounded-2xl font-black bg-white border-indigo-100 text-xl text-indigo-900 focus:border-indigo-500 shadow-sm pr-12 placeholder:font-medium placeholder:opacity-30" 
                                placeholder="0"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-300">MILL</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none px-1">% of Fertilized Eggs *</Label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                value={entry.fertilizationPercent} 
                                onChange={e => updateEntry(entry.id, { fertilizationPercent: e.target.value })} 
                                className="h-14 rounded-2xl font-black bg-white border-indigo-100 text-xl text-indigo-950 focus:border-indigo-500 shadow-sm pr-12 placeholder:font-medium placeholder:opacity-30" 
                                placeholder="0"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-indigo-300 opacity-40">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-muted-foreground/10 mx-4" />

            {/* STEP #3: CONSOLIDATED DATA */}
            <div className="space-y-4 pb-8">
              <div className="flex items-center gap-2 px-1">
                <div className="p-2 bg-indigo-100 rounded-xl">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Step # 3: Consolidated Data</h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-indigo-50/30 border-indigo-100 flex flex-col justify-center shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">Total Egg Count</p>
                  <div className="flex items-baseline gap-1 font-black text-indigo-950">
                    <span className="text-2xl leading-none">{(data.summary?.totalEggs || 0).toLocaleString()}</span>
                    <span className="text-[10px] uppercase opacity-40">mil</span>
                  </div>
                </Card>

                <Card className="p-4 bg-indigo-50/30 border-indigo-100 flex flex-col justify-center shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 leading-tight">Approx No. of Fertilized Egg</p>
                  <div className="flex items-baseline gap-1 font-black text-indigo-950">
                    <span className="text-2xl leading-none">{(data.summary?.totalFertilized || 0).toLocaleString()}</span>
                    <span className="text-[10px] uppercase opacity-40">mil</span>
                  </div>
                </Card>

                <Card className="p-4 bg-indigo-50/30 border-indigo-100 flex flex-col justify-center shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">Avg % Fertilization</p>
                  <p className="text-2xl font-black text-indigo-950 leading-none">{(data.summary?.avgFertilization || 0).toFixed(1)}%</p>
                </Card>

                <Card className="p-4 bg-indigo-50/30 border-indigo-100 flex flex-col justify-center shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">No. of Eggs per Animal</p>
                  <div className="flex items-baseline gap-1 font-black text-indigo-950">
                    <span className="text-2xl leading-none">{(data.summary?.eggsPerAnimal || 0).toLocaleString()}</span>
                    <span className="text-[10px] uppercase opacity-40">mil</span>
                  </div>
                  <p className="text-[8px] font-bold text-indigo-600/60 mt-1 leading-none italic truncate">({data.summary?.totalEggs}M / {data.summary?.totalBatchSpawned} animals)</p>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-indigo-50/20 rounded-[2.5rem] border border-dashed border-indigo-100 text-indigo-400 gap-4 group hover:bg-indigo-50/40 transition-colors">
            <div className="p-4 bg-white rounded-[1.5rem] shadow-sm group-hover:scale-110 transition-transform duration-500">
               <Database className="w-8 h-8 opacity-40" />
            </div>
            <div className="text-center space-y-1">
               <p className="text-sm font-black uppercase tracking-widest">No Batch Selected</p>
               <p className="text-[10px] font-medium opacity-60">Please choose a Nauplii Production Batch in Step 1 to load egg count details.</p>
            </div>
          </div>
        )}

        {/* Activity Photo */}
        <div className="space-y-1.5 pt-4 border-t border-dashed">
          <Label className="text-xs">Activity Photo (Optional)</Label>
          <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
        </div>

        {/* Comments */}
        <div className="space-y-1.5">
          <Label className="text-xs">Comments</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder="Add notes..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

export default EggCountForm;
