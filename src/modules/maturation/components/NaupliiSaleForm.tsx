import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator, ShoppingCart, Camera, ClipboardList, CheckCircle2, TrendingUp, Database, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SaleTankEntry {
  id: string;
  tankId: string;
  tankName: string;
  harvestedAmount: string; // From the Harvest log
  saleMil: string;
  discardMil: string;
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
  const [selectedBatchId, setSelectedBatchId] = useState<string>(data.selectedBatchId || '');
  const [saleTanks, setSaleTanks] = useState<SaleTankEntry[]>(data.saleTanks || []);
  const [bonusPercentage, setBonusPercentage] = useState<string>(data.bonusPercentage || '0');
  const [packsPacked, setPacksPacked] = useState<string>(data.packsPacked || '');
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Fetch and Aggregate Inventory (Harvest - Sale)
  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch Recent Nauplii Harvest Batches
  useEffect(() => {
    const fetchBatches = async () => {
      if (!farmId) return;
      setLoadingBatches(true);
      try {
        const { data: logs, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('farm_id', farmId)
          .eq('activity_type', 'Nauplii Harvest')
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
        console.error('Error fetching harvest batches:', err);
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

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    const log = batchLogs.find(l => l.data?.selectedBatchId === batchId);
    if (log && log.data) {
      const harvestEntries = log.data.naupliiDestinations || [];
      const newSaleTanks = harvestEntries.map((e: any) => ({
        id: e.id,
        tankId: e.tankId,
        tankName: e.tankName,
        harvestedAmount: e.shiftedMil,
        saleMil: e.shiftedMil, // Default to selling 100%
        discardMil: '0'
      }));
      setSaleTanks(newSaleTanks);
      updateData({ 
        selectedBatchId: batchId,
        saleTanks: newSaleTanks
      });
    }
  };

  const handleTankUpdate = (id: string, updates: any) => {
    const newList = saleTanks.map(t => t.id === id ? { ...t, ...updates } : t);
    setSaleTanks(newList);
    updateData({ saleTanks: newList });
  };

  useEffect(() => {
    const gross = saleTanks.reduce((sum, t) => sum + (parseFloat(t.saleMil) || 0), 0);
    const discards = saleTanks.reduce((sum, t) => sum + (parseFloat(t.discardMil) || 0), 0);
    const bonus = parseFloat(bonusPercentage) || 0;
    const net = gross * (1 + bonus / 100);

    updateData({
      totalGross: Math.round(gross * 100) / 100,
      totalDiscard: Math.round(discards * 100) / 100,
      bonusPercentage,
      packsPacked,
      netNauplii: Math.round(net * 100) / 100
    });
  }, [saleTanks, bonusPercentage, packsPacked]);

  // Handle Calculations & State Sync
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
                   <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest opacity-70">Active Harvest Batch</p>
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
              <p className="text-[10px] text-muted-foreground uppercase bg-indigo-50 px-2 py-1 rounded-md font-bold">From Harvest</p>
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
                        No Harvest batches found. Please record a "Nauplii Harvest" activity first.
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
            </div>
          </div>
        )}

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Step 1: Sale vs. Discard */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Step # 2 available Nauplii tanks</h3>
          </div>
          
          <div className="space-y-4">
             {saleTanks.map((tank) => (
               <Card key={tank.id} className="p-5 bg-muted/5 border-none rounded-[2rem] space-y-4 relative group">
                  <div className="flex items-center justify-between px-2">
                     <div>
                        <p className="text-xs font-black text-foreground">{tank.tankName}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Harvested: {tank.harvestedAmount} mil</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-emerald-700 ml-1 leading-none tracking-widest">Step # 3 Amount for sale (mil) *</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={tank.saleMil} 
                            onChange={e => handleTankUpdate(tank.id, { saleMil: e.target.value })} 
                            className="h-11 rounded-xl font-black bg-white border-none shadow-sm text-lg text-emerald-950 pr-10" 
                            placeholder="0.0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-300">MIL</span>
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
                            className="h-11 rounded-xl font-black bg-white border-none shadow-sm text-lg text-rose-950 pr-10" 
                            placeholder="0.0"
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

        {/* Calculations Section: Points 4, 5, 6, 7 */}
        <div className="p-8 bg-muted/5 rounded-[2.5rem] border border-dashed border-primary/20 space-y-8">
           {/* Calculations Section: Results Card */}
        <div className="p-8 bg-muted/5 rounded-[2.5rem] border border-dashed border-primary/20 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-emerald-600 tracking-widest ml-1">Gross Sale (mil)</Label>
                    <div className="h-12 bg-white rounded-2xl border border-emerald-100 flex items-center justify-center font-black text-emerald-950">
                       {data.totalGross?.toLocaleString()}M
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-rose-600 tracking-widest ml-1">Total Discard (mil)</Label>
                    <div className="h-12 bg-white rounded-2xl border border-rose-100 flex items-center justify-center font-black text-rose-950">
                       {data.totalDiscard?.toLocaleString()}M
                    </div>
                 </div>
              </div>

              {/* Bonus % Input */}
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-blue-700 uppercase tracking-widest ml-1">Step # 4 Bonus % *</Label>
                 <div className="relative">
                    <Input 
                      type="number" 
                      value={bonusPercentage} 
                      onChange={e => setBonusPercentage(e.target.value)} 
                      className="h-12 rounded-2xl font-black bg-blue-50/30 border-blue-100 text-xl text-blue-950 shadow-sm pr-12 text-center" 
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-blue-200">%</span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              {/* Net Sale Display */}
              <div className="p-6 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-100 overflow-hidden relative group">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Step # 7: Net nauplii sold</p>
                 <p className="text-4xl font-black mt-1 leading-none">{data.netNauplii?.toLocaleString()}<span className="text-sm opacity-50 ml-2 uppercase">Millions</span></p>
                 <p className="text-[8px] mt-2 opacity-50 italic animate-pulse tracking-tight">Auto-calculated: Gross * (1 + Bonus%)</p>
                 <ShoppingCart className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10" />
              </div>

              {/* No of Packets */}
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none">Step # 5: Nos. of packets packed *</Label>
                 <div className="relative">
                    <Input 
                       type="number" 
                       value={packsPacked} 
                       onChange={e => setPacksPacked(e.target.value)} 
                       className="h-16 rounded-[2rem] font-black bg-white border-muted-foreground/10 text-2xl shadow-sm pr-20 text-center" 
                       placeholder="0"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none opacity-40">
                       <span className="text-[10px] font-black">NOS</span>
                       <span className="text-[8px] font-bold uppercase tracking-tighter">Packets</span>
                    </div>
                 </div>
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
    </div>
  );
};

export default NaupliiSaleForm;



