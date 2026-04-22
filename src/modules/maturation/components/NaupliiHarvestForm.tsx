import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, PlusCircle, Trash2, Calculator, Database, DatabaseIcon, Loader2, AlertCircle, ArrowRight, FlaskConical, Beaker, ClipboardList, Camera, Info, Sparkles, TrendingUp, CheckCircle2, ListChecks, Layers, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import RatingScale from '@/modules/shared/components/RatingScale';
import { ANIMAL_RATING_FIELDS } from '@/modules/shared/constants/activity';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface HarvestTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  harvestedMil: string;
  isAutoPopulated?: boolean;
}

interface ShiftingTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  shiftedMil: string;
}

interface NaupliiHarvestFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl: string;
  onPhotoUrlChange: (val: string) => void;
  availableTanks: any[];
  isPlanningMode?: boolean;
  farmId?: string;
  activeBroodstockBatchId?: string | null;
  tankPopulations?: Record<string, number>;
}

const NaupliiHarvestForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  availableTanks,
  isPlanningMode = false,
  farmId,
  activeBroodstockBatchId,
  tankPopulations = {},
}: NaupliiHarvestFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [existingHarvests, setExistingHarvests] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [harvestTanks, setHarvestTanks] = useState<HarvestTankEntry[]>(data.harvestTanks || []);
  const [shiftingTanks, setShiftingTanks] = useState<ShiftingTankEntry[]>(data.naupliiDestinations || []);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [totalEggsInBatch, setTotalEggsInBatch] = useState<number>(data.summary?.totalBatchEggs || 0);
  const [totalSpawnedInBatch, setTotalSpawnedInBatch] = useState<number>(data.summary?.totalBatchSpawned || 0);
  const [selectionScope, setSelectionScope] = useState<'single' | 'all' | 'custom'>(data.selectionScope || 'custom');
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>(data.animalRatings || {});
  const [perTankEggCounts, setPerTankEggCounts] = useState<Record<string, string>>({}); // tankId -> eggCountMil
  const [existingSales, setExistingSales] = useState<any[]>([]);

  const isSupervisor = user?.role === 'owner' || user?.role === 'supervisor';
  const isEditing = !!searchParams.get('edit') || !!data.id;

  // Check if a sale already exists for this batch
  const isBatchAlreadySold = useMemo(() => {
    if (!selectedBatchId) return false;
    return (existingSales || []).some(sale => {
      const saleBatchId = sale.data?.selectedBatchId || sale.data?.sourceBatchId;
      return saleBatchId === selectedBatchId;
    });
  }, [existingSales, selectedBatchId]);

  const canEdit = isSupervisor || (!isEditing && !isBatchAlreadySold);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Animal Quality Score
  const animalValues = ANIMAL_RATING_FIELDS.map(f => animalRatings[f.key] || 0);
  const animalFilledCount = animalValues.filter(v => v > 0).length;
  const animalAvg = animalFilledCount > 0 ? animalValues.reduce((a, b) => a + b, 0) / animalFilledCount : 0;

  const setRating = (key: string, value: number) => {
    const newRatings = { ...animalRatings, [key]: value };
    setAnimalRatings(newRatings);
    updateData({ animalRatings: newRatings });
  };

  const availableNaupliiTanks = useMemo(() => {
    const naupliiSections = availableTanks.filter(s => s.section_type === 'NAUPLII' && s.farm_id === farmId);
    return naupliiSections.flatMap(s => s.tanks.map((t: any) => ({
      ...t,
      sectionName: s.name,
      population: tankPopulations[t.id] || 0
    }))).filter(t => t.population === 0); // Only not stocked tanks
  }, [availableTanks, farmId, tankPopulations]);

  // Handle Scope Change
  const handleScopeChange = (newScope: 'single' | 'all' | 'custom') => {
    setSelectionScope(newScope);
    let newList: ShiftingTankEntry[] = [];
    
    if (newScope === 'all') {
      newList = availableNaupliiTanks.map(tank => ({
        id: Math.random().toString(36).substr(2, 9),
        tankId: tank.id,
        tankName: tank.name,
        shiftedMil: ''
      }));
    } else if (newScope === 'single') {
      // Clear or keep only the first if switching from custom
      if (selectionScope === 'custom' && shiftingTanks.length > 0) {
        newList = [shiftingTanks[0]];
      } else {
        newList = [];
      }
    } else {
      // switching to custom: if coming from 'all', clear it so user can pick manually
      if (selectionScope === 'all') {
        newList = [];
      } else {
        newList = [...shiftingTanks];
      }
    }
    
    setShiftingTanks(newList);
    updateData({ selectionScope: newScope, naupliiDestinations: newList });
  };

  // Fetch Recent Egg Count Batches and existing Harvests
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        // 1. Fetch Egg Count logs (candidate batches) - ONLY for this broodstock batch
        let eggQuery = supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Egg Count')
          .order('created_at', { ascending: false })
          .limit(100);

        if (activeBroodstockBatchId) {
          eggQuery = eggQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const { data: logs, error } = await eggQuery;

        if (error) throw error;

        // 2. Fetch existing Nauplii Harvest logs (to find locked batches) - ONLY for this broodstock batch
        let harvestQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Harvest');
        
        if (activeBroodstockBatchId) {
          harvestQuery = harvestQuery.eq('stocking_id', activeBroodstockBatchId);
        }
        
        const { data: harvestLogs } = await harvestQuery;
        setExistingHarvests(harvestLogs || []);

        // 3. Fetch Egg Count logs to extract per-tank egg references
        let eggDetailQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Egg Count');
        
        if (activeBroodstockBatchId) {
          eggDetailQuery = eggDetailQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const { data: eggDetailLogs } = await eggDetailQuery;
        const eggMap: Record<string, string> = {};
        (eggDetailLogs || []).forEach(log => {
          const batchEntries = log.data?.entries || [];
          batchEntries.forEach((e: any) => {
            if (e.tankId && e.totalEggsMillions) {
              eggMap[e.tankId] = e.totalEggsMillions;
            }
          });
        });
        setPerTankEggCounts(eggMap);

        // 4. Fetch Sale logs to check for batch closure
        let saleCheckQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Sale');
        
        if (activeBroodstockBatchId) {
          saleCheckQuery = saleCheckQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const { data: saleLogs } = await saleCheckQuery;
        setExistingSales(saleLogs || []);

        // Final sanity filter in JS
        const filtered = (logs || []).filter(l => {
           const sId = l.stocking_id || l.stockingId || l.data?.stockingId;
           const bId = l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber;
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

  const lockedEggCountIds = useMemo(() => {
    return (existingHarvests || []).map(l => 
      l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber || l.data?.displayBatchId
    ).filter(Boolean);
  }, [existingHarvests]);

  const availableBatches = useMemo(() => {
    const filtered = batchLogs.filter(log => {
      const bId = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      const logStockingId = log.stocking_id || log.data?.stockingId || log.stockingId;

      // Filter by active broodstock batch
      if (activeBroodstockBatchId && logStockingId && logStockingId !== activeBroodstockBatchId) return false;

      // Only show if not locked, OR if it's the currently selected one
      return !lockedEggCountIds.includes(bId) || bId === data.selectedBatchId;
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
  }, [batchLogs, lockedEggCountIds, data.selectedBatchId, activeBroodstockBatchId]);

  // Auto-select batch from dashboard context
  useEffect(() => {
    if (activeBroodstockBatchId && batchLogs.length > 0 && !selectedBatchId) {
      const matches = batchLogs.filter(l => {
        const sId = l.stockingId || l.data?.stockingId;
        const bId = l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber;
        return (sId === activeBroodstockBatchId || (bId && bId.startsWith(activeBroodstockBatchId))) && !lockedEggCountIds.includes(bId);
      });
      
      if (matches.length > 0) {
        handleBatchSelect(matches[0].data?.selectedBatchId || matches[0].data?.batchId || matches[0].data?.batchNumber);
      }
    }
  }, [activeBroodstockBatchId, batchLogs, selectedBatchId, lockedEggCountIds]);

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (batchId) {
      const log = batchLogs.find(l => (l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber) === batchId);
      if (log && log.data) {
        const eggEntries = log.data.entries || [];
        const totalEggs = log.data.summary?.totalEggs || 0;
        const totalSpawned = log.data.summary?.totalBatchSpawned || 0;
        
        setTotalEggsInBatch(totalEggs);
        setTotalSpawnedInBatch(totalSpawned);

        // Pre-fill harvest tanks using the same tanks from egg count
        const newHarvestEntries: HarvestTankEntry[] = eggEntries.map((e: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          tankId: e.tankId,
          tankName: e.tankName,
          harvestedMil: '',
          isAutoPopulated: true
        }));

        setHarvestTanks(newHarvestEntries);
        updateData({ 
          selectedBatchId: batchId, 
          harvestTanks: newHarvestEntries,
          summary: { 
            ...data.summary, 
            totalBatchEggs: totalEggs, 
            totalBatchSpawned: totalSpawned 
          }
        });
      }
    } else {
      setHarvestTanks([]);
      updateData({ 
        selectedBatchId: '', 
        harvestTanks: [],
        summary: { totalBatchEggs: 0, totalBatchSpawned: 0, totalHarvested: 0, hatchability: 0 }
      });
    }
  };

  const goToActivity = (type: string) => {
    const portal = user?.role === 'owner' ? 'owner' : 'user';
    const url = `/${portal}/activity/${type}?mode=activity&category=MATURATION${farmId ? `&farm=${farmId}` : ''}`;
    navigate(url);
  };

  const handleHarvestChange = (id: string, updates: any) => {
    const newList = harvestTanks.map(t => t.id === id ? { ...t, ...updates } : t);
    setHarvestTanks(newList);
    updateData({ harvestTanks: newList });
  };

  const handleShiftingChange = (id: string, updates: any) => {
    const newList = shiftingTanks.map(t => t.id === id ? { ...t, ...updates } : t);
    setShiftingTanks(newList);
    updateData({ naupliiDestinations: newList });
  };

  const handleTankToggle = (tank: any) => {
    if (selectionScope === 'single') {
      const newList = [{
        id: Math.random().toString(36).substr(2, 9),
        tankId: tank.id,
        tankName: tank.name,
        shiftedMil: ''
      }];
      setShiftingTanks(newList);
      updateData({ naupliiDestinations: newList });
      return;
    }

    const exists = shiftingTanks.find(t => t.tankId === tank.id);
    if (exists) {
      const newList = shiftingTanks.filter(t => t.tankId !== tank.id);
      setShiftingTanks(newList);
      updateData({ naupliiDestinations: newList });
    } else {
      const newList = [...shiftingTanks, {
        id: Math.random().toString(36).substr(2, 9),
        tankId: tank.id,
        tankName: tank.name,
        shiftedMil: ''
      }];
      setShiftingTanks(newList);
      updateData({ naupliiDestinations: newList });
    }
  };

  useEffect(() => {
    const totalHarvested = harvestTanks.reduce((sum, t) => sum + (parseFloat(t.harvestedMil) || 0), 0);
    const totalShifted = shiftingTanks.reduce((sum, t) => sum + (parseFloat(t.shiftedMil) || 0), 0);
    const hatchability = totalEggsInBatch > 0 ? (totalHarvested / totalEggsInBatch) * 100 : 0;
    
    updateData({
      totalHarvested: Math.round(totalHarvested * 1000) / 1000,
      totalShifted: Math.round(totalShifted * 1000) / 1000,
      hatchability: Math.round(hatchability * 100) / 100,
      summary: {
        totalBatchEggs: totalEggsInBatch,
        totalBatchSpawned: totalSpawnedInBatch,
        totalHarvested: Math.round(totalHarvested * 1000) / 1000,
        totalShifted: Math.round(totalShifted * 1000) / 1000,
        hatchability: Math.round(hatchability * 100) / 100,
        naupliiPerAnimal: totalSpawnedInBatch > 0 ? totalHarvested / totalSpawnedInBatch : 0
      }
    });
  }, [harvestTanks, shiftingTanks, totalEggsInBatch, totalSpawnedInBatch]);

  return (
    <div className={cn("space-y-6 animate-fade-in-up", !canEdit && "opacity-80 pointer-events-none select-none")}>
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm animate-in zoom-in-95 duration-300 pointer-events-auto">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Read-Only Mode</p>
            <p className="text-[10px] font-medium opacity-80">This {isBatchAlreadySold ? 'finalized' : ''} record can only be edited by a supervisor.</p>
          </div>
        </div>
      )}

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
        
        {/* Batch Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1: Choose Nauplii Production Batch</h3>
          </div>
          
          <div className="space-y-4">
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
                          <span className="ml-2 opacity-50 text-[10px]">({new Date(log.created_at).toLocaleDateString()})</span>
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
                    <p className="text-sm font-black uppercase tracking-tight">No Nauplii Production Batch updated</p>
                    <p className="text-[11px] text-amber-700/70 font-medium leading-tight max-w-[240px]">
                      Please complete "Egg Count" for this broodstock batch first.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 w-full mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-11 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-black text-xs uppercase gap-2 w-full shadow-sm"
                        onClick={() => goToActivity('sourcing-mating')}
                      >
                        <PlusCircle className="w-4 h-4" /> Record Sourcing & Mating
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-11 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-black text-xs uppercase gap-2 w-full shadow-sm"
                        onClick={() => goToActivity('spawning')}
                      >
                        <PlusCircle className="w-4 h-4" /> Record Spawning
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-11 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-black text-xs uppercase gap-2 w-full shadow-sm"
                        onClick={() => goToActivity('egg-count')}
                      >
                        <PlusCircle className="w-4 h-4" /> Record Egg Count
                      </Button>
                  </div>
                </div>
            )}
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Tank Harvest Data */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2: Nauplii Harvest Details</h3>
          </div>

          <div className="space-y-4">
              {harvestTanks.map((tank) => (
                <Card key={tank.id} className="p-4 bg-indigo-50/40 border-indigo-100 shadow-sm rounded-2xl flex items-center justify-between gap-4 group hover:bg-indigo-50/60 transition-colors">
                  <div className="flex-1">
                     <p className="text-xs font-black text-indigo-950">{tank.tankName}</p>
                     <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[9px] font-bold text-indigo-600 uppercase opacity-60">Spawning Tank</p>
                        {perTankEggCounts[tank.tankId] && (
                          <div className="flex items-center gap-1 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-200/50">
                             <Database className="w-2 h-2 text-indigo-600" />
                             <span className="text-[8px] font-black text-indigo-700 uppercase">Eggs: {perTankEggCounts[tank.tankId]}M</span>
                          </div>
                        )}
                     </div>
                  </div>
                  
                  <div className="w-32">
                     <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="bg-indigo-500/10 p-0.5 rounded-sm">
                           <Beaker className="w-2.5 h-2.5 text-indigo-600" />
                        </div>
                        <Label className="text-[8px] font-black uppercase text-indigo-600 block leading-none pt-0.5">Harvested (mil) *</Label>
                     </div>
                     <div className="relative">
                       <Input 
                         type="number" 
                         step="0.01"
                         value={tank.harvestedMil} 
                         onChange={e => handleHarvestChange(tank.id, { harvestedMil: e.target.value })} 
                         className="h-10 rounded-xl font-black bg-white border-none shadow-sm text-center pr-8 text-indigo-950 focus:ring-2 focus:ring-indigo-500 placeholder:font-medium placeholder:opacity-30" 
                         placeholder="0"
                       />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400">MIL</span>
                     </div>
                  </div>
               </Card>
              ))}
              {harvestTanks.length === 0 && (
                <div className="p-12 text-center bg-muted/5 border border-dashed rounded-[2rem] text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                   Select a Production batch to load spawning tanks
                </div>
              )}
          </div>
          
          {harvestTanks.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
               <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Total Nauplii Harvested</Label>
               <span className="text-lg font-black text-indigo-950">{(data.totalHarvested || 0).toFixed(3)}M</span>
            </div>
          )}
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Nauplii Shifting */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 3: Nauplii Shifting</h3>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-2xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider">Location & Scope</Label>
                <div className="flex bg-muted p-1 rounded-xl gap-1">
                  {['single', 'all', 'custom'].map((scope) => (
                    <button
                      key={scope}
                      onClick={() => handleScopeChange(scope as any)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                        selectionScope === scope ? "bg-white text-amber-600 shadow-sm" : "text-muted-foreground opacity-60"
                      )}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Selected Tanks *</Label>
                <div className="h-12 bg-amber-50/50 rounded-xl border border-dashed border-amber-200 flex items-center px-4 text-xs font-black text-amber-700 gap-2">
                  {selectionScope === 'all' ? <CheckCircle2 className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                  {selectionScope === 'all' ? 'All available Nauplii tanks selected' : `${shiftingTanks.length} tank(s) selected`}
                </div>
              </div>

              {selectionScope === 'single' && (
                <div className="pt-2 border-t border-dashed animate-in fade-in slide-in-from-top-2">
                   <Label className="text-[10px] uppercase text-muted-foreground mb-1.5 block ml-1">Choose Destination Tank *</Label>
                   <Select 
                      value={shiftingTanks[0]?.tankId || ''} 
                      onValueChange={(val) => {
                         const tank = availableNaupliiTanks.find(t => t.id === val);
                         if (tank) handleTankToggle(tank);
                      }}
                   >
                      <SelectTrigger className="h-12 rounded-2xl border-amber-100 bg-white font-black text-amber-900">
                         <SelectValue placeholder="Select a Nauplii Tank" />
                      </SelectTrigger>
                      <SelectContent>
                         {availableNaupliiTanks.map(tank => (
                           <SelectItem key={tank.id} value={tank.id} className="font-bold">
                              {tank.name} <span className="ml-2 opacity-50 font-normal text-[10px]">({tank.sectionName})</span>
                           </SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                </div>
              )}

              {selectionScope === 'custom' && (
                <div className="pt-2 border-t border-dashed animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] uppercase text-muted-foreground mb-3 block">
                    Select Nauplii Tanks for Shifting
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableNaupliiTanks.map((tank) => (
                      <div 
                          key={tank.id}
                          onClick={() => handleTankToggle(tank)}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                            shiftingTanks.find(t => t.tankId === tank.id)
                              ? "bg-amber-50 border-amber-200 text-amber-900 shadow-sm"
                              : "bg-white border-border hover:border-amber-200"
                          )}
                      >
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                            shiftingTanks.find(t => t.tankId === tank.id) ? "bg-amber-600 border-amber-600" : "border-muted-foreground/30"
                          )}>
                            {shiftingTanks.find(t => t.tankId === tank.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-tight">{tank.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shift Inputs for Selected Tanks */}
            <div className="space-y-3">
               {shiftingTanks.map((tank) => (
                 <div key={tank.id} className="p-4 bg-amber-50/40 border border-amber-100 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-left-2">
                    <div className="flex-1">
                       <p className="text-xs font-black text-amber-950">{tank.tankName}</p>
                       <p className="text-[9px] font-bold text-amber-600 uppercase opacity-60">Nauplii Tank</p>
                    </div>
                    <div className="w-32">
                       <Label className="text-[8px] font-black uppercase text-amber-600 block leading-none mb-1 text-center">Shifted (mil) *</Label>
                       <div className="relative">
                          <Input 
                            type="number"
                            step="0.01"
                            value={tank.shiftedMil}
                            onChange={e => handleShiftingChange(tank.id, { shiftedMil: e.target.value })}
                            className="h-10 rounded-xl font-black bg-white border-none shadow-sm text-center pr-8 text-amber-950 focus:ring-2 focus:ring-amber-500 placeholder:font-medium placeholder:opacity-30"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-400">MIL</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Animal Quality Assessment */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-100 rounded-xl">
                 <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Step # 4: Animal Quality Assessment</h3>
           </div>

           <div className="bg-amber-50/30 rounded-3xl p-4 border border-amber-100">
              <Label className="text-[10px] font-black uppercase tracking-wide text-amber-700 flex justify-between items-center mb-3 ml-1">
                Nauplii Condition Quality
                {animalAvg > 0 && <span className="text-amber-600">{animalAvg.toFixed(1)} / 10</span>}
              </Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-16 justify-between px-4 rounded-2xl border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 group transition-all bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                        <ClipboardList className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-amber-900">Record Quality Score</p>
                        <p className="text-[10px] text-amber-600/70 uppercase tracking-wider font-bold">{animalFilledCount} of {ANIMAL_RATING_FIELDS.length} rated</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className={`text-2xl font-black leading-none ${animalAvg > 0 ? 'text-amber-900' : 'text-amber-200'}`}>{animalAvg.toFixed(1)}</p>
                      <p className="text-[9px] text-amber-600/50 uppercase font-black tracking-tighter">Avg. Score</p>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-[2rem] gap-0 border-none shadow-2xl">
                  <DialogHeader className="p-6 pb-4 bg-amber-50 sticky top-0 z-10 backdrop-blur-md border-b border-amber-100">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-900">
                      <ClipboardList className="w-5 h-5 text-amber-600" />
                      Nauplii Quality Assessment
                    </DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                    <div className="space-y-5">
                      {ANIMAL_RATING_FIELDS.map(f => (
                        <RatingScale
                          key={f.key}
                          label={f.label}
                          required={f.required}
                          value={animalRatings[f.key] || 0}
                          onChange={val => setRating(f.key, val)}
                        />
                      ))}
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Current Quality Score</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-amber-600">{animalAvg.toFixed(1)}</span>
                          <span className="text-xs font-bold text-amber-400">/ 10</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(animalAvg / 10) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-amber-600/70 text-center italic font-medium">Calculated average of {animalFilledCount} parameters</p>
                    </div>
                  </div>
                  <DialogFooter className="p-4 bg-amber-50 border-t border-amber-100 sticky bottom-0 z-10">
                    <DialogClose asChild>
                      <Button
                        className="w-full h-12 rounded-xl font-black text-base shadow-lg shadow-amber-200 bg-amber-600 hover:bg-amber-700 text-white border-none"
                        onClick={() => {
                          updateData({
                            animalQualityScore: parseFloat(animalAvg.toFixed(1)),
                            animalRatings: animalRatings
                          });
                        }}
                      >
                        Save Quality Score
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
           </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Consolidated Data */}
        <div className="p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 space-y-6">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-100 rounded-xl">
                 <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Consolidated Data</h3>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Total Nauplii (mil)</Label>
                 <div className="h-14 bg-white rounded-2xl border border-indigo-100 flex items-center justify-center font-black text-indigo-950 text-xl shadow-sm">
                    {data.totalHarvested?.toLocaleString()}M
                 </div>
              </div>
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">No. Nauplii per Animal</Label>
                 <div className="h-14 bg-white rounded-2xl border border-indigo-100 flex flex-col items-center justify-center font-black text-amber-600 text-xl shadow-sm relative overflow-hidden group">
                    <span className="leading-tight">{(totalSpawnedInBatch > 0 ? (data.totalHarvested / totalSpawnedInBatch) : 0).toFixed(2)}M</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">Per Female</span>
                    <div className="absolute inset-0 bg-amber-50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 opacity-30" />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Hatchability %</Label>
                 <div className="h-12 bg-white/50 rounded-2xl border border-dashed border-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-black text-indigo-950">{data.hatchability?.toFixed(1)}%</span>
                 </div>
              </div>
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Source Batch</Label>
                 <div className="h-12 bg-white/50 rounded-2xl border border-dashed border-indigo-100 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-indigo-900">{selectedBatchId || 'No Batch'}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Media & Comments */}
        <div className="space-y-6 pt-4 border-t border-dashed">
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Photos (Optional)</Label>
             </div>
             <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
          </div>

          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Comments</Label>
             </div>
             <Textarea
               value={comments}
               onChange={e => onCommentsChange(e.target.value)}
               placeholder="Add harvest notes..."
               rows={3}
               className="rounded-2xl border-muted-foreground/10 bg-muted/5 font-medium"
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NaupliiHarvestForm;
