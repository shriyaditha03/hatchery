import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator, ShoppingCart, Camera, ClipboardList, CheckCircle2, TrendingUp, Database, Loader2, AlertCircle, ArrowRight, History, Info, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface SaleTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  harvestedAmount: string; // From the Harvest log
  saleMil: string;
  discardMil: string;
  isExceedingConfirmed?: boolean;
}

interface NaupliiSaleFormProps {
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

const NaupliiSaleForm = ({
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
}: NaupliiSaleFormProps) => {
  const [batchLogs, setBatchLogs] = useState<any[]>([]);
  const [existingSales, setExistingSales] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [saleTanks, setSaleTanks] = useState<SaleTankEntry[]>(data.saleTanks || []);
  const [bonusPercentage, setBonusPercentage] = useState<string>(data.bonusPercentage || '0');
  const [netSaleManual, setNetSaleManual] = useState<string>(data.netNauplii?.toString() || '');
  const [packsPacked, setPacksPacked] = useState<string>(data.packsPacked || '');
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [totalHarvestedInBatch, setTotalHarvestedInBatch] = useState<number>(data.summary?.totalAvailable || 0);
  const [totalSpawnedInBatch, setTotalSpawnedInBatch] = useState<number>(data.summary?.totalSpawned || 0);
  const [showOverSaleWarning, setShowOverSaleWarning] = useState(false);
  const [pendingSaleUpdate, setPendingSaleUpdate] = useState<{ id: string, value: string } | null>(null);

  // Fetch and Aggregate Inventory (Harvest - Sale)
  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch Recent Nauplii Harvest Batches and existing Sales
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        // 1. Fetch Harvest logs (Candidate batches) - ONLY for this broodstock batch
        let harvestQuery = supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Harvest')
          .order('created_at', { ascending: false })
          .limit(100);

        if (activeBroodstockBatchId) {
          harvestQuery = harvestQuery.eq('stocking_id', activeBroodstockBatchId);
        }

        const { data: logs, error } = await harvestQuery;

        if (error) throw error;

        // 2. Fetch existing Nauplii Sale logs (to find locked batches) - ONLY for this broodstock batch
        let saleQuery = supabase
          .from('activity_logs')
          .select('data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Sale');
        
        if (activeBroodstockBatchId) {
          saleQuery = saleQuery.eq('stocking_id', activeBroodstockBatchId);
        }
        
        const { data: saleLogs } = await saleQuery;
        setExistingSales(saleLogs || []);

        // Filter in JS for batch/stocking alignment
        const filtered = (logs || []).filter(l => 
          l.stocking_id === activeBroodstockBatchId || 
          l.stockingId === activeBroodstockBatchId || 
          l.data?.stockingId === activeBroodstockBatchId ||
          l.data?.selectedBatchId?.startsWith(activeBroodstockBatchId || '')
        );
        setBatchLogs(filtered || []);
      } catch (err) {
        console.error('Error fetching harvest batches:', err);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [farmId, activeBroodstockBatchId]);

  const lockedHarvestIds = useMemo(() => {
    return (existingSales || []).map(l => 
      l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber || l.data?.sourceBatchId || l.data?.displayBatchId
    ).filter(Boolean);
  }, [existingSales]);

  const availableBatches = useMemo(() => {
    const filtered = batchLogs.filter(log => {
      const bId = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      const logStockingId = log.stocking_id || log.data?.stockingId || log.stockingId;

      // Filter by active broodstock batch
      if (activeBroodstockBatchId && logStockingId && logStockingId !== activeBroodstockBatchId) return false;

      // Only show if not locked, OR if it's the currently selected one
      return !lockedHarvestIds.includes(bId) || bId === data.sourceBatchId || bId === data.selectedBatchId;
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
  }, [batchLogs, lockedHarvestIds, data.selectedBatchId, data.sourceBatchId, activeBroodstockBatchId]);

  // Auto-select batch from dashboard context
  useEffect(() => {
    if (activeBroodstockBatchId && batchLogs.length > 0 && !selectedBatchId) {
      const matches = batchLogs.filter(l => 
        l.stockingId === activeBroodstockBatchId || 
        l.data?.stockingId === activeBroodstockBatchId ||
        l.data?.selectedBatchId?.startsWith(activeBroodstockBatchId)
      );
      
      if (matches.length > 0) {
        handleBatchSelect(matches[0].data?.selectedBatchId || matches[0].data?.batchId || matches[0].data?.batchNumber);
      }
    }
  }, [activeBroodstockBatchId, batchLogs, selectedBatchId]);

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    const log = batchLogs.find(l => (l.data?.selectedBatchId || l.data?.batchId || l.data?.batchNumber) === batchId);
    if (log && log.data) {
      const harvestEntries = log.data.naupliiDestinations || [];
      const harvestedTotal = log.data.summary?.totalHarvested || 0;
      const spawnedTotal = log.data.summary?.totalBatchSpawned || 0;
      
      // Check 24-hour expiration logic
      const harvestDate = new Date(log.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - harvestDate.getTime()) / (1000 * 60 * 60);
      const expired = hoursDiff > 24;
      setIsExpired(expired);

      setTotalHarvestedInBatch(harvestedTotal);
      setTotalSpawnedInBatch(spawnedTotal);

      const newSaleTanks = harvestEntries.map((e: any) => ({
        id: e.id,
        tankId: e.tankId,
        tankName: e.tankName,
        harvestedAmount: e.shiftedMil,
        saleMil: expired ? '0' : e.shiftedMil, // Auto-discard if expired
        discardMil: expired ? e.shiftedMil : '0' // Auto-discard if expired
      }));
      setSaleTanks(newSaleTanks);
      updateData({ 
        selectedBatchId: batchId,
        saleTanks: newSaleTanks,
        summary: {
          totalAvailable: harvestedTotal,
          totalSpawned: spawnedTotal
        }
      });
    }
  };

  const handleTankUpdate = (id: string, updates: any) => {
    const tank = saleTanks.find(t => t.id === id);
    if (!tank) return;

    let finalUpdates = { ...updates };
    const harvested = parseFloat(tank.harvestedAmount) || 0;

    // A. Interdependence Logic: Sale updates Discard
    if ('saleMil' in updates) {
      const newSale = parseFloat(updates.saleMil) || 0;
      // Discard = Available - Sale (clamped at 0)
      const newDiscard = Math.max(0, harvested - newSale);
      finalUpdates.discardMil = newDiscard.toFixed(2);
      
      // Reset confirmation if value changes back to below/equal harvested
      if (newSale <= harvested) {
        finalUpdates.isExceedingConfirmed = false;
      }
    }

    // B. Interdependence Logic: Discard updates Sale (Optional but logical for "based on available")
    if ('discardMil' in updates) {
      const newDiscard = parseFloat(updates.discardMil) || 0;
      // Sale = Available - Discard (clamped at 0)
      const newSale = Math.max(0, harvested - newDiscard);
      finalUpdates.saleMil = newSale.toFixed(2);
      finalUpdates.isExceedingConfirmed = false;
    }

    const newList = saleTanks.map(t => t.id === id ? { ...t, ...finalUpdates } : t);
    setSaleTanks(newList);
    updateData({ saleTanks: newList });
  };

  const handleSaleInputBlur = (id: string, value: string) => {
    const tank = saleTanks.find(t => t.id === id);
    if (!tank) return;

    const harvested = parseFloat(tank.harvestedAmount) || 0;
    const sale = parseFloat(value) || 0;

    if (sale > harvested && !tank.isExceedingConfirmed) {
      setPendingSaleUpdate({ id, value });
      setShowOverSaleWarning(true);
    }
  };

  const confirmOverSale = () => {
    if (pendingSaleUpdate) {
      handleTankUpdate(pendingSaleUpdate.id, { 
        saleMil: pendingSaleUpdate.value, 
        isExceedingConfirmed: true 
      });
    }
    setShowOverSaleWarning(false);
    setPendingSaleUpdate(null);
  };

  const cancelOverSale = () => {
    if (pendingSaleUpdate) {
      const tank = saleTanks.find(t => t.id === pendingSaleUpdate.id);
      if (tank) {
        // Revert to harvested amount or original? 
        // User said "it should still allow", but if they cancel, we revert to harvested amount
        handleTankUpdate(pendingSaleUpdate.id, { 
          saleMil: tank.harvestedAmount,
          isExceedingConfirmed: false 
        });
      }
    }
    setShowOverSaleWarning(false);
    setPendingSaleUpdate(null);
  };

  useEffect(() => {
    const gross = saleTanks.reduce((sum, t) => sum + (parseFloat(t.saleMil) || 0), 0);
    const discards = saleTanks.reduce((sum, t) => sum + (parseFloat(t.discardMil) || 0), 0);
    const bonus = parseFloat(bonusPercentage) || 0;
    
    // Net = Gross / (1 + Bonus%)
    const calculatedNet = gross / (1 + (bonus / 100));
    
    // Auto-update manual field if it's empty or matching exactly previous auto-value
    if (!netSaleManual || parseFloat(netSaleManual) === 0) {
      setNetSaleManual((Math.round(calculatedNet * 100) / 100).toString());
    }

    const efficiency = totalSpawnedInBatch > 0 ? (totalHarvestedInBatch / totalSpawnedInBatch) : 0;

    updateData({
      totalGross: Math.round(gross * 100) / 100,
      totalDiscard: Math.round(discards * 100) / 100,
      bonusPercentage,
      packsPacked,
      netNauplii: netSaleManual ? parseFloat(netSaleManual) : Math.round(calculatedNet * 100) / 100,
      sourceBatchId: selectedBatchId,
      summary: {
        totalAvailable: totalHarvestedInBatch,
        totalSpawned: totalSpawnedInBatch,
        naupliiPerAnimal: Math.round(efficiency * 100) / 100
      }
    });
  }, [saleTanks, bonusPercentage, packsPacked, netSaleManual, totalHarvestedInBatch, totalSpawnedInBatch]);

  // Handle Calculations & State Sync
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
              <h3 className="text-sm font-bold uppercase tracking-wider" id="step-1-title">Step # 1: Choose Batch</h3>
              <p className="text-[10px] text-muted-foreground uppercase bg-indigo-50 px-2 py-1 rounded-md font-bold">From Harvest</p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold ml-1 text-muted-foreground uppercase tracking-widest leading-none">Choose Batch *</Label>
              {batchLogs.length === 0 && !loadingBatches ? (
                 <div className="p-8 text-center bg-amber-50 border border-amber-100 rounded-3xl space-y-4 animate-in fade-in zoom-in-95" id="empty-batch-state">
                    <div className="flex flex-col items-center gap-2">
                       <AlertCircle className="w-8 h-8 text-amber-600" />
                       <p className="text-sm font-black uppercase text-amber-900">No Nauplii Production Batch updated</p>
                       <p className="text-[10px] text-amber-700/70 max-w-[280px]">Please complete previous steps to enable Nauplii Sale.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                       <Button id="nav-sourcing" variant="outline" size="sm" onClick={() => window.location.href='/user/activity?type=Sourcing%20%26%20Mating&mode=activity&category=MATURATION'} className="text-[9px] h-8 font-black uppercase border-amber-200">Sourcing & Mating</Button>
                       <Button id="nav-spawning" variant="outline" size="sm" onClick={() => window.location.href='/user/activity?type=Spawning&mode=activity&category=MATURATION'} className="text-[9px] h-8 font-black uppercase border-amber-200">Spawning</Button>
                       <Button id="nav-egg" variant="outline" size="sm" onClick={() => window.location.href='/user/activity?type=Egg%20Count&mode=activity&category=MATURATION'} className="text-[9px] h-8 font-black uppercase border-amber-200">Egg Count</Button>
                       <Button id="nav-harvest" variant="outline" size="sm" onClick={() => window.location.href='/user/activity?type=Nauplii%20Harvest&mode=activity&category=MATURATION'} className="text-[9px] h-8 font-black uppercase border-amber-200">Nauplii Harvest</Button>
                    </div>
                 </div>
              ) : (
                <Select value={selectedBatchId} onValueChange={handleBatchSelect}>
                   <SelectTrigger className="h-12 rounded-2xl border-indigo-100 bg-background/50 text-sm font-black text-indigo-900 focus:ring-indigo-500" id="batch-select-trigger">
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

         {/* Available Metric */}
         {selectedBatchId && (
           <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                 <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                    <History className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest leading-none mb-1">Total Available for Sale</p>
                    <p className="text-xl font-black text-emerald-950">{totalHarvestedInBatch.toLocaleString()} mil <span className="text-[10px] opacity-70">(from Harvest)</span></p>
                 </div>
              </div>
              <div className="text-right flex items-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-emerald-100">
                 <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                   <TrendingUp className="w-4 h-4 text-emerald-600" />
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-emerald-800 uppercase opacity-60">Avg. Yield</p>
                    <p className="text-xs font-black text-emerald-900">{(totalHarvestedInBatch / (totalSpawnedInBatch || 1)).toFixed(2)}M / Fem</p>
                 </div>
              </div>
           </div>
         )}

        {/* Step 2: Sale vs. Discard */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2 available Nauplii tanks</h3>
          </div>
          
          <div className="space-y-4">
              {saleTanks.map((tank) => (
                <Card 
                  key={tank.id} 
                  className={cn(
                    "p-5 bg-amber-50/40 border-amber-100 shadow-sm rounded-[2rem] space-y-4 relative group hover:bg-amber-50/60 transition-colors overflow-hidden",
                    (parseFloat(tank.saleMil) > (parseFloat(tank.harvestedAmount) || 0)) && "border-rose-400 bg-rose-50/20"
                  )}
                >
                  {/* Over-sale Badge */}
                  {parseFloat(tank.saleMil) > (parseFloat(tank.harvestedAmount) || 0) && (
                    <div className="absolute top-4 right-4 bg-rose-600 text-white text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1 animate-in zoom-in-95">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      EXCEEDS AVAILABLE
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2">
                     <div>
                        <p className="text-xs font-black text-amber-950">{tank.tankName}</p>
                        <p className="text-[9px] font-bold text-amber-600 uppercase opacity-60">Available: {tank.harvestedAmount} mil</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-amber-700 ml-1 leading-none tracking-widest">Step # 3 Amount for sale (mil) *</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={tank.saleMil} 
                            onChange={e => handleTankUpdate(tank.id, { saleMil: e.target.value })} 
                            onBlur={e => handleSaleInputBlur(tank.id, e.target.value)}
                            className={cn(
                              "h-11 rounded-xl font-black bg-white border border-amber-100 shadow-sm text-lg text-amber-950 pr-10 focus:ring-amber-500 placeholder:font-medium placeholder:opacity-30",
                              (parseFloat(tank.saleMil) > (parseFloat(tank.harvestedAmount) || 0)) && "border-rose-500 ring-rose-500 focus:ring-rose-500"
                            )}
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-400">MIL</span>
                        </div>
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-rose-700 ml-1 leading-none tracking-widest">Step # 6 Discarded amount (mil)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={tank.discardMil} 
                            onChange={e => handleTankUpdate(tank.id, { discardMil: e.target.value })} 
                            className="h-11 rounded-xl font-black bg-white border border-rose-100 shadow-sm text-lg text-rose-950 pr-10 focus:ring-rose-500 placeholder:font-medium placeholder:opacity-30" 
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-300">MIL</span>
                        </div>
                     </div>
                  </div>
               </Card>
             ))}
             {saleTanks.length === 0 && (
               <div className="p-12 text-center bg-muted/5 border border-dashed rounded-[2rem] text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                  Select a batch to load nauplii tanks
               </div>
             )}
          </div>
        </div>

         {/* Consolidated Data (a-f) */}
         <div className="p-8 bg-amber-50/30 rounded-[2.5rem] border border-dashed border-amber-200 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* a. Bonus % Offered */}
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">a. Bonus % Offered *</Label>
                 <div className="relative">
                    <Input 
                      id="input-bonus-percentage"
                      type="number" 
                      value={bonusPercentage} 
                      onChange={e => setBonusPercentage(e.target.value)} 
                      className="h-12 rounded-2xl font-black bg-white border-amber-100 text-xl text-amber-950 shadow-sm pr-12 text-center focus:ring-amber-500 placeholder:font-medium placeholder:opacity-30" 
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-amber-200">%</span>
                 </div>
              </div>

              {/* b. Total Gross Sold */}
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest ml-1">b. Total Nauplii Sold Gross (mil)</Label>
                 <div className="h-12 bg-white rounded-2xl border border-amber-100 flex items-center justify-center font-black text-amber-950 text-xl shadow-sm">
                    {data.totalGross?.toLocaleString()}M
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* c. Total Net Sold */}
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1 flex justify-between">
                   <span>c. Total Nauplii Sold Net (mil) *</span>
                   <span className="text-[8px] opacity-50 lowercase tracking-normal bg-amber-100 px-1.5 rounded-full">Editable</span>
                 </Label>
                 <div className="relative">
                    <Input 
                      id="input-net-sale"
                      type="number" 
                      step="0.01"
                      value={netSaleManual} 
                      onChange={e => setNetSaleManual(e.target.value)} 
                      className="h-16 rounded-[2rem] font-black bg-amber-600 text-white border-none text-3xl shadow-lg shadow-amber-200 pr-12 text-center focus:ring-amber-500 placeholder:font-medium placeholder:opacity-30" 
                      placeholder="0"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-amber-200">M</span>
                 </div>
                 <p className="text-[8px] text-amber-600/60 ml-3 italic">Formula: Gross / (1 + Bonus%)</p>
              </div>

              {/* d. Total No Packets */}
              <div className="space-y-1.5 self-end">
                 <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none">d. Total No Packets packed *</Label>
                 <div className="relative">
                    <Input 
                       type="number" 
                       value={packsPacked} 
                       onChange={e => setPacksPacked(e.target.value)} 
                       className="h-16 rounded-[2rem] font-black bg-white border-muted-foreground/10 text-2xl shadow-sm pr-20 text-center focus:ring-amber-500 placeholder:font-medium placeholder:opacity-30" 
                       placeholder="0"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none opacity-40">
                       <span className="text-[10px] font-black">NOS</span>
                       <span className="text-[8px] font-bold uppercase tracking-tighter">Packets</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* e. Total Discarded */}
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">e. Total Nauplii Discarded (mil)</Label>
                 <div className="h-14 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center justify-center font-black text-rose-950 text-xl">
                    {data.totalDiscard?.toLocaleString()}M
                 </div>
              </div>

              {/* f. No. of Nauplii per Animal */}
              <div className="space-y-1.5">
                 <div className="flex items-center gap-1.5 ml-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">f. No. of Nauplii per Animal (mil)</Label>
                 </div>
                 <div className="h-14 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center relative overflow-hidden group">
                    <span className="text-xl font-black text-emerald-950 z-10">
                      {data.summary?.naupliiPerAnimal || '0'}M
                    </span>
                    <span className="text-[8px] font-bold text-emerald-600/50 uppercase leading-none z-10">Per Female</span>
                    <div className="absolute inset-0 bg-emerald-100/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                 </div>
              </div>
           </div>

         </div>

        {/* Points 9 & 10: Media & Comments */}
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
               placeholder="Add sale notes..."
               rows={3}
               className="rounded-2xl border-muted-foreground/10 bg-muted/5 font-medium"
             />
          </div>
        </div>
      </div>

      <AlertDialog open={showOverSaleWarning} onOpenChange={setShowOverSaleWarning}>
        <AlertDialogContent className="rounded-[2rem] border-rose-100">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Over-Sale Warning</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base font-bold text-rose-900/70">
              The amount of Nauplii for sale (<span className="text-rose-600 font-black">{pendingSaleUpdate?.value}M</span>) is above the available amount (<span className="text-amber-600 font-black">
                {saleTanks.find(t => t.id === pendingSaleUpdate?.id)?.harvestedAmount}M
              </span>).
              <br /><br />
              Do you still want to go ahead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={cancelOverSale}
              className="rounded-xl font-bold h-12 border-rose-100 text-rose-900 hover:bg-rose-50"
            >
              No, Correct Amount
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmOverSale}
              className="rounded-xl font-black h-12 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200"
            >
              Yes, Continue Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NaupliiSaleForm;
