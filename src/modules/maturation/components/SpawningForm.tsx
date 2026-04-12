import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRightLeft, Sparkles, Search, CheckCircle2, AlertCircle, CheckCircle, Database, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.batchId || '');
  const [spawningTanks, setSpawningTanks] = useState<any[]>(data.spawningTanks || []);
  const [returnDestinations, setReturnDestinations] = useState<any[]>(data.returnDestinations || []);
  const [loadingBatches, setLoadingBatches] = useState(false);

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
          .or(`stockingId.eq.${activeBroodstockBatchId},data->>stockingId.eq.${activeBroodstockBatchId}`)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        setBatchLogs(logs || []);
      } catch (err) {
        console.error('Error fetching batches:', err);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [farmId]);

  // When selectedBatchId changes, populate tank lists from the log
  useEffect(() => {
    if (!selectedBatchId) return;
    const log = batchLogs.find(l => l.data?.batchNumber === selectedBatchId);
    if (log && log.data) {
      // 1. Spawning Tanks (Destinations from Mating)
      const matDests = log.data.matedDestinations || [];
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
          returnCount: '',
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
        const spawned = updates.spawnedCount !== undefined ? (parseFloat(updates.spawnedCount) || 0) : (parseFloat(t.spawnedCount) || 0);
        const original = parseFloat(t.shiftedCount) || 0;
        return { ...t, ...updates, balanceCount: Math.max(0, original - spawned).toString() };
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
  const totalFemaleUnspawned = spawningTanks.reduce((sum, t) => sum + (parseFloat(t.balanceCount) || 0), 0);
  const totalReturned = returnDestinations.reduce((sum, d) => sum + (parseFloat(d.returnCount) || 0), 0);
  const totalOriginalShifted = spawningTanks.reduce((sum, t) => sum + (parseFloat(t.shiftedCount) || 0), 0);

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
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        {/* 1. Spawning Tank Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Select Batch from Sourcing & Mating</h3>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-bold ml-1 text-muted-foreground uppercase tracking-widest leading-none">Choose Batch *</Label>
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
               <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/20 bg-background/50 text-base font-black text-primary">
                 <SelectValue placeholder="Search Batch ID" />
               </SelectTrigger>
               <SelectContent>
                 {loadingBatches ? (
                   <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...</div>
                 ) : batchLogs.length === 0 ? (
                   <div className="p-4 text-center text-xs text-muted-foreground">No recent batches found</div>
                 ) : (
                   batchLogs.map(log => (
                     <SelectItem key={log.id} value={log.data?.batchNumber}>
                       <span className="font-bold">{log.data?.batchNumber}</span>
                       <span className="ml-2 opacity-50 text-[10px]">({log.data?.totalSourced} F)</span>
                     </SelectItem>
                   ))
                 )}
               </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground ml-2 italic">Selecting a batch will automatically load associated tanks.</p>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 2. Spawning Results */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Spawning Results for Batch Tanks</h3>
          </div>
          
          <div className="space-y-1 text-[10px] text-muted-foreground italic -mt-2 px-1">
            Specify spawned count for each tank. Animals will be moved back to source.
          </div>

          <div className="space-y-3">
             {spawningTanks.map((tank) => (
               <Card key={tank.id} className="p-4 bg-muted/5 border-none rounded-2xl overflow-hidden relative group">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex-1">
                        <p className="text-xs font-black text-foreground">{tank.tankName}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Maturation Tank ({tank.shiftedCount} F In)</p>
                     </div>
                     <div className="w-32 flex flex-col gap-1">
                        <Label className="text-[8px] font-black uppercase text-center text-emerald-600 leading-none">Spawned</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            value={tank.spawnedCount} 
                            onChange={e => handleSpawningChange(tank.id, { spawnedCount: e.target.value })} 
                            className="h-9 rounded-xl font-black bg-white border-none focus:ring-emerald-500 shadow-sm text-center pr-6" 
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-400">F</span>
                        </div>
                     </div>
                     <div className="w-16 flex flex-col items-center justify-center">
                        <Label className="text-[8px] font-black uppercase text-amber-600 leading-none">Bal. (F)</Label>
                        <span className="text-sm font-black text-amber-700/60 mt-2">{tank.balanceCount}</span>
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
             <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Female Spawned</span>
                <span className="text-xl font-black text-emerald-950">{totalFemaleSpawned}</span>
             </div>
             <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest mb-1">Total (F) Un-spawned</span>
                <span className="text-xl font-black text-amber-950">{totalFemaleUnspawned}</span>
             </div>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* 3. Redistribution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Animals Shifted To (Return Source)</h3>
          </div>
          
          <div className="px-1 text-[10px] text-muted-foreground italic -mt-2">Confirm return to starting tanks.</div>

          <div className="space-y-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">Return Status</span>
                <span className="text-[10px] font-black text-indigo-950">{totalReturned} / {totalOriginalShifted} Returned</span>
             </div>
             <div className="w-full bg-white/50 h-1 rounded-full overflow-hidden mt-1">
                <div 
                   className="bg-indigo-500 h-full transition-all duration-700" 
                   style={{ width: `${Math.min(100, (totalReturned / (totalOriginalShifted || 1)) * 100)}%` }}
                />
             </div>
          </div>

          <div className="space-y-3">
            {returnDestinations.map((dest) => (
              <Card key={dest.id} className="p-4 bg-muted/5 border-none rounded-2xl group transition-all hover:bg-muted/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-black text-foreground">{dest.tankName}</p>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter opacity-70">Female Source Tank</p>
                  </div>
                  <div className="w-40 flex items-center gap-4">
                    <div className="flex-1">
                       <Label className="text-[8px] font-black uppercase text-indigo-600 block ml-1 mb-1">Return</Label>
                       <div className="relative">
                         <Input 
                             type="number" 
                             value={dest.returnCount} 
                             onChange={e => handleReturnChange(dest.id, { returnCount: e.target.value })} 
                             className="h-9 rounded-xl text-sm font-black pr-8 border-none bg-white shadow-sm focus:ring-indigo-500" 
                             placeholder="0"
                         />
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400">F</span>
                       </div>
                    </div>
                    <div className="w-12 flex flex-col items-center justify-center pt-3">
                       <Label className="text-[7px] font-black uppercase text-muted-foreground">New Pop</Label>
                       <span className="text-xs font-black text-foreground/70">
                         {Math.max(0, (dest.initialPopulation || 0) + (parseFloat(dest.returnCount) || 0))}
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
