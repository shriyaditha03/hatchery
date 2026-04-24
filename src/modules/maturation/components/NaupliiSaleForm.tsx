import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, PlusCircle, Trash2, Calculator, ShoppingCart, Camera, ClipboardList, CheckCircle2, TrendingUp, Database, Loader2, AlertCircle, ArrowRight, History, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
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

import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const isSupervisor = user?.role === 'owner' || user?.role === 'supervisor';
  const isEditing = !!searchParams.get('edit') || !!data.id;

  // Calculate how much of this batch has already been processed across all sale records
  const batchProcessedSummary = useMemo(() => {
    if (!selectedBatchId || !existingSales.length) return { totalSold: 0, totalDiscarded: 0 };
    
    return existingSales.reduce((acc, sale) => {
      // Skip the current record if we're editing it
      if (data.id && sale.id === data.id) return acc;
      
      const saleBatchId = sale.data?.selectedBatchId || sale.data?.sourceBatchId;
      if (saleBatchId === selectedBatchId) {
        acc.totalSold += (parseFloat(sale.data?.totalGross || sale.data?.summary?.totalSaleMil) || 0);
        acc.totalDiscarded += (parseFloat(sale.data?.totalDiscard || sale.data?.summary?.totalDiscardMil) || 0);
      }
      return acc;
    }, { totalSold: 0, totalDiscarded: 0 });
  }, [existingSales, selectedBatchId, data.id]);

  const totalProcessedSoFar = batchProcessedSummary.totalSold + batchProcessedSummary.totalDiscarded;
  const remainingInBatch = Math.max(0, totalHarvestedInBatch - totalProcessedSoFar);

  // A batch is "locked" (closed) only if it's fully sold/discarded
  const completedHarvestIds = useMemo(() => {
    // 1. Create a map of batchId -> processedAmount (from existing sales)
    const processedMap: Record<string, number> = {};
    (existingSales || []).forEach(sale => {
      const bId = sale.data?.selectedBatchId || sale.data?.sourceBatchId;
      if (bId) {
        const sold = (parseFloat(sale.data?.totalGross || sale.data?.summary?.totalSaleMil) || 0);
        const disc = (parseFloat(sale.data?.totalDiscard || sale.data?.summary?.totalDiscardMil) || 0);
        processedMap[bId] = (processedMap[bId] || 0) + sold + disc;
      }
    });

    // 2. Map harvest batches to their total harvested amounts (from harvest logs)
    const harvestTotalsMap: Record<string, number> = {};
    batchLogs.forEach(log => {
      const bId = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      if (bId) {
        harvestTotalsMap[bId] = log.data?.summary?.totalHarvested || 0;
      }
    });

    // 3. A batch is completed if processed amount >= harvested amount
    return Object.keys(processedMap).filter(bId => {
      if (data.id && (bId === data.selectedBatchId || bId === data.sourceBatchId)) return false;
      const harvested = harvestTotalsMap[bId] || 0;
      const processed = processedMap[bId] || 0;
      // Consider it closed if processed >= harvested (within a small tolerance)
      return harvested > 0 && processed >= (harvested - 0.001);
    });
  }, [existingSales, batchLogs, data.id, data.selectedBatchId, data.sourceBatchId]);

  const availableBatches = useMemo(() => {
    const filtered = batchLogs.filter(log => {
      const bId = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      const logStockingId = log.stocking_id || log.data?.stockingId || log.stockingId;

      if (activeBroodstockBatchId && logStockingId && logStockingId !== activeBroodstockBatchId) return false;

      const isLocked = completedHarvestIds.includes(bId);
      const isCurrentlySelected = bId === data.sourceBatchId || bId === data.selectedBatchId;
      
      return !isLocked || (isEditing && isCurrentlySelected);
    });

    const uniqueMap = new Map();
    filtered.forEach(log => {
      const bn = log.data?.selectedBatchId || log.data?.batchId || log.data?.batchNumber;
      if (bn && !uniqueMap.has(bn)) {
        uniqueMap.set(bn, log);
      }
    });

    return Array.from(uniqueMap.values());
  }, [batchLogs, completedHarvestIds, data.selectedBatchId, data.sourceBatchId, activeBroodstockBatchId, isEditing]);

  const isBatchStillAvailable = useMemo(() => {
    if (!selectedBatchId) return false;
    return availableBatches.some(b => 
      (b.data?.selectedBatchId || b.data?.batchId || b.data?.batchNumber) === selectedBatchId
    );
  }, [availableBatches, selectedBatchId]);

  const isBatchAlreadySold = useMemo(() => {
    if (!selectedBatchId) return false;
    const hasSale = (existingSales || []).some(s => 
      (s.data?.selectedBatchId === selectedBatchId || s.data?.sourceBatchId === selectedBatchId) && 
      (!data.id || s.id !== data.id)
    );
    return hasSale && !isEditing;
  }, [existingSales, isEditing, selectedBatchId, data.id]);

  const canEdit = isSupervisor || (!isEditing && !isBatchAlreadySold);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
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

        let saleQuery = supabase
          .from('activity_logs')
          .select('id, data')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Sale');
        
        if (activeBroodstockBatchId) {
          saleQuery = saleQuery.eq('stocking_id', activeBroodstockBatchId);
        }
        
        const { data: saleLogs } = await saleQuery;
        setExistingSales(saleLogs || []);

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
      
      const harvestDate = new Date(log.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - harvestDate.getTime()) / (1000 * 60 * 60);
      const expired = hoursDiff > 24;
      setIsExpired(expired);

      setTotalHarvestedInBatch(harvestedTotal);
      setTotalSpawnedInBatch(spawnedTotal);

      const newSaleTanks = harvestEntries.map((e: any) => {
        let currentPop = 0;
        availableTanks.forEach(s => {
          const t = s.tanks.find((tk: any) => tk.id === e.tankId);
          if (t) currentPop = parseFloat(t.presentPopulation || t.data?.presentPopulation || '0');
        });

        return {
          id: e.id,
          tankId: e.tankId,
          tankName: e.tankName,
          harvestedAmount: e.shiftedMil || '0', 
          saleMil: expired ? '0' : (e.shiftedMil || '0'),
          discardMil: expired ? (e.shiftedMil || '0') : '0',
          currentPopulation: currentPop
        };
      });

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

  const goToActivity = (type: string) => {
    const portal = user?.role === 'owner' ? 'owner' : 'user';
    const url = `/${portal}/activity/${type}?mode=activity&category=MATURATION${farmId ? `&farm=${farmId}` : ''}`;
    navigate(url);
  };

  const handleTankUpdate = (id: string, updates: any) => {
    const tank = saleTanks.find(t => t.id === id);
    if (!tank) return;

    let finalUpdates = { ...updates };
    const harvested = parseFloat(tank.harvestedAmount) || 0;

    if ('saleMil' in updates) {
      const newSale = parseFloat(updates.saleMil) || 0;
      const newDiscard = Math.max(0, harvested - newSale);
      finalUpdates.discardMil = newDiscard.toFixed(3);
      if (newSale <= harvested) finalUpdates.isExceedingConfirmed = false;
    }

    if ('discardMil' in updates) {
      const newDiscard = parseFloat(updates.discardMil) || 0;
      const newSale = Math.max(0, harvested - newDiscard);
      finalUpdates.saleMil = newSale.toFixed(3);
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
    if (!selectedBatchId) {
      if (saleTanks.length > 0) setSaleTanks([]);
      if (totalHarvestedInBatch !== 0) setTotalHarvestedInBatch(0);
      if (totalSpawnedInBatch !== 0) setTotalSpawnedInBatch(0);
      return;
    }

    const metrics = saleTanks.reduce((acc, t) => ({
      totalSale: acc.totalSale + (parseFloat(t.saleMil) || 0),
      totalDiscard: acc.totalDiscard + (parseFloat(t.discardMil) || 0)
    }), { totalSale: 0, totalDiscard: 0 });

    const bonus = parseFloat(bonusPercentage) || 0;
    const calculatedNet = metrics.totalSale / (1 + (bonus / 100));
    
    if (!netSaleManual || parseFloat(netSaleManual) === 0) {
      setNetSaleManual((Math.round(calculatedNet * 1000) / 1000).toString());
    }

    const efficiency = totalSpawnedInBatch > 0 ? (totalHarvestedInBatch / totalSpawnedInBatch) : 0;

    const currentProcessed = metrics.totalSale + metrics.totalDiscard;
    const isBatchClosed = Math.abs(totalHarvestedInBatch - (totalProcessedSoFar + currentProcessed)) < 0.005;

    updateData({
      totalGross: Math.round(metrics.totalSale * 1000) / 1000,
      totalDiscard: Math.round(metrics.totalDiscard * 1000) / 1000,
      bonusPercentage,
      packsPacked,
      netNauplii: netSaleManual ? parseFloat(netSaleManual) : Math.round(calculatedNet * 1000) / 1000,
      sourceBatchId: selectedBatchId,
      isBatchClosed: isBatchClosed,
      summary: {
        totalSaleMil: metrics.totalSale,
        totalDiscardMil: metrics.totalDiscard,
        netSaleMil: netSaleManual ? parseFloat(netSaleManual) : metrics.totalSale,
        totalAvailable: totalHarvestedInBatch,
        remainingInBatch: Math.max(0, totalHarvestedInBatch - (totalProcessedSoFar + currentProcessed)), 
        totalSpawned: totalSpawnedInBatch,
        naupliiPerAnimal: Math.round(efficiency * 1000) / 1000
      }
    });
  }, [selectedBatchId, saleTanks, bonusPercentage, packsPacked, netSaleManual, totalHarvestedInBatch, totalSpawnedInBatch]);

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
        <div className="space-y-4">
          {!canEdit && isBatchAlreadySold && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 flex items-start gap-4 mb-4 animate-in zoom-in-95 pointer-events-auto">
               <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
               </div>
               <div className="space-y-1">
                  <h4 className="text-base font-black text-amber-900 uppercase tracking-tight">Batch Already Sold & Finalized</h4>
                  <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
                    A sale record already exists for batch <span className="font-bold">{selectedBatchId}</span>. To prevent duplicate data capture, this batch is now locked. Only supervisors can modify finalized records.
                  </p>
               </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1: Choose Nauplii Production Batch</h3>
            <p className="text-[10px] text-muted-foreground uppercase bg-indigo-50 px-2 py-1 rounded-md font-bold">From Harvest</p>
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
                      Please complete "Nauplii Harvest" for this broodstock batch first.
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-11 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-100 font-black text-xs uppercase gap-2 w-full shadow-sm"
                        onClick={() => goToActivity('nauplii-harvest')}
                      >
                        <PlusCircle className="w-4 h-4" /> Record Nauplii Harvest
                      </Button>
                  </div>
                </div>
            )}
          </div>
        </div>

        {selectedBatchId && isBatchStillAvailable && (
          <>
            <div className="h-px bg-muted-foreground/10 mx-4" />
            
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-indigo-950/40 uppercase tracking-widest mb-1">Total Harvested</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black text-indigo-950">{totalHarvestedInBatch.toFixed(3)} mil</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase opacity-60">(from Harvest)</span>
                  </div>
                </div>
                <div className="w-px h-10 bg-indigo-200/50" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">Remaining to Sell</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black text-emerald-600">{remainingInBatch.toFixed(3)} mil</span>
                    <div className="bg-emerald-500/10 p-1.5 rounded-xl">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2 available Nauplii tanks</h3>
              </div>
              
              <div className="space-y-4">
                {saleTanks.map((tank) => (
                  <Card key={tank.id} className={cn("p-5 bg-amber-50/40 border-amber-100 shadow-sm rounded-[2rem] space-y-4 relative group hover:bg-amber-50/60 transition-colors overflow-hidden")}>
                    <div className="flex items-center justify-between px-2">
                      <div>
                        <p className="text-xs font-black text-amber-950">{tank.tankName}</p>
                        <p className="text-[9px] font-bold text-amber-600 uppercase opacity-60">AVAILABLE: {tank.harvestedAmount} mil</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-amber-700 ml-1 leading-none tracking-widest">NUMBER OF NAUPLII IN MILLION - SOLD (GROSS) *</Label>
                        <div className="relative">
                          <Input 
                            type="number" step="0.001" value={tank.saleMil} 
                            onChange={e => handleTankUpdate(tank.id, { saleMil: e.target.value })} 
                            onBlur={e => handleSaleInputBlur(tank.id, e.target.value)}
                            className="h-11 rounded-xl font-black bg-white border border-amber-100 shadow-sm text-lg text-amber-950 pr-10" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-400">MIL</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-rose-700 ml-1 leading-none tracking-widest">NUMBER OF NAUPLII IN MIL - DISCARDED (GROSS)</Label>
                        <div className="relative">
                          <Input 
                            type="number" step="0.001" value={tank.discardMil} 
                            onChange={e => handleTankUpdate(tank.id, { discardMil: e.target.value })} 
                            className="h-11 rounded-xl font-black bg-white border border-rose-100 shadow-sm text-lg text-rose-950 pr-10" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-300">MIL</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="p-8 bg-amber-50/30 rounded-[2.5rem] border border-dashed border-amber-200 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">a. Bonus % Offered *</Label>
                  <div className="relative">
                    <Input 
                      type="number" value={bonusPercentage} 
                      onChange={e => setBonusPercentage(e.target.value)} 
                      className="h-12 rounded-2xl font-black bg-white border-amber-100 text-xl text-amber-950 pr-12 text-center" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-amber-200">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest ml-1">b. Total Nauplii Sold Gross (mil)</Label>
                  <div className="h-12 bg-white rounded-2xl border border-amber-100 flex items-center justify-center font-black text-amber-950 text-xl shadow-sm">
                    {(data.totalGross || 0).toFixed(3)}M
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1 flex justify-between">
                    <span>c. Total Nauplii Sold Net (mil) *</span>
                    <span className="text-[8px] opacity-50 lowercase tracking-normal bg-amber-100 px-1.5 rounded-full">Editable</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      type="number" step="0.001" value={netSaleManual} 
                      onChange={e => setNetSaleManual(e.target.value)} 
                      className="h-16 rounded-[2rem] font-black bg-amber-600 text-white border-none text-3xl shadow-lg shadow-amber-200 pr-12 text-center" 
                      placeholder={((data.totalGross || 0) / (1 + (parseFloat(bonusPercentage) || 0) / 100)).toFixed(3)}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-amber-200">M</span>
                  </div>
                </div>
                <div className="space-y-1.5 self-end">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none">d. Total No Packets packed *</Label>
                  <div className="relative">
                    <Input 
                      type="number" value={packsPacked} 
                      onChange={e => setPacksPacked(e.target.value)} 
                      className="h-16 rounded-[2rem] font-black bg-white border-muted-foreground/10 text-2xl shadow-sm pr-20 text-center" 
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none opacity-40">
                      <span className="text-[10px] font-black">NOS</span>
                      <span className="text-[8px] font-bold uppercase tracking-tighter">Packets</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-rose-600 tracking-widest ml-1">e. Total Nauplii Discarded (mil)</Label>
                  <div className="h-14 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center justify-center font-black text-rose-950 text-xl">
                    {(data.totalDiscard || 0).toFixed(3)}M
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 ml-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">f. No. of Nauplii per Animal (mil)</Label>
                  </div>
                  <div className="h-14 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center relative overflow-hidden group">
                    <span className="text-xl font-black text-emerald-950 z-10">
                      {(data.summary?.naupliiPerAnimal || 0).toFixed(3)}M
                    </span>
                    <span className="text-[8px] font-bold text-emerald-600/50 uppercase leading-none z-10">Per Female</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
            <AlertDialogCancel onClick={cancelOverSale} className="rounded-xl font-bold h-12 border-rose-100">No, Correct Amount</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverSale} className="rounded-xl font-black h-12 bg-rose-600 text-white shadow-lg shadow-rose-200">Yes, Continue Sale</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NaupliiSaleForm;
