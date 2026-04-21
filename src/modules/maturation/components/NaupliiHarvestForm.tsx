import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator, Database, Loader2, AlertCircle, ArrowRight, FlaskConical, Beaker, ClipboardList, Camera, Info, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HarvestTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  harvestedMil: string;
  isAutoPopulated?: boolean;
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
}: NaupliiHarvestFormProps) => {
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [existingHarvests, setExistingHarvests] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [harvestTanks, setHarvestTanks] = useState<HarvestTankEntry[]>(data.naupliiDestinations || []);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [totalEggsInBatch, setTotalEggsInBatch] = useState<number>(data.summary?.totalBatchEggs || 0);
  const [totalSpawnedInBatch, setTotalSpawnedInBatch] = useState<number>(data.summary?.totalBatchSpawned || 0);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
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
          naupliiDestinations: newHarvestEntries,
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
        naupliiDestinations: [],
        summary: { totalBatchEggs: 0, totalBatchSpawned: 0, totalHarvested: 0, hatchability: 0 }
      });
    }
  };

  const handleHarvestChange = (id: string, updates: any) => {
    const newList = harvestTanks.map(t => t.id === id ? { ...t, ...updates } : t);
    setHarvestTanks(newList);
    updateData({ naupliiDestinations: newList });
  };

  useEffect(() => {
    const totalHarvested = harvestTanks.reduce((sum, t) => sum + (parseFloat(t.harvestedMil) || 0), 0);
    const hatchability = totalEggsInBatch > 0 ? (totalHarvested / totalEggsInBatch) * 100 : 0;
    
    updateData({
      totalHarvested: Math.round(totalHarvested * 100) / 100,
      hatchability: Math.round(hatchability * 100) / 100,
      summary: {
        totalBatchEggs: totalEggsInBatch,
        totalBatchSpawned: totalSpawnedInBatch,
        totalHarvested: Math.round(totalHarvested * 100) / 100,
        hatchability: Math.round(hatchability * 100) / 100
      }
    });
  }, [harvestTanks, totalEggsInBatch, totalSpawnedInBatch]);

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
        
        {/* Batch Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1: Choose Egg Count Batch</h3>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-bold ml-1 text-muted-foreground uppercase tracking-widest leading-none">Choose Batch *</Label>
            {batchLogs.length === 0 && !loadingBatches ? (
                 <div className="p-8 text-center bg-amber-50 border border-amber-100 rounded-3xl space-y-3 animate-in fade-in zoom-in-95" id="empty-batch-state">
                    <div className="flex flex-col items-center gap-2">
                       <AlertCircle className="w-8 h-8 text-amber-600" />
                       <p className="text-sm font-black uppercase text-amber-900 leading-tight">No Egg Count Production Batch found</p>
                       <p className="text-[10px] text-amber-700/70 max-w-[280px]">Please complete Egg Count for this broodstock batch first.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto pt-2">
                       <Button variant="outline" size="sm" onClick={() => window.location.href='/user/activity?type=Spawning&mode=activity&category=MATURATION'} className="text-[9px] h-8 font-black uppercase border-amber-200">Record Spawning</Button>
                       <Button variant="outline" size="sm" onClick={() => window.location.href='/user/activity?type=Egg%20Count&mode=activity&category=MATURATION'} className="text-[9px] h-8 font-black uppercase border-amber-200">Record Egg Count</Button>
                    </div>
                 </div>
            ) : (
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
            )}
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Tank Harvest Data */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2: Harvest Results</h3>
          </div>

          <div className="space-y-4">
              {harvestTanks.map((tank) => (
                <Card key={tank.id} className="p-4 bg-emerald-50/40 border-emerald-100 shadow-sm rounded-2xl flex items-center justify-between gap-4 group hover:bg-emerald-50/60 transition-colors">
                  <div className="flex-1">
                     <p className="text-xs font-black text-emerald-950">{tank.tankName}</p>
                     <p className="text-[9px] font-bold text-emerald-600 uppercase opacity-60">Maturation Tank</p>
                  </div>
                  
                  <div className="w-32">
                     <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="bg-emerald-500/10 p-0.5 rounded-sm">
                           <Beaker className="w-2.5 h-2.5 text-emerald-600" />
                        </div>
                        <Label className="text-[8px] font-black uppercase text-indigo-600 block leading-none pt-0.5">Harvested (mil) *</Label>
                     </div>
                     <div className="relative">
                       <Input 
                         type="number" 
                         step="0.01"
                         value={tank.harvestedMil} 
                         onChange={e => handleHarvestChange(tank.id, { harvestedMil: e.target.value })} 
                         className="h-10 rounded-xl font-black bg-white border-none shadow-sm text-center pr-8 text-emerald-950 focus:ring-2 focus:ring-indigo-500 placeholder:font-medium placeholder:opacity-30" 
                         placeholder="0"
                       />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-400">MIL</span>
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

        {/* Summary Calculations */}
        <div className="p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Total Nauplii Harvested (mil)</Label>
                 <div className="h-14 bg-white rounded-2xl border border-indigo-100 flex items-center justify-center font-black text-indigo-950 text-xl shadow-sm">
                    {data.totalHarvested?.toLocaleString()}M
                 </div>
              </div>
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Hatchability %</Label>
                 <div className="h-14 bg-white rounded-2xl border border-indigo-100 flex items-center justify-center font-black text-emerald-600 text-xl shadow-sm relative overflow-hidden group">
                    {data.hatchability?.toFixed(1)}%
                    <div className="absolute inset-0 bg-emerald-50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 opacity-30" />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Avg. Nauplii per Female (mil)</Label>
                 <div className="h-12 bg-white/50 rounded-2xl border border-dashed border-indigo-100 flex flex-col items-center justify-center">
                    <span className="text-sm font-black text-indigo-950">
                      {totalSpawnedInBatch > 0 ? (data.totalHarvested / totalSpawnedInBatch).toFixed(2) : '0'}M
                    </span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none opacity-50">Per Spawned Female</span>
                 </div>
              </div>
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Batch Sourcing Basis</Label>
                 <div className="h-12 bg-white/50 rounded-2xl border border-dashed border-indigo-100 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-indigo-900">{selectedBatchId || 'No Batch'}</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none opacity-50">Source Egg Count</span>
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
