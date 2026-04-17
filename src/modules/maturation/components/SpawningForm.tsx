import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRightLeft, Sparkles, Search, CheckCircle2, AlertCircle, CheckCircle, Database, Loader2, PlusCircle, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  activeBroodstockBatchId?: string | null;
  activeSectionId?: string;
  tankPopulations?: Record<string, number>;
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
  activeBroodstockBatchId,
}: SpawningFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.batchId || '');
  const [spawningTanks, setSpawningTanks] = useState<any[]>(data.spawningTanks || []);
  const [returnDestinations, setReturnDestinations] = useState<any[]>(data.returnDestinations || []);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'owner';
  const isEditing = !!data.id;
  const canEdit = isSupervisor || !isEditing;

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch Recent Sourcing & Mating Batches for this farm
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        const { data: logs, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Sourcing & Mating')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Fetch Spawning logs to check for completed batches
        const { data: spawnLogs } = await supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Spawning');

        const spawnedBatchNumbers = new Set((spawnLogs || []).map(l => l.data?.batchId || l.data?.batchNumber));

        // Filter to logs belonging to the active broodstock batch
        const filtered = (logs || []).filter(l => {
          const logStockingId = l.data?.stockingId || l.stockingId;
          const bn = l.data?.batchNumber || l.data?.batchId;
          
          // Filter by active broodstock batch
          if (activeBroodstockBatchId && logStockingId !== activeBroodstockBatchId) return false;
          
          // Filter out already spawned batches (unless we are in edit mode for one)
          if (spawnedBatchNumbers.has(bn) && data.batchId !== bn) return false;
          
          return true;
        });
        
        // De-duplicate by batchNumber
        const seen = new Set<string>();
        const unique = filtered.filter(l => {
          const bn = l.data?.batchNumber || l.data?.naupliiBatchId;
          if (!bn || seen.has(bn)) return false;
          seen.add(bn);
          return true;
        });
        setBatchLogs(unique);
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
      const matches = batchLogs.filter(l => 
        l.stockingId === activeBroodstockBatchId || 
        l.data?.stockingId === activeBroodstockBatchId ||
        l.data?.batchNumber?.startsWith(activeBroodstockBatchId)
      );
      
      if (matches.length > 0) {
        setSelectedBatchId(matches[0].data?.batchNumber);
      }
    }
  }, [activeBroodstockBatchId, batchLogs, selectedBatchId]);

  // When selectedBatchId changes, populate tank lists from the log
  useEffect(() => {
    if (!selectedBatchId) return;
    
    // Only auto-populate if we haven't loaded this batch yet or if data is totally empty
    const isNewBatch = data.batchId !== selectedBatchId;
    const isEmpty = spawningTanks.length === 0;
    
    if (!isNewBatch && !isEmpty) {
      // Update names if availableTanks arrived late
      if (spawningTanks.some(t => t.tankName === 'Unknown Tank' || t.tankName === 'Unknown')) {
        const updatedTanks = spawningTanks.map(t => {
          let tName = t.tankName;
          availableTanks.forEach(s => {
            const tk = s.tanks.find((tk: any) => tk.id === t.tankId);
            if (tk) tName = `${s.name} - ${tk.name}`;
          });
          return { ...t, tankName: tName };
        });
        setSpawningTanks(updatedTanks);
        
        const updatedReturns = returnDestinations.map(r => {
          let tName = r.tankName;
          availableTanks.forEach(s => {
            const tk = s.tanks.find((tk: any) => tk.id === r.tankId);
            if (tk) tName = `${s.name} - ${tk.name}`;
          });
          return { ...r, tankName: tName };
        });
        setReturnDestinations(updatedReturns);
      }
      return;
    }

    const log = batchLogs.find(l => l.data?.batchNumber === selectedBatchId);
    if (log && log.data) {
      // 1. Spawning Tanks (Destinations from Mating) - ONLY those with animals shifted in
      const matDests = (log.data.matedDestinations || []).filter((d: any) => (parseFloat(d.count) || 0) > 0);
      const newSpawningTanks = matDests.map((d: any) => {
        let tName = 'Unknown Tank';
        availableTanks.forEach(s => {
          const t = s.tanks.find((tk: any) => tk.id === d.tankId);
          if (t) tName = `${s.name} - ${t.name}`;
        });
        return {
          id: d.id,
          tankId: d.tankId,
          tankName: tName,
          shiftedCount: d.count || '0',
          spawnedCount: '',
          balanceCount: d.count || '0'
        };
      });
      setSpawningTanks(newSpawningTanks);

      // 2. Return Source Tanks (Source tanks from Sourcing)
      const sources = log.data.sourceTanks || [];
      const newReturns = sources.map((s: any) => {
        let tName = 'Unknown Tank';
        availableTanks.forEach(sect => {
          const t = sect.tanks.find((tk: any) => tk.id === s.tankId);
          if (t) tName = `${sect.name} - ${t.name}`;
        });
        return {
          id: s.id,
          tankId: s.tankId,
          tankName: tName,
          count: '',
          initialPopulation: tankPopulations[s.tankId] || 0
        };
      });
      setReturnDestinations(newReturns);
      
      updateData({ 
        batchId: selectedBatchId,
        spawningTanks: newSpawningTanks,
        returnDestinations: newReturns
      });
    }
  }, [selectedBatchId, batchLogs, availableTanks]);

  const handleSpawningChange = (id: string, updates: any) => {
    const newList = spawningTanks.map(t => {
      if (t.id === id) {
        let spawnedVal = updates.spawnedCount;
        const original = parseFloat(t.shiftedCount) || 0;

        if (spawnedVal !== undefined && spawnedVal !== '') {
          const numValue = parseFloat(spawnedVal);
          if (numValue > original) {
            toast.error(`Cannot exceed ${original} females available in ${t.tankName}`);
          }
        }

        const spawned = spawnedVal !== undefined ? (parseFloat(spawnedVal) || 0) : (parseFloat(t.spawnedCount) || 0);
        return { 
          ...t, 
          ...updates, 
          spawnedCount: spawnedVal ?? t.spawnedCount,
          balanceCount: Math.max(0, original - spawned).toString() 
        };
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
    let spawningId = selectedBatchId;
    
    if (selectedBatchId && selectedBatchId.includes('_')) {
      const parts = selectedBatchId.split('_');
      // Format: NP_FS(S)_FM(M)_YYMMDD_SUFFIX
      // We want to transform to: NP_SP(SP)_NSP(NSP)_YYMMDD_SUFFIX
      // Or if it was already updated, just replace the SP/NSP parts
      
      const datePart = parts.find(p => /^\d{6}$/.test(p)) || '';
      const suffixPart = parts[parts.length - 1];
      
      spawningId = `NP_SP${totalFemaleSpawned}_NSP${totalFemaleNotSpawned}_${datePart}_${suffixPart}`;
    }

    updateData({
      batchId: spawningId,
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
           <div className="text-right">
              <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest opacity-70">Context</p>
              <p className="text-[10px] font-bold text-red-600 italic">Maturation Module</p>
           </div>
        </div>
      )}

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Read-Only Mode</p>
            <p className="text-[10px] font-medium opacity-80">This spawning record can only be edited by a supervisor.</p>
          </div>
        </div>
      )}

      <div className={cn("glass-card rounded-3xl p-6 border shadow-sm space-y-8", !canEdit && "opacity-80 pointer-events-none select-none")}>
        {selectedBatchId && activeBroodstockBatchId ? (
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-4 animate-in fade-in slide-in-from-top-2">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                   <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest opacity-70">Active Spawning Batch</p>
                   <p className="text-sm font-black text-indigo-900">{selectedBatchId}</p>
                </div>
             </div>
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedBatchId('')} 
                className="h-8 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100"
             >
                Change Batch
             </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1: Choose Batch</h3>
              <p className="text-[10px] text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-md font-bold">From Sourcing & Mating</p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold ml-1 text-muted-foreground uppercase tracking-widest leading-none">Choose Batch *</Label>
                {!loadingBatches && batchLogs.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 text-amber-600 bg-amber-50 p-6 rounded-3xl border border-amber-100 animate-in fade-in zoom-in-95 w-full">
                    <div className="p-3 bg-amber-100 rounded-2xl">
                      <AlertCircle className="w-8 h-8 text-amber-600" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-black uppercase tracking-tight">No Batch Found</p>
                      <p className="text-[11px] text-amber-700/70 font-medium leading-tight max-w-[240px]">
                        Please record a "Sourcing & Mating" activity first to create a batch for this broodstock.
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
                    </div>
                  </div>
                ) : (
                 <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                    <SelectTrigger className="h-12 rounded-2xl border-indigo-100 bg-background/50 text-base font-black text-indigo-900 focus:ring-indigo-500">
                      <SelectValue placeholder="Search Batch ID" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingBatches ? (
                        <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...</div>
                      ) : (
                        batchLogs.map(log => (
                          <SelectItem key={log.id} value={log.data?.batchId || log.data?.batchNumber}>
                             <span className="font-bold">{log.data?.batchId || log.data?.batchNumber}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                 </Select>
               )}
              <p className="text-[10px] text-muted-foreground ml-2 italic">Selecting a batch will automatically load associated tanks.</p>
            </div>
          </div>
        )}

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
                              "h-9 rounded-xl font-black bg-white border shadow-sm text-center pr-6 transition-all",
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
                             className="h-9 rounded-xl text-sm font-black pr-8 border border-rose-100 bg-white shadow-sm focus:ring-rose-500 text-rose-950" 
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
                  Select a batch to load source tanks
               </div>
            )}
          </div>

          <div className={`mt-2 p-4 rounded-2xl border transition-all duration-500 ${totalReturned === totalOriginalShifted && totalOriginalShifted > 0 ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-muted/10 border-dashed'}`}>
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className={`text-[9px] font-black uppercase tracking-widest ${totalReturned === totalOriginalShifted && totalOriginalShifted > 0 ? 'text-rose-100' : 'text-rose-600'}`}>Total Females Shifted</p>
                <p className="text-xl font-black">
                  {totalReturned} <span className="text-xs font-normal opacity-70">/ {totalOriginalShifted} Females</span>
                </p>
              </div>
              {totalReturned === totalOriginalShifted && totalOriginalShifted > 0 ? (
                <div className="bg-white/20 p-2 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
              ) : (
                <p className="text-[10px] font-bold italic opacity-60">Cross-check totals</p>
              )}
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

export default SpawningForm;
