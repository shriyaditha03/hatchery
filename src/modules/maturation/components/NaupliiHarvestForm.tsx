import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  Calculator, 
  CheckCircle2, 
  AlertCircle,
  PlusCircle, 
  ClipboardList, 
  Loader2, 
  Database,
  ArrowRight,
  Check
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface HarvestTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  spawnedCount: string;
  harvestedMil: string;
  totalEggsMil?: string;
  fertilizedEggsMil?: string;
}

interface NaupliiDestEntry {
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
  activeSectionId?: string;
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
  activeSectionId,
  farmId,
  activeBroodstockBatchId,
  tankPopulations = {},
}: NaupliiHarvestFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [existingHarvests, setExistingHarvests] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [harvestTanks, setHarvestTanks] = useState<HarvestTankEntry[]>(data.harvestTanks || []);
  const [naupliiDestinations, setNaupliiDestinations] = useState<NaupliiDestEntry[]>(data.naupliiDestinations || []);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [totalSpawnedInBatch, setTotalSpawnedInBatch] = useState<number>(data.summary?.totalBatchSpawned || 0);
  
  // Shifting Scope State
  const [shiftingScope, setShiftingScope] = useState<'single' | 'all' | 'custom'>(data.shiftingScope || 'custom');
  const [shiftingSectionId, setShiftingSectionId] = useState<string>(data.shiftingSectionId || '');

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch Recent Egg Count Batches and existing Harvests
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        // 1. Fetch Egg Count logs (Candidate batches)
        const { data: logs, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Egg Count')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        
        // 2. Fetch existing Nauplii Harvest logs (to find locked batches)
        const { data: harvestLogs } = await supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Harvest');
        
        setExistingHarvests(harvestLogs || []);

        // Filter in JS for batch/stocking alignment
        const filtered = (logs || []).filter(l => 
          l.stockingId === activeBroodstockBatchId || 
          l.data?.stockingId === activeBroodstockBatchId ||
          l.data?.selectedBatchId?.startsWith(activeBroodstockBatchId || '')
        );
        setBatchLogs(filtered || []);
      } catch (err) {
        console.error('Error fetching egg count batches:', err);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [farmId, activeBroodstockBatchId]);

  const lockedBatchIds = useMemo(() => {
    return (existingHarvests || []).map(l => 
      l.data?.sourceBatchId || l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber
    ).filter(Boolean);
  }, [existingHarvests]);

  const availableBatches = useMemo(() => {
    return batchLogs.filter(log => {
      const bId = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      // Only show if not locked, OR if it's the currently selected one (for editing/viewing)
      return !lockedBatchIds.includes(bId) || bId === data.sourceBatchId || bId === data.selectedBatchId;
    }).filter((l, index, self) => {
      // De-duplicate
      const bn = l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber;
      return self.findIndex(t => (t.data?.selectedBatchId || t.data?.batchId || t.data?.batchNumber) === bn) === index;
    });
  }, [batchLogs, lockedBatchIds, data.sourceBatchId, data.selectedBatchId]);

  // Handle batch selection and population of tanks
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (!batchId) {
      setHarvestTanks([]);
      setTotalSpawnedInBatch(0);
      updateData({ selectedBatchId: '', harvestTanks: [], summary: { ...data.summary, totalBatchSpawned: 0 } });
      return;
    }

    const log = batchLogs.find(l => l.data?.selectedBatchId === batchId);
    if (log && log.data) {
      const eggEntries = log.data.entries || [];
      const totalSpawned = log.data.summary?.totalBatchSpawned || 0;
      setTotalSpawnedInBatch(totalSpawned);

      const newHarvestTanks = eggEntries.map((e: any) => {
        const eggs = parseFloat(e.totalEggsMillions) || 0;
        const fert = parseFloat(e.fertilizationPercent) || 0;
        const fertilized = eggs * (fert / 100);
        
        return {
          id: e.id || Math.random().toString(36).substr(2, 9),
          tankId: e.tankId,
          tankName: e.tankName,
          spawnedCount: e.spawnedCount,
          totalEggsMil: eggs.toString(),
          fertilizedEggsMil: fertilized.toFixed(2),
          harvestedMil: ''
        };
      });
      setHarvestTanks(newHarvestTanks);
      
      updateData({ 
        selectedBatchId: batchId,
        harvestTanks: newHarvestTanks,
        summary: { ...data.summary, totalBatchSpawned: totalSpawned }
      });
    }
  };

  const handleHarvestChange = (id: string, updates: any) => {
    const newList = harvestTanks.map(t => t.id === id ? { ...t, ...updates } : t);
    setHarvestTanks(newList);
    updateData({ harvestTanks: newList });
  };

  // Logic for Shifting (Step 4 & 5)
  // Get all available Nauplii tanks (Not stocked)
  const naupliiTanksOptions = useMemo(() => {
    return availableTanks
      .filter(s => {
        const sType = (s.section_type || '').toUpperCase();
        const sName = (s.name || '').toUpperCase();
        return (sType.includes('NAUPLII') || sName.includes('NAUPLII') || sName.includes('NS')) && (!farmId || s.farm_id === farmId);
      })
      .flatMap(s => s.tanks.map((t: any) => ({
        id: t.id,
        name: `${s.name} - ${t.name}`,
        isStocked: (tankPopulations[t.id] || 0) > 0
      })));
  }, [availableTanks, farmId, tankPopulations]);

  const toggleNaupliiTank = (tankId: string, tankName: string) => {
    let newList = [...naupliiDestinations];
    const existing = newList.find(d => d.tankId === tankId);
    
    // If 'single' scope, we just replace the entire list
    if (shiftingScope === 'single') {
      if (existing) {
        newList = []; // Deselect if clicking the same one
      } else {
        newList = [{ id: Math.random().toString(36).substr(2, 9), tankId, tankName, shiftedMil: '' }];
      }
    } else {
      // Normal toggle for 'custom' or 'all'
      if (existing) {
        newList = newList.filter(d => d.tankId !== tankId);
      } else {
        newList.push({ id: Math.random().toString(36).substr(2, 9), tankId, tankName, shiftedMil: '' });
      }
    }
    
    setNaupliiDestinations(newList);
    updateData({ naupliiDestinations: newList });
  };

  const handleDestChange = (id: string, updates: any) => {
    const newList = naupliiDestinations.map(d => d.id === id ? { ...d, ...updates } : d);
    setNaupliiDestinations(newList);
    updateData({ naupliiDestinations: newList, shiftingScope, shiftingSectionId });
  };

  const handleScopeChange = (scope: any) => {
    setShiftingScope(scope);
    setNaupliiDestinations([]); // Reset on scope change for clarity
    updateData({ shiftingScope: scope, naupliiDestinations: [] });
  };

  const handleSectionChange = (sectionId: string) => {
    setShiftingSectionId(sectionId);
    if (shiftingScope === 'all') {
      const section = availableTanks.find(s => s.id === sectionId);
      if (section) {
        const newDests = section.tanks
          .filter((t:any) => (tankPopulations[t.id] || 0) === 0)
          .map((t:any) => ({
            id: Math.random().toString(36).substr(2, 9),
            tankId: t.id,
            tankName: `${section.name} - ${t.name}`,
            shiftedMil: ''
          }));
        setNaupliiDestinations(newDests);
        updateData({ shiftingSectionId: sectionId, naupliiDestinations: newDests });
        return;
      }
    }
    updateData({ shiftingSectionId: sectionId });
  };

  const totalHarvestedMil = harvestTanks.reduce((sum, t) => sum + (parseFloat(t.harvestedMil) || 0), 0);
  const totalShiftedMil = naupliiDestinations.reduce((sum, d) => sum + (parseFloat(d.shiftedMil) || 0), 0);
  const yieldPerAnimal = totalSpawnedInBatch > 0 ? (totalHarvestedMil / totalSpawnedInBatch) : 0;
  const isBalanced = Math.abs(totalHarvestedMil - totalShiftedMil) < 0.01 && totalHarvestedMil > 0;

  // Sections for Shifting
  const naupliiSections = useMemo(() => {
    return availableTanks.filter(s => {
      const sType = (s.section_type || '').toUpperCase();
      const sName = (s.name || '').toUpperCase();
      return (sType.includes('NAUPLII') || sName.includes('NAUPLII') || sName.includes('NS')) && (!farmId || s.farm_id === farmId);
    });
  }, [availableTanks, farmId]);

  // Auto-populate when scope is 'all'
  useEffect(() => {
    if (shiftingScope === 'all') {
      // Find the active section(s) - could be ID or name match
      const section = availableTanks.find(s => s.id === activeSectionId || s.name === activeSectionId);
      
      // If no active section found but we are in 'all', we might want all relevant nauplii tanks
      let targetTanks = [];
      if (section) {
        targetTanks = section.tanks.map((t: any) => ({
          id: t.id + Math.random().toString(36).substr(2, 5),
          tankId: t.id,
          tankName: `${section.name} - ${t.name}`,
          shiftedMil: ''
        }));
      } else if (!activeSectionId) {
        // If no section context, pull all available nauplii tanks
        targetTanks = naupliiTanksOptions.map(t => ({
          id: t.id + Math.random().toString(36).substr(2, 5),
          tankId: t.id,
          tankName: t.name,
          shiftedMil: ''
        }));
      }

      const newDests = targetTanks.filter(t => {
        // Only include tanks that aren't already in destinations (avoiding loops)
        return true; 
      });
        
      if (newDests.length > 0 && JSON.stringify(newDests.map(d => d.tankId)) !== JSON.stringify(naupliiDestinations.map(d => d.tankId))) {
        setNaupliiDestinations(newDests);
        updateData({ naupliiDestinations: newDests });
      }
    }
  }, [shiftingScope, activeSectionId, availableTanks, naupliiTanksOptions]);

  useEffect(() => {
    const summary = {
      totalHarvested: totalHarvestedMil,
      totalShifted: totalShiftedMil,
      totalBatchSpawned: totalSpawnedInBatch,
      naupliiPerAnimal: yieldPerAnimal
    };

    if (
      JSON.stringify(data.summary) !== JSON.stringify(summary)
    ) {
      updateData({ 
        summary,
        selectedBatchId: selectedBatchId,
        sourceBatchId: selectedBatchId // Keep reference to Egg Count ID
      });
    }
  }, [totalHarvestedMil, totalShiftedMil, totalSpawnedInBatch, yieldPerAnimal, selectedBatchId]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Context Badge */}
      {activeBroodstockBatchId && (
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
        </div>
      )}

      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* Step 1: Choose Batch */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
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
                  availableBatches.map(log => (
                    <SelectItem key={log.id} value={log.data?.selectedBatchId}>
                      <span className="font-bold">{log.data?.selectedBatchId}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {!loadingBatches && availableBatches.length === 0 && (
              <div className="flex flex-col items-center gap-3 text-amber-600 bg-amber-50 p-6 rounded-3xl border border-amber-100 animate-in fade-in zoom-in-95 mb-4 mt-4">
                <div className="p-3 bg-amber-100 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight">No Egg Count Batch Found</p>
                  <p className="text-[11px] text-amber-700/70 font-medium leading-tight max-w-[240px]">
                    Please record an "Egg Count" activity first for this broodstock batch.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-2 w-full mt-2">
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase gap-2"
                    onClick={() => navigate(`${user?.role === 'owner' ? '/owner' : '/user'}/activity/sourcing & mating?farm=${farmId}&category=MATURATION`)}
                   >
                     <PlusCircle className="w-3 h-3" /> Record Sourcing
                   </Button>
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase gap-2"
                    onClick={() => navigate(`${user?.role === 'owner' ? '/owner' : '/user'}/activity/spawning?farm=${farmId}&category=MATURATION`)}
                   >
                     <PlusCircle className="w-3 h-3" /> Record Spawning
                   </Button>
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase gap-2"
                    onClick={() => navigate(`${user?.role === 'owner' ? '/owner' : '/user'}/activity/egg count?farm=${farmId}&category=MATURATION`)}
                   >
                     <PlusCircle className="w-3 h-3" /> Record Egg Count
                   </Button>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Step 2: Nauplii Harvest Details */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2: Nauplii Harvest Details</h3>
          </div>
          
          <div className="space-y-3">
             {harvestTanks.map((tank) => (
               <Card key={tank.id} className="p-4 bg-indigo-50/40 border-indigo-100 shadow-sm rounded-2xl overflow-hidden group hover:bg-indigo-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex-1">
                        <p className="text-xs font-black text-indigo-950">{tank.tankName}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <p className="text-[9px] font-bold text-indigo-600 uppercase opacity-60 leading-none">Spawn: {tank.spawnedCount} F</p>
                          {tank.totalEggsMil && (
                            <>
                              <span className="text-[8px] text-indigo-200">|</span>
                              <p className="text-[9px] font-bold text-amber-600 uppercase leading-none">Eggs: {tank.totalEggsMil}M</p>
                            </>
                          )}
                          {tank.fertilizedEggsMil && (
                            <>
                              <span className="text-[8px] text-indigo-200">|</span>
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter leading-none">Target: {tank.fertilizedEggsMil}M</p>
                            </>
                          )}
                        </div>
                     </div>
                     <div className="w-44 text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                           {parseFloat(tank.harvestedMil) > 0 && tank.fertilizedEggsMil && (
                             <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md animate-in fade-in zoom-in-95 leading-none">
                               Yield: {((parseFloat(tank.harvestedMil) / parseFloat(tank.fertilizedEggsMil)) * 100).toFixed(1)}%
                             </span>
                           )}
                           <Label className="text-[8px] font-black uppercase text-indigo-600 block leading-none pt-0.5">Harvested (mil) *</Label>
                        </div>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={tank.harvestedMil} 
                            onChange={e => handleHarvestChange(tank.id, { harvestedMil: e.target.value })} 
                            className="h-10 rounded-xl font-black bg-white border-none shadow-sm text-center pr-8 text-emerald-950 focus:ring-2 focus:ring-indigo-500" 
                            placeholder="0.0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-400">MIL</span>
                        </div>
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
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 4: Nauplii Shifting (Available Tanks)</h3>
          </div>

          <div className="glass-card rounded-[2.5rem] p-6 border-amber-100 space-y-6 shadow-sm bg-amber-50/20">
            {/* Scope Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Label className="text-[10px] font-black uppercase text-amber-900/60 ml-1">Location & Scope</Label>
              <Tabs value={shiftingScope} onValueChange={handleScopeChange} className="w-auto">
                <TabsList className="bg-amber-100/50 p-1 h-10 rounded-xl border border-amber-200/50">
                  <TabsTrigger value="single" className="rounded-lg text-[10px] font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">SINGLE</TabsTrigger>
                  <TabsTrigger value="all" className="rounded-lg text-[10px] font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">ALL TANKS IN SECTION</TabsTrigger>
                  <TabsTrigger value="custom" className="rounded-lg text-[10px] font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">CUSTOM</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tank Selection Area */}
            <div className="p-4 bg-white/30 rounded-2xl border border-amber-100/20">
               {shiftingScope === 'single' ? (
                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] font-black uppercase text-amber-900/40 ml-1">Select Destination Tank</Label>
                    <Select 
                      value={naupliiDestinations[0]?.tankId || ''} 
                      onValueChange={(val) => {
                        const tank = naupliiTanksOptions.find(t => t.id === val);
                        if (tank) toggleNaupliiTank(tank.id, tank.name);
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-amber-100 bg-white/50 text-sm font-bold text-amber-900">
                        <SelectValue placeholder="Choose a tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {naupliiTanksOptions
                          .filter(t => !activeSectionId || availableTanks.find(s => s.id === activeSectionId)?.tanks.some((st:any) => st.id === t.id))
                          .map(tank => (
                            <SelectItem key={tank.id} value={tank.id} disabled={tank.isStocked}>
                              {tank.name.split(' - ')[1] || tank.name} {tank.isStocked ? '(Stocked)' : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                 </div>
               ) : shiftingScope === 'all' ? (
                 <div className="p-6 text-center space-y-2 animate-in fade-in zoom-in-95">
                    <div className="inline-flex p-3 bg-amber-100 rounded-full text-amber-600 mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-amber-900 uppercase">All tanks in active section selected</p>
                    <p className="text-[10px] text-amber-700/60 font-bold">You are shifting nauplii to all available tanks in the current section.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2">
                    {naupliiTanksOptions
                      .filter(t => {
                         // Only show tanks for the active section if available
                         if (!activeSectionId) return true;
                         return availableTanks.find(s => s.id === activeSectionId)?.tanks.some((st:any) => st.id === t.id);
                      })
                      .map(tank => (
                         <button
                            key={tank.id}
                            disabled={tank.isStocked}
                            type="button"
                            onClick={() => toggleNaupliiTank(tank.id, tank.name)}
                            className={cn(
                              "px-4 py-3 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-between gap-3 text-left relative overflow-hidden min-h-[52px]",
                              naupliiDestinations.some(d => d.tankId === tank.id)
                                ? "bg-amber-600 border-amber-500 text-white shadow-md scale-[1.02]"
                                : "bg-white border-amber-100 text-amber-900 hover:border-amber-300 shadow-sm",
                              tank.isStocked && "opacity-20 cursor-not-allowed bg-muted grayscale",
                            )}
                         >
                           <span className="whitespace-normal leading-tight font-black uppercase text-[10px] flex-1">{tank.name.split(' - ')[1] || tank.name}</span>
                           {naupliiDestinations.some(d => d.tankId === tank.id) && <Check className="w-3 h-3 shrink-0" />}
                         </button>
                      ))}
                 </div>
               )}
            </div>
          </div>

          {/* Allocation Inputs */}
          {naupliiDestinations.length > 0 && (
             <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 px-1">
                <div className="flex items-center justify-between px-3 py-2 bg-amber-50/50 rounded-xl border border-amber-100/50">
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black uppercase text-amber-950/40 tracking-widest">Shift Details</p>
                    <div className="h-3 w-px bg-amber-200" />
                    <p className="text-[10px] font-black text-amber-600 uppercase">Input Qty per Tank (Millions)</p>
                  </div>
                  <p className="text-[10px] font-black text-amber-700">{naupliiDestinations.length} Selected</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {naupliiDestinations.map((dest) => (
                      <div 
                        key={dest.id} 
                        className="flex items-center justify-between p-2 pl-4 bg-white border border-amber-100 rounded-xl transition-all hover:border-amber-400 hover:shadow-md group"
                      >
                         <div className="flex-1 min-w-0 mr-4">
                            <p className="text-[11px] font-black text-amber-950 truncate tracking-tight">{dest.tankName.split(' - ')[1] || dest.tankName}</p>
                            <p className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">Destination</p>
                         </div>
                         <div className="w-24 relative flex-shrink-0">
                            <Input 
                              type="number" 
                              step="0.01"
                              value={dest.shiftedMil} 
                              onChange={e => handleDestChange(dest.id, { shiftedMil: e.target.value })} 
                              className="h-8 rounded-lg font-black bg-amber-50/30 border-none text-right pr-8 text-amber-950 text-[11px] focus:ring-amber-500 focus:bg-white transition-all transition-colors" 
                              placeholder="0.0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-300 pointer-events-none">M</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Step 5: Consolidated Data */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Calculator className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 5: Consolidated Data</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Total Nauplii Card */}
             <Card className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex items-center justify-between shadow-sm">
                <div>
                   <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block leading-tight">Total Nauplii Harvested</span>
                   <span className="text-[8px] font-bold text-muted-foreground italic">(Millions)</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-indigo-950 leading-none">{totalHarvestedMil.toLocaleString()}</span>
                  <p className={cn(
                    "text-[9px] font-black mt-1",
                    isBalanced ? "text-emerald-500" : "text-rose-400"
                  )}>
                    {isBalanced ? "✓ FULLY ALLOCATED" : `PENDING: ${(totalHarvestedMil - totalShiftedMil).toFixed(2)}M`}
                  </p>
                </div>
             </Card>

             {/* Yield per Animal Card */}
             <Card className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] flex items-center justify-between shadow-sm">
                <div>
                   <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block leading-tight">Nauplii per Animal</span>
                   <span className="text-[8px] font-bold text-muted-foreground italic">(Total / {totalSpawnedInBatch} Spawned)</span>
                </div>
                <div className="text-right">
                   <span className="text-3xl font-black text-emerald-950 leading-none">{yieldPerAnimal.toFixed(2)}</span>
                   <span className="text-[10px] font-black text-emerald-600 block opacity-50 uppercase tracking-tighter">MIL / ANIMAL</span>
                </div>
             </Card>
          </div>
        </div>

        {/* Additional Fields */}
        <div className="space-y-6 pt-4 border-t border-dashed">
          <div className="space-y-1.5 px-1">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Activity Photo (Optional)</Label>
            <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
          </div>

          <div className="space-y-1.5 px-1">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Additional Comments</Label>
            <Textarea
              value={comments}
              onChange={e => onCommentsChange(e.target.value)}
              placeholder="Record any deviations or observations..."
              rows={3}
              className="rounded-2xl border-muted-foreground/20 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NaupliiHarvestForm;
