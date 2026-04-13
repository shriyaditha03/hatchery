import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUpRight, Calculator, CheckCircle2, AlertCircle, Camera, ClipboardList, Loader2, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface HarvestTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  spawnedCount: string;
  harvestedMil: string;
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
}: NaupliiHarvestFormProps) => {
  // Use grouped state internally if possible, or derive from flat arrays on mount
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [harvestTanks, setHarvestTanks] = useState<HarvestTankEntry[]>(data.harvestTanks || []);
  const [naupliiDestinations, setNaupliiDestinations] = useState<NaupliiDestEntry[]>(data.naupliiDestinations || []);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch Recent Egg Count Batches for this farm
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        const { data: logs, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Egg Count')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        // Filter in JS to avoid 400 errors on complex JSON queries
        const filtered = logs.filter(l => 
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

  // Auto-select batch from dashboard context
  useEffect(() => {
    if (activeBroodstockBatchId && batchLogs.length > 0 && !selectedBatchId) {
      const matches = batchLogs.filter(l => 
        l.stockingId === activeBroodstockBatchId || 
        l.data?.stockingId === activeBroodstockBatchId ||
        l.data?.selectedBatchId?.startsWith(activeBroodstockBatchId)
      );
      
      if (matches.length > 0) {
        handleBatchSelect(matches[0].data?.selectedBatchId);
      }
    }
  }, [activeBroodstockBatchId, batchLogs, selectedBatchId]);

  // When selectedBatchId changes, populate tank lists from the Egg Count log
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    const log = batchLogs.find(l => l.data?.selectedBatchId === batchId);
    if (log && log.data) {
      // 1. Harvest Tanks (Tanks from Egg Count)
      const eggEntries = log.data.entries || [];
      const newHarvestTanks = eggEntries.map((e: any) => ({
        id: e.id,
        tankId: e.tankId,
        tankName: e.tankName,
        spawnedCount: e.spawnedCount,
        harvestedMil: ''
      }));
      setHarvestTanks(newHarvestTanks);

      // 2. Initial Destination (Add one empty row)
      const initialDests = [{ id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', shiftedMil: '' }];
      setNaupliiDestinations(initialDests);
      
      updateData({ 
        selectedBatchId: batchId,
        harvestTanks: newHarvestTanks,
        naupliiDestinations: initialDests
      });
    }
  };

  const handleHarvestChange = (id: string, updates: any) => {
    const newList = harvestTanks.map(t => t.id === id ? { ...t, ...updates } : t);
    setHarvestTanks(newList);
    updateData({ harvestTanks: newList });
  };

  const handleDestChange = (id: string, updates: any) => {
    const newList = naupliiDestinations.map(d => {
       if (d.id === id) {
          if (updates.tankId) {
             let tName = 'Unknown Tank';
             availableTanks.forEach(s => {
                const t = s.tanks.find((tk: any) => tk.id === updates.tankId);
                if (t) tName = `${s.name} - ${t.name}`;
             });
             return { ...d, ...updates, tankName: tName };
          }
          return { ...d, ...updates };
       }
       return d;
    });
    setNaupliiDestinations(newList);
    updateData({ naupliiDestinations: newList });
  };

  const addDestination = () => {
    const newDest = { id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', shiftedMil: '' };
    const newList = [...naupliiDestinations, newDest];
    setNaupliiDestinations(newList);
    updateData({ naupliiDestinations: newList });
  };

  const removeDestination = (id: string) => {
    const newList = naupliiDestinations.filter(d => d.id !== id);
    setNaupliiDestinations(newList);
    updateData({ naupliiDestinations: newList });
  };

  const totalHarvestedMil = harvestTanks.reduce((sum, t) => sum + (parseFloat(t.harvestedMil) || 0), 0);
  const totalShiftedMil = naupliiDestinations.reduce((sum, d) => sum + (parseFloat(d.shiftedMil) || 0), 0);
  const totalSpawnedFemale = harvestTanks.reduce((sum, t) => sum + (parseFloat(t.spawnedCount) || 0), 0);
  const isBalanced = Math.abs(totalHarvestedMil - totalShiftedMil) < 0.001 && totalHarvestedMil > 0;

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
        
        {/* Batch Selection */}
        {selectedBatchId && activeBroodstockBatchId ? (
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-4 animate-in fade-in slide-in-from-top-2">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                   <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest opacity-70">Active Egg Count Batch</p>
                   <p className="text-sm font-black text-indigo-900">{selectedBatchId}</p>
                </div>
             </div>
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedBatchId('')} 
                className="h-8 text-[10px] font-bold text-indigo-600 hover:bg-blue-100"
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
              <p className="text-[10px] text-muted-foreground uppercase bg-indigo-50 px-2 py-1 rounded-md font-bold">From Egg Count</p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold ml-1 text-muted-foreground uppercase tracking-widest leading-none">Choose Batch *</Label>
              <Select value={selectedBatchId} onValueChange={handleBatchSelect}>
                 <SelectTrigger className="h-12 rounded-2xl border-indigo-100 bg-background/50 text-base font-black text-indigo-900">
                   <SelectValue placeholder="Search Batch ID" />
                 </SelectTrigger>
                 <SelectContent>
                   {loadingBatches ? (
                     <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...</div>
                   ) : batchLogs.length === 0 ? (
                     <div className="p-4 text-center text-xs text-amber-600 bg-amber-50 rounded-xl">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        No Egg Count batches found. Please record an "Egg Count" activity first.
                     </div>
                   ) : (
                     batchLogs.map(log => (
                       <SelectItem key={log.id} value={log.data?.selectedBatchId}>
                         <span className="font-bold">{log.data?.selectedBatchId}</span>
                         <span className="ml-2 opacity-50 text-[10px]">({new Date(log.created_at).toLocaleDateString()})</span>
                       </SelectItem>
                     ))
                   )}
                 </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground ml-2 italic">Selecting a batch will load Spawning tanks recorded in Egg Count.</p>
            </div>
          </div>
        )}

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Step 1: Nauplii Harvested */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2: Nauplii Harvested</h3>
          </div>
          
          <div className="space-y-3">
             {harvestTanks.map((tank) => (
               <Card key={tank.id} className="p-4 bg-muted/5 border-none rounded-2xl overflow-hidden group">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex-1">
                        <p className="text-xs font-black text-foreground">{tank.tankName}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Spawning Tank ({tank.spawnedCount} F)</p>
                     </div>
                     <div className="w-44">
                        <Label className="text-[8px] font-black uppercase text-emerald-600 block mb-1 ml-1 text-center">Harvested (mil) *</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={tank.harvestedMil} 
                            onChange={e => handleHarvestChange(tank.id, { harvestedMil: e.target.value })} 
                            className="h-10 rounded-xl font-black bg-white border-none shadow-sm text-center pr-8 text-emerald-950" 
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
                  Select a batch to load harvest tanks
               </div>
             )}
          </div>

          <Card className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
              <div>
                 <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block leading-tight">Total Nauplii Harvested</span>
                 <span className="text-[8px] font-bold text-muted-foreground italic">(Millions)</span>
              </div>
              <span className="text-3xl font-black text-emerald-950 leading-none">{totalHarvestedMil.toLocaleString()}</span>
          </Card>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Step 2: Shifted To */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 3: Shifted To (Nauplii Tanks)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {naupliiDestinations.map((dest) => (
               <Card key={dest.id} className="p-5 bg-blue-50/30 border-blue-100/50 rounded-[2rem] space-y-4 relative group">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDestination(dest.id)}
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-rose-50 text-rose-600 opacity-0 group-hover:opacity-100 transition-all border border-rose-100 shadow-sm z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  
                  <div className="space-y-1.5">
                     <Label className="text-[9px] font-black uppercase text-blue-700 ml-1 leading-none tracking-widest">Nauplii Tank ID</Label>
                     <Select value={dest.tankId} onValueChange={val => handleDestChange(dest.id, { tankId: val })}>
                        <SelectTrigger className="h-10 rounded-xl border-blue-50 bg-white font-bold text-blue-950 text-xs">
                           <SelectValue placeholder="Select Tank" />
                        </SelectTrigger>
                        <SelectContent>
                           {availableTanks
                            .filter(s => {
                              const sType = (s.section_type || '').toUpperCase();
                              const sName = (s.name || '').toUpperCase();
                              // Robust keywords: NAUPLII, NS
                              return (sType.includes('NAUPLII') || sName.includes('NAUPLII') || sName.includes('NS')) && (!farmId || s.farm_id === farmId);
                            })
                            .flatMap(s => s.tanks.map((t:any) => (
                              <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>
                            )))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1.5">
                     <Label className="text-[9px] font-black uppercase text-blue-700 ml-1 leading-none tracking-widest">Amount Shifted (mil)</Label>
                     <div className="relative">
                        <Input 
                           type="number" 
                           step="0.01"
                           value={dest.shiftedMil} 
                           onChange={e => handleDestChange(dest.id, { shiftedMil: e.target.value })} 
                           className="h-11 rounded-xl font-black bg-white border-blue-50 text-lg text-blue-950 pr-12 focus:border-blue-500 shadow-sm" 
                           placeholder="0.0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400 opacity-60">MIL</span>
                     </div>
                  </div>
               </Card>
             ))}
             
             <Button 
                variant="outline" 
                onClick={addDestination}
                className="h-auto py-8 rounded-[2rem] border-dashed border-blue-200 bg-blue-50/10 hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold text-xs uppercase flex flex-col gap-3 transition-all"
             >
                <Plus className="w-6 h-6" />
                Add Nauplii Tank
             </Button>
          </div>

          <div className={cn(
             "p-6 rounded-[2.5rem] border-2 transition-all duration-500 shadow-lg",
             isBalanced ? "bg-blue-600 border-blue-400 text-white" : "bg-rose-50 border-rose-100 text-rose-900"
          )}>
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Total Allocation Status</p>
                   <p className="text-3xl font-black mt-1">{totalShiftedMil.toLocaleString()}<span className="text-sm font-bold opacity-50 ml-2">MIL SHIFTED</span></p>
                </div>
                {isBalanced ? (
                   <div className="flex flex-col items-end gap-1">
                      <div className="p-3 bg-white/20 rounded-full animate-pulse">
                         <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">Fully Distributed</span>
                   </div>
                ) : (
                   <div className="flex flex-col items-end gap-1">
                      <p className="text-xl font-black text-rose-600">
                         {totalHarvestedMil >= totalShiftedMil 
                            ? `${(totalHarvestedMil - totalShiftedMil).toFixed(2)}M`
                            : `-${Math.abs(totalHarvestedMil - totalShiftedMil).toFixed(2)}M`
                         }
                      </p>
                      <span className="text-[9px] font-black uppercase text-rose-400 tracking-widest">
                         {totalHarvestedMil >= totalShiftedMil ? 'Pending Allocation' : 'Over Allocated'}
                      </span>
                   </div>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-4 border-t border-dashed">
          <Label className="text-xs">Activity Photo (Optional)</Label>
          <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Comments</Label>
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

export default NaupliiHarvestForm;
