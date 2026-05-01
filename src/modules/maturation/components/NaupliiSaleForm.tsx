import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, PlusCircle, Trash2, Calculator, ShoppingCart, Camera, ClipboardList, CheckCircle2, TrendingUp, Database, Loader2, AlertCircle, ArrowRight, History, Info, AlertTriangle, ShieldAlert, ArrowRightLeft, Activity } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  currentPopulation?: number;
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
  const [saleType, setSaleType] = useState<'partial' | 'complete'>(data.saleType || 'complete');
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
  const [isNetSaleManuallyEdited, setIsNetSaleManuallyEdited] = useState(false);
  
  // Default to complete if not set
  useEffect(() => {
    if (!data.saleType) {
      updateData({ saleType: 'complete' });
    }
  }, []);

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

  // A batch is "locked" (closed) only if it's fully sold/discarded or explicitly closed
  const completedHarvestIds = useMemo(() => {
    // 1. Create a map of batchId -> processedAmount (from existing sales)
    const processedMap: Record<string, number> = {};
    const explicitlyClosed = new Set<string>();
    
    (existingSales || []).forEach(sale => {
      const bId = sale.data?.selectedBatchId || sale.data?.sourceBatchId;
      if (bId) {
        const sold = (parseFloat(sale.data?.totalGross || sale.data?.summary?.totalSaleMil) || 0);
        const disc = (parseFloat(sale.data?.totalDiscard || sale.data?.summary?.totalDiscardMil) || 0);
        processedMap[bId] = (processedMap[bId] || 0) + sold + disc;
        
        if (sale.data?.isBatchClosed || sale.data?.saleType === 'complete') {
            explicitlyClosed.add(bId);
        }
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

    // 3. A batch is completed if (explicitly closed AND balance is 0) OR (processed amount >= harvested amount)
    return Array.from(new Set([
        ...Object.keys(processedMap).filter(bId => {
            if (data.id && (bId === data.selectedBatchId || bId === data.sourceBatchId)) return false;
            
            const harvested = harvestTotalsMap[bId] || 0;
            const processed = processedMap[bId] || 0;
            const remaining = harvested - processed;
            const isExplicitlyClosed = explicitlyClosed.has(bId);

            // ONLY lock if:
            // 1. It was explicitly closed AND there's no significant balance left
            if (isExplicitlyClosed && remaining < 0.005) return true;
            
            // 2. OR it was fully processed automatically
            if (harvested > 0 && processed >= (harvested - 0.001)) return true;

            return false;
        })
    ]));
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

  const isBatchAlreadyClosed = useMemo(() => {
    if (!selectedBatchId) return false;
    const closedSale = (existingSales || []).find(s => 
      (s.data?.selectedBatchId === selectedBatchId || s.data?.sourceBatchId === selectedBatchId) && 
      (!data.id || s.id !== data.id) &&
      (s.data?.isBatchClosed === true || s.data?.saleType === 'complete')
    );
    return !!closedSale && !isEditing;
  }, [existingSales, isEditing, selectedBatchId, data.id]);

  const canEdit = isSupervisor || (!isEditing && !isBatchAlreadyClosed);

  const updateData = (updates: any) => {
    const newData = { ...data, ...updates };
    onDataChange(newData);
  };

  useEffect(() => {
    if (selectedBatchId) {
        setIsNetSaleManuallyEdited(false);
        setNetSaleManual('');
    }
  }, [selectedBatchId]);

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

        // Relax the JS filter to ensure we don't accidentally hide the batch
        setBatchLogs(logs || []);
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
          saleMil: expired ? '0' : (currentPop.toString() || '0'),
          discardMil: expired ? (currentPop.toString() || '0') : '0',
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

    setIsNetSaleManuallyEdited(false);
    setNetSaleManual('');

    let finalUpdates = { ...updates };
    const harvested = parseFloat(tank.harvestedAmount) || 0;

    if ('saleMil' in updates) {
      const newSale = parseFloat(updates.saleMil) || 0;
      if (data.saleType === 'complete') {
        const newDiscard = Math.max(0, harvested - newSale);
        finalUpdates.discardMil = newDiscard.toFixed(3);
      }
      if (newSale <= harvested) finalUpdates.isExceedingConfirmed = false;
    }

    if ('discardMil' in updates) {
      const newDiscard = parseFloat(updates.discardMil) || 0;
      if (data.saleType === 'complete') {
        const newSale = Math.max(0, harvested - newDiscard);
        finalUpdates.saleMil = newSale.toFixed(3);
      }
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
    
    const efficiency = totalSpawnedInBatch > 0 ? (totalHarvestedInBatch / totalSpawnedInBatch) : 0;
    const currentProcessed = metrics.totalSale + metrics.totalDiscard;
    
    const isBalanceFullyProcessed = Math.abs(remainingInBatch - currentProcessed) < 0.005;
    const finalIsClosed = data.saleType === 'complete' || (data.saleType !== 'partial' && isBalanceFullyProcessed);

    const calculatedNetRounded = Math.round(calculatedNet * 1000) / 1000;
    const finalNetSale = isNetSaleManuallyEdited && netSaleManual ? parseFloat(netSaleManual) : calculatedNetRounded;

    updateData({
      totalGross: Math.round(metrics.totalSale * 1000) / 1000,
      totalDiscard: Math.round(metrics.totalDiscard * 1000) / 1000,
      bonusPercentage,
      packsPacked,
      netNauplii: finalNetSale,
      sourceBatchId: selectedBatchId,
      isBatchClosed: finalIsClosed,
      summary: {
        totalSaleMil: metrics.totalSale,
        totalDiscardMil: metrics.totalDiscard,
        netSaleMil: finalNetSale,
        totalAvailable: totalHarvestedInBatch,
        totalProcessedSoFar: totalProcessedSoFar,
        remainingInBatch: Math.max(0, remainingInBatch - currentProcessed), 
        totalSpawned: totalSpawnedInBatch,
        naupliiPerAnimal: Math.round(efficiency * 1000) / 1000
      }
    });

    if (!isNetSaleManuallyEdited) {
        setNetSaleManual(calculatedNetRounded.toString());
    }
  }, [selectedBatchId, saleTanks, bonusPercentage, packsPacked, netSaleManual, totalHarvestedInBatch, totalSpawnedInBatch, data.saleType, remainingInBatch, totalProcessedSoFar, isNetSaleManuallyEdited]);

  return (
    <div className={cn("space-y-6 animate-fade-in-up", !canEdit && "opacity-80 pointer-events-none select-none")}>
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm animate-in zoom-in-95 duration-300 pointer-events-auto">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Read-Only Mode</p>
            <p className="text-[10px] font-medium opacity-80">This finalized record can only be edited by a supervisor.</p>
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
          {!canEdit && isBatchAlreadyClosed && (
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

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-indigo-50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Step # 1: Choose Nauplii Batch</h3>
            </div>

            <RadioGroup 
                value={data.saleType || 'complete'} 
                onValueChange={(v) => updateData({ saleType: v })}
                className="flex flex-wrap gap-2"
            >
                <Label
                    htmlFor="sale-complete"
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer ${data.saleType === 'complete' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-muted hover:border-indigo-200'}`}
                >
                    <RadioGroupItem value="complete" id="sale-complete" className="sr-only" />
                    <CheckCircle2 className={`w-4 h-4 ${data.saleType === 'complete' ? 'text-white' : 'text-indigo-300'}`} />
                    <span className="text-[10px] font-black uppercase">Final Sale (Close Batch)</span>
                </Label>
                <Label
                    htmlFor="sale-partial"
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer ${data.saleType === 'partial' ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-muted hover:border-amber-200'}`}
                >
                    <RadioGroupItem value="partial" id="sale-partial" className="sr-only" />
                    <ArrowRightLeft className={`w-4 h-4 ${data.saleType === 'partial' ? 'text-white' : 'text-amber-300'}`} />
                    <span className="text-[10px] font-black uppercase">Split Sale (Partial)</span>
                </Label>
            </RadioGroup>
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
            
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-6">
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                <div className="text-center">
                  <p className="text-[10px] font-black text-indigo-950/40 uppercase tracking-widest mb-1">Total Harvested</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black text-indigo-950">{totalHarvestedInBatch.toFixed(3)}M</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest mb-1">Previously Processed</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black text-amber-600">{totalProcessedSoFar.toFixed(3)}M</span>
                  </div>
                </div>

                <div className="text-center bg-white/60 p-4 rounded-2xl border border-indigo-100/50 shadow-inner">
                  <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">Balance Available</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black text-emerald-600">{remainingInBatch.toFixed(3)}M</span>
                    <div className="bg-emerald-500/10 p-1.5 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>

              {totalProcessedSoFar > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest border border-indigo-200 shadow-sm animate-pulse">
                  <History className="w-3 h-3" />
                  Split Sale Progressing
                </div>
              )}
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
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-black text-amber-950 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  2. Production Metrics (a-f)
                </h2>
                {data.saleType === 'partial' && (
                  <div className="flex items-center gap-2 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-900 uppercase">
                      Remaining: {(data.summary?.remainingInBatch || 0).toFixed(3)}M
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">a. Bonus % Offered *</Label>
                  <div className="relative">
                    <Input 
                      type="number" value={bonusPercentage} 
                      onChange={e => setBonusPercentage(e.target.value)} 
                      className="h-14 rounded-2xl font-black bg-white border border-amber-100 shadow-sm text-center text-xl text-amber-950 focus:ring-2 focus:ring-amber-500" 
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-amber-300">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                   <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest">b. Total Nauplii Sold Gross (mil)</Label>
                      <div className="bg-amber-100 px-2 py-0.5 rounded-md">
                         <span className="text-[8px] font-black text-amber-600 uppercase">Auto</span>
                      </div>
                   </div>
                   <div className="h-14 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center justify-center font-black text-amber-950 text-2xl shadow-inner">
                    {(data.totalGross || 0).toFixed(3)}M
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                   <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-black text-amber-700 uppercase tracking-widest">c. Total Nauplii Sold Net (mil) *</Label>
                      <div className="flex items-center gap-2">
                        {isNetSaleManuallyEdited && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[8px] font-black uppercase text-amber-600 hover:bg-amber-100 gap-1 rounded-md"
                            onClick={() => {
                              setIsNetSaleManuallyEdited(false);
                              const bonus = parseFloat(bonusPercentage) || 0;
                              const totalG = data.totalGross || 0;
                              const calc = totalG / (1 + (bonus / 100));
                              setNetSaleManual((Math.round(calc * 1000) / 1000).toString());
                            }}
                          >
                            <History className="w-2.5 h-2.5" /> Reset
                          </Button>
                        )}
                        <div className={cn(
                          "px-2 py-0.5 rounded-md border",
                          isNetSaleManuallyEdited ? "bg-amber-500 border-amber-600 text-white" : "bg-amber-100 border-amber-200 text-amber-600"
                        )}>
                           <span className="text-[8px] font-black uppercase">{isNetSaleManuallyEdited ? 'Manual Entry' : 'Auto'}</span>
                        </div>
                      </div>
                   </div>
                   <div className="relative">
                    <Input 
                      type="number" step="0.001" value={netSaleManual} 
                      onChange={e => {
                        setIsNetSaleManuallyEdited(true);
                        setNetSaleManual(e.target.value);
                      }}
                      className={cn(
                        "h-14 rounded-2xl font-black shadow-sm text-center text-2xl transition-all",
                        isNetSaleManuallyEdited ? "bg-amber-50 border-2 border-amber-500 text-amber-900" : "bg-white border-amber-100 text-amber-950"
                      )} 
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-amber-300">M</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">d. Total No Packets Packed *</Label>
                  <div className="relative">
                    <Input 
                      type="number" value={packsPacked} 
                      onChange={e => setPacksPacked(e.target.value)} 
                      className="h-14 rounded-2xl font-black bg-white border border-indigo-100 shadow-sm text-center text-xl text-indigo-950 focus:ring-2 focus:ring-indigo-500" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none opacity-40">
                      <span className="text-[8px] font-black uppercase">Nos</span>
                      <span className="text-[8px] font-black uppercase">Packets</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                 <div className="space-y-1.5">
                   <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-black text-rose-700 uppercase tracking-widest">e. Total Nauplii Discarded (mil)</Label>
                      <div className="bg-rose-100 px-2 py-0.5 rounded-md">
                         <span className="text-[8px] font-black text-rose-600 uppercase">Auto</span>
                      </div>
                   </div>
                   <div className="h-14 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center justify-center font-black text-rose-950 text-2xl shadow-inner">
                    {(data.totalDiscard || 0).toFixed(3)}M
                  </div>
                </div>

                <div className="space-y-1.5">
                   <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">f. No. of Nauplii per Animal (mil)</Label>
                      <div className="bg-emerald-100 px-2 py-0.5 rounded-md">
                         <span className="text-[8px] font-black text-emerald-600 uppercase">Auto</span>
                      </div>
                   </div>
                   <div className="h-14 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center font-black text-emerald-950 text-2xl shadow-inner relative overflow-hidden group">
                    <span className="leading-tight">{(totalSpawnedInBatch > 0 ? (totalHarvestedInBatch / totalSpawnedInBatch) : 0).toFixed(3)}M</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">Per Female</span>
                    <div className="absolute inset-0 bg-emerald-500/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-muted-foreground/10 mx-4" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Camera className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Step # 3: Media Attachment (Optional)</h3>
              </div>
              <ImageUpload
                value={photoUrl}
                onChange={onPhotoUrlChange}
                folder="nauplii-sale"
              />
            </div>
          </>
        )}
      </div>

      <AlertDialog open={showOverSaleWarning} onOpenChange={setShowOverSaleWarning}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden max-w-sm">
          <div className="bg-amber-50 p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-black text-amber-950 uppercase tracking-tight">Oversale Warning</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-amber-800/70 font-medium">
                The amount entered exceeds the quantity currently available in this tank. Are you sure you want to proceed?
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-4 bg-white flex flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={confirmOverSale} className="h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm uppercase shadow-lg shadow-amber-200 border-none">
              Yes, Confirm Quantity
            </AlertDialogAction>
            <AlertDialogCancel onClick={cancelOverSale} className="h-12 rounded-xl bg-white text-amber-900 border-2 border-amber-100 hover:bg-amber-50 font-black text-sm uppercase">
              No, Go Back
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NaupliiSaleForm;
