import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Database, PlusCircle, CheckCircle2, Loader2, AlertCircle, Sparkles, ArrowRightLeft, History, Database as DatabaseIcon, ShieldAlert, Camera, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SpawningTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  shiftedCount: string;
  spawnedCount: string;
  balanceCount: string;
}

interface ReturnDestination {
  id: string;
  tankId: string;
  tankName: string;
  count: string;
  initialPopulation?: number;
}

interface SpawningFormProps {
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

const SpawningForm = ({
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
}: SpawningFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spawningTanks, setSpawningTanks] = useState<SpawningTankEntry[]>(data.spawningTanks || []);
  const [returnDestinations, setReturnDestinations] = useState<ReturnDestination[]>(data.returnDestinations || []);
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [existingSpawning, setExistingSpawning] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.batchId || '');
  const [loadingBatches, setLoadingBatches] = useState(false);

  const isSupervisor = user?.role === 'owner' || user?.role === 'supervisor';
  const isEditing = !!data.id;
  const canEdit = isSupervisor || !isEditing;

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  const lockedBatchIds = useMemo(() => {
    return (existingSpawning || []).map(l => 
      l.data?.batchId || l.data?.batchNumber || l.data?.selectedBatchId || l.data?.displayBatchId
    ).filter(Boolean);
  }, [existingSpawning]);

  const availableBatches = useMemo(() => {
    const filtered = batchLogs.filter(l => {
      const bn = l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber;
      const logStockingId = l.stocking_id || l.data?.stockingId || l.stockingId;

      // Filter by active broodstock batch
      if (activeBroodstockBatchId && logStockingId && logStockingId !== activeBroodstockBatchId) return false;

      // Filter out already spawned batches (unless we are in edit mode for one)
      if (lockedBatchIds.includes(bn) && data.batchId !== bn) return false;

      return true;
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
  }, [batchLogs, lockedBatchIds, activeBroodstockBatchId, data.batchId]);

  // Fetch candidate batches from Sourcing & Mating
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        // 1. Fetch Sourcing & Mating logs - ONLY for this broodstock batch
        let sourcingQuery = supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Sourcing & Mating')
          .order('created_at', { ascending: false })
          .limit(100);

        if (activeBroodstockBatchId) {
          sourcingQuery = sourcingQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const { data: logs, error } = await sourcingQuery;

        if (error) throw error;

        // 2. Fetch existing Spawning logs to find locked batches - ONLY for this broodstock batch
        let spawnQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Spawning');

        if (activeBroodstockBatchId) {
          spawnQuery = spawnQuery.eq('stocking_id', activeBroodstockBatchId);
        }
        
        const { data: spawnLogs } = await spawnQuery;
        setExistingSpawning(spawnLogs || []);

        setBatchLogs(logs || []);
      } catch (err) {
        console.error('Error fetching batches:', err);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [farmId, activeBroodstockBatchId]);

  // Auto-select batch from dashboard context
  useEffect(() => {
    if (activeBroodstockBatchId && batchLogs.length > 0 && !selectedBatchId) {
      const matches = batchLogs.filter(l => {
        const sId = l.stocking_id || l.data?.stockingId;
        const bId = l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber;
        return (sId === activeBroodstockBatchId || (bId && bId.startsWith(activeBroodstockBatchId))) && !lockedBatchIds.includes(bId);
      });
      
      if (matches.length > 0) {
        setSelectedBatchId(matches[0].data?.selectedBatchId || matches[0].data?.batchId || matches[0].data?.batchNumber);
      }
    }
  }, [activeBroodstockBatchId, batchLogs, selectedBatchId, lockedBatchIds]);

  // Sync entries based on selected Sourcing batch
  useEffect(() => {
    if (selectedBatchId && !isEditing) {
      const log = batchLogs.find(l => (l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber) === selectedBatchId);
      if (log && log.data) {
        const matedDests = log.data.matedDestinations || [];
        const sourceTanksFromLog = log.data.sourceTanks || [];

        const newSpawningTanks = matedDests.map((d: any) => ({
          id: d.id,
          tankId: d.tankId,
          tankName: d.tankName,
          shiftedCount: d.count,
          spawnedCount: '',
          balanceCount: d.count
        }));
        setSpawningTanks(newSpawningTanks);

        const newReturns = sourceTanksFromLog.map((s: any) => ({
          id: s.id,
          tankId: s.tankId,
          tankName: s.tankName,
          count: '',
          initialPopulation: s.available // reference
        }));
        setReturnDestinations(newReturns);
      }
    }
  }, [selectedBatchId, isEditing, batchLogs]);

  const handleSpawningChange = (id: string, updates: any) => {
    const newList = spawningTanks.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        if (updates.spawnedCount !== undefined) {
          const shifted = parseFloat(t.shiftedCount) || 0;
          const spawned = parseFloat(updates.spawnedCount) || 0;
          updated.balanceCount = (shifted - spawned).toString();
        }
        return updated;
      }
      return t;
    });
    setSpawningTanks(newList);
    updateData({ spawningTanks: newList });
  };

  const handleReturnChange = (id: string, updates: any) => {
    const newList = returnDestinations.map(d => d.id === id ? { ...d, ...updates } : d);
    setReturnDestinations(newList);
    updateData({ returnDestinations: newList });
  };

  const totalFemaleSpawned = spawningTanks.reduce((sum, t) => sum + (parseFloat(t.spawnedCount) || 0), 0);
  const totalFemaleNotSpawned = spawningTanks.reduce((sum, t) => sum + (parseFloat(t.balanceCount) || 0), 0);
  const totalReturned = returnDestinations.reduce((sum, d) => sum + (parseFloat(d.count) || 0), 0);
  const totalOriginalShifted = spawningTanks.reduce((sum, t) => sum + (parseFloat(t.shiftedCount) || 0), 0);

  // Sync summary data for saving
  useEffect(() => {
    updateData({
      batchId: selectedBatchId,
      sourcingBatchId: selectedBatchId, // Keep reference to original
      stockingId: activeBroodstockBatchId,
      totalSpawned: totalFemaleSpawned,
      totalNotSpawned: totalFemaleNotSpawned,
      totalReturned: totalReturned,
      totalInitialShifted: totalOriginalShifted,
      spawningTanks,
      returnDestinations
    });
  }, [totalFemaleSpawned, totalFemaleNotSpawned, totalReturned, totalOriginalShifted, spawningTanks, returnDestinations, selectedBatchId, activeBroodstockBatchId]);

  const goToSourcingMating = () => {
    const portal = user?.role === 'owner' ? 'owner' : 'user';
    navigate(`/${portal}/activity?mode=activity&type=Sourcing%20%26%20Mating&category=MATURATION`);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {activeBroodstockBatchId && activeBroodstockBatchId !== 'new' && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between shadow-sm border-l-4 border-l-red-500">
           <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-xl text-red-600">
                 <DatabaseIcon className="w-5 h-5" />
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm animate-in zoom-in-95">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Read-Only Mode</p>
            <p className="text-[10px] font-medium opacity-80">This spawning record can only be edited by a supervisor.</p>
          </div>
        </div>
      )}

      <div className={cn("glass-card rounded-3xl p-6 border shadow-sm space-y-8 relative", !canEdit && "opacity-80 pointer-events-none select-none")}>
        
        {/* 1. Batch Connection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <DatabaseIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1 Choose Mating Batch</h3>
          </div>
          
          <div className="space-y-1 text-[10px] text-muted-foreground italic -mt-2 px-1">
            Connect this spawning record to a previous sourcing activity.
          </div>

          <div className="grid grid-cols-1 gap-4">
              {batchLogs.length === 0 && !loadingBatches ? (
                <div className="p-8 text-center bg-amber-50 border border-amber-100 rounded-[2rem] space-y-4 animate-in fade-in zoom-in-95">
                   <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-amber-600" />
                      <p className="text-sm font-black uppercase text-amber-900">No Mating Batch Found</p>
                      <p className="text-[10px] text-amber-700/70 max-w-[280px]">Please complete "Sourcing & Mating" for this broodstock batch first.</p>
                   </div>
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={goToSourcingMating}
                     className="h-9 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase gap-2 w-full max-w-[200px] mx-auto"
                   >
                     <PlusCircle className="w-3.5 h-3.5" /> Record Sourcing
                   </Button>
                </div>
              ) : (
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
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
              )}
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 2. Spawning Results */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2 Spawner Result</h3>
          </div>
          
          <div className="space-y-1 text-[10px] text-muted-foreground italic -mt-2 px-1">
            Specify spawned count for each tank. Animals will be moved back to source.
          </div>

          <div className="space-y-3">
             {spawningTanks.map((tank) => (
               <Card key={tank.id} className="p-4 bg-indigo-50/40 border-indigo-100/50 rounded-2xl overflow-hidden relative group hover:bg-indigo-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex-1">
                        <p className="text-xs font-black text-indigo-950">{tank.tankName}</p>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase opacity-60">Spawning Tank ({tank.shiftedCount} F In)</p>
                     </div>
                     <div className="w-32 flex flex-col gap-1">
                        <Label className="text-[8px] font-black uppercase text-center text-indigo-600 leading-none">No. Females Spawned</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            value={tank.spawnedCount} 
                            min="0"
                            onChange={e => handleSpawningChange(tank.id, { spawnedCount: e.target.value })} 
                            className={cn(
                              "h-9 rounded-xl font-black bg-white border shadow-sm text-center pr-6 transition-all placeholder:font-medium placeholder:opacity-30",
                              (parseFloat(tank.spawnedCount) > parseFloat(tank.shiftedCount)) 
                                ? "border-rose-500 text-rose-950 focus:ring-rose-500 bg-rose-50/50" 
                                : "border-indigo-100 text-indigo-950 focus:ring-indigo-500"
                            )}
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400">F</span>
                        </div>
                     </div>
                     <div className="w-20 flex flex-col items-center justify-center">
                        <Label className="text-[8px] font-black uppercase text-indigo-600 leading-none">Not Spawned</Label>
                        <span className="text-sm font-black text-indigo-700/60 mt-2">{tank.balanceCount}</span>
                     </div>
                  </div>
               </Card>
             ))}
             {spawningTanks.length === 0 && (
               <div className="p-12 text-center bg-muted/5 border border-dashed rounded-[2rem] text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                  Select a batch to load tanks
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-indigo-600 tracking-widest mb-1">Total Female Spawned</span>
                <span className="text-xl font-black text-indigo-950">{totalFemaleSpawned}</span>
             </div>
             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-indigo-600 tracking-widest mb-1">Total Females Not-spawned</span>
                <span className="text-xl font-black text-indigo-950">{totalFemaleNotSpawned}</span>
             </div>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 3. Redistribution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-rose-100 rounded-xl">
              <ArrowRightLeft className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Animal Movement after Spawning</h3>
          </div>
          
          <div className="px-1 text-[10px] text-muted-foreground italic -mt-2">Confirm return to female animal tanks.</div>

          <div className="space-y-1 bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-rose-700 tracking-wider">Return Status</span>
                <span className="text-[10px] font-black text-rose-950">{totalReturned} / {totalOriginalShifted} Returned</span>
             </div>
             <div className="w-full bg-white/50 h-1 rounded-full overflow-hidden mt-1">
                <div 
                   className="bg-rose-500 h-full transition-all duration-700" 
                   style={{ width: `${Math.min(100, (totalReturned / (totalOriginalShifted || 1)) * 100)}%` }}
                />
             </div>
          </div>

          <div className="space-y-3">
            {returnDestinations.map((dest) => (
              <Card key={dest.id} className="p-4 bg-rose-50/40 border-rose-100 border shadow-sm rounded-2xl group transition-all hover:bg-rose-50/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-black text-rose-950 leading-none">{dest.tankName}</p>
                    <p className="text-[9px] uppercase font-bold text-rose-600 tracking-tighter opacity-70">Female Source Tank</p>
                  </div>
                  <div className="w-40 flex items-center gap-4">
                    <div className="flex-1">
                       <Label className="text-[8px] font-black uppercase text-rose-600 block ml-1 mb-1">No. Shifted</Label>
                       <div className="relative">
                         <Input 
                             type="number" 
                             value={dest.count} 
                             onChange={e => handleReturnChange(dest.id, { count: e.target.value })} 
                             className="h-9 rounded-xl text-sm font-black pr-8 border border-rose-100 bg-white shadow-sm focus:ring-rose-500 text-rose-950 placeholder:font-medium placeholder:opacity-30" 
                             placeholder="0"
                         />
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-300">F</span>
                       </div>
                    </div>
                    <div className="w-12 flex flex-col items-center justify-center pt-3">
                       <Label className="text-[7px] font-black uppercase text-muted-foreground">New Pop</Label>
                       <span className="text-xs font-black text-foreground/70">
                         {Math.max(0, (dest.initialPopulation || 0) + (parseFloat(dest.count) || 0))}
                       </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {returnDestinations.length === 0 && (
               <div className="p-8 text-center bg-muted/5 border border-dashed rounded-2xl text-[10px] font-bold text-muted-foreground uppercase opacity-40">
                  Select a batch to load return tanks
               </div>
            )}
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
               placeholder="Add spawning notes..."
               rows={3}
               className="rounded-2xl border-muted-foreground/10 bg-muted/5 font-medium"
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpawningForm;
