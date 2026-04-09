import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator, ShoppingCart, Camera, ClipboardList, CheckCircle2, TrendingUp, Database, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface TankEntry {
  id: string;
  tankId: string;
  tankName: string;
  population: string;
  batchNumber?: string;
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
}: NaupliiSaleFormProps) => {
  const [naupliiTanks, setNaupliiTanks] = useState<TankEntry[]>(data.naupliiTanks || [
    { id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: '' }
  ]);
  const [bonusPercentage, setBonusPercentage] = useState<string>(data.bonusPercentage || '0');
  const [packsPacked, setPacksPacked] = useState<string>(data.packsPacked || '');
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [tankBatches, setTankBatches] = useState<Record<string, string>>({});
  const [totalInventoryLoad, setTotalInventoryLoad] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch and Aggregate Inventory (Harvest - Sale)
  const fetchInventory = async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      // 1. Fetch all Nauplii Harvest logs
      const { data: harvestLogs, error: harvestError } = await supabase
        .from('activity_logs')
        .select('data')
        .eq('farm_id', farmId)
        .eq('activity_type', 'Nauplii Harvest');

      // 2. Fetch all Nauplii Sale logs
      const { data: saleLogs, error: saleError } = await supabase
        .from('activity_logs')
        .select('data')
        .eq('farm_id', farmId)
        .eq('activity_type', 'Nauplii Sale');

      if (harvestError || saleError) throw (harvestError || saleError);

      const popMap: Record<string, number> = {};
      const batchMap: Record<string, string> = {};

      // Add Populations from Harvests
      harvestLogs?.forEach(log => {
        const destinations = log.data?.destinations || [];
        const logBatch = log.data?.batchNumber || '';
        
        destinations.forEach((d: any) => {
          if (d.tankId) {
            popMap[d.tankId] = (popMap[d.tankId] || 0) + (parseFloat(d.population) || 0);
            if (logBatch) batchMap[d.tankId] = logBatch; // Latest harvest batch wins
          }
        });
      });

      // Subtract Populations from Sales
      saleLogs?.forEach(log => {
        const tanks = log.data?.naupliiTanks || [];
        tanks.forEach((t: any) => {
          if (t.tankId) {
            popMap[t.tankId] = (popMap[t.tankId] || 0) - (parseFloat(t.population) || 0);
          }
        });
      });

      setInventory(popMap);
      setTankBatches(batchMap);
      const total = Object.values(popMap).reduce((sum, val) => sum + val, 0);
      setTotalInventoryLoad(Math.round(total * 100) / 100);
    } catch (err) {
      console.error('Error fetching nauplii inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [farmId]);

  // Handle Calculations & State Sync
  useEffect(() => {
    const gross = naupliiTanks.reduce((sum, t) => sum + (parseFloat(t.population) || 0), 0);
    const bonus = parseFloat(bonusPercentage) || 0;
    const net = gross * (1 + bonus / 100);
    const balanceRemaining = totalInventoryLoad - gross;

    onDataChange({
      ...data,
      naupliiTanks,
      bonusPercentage,
      packsPacked,
      totalGross: Math.round(gross * 100) / 100,
      netNauplii: Math.round(net * 100) / 100,
      totalAvailable: totalInventoryLoad,
      balanceRemaining: Math.round(balanceRemaining * 100) / 100
    });
  }, [naupliiTanks, bonusPercentage, packsPacked, totalInventoryLoad]);

  const addTank = () => {
    setNaupliiTanks([...naupliiTanks, { id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: '' }]);
  };

  const removeTank = (id: string) => {
    if (naupliiTanks.length > 1) setNaupliiTanks(naupliiTanks.filter(t => t.id !== id));
  };

  const updateTank = (id: string, updates: Partial<TankEntry>) => {
    setNaupliiTanks(naupliiTanks.map(t => {
      if (t.id === id) {
        if (updates.tankId) {
          let foundName = '';
          availableTanks
            .filter(sec => sec.section_type === 'NAUPLII' && (!farmId || sec.farm_id === farmId))
            .forEach(sec => {
              const tank = sec.tanks.find((tk: any) => tk.id === updates.tankId);
              if (tank) foundName = `${sec.name} - ${tank.name}`;
            });
          return { ...t, ...updates, tankName: foundName, batchNumber: tankBatches[updates.tankId] || '' };
        }
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const totalGross = data.totalGross || 0;
  const netNauplii = data.netNauplii || 0;
  const balanceRemaining = data.balanceRemaining || 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* Field 3: Gross Available Summary (Calculated from Field 1/2 hidden logic) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-amber-100 rounded-xl">
                  <Calculator className="w-4 h-4 text-amber-600" />
               </div>
               <h3 className="text-sm font-bold uppercase tracking-wider">Inventory Status</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchInventory} 
              disabled={loading}
              className="text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50 gap-1.5 h-8 rounded-xl"
            >
              <TrendingUp className={cn("w-3 h-3", loading && "animate-pulse")} />
              Sync Inventory
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 bg-white border-amber-100 flex flex-col justify-center shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-5">
                  <ShoppingCart className="w-12 h-12 text-amber-600" />
               </div>
               <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Gross Available Total</p>
               </div>
               <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-amber-950">{totalInventoryLoad.toLocaleString()}</span>
                <span className="text-xs font-bold text-amber-600 opacity-50 uppercase tracking-tighter">Millions</span>
              </div>
            </Card>

            <Card className="p-5 bg-white border-blue-100 flex flex-col justify-center shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-5">
                  <Calculator className="w-12 h-12 text-blue-600" />
               </div>
               <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none">Still Available for Sale</p>
               </div>
               <div className="flex items-baseline gap-1.5">
                <span className={cn("text-3xl font-black", balanceRemaining < 0 ? "text-rose-600" : "text-blue-950")}>
                  {balanceRemaining.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-600 opacity-50 uppercase tracking-tighter">Millions</span>
              </div>
            </Card>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Field 1/4: Select Tanks & Quantities */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Sale Selections</h3>
            </div>
            <Button variant="outline" size="sm" onClick={addTank} className="rounded-xl border-dashed h-9 font-bold text-[10px] uppercase gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Select More Tanks
            </Button>
          </div>

          <div className="space-y-4">
            {naupliiTanks.map((entry) => (
              <Card key={entry.id} className="p-6 bg-muted/5 border shadow-sm rounded-[2rem] group transition-all hover:bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeTank(entry.id)}
                    className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 opacity-0 group-hover:opacity-100 transition-all z-10 border border-rose-100 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  {/* Field 1: Tank Selection */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 leading-none">Select Nauplii Tank</Label>
                    <Select value={entry.tankId} onValueChange={val => updateTank(entry.id, { tankId: val })}>
                      <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/20 bg-white text-base font-black shadow-sm pl-4">
                        <SelectValue placeholder="Select Tank" />
                      </SelectTrigger>
                       <SelectContent>
                        {availableTanks
                          .filter(s => s.section_type === 'NAUPLII' && (!farmId || s.farm_id === farmId))
                          .flatMap(s => s.tanks.map((t: any) => {
                            const avail = inventory[t.id] || 0;
                            return (
                              <SelectItem key={t.id} value={t.id} disabled={avail <= 0}>
                                <div className="flex items-center justify-between w-full gap-4">
                                   <span>{s.name} - {t.name}</span>
                                   <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase", avail > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-muted text-muted-foreground/40")}>
                                      {avail > 0 ? `${avail.toLocaleString()}M available` : 'Empty'}
                                   </span>
                                </div>
                              </SelectItem>
                            );
                          }))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity to sell from this tank */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 leading-none">Quantity to Sell (mil) *</Label>
                    <div className="relative">
                       <Input 
                        type="number" 
                        step="0.01"
                        value={entry.population} 
                        onChange={e => updateTank(entry.id, { population: e.target.value })} 
                        className="h-12 rounded-2xl font-black bg-white border-primary/10 text-lg text-primary shadow-sm pr-14" 
                        placeholder="0.0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/30 uppercase">MIL</span>
                    </div>
                  </div>

                  {/* Batch Display */}
                  {entry.batchNumber && (
                    <div className="absolute top-3 left-6 flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-full animate-fade-in">
                       <Database className="w-2.5 h-2.5 text-primary" />
                       <span className="text-[8px] font-black text-primary uppercase tracking-wider">Batch: {entry.batchNumber}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Calculations Section: Points 4, 5, 6, 7 */}
        <div className="p-8 bg-muted/5 rounded-[2.5rem] border border-dashed border-primary/20 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Field 4: Total Gross */}
              <div className="space-y-3">
                 <div className="flex items-center gap-3 h-10">
                    <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-tight">Total Gross Nauplii</Label>
                 </div>
                 <div className="h-16 px-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex items-center justify-center shadow-sm group">
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-emerald-950 leading-none">{totalGross.toLocaleString()}</span>
                       <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter leading-none">Millions</span>
                    </div>
                 </div>
              </div>

              {/* Field 5: Bonus % */}
              <div className="space-y-3">
                 <div className="flex items-center gap-3 h-10">
                    <Label className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-tight">Bonus %</Label>
                 </div>
                 <div className="relative group">
                    <Input 
                      type="number" 
                      value={bonusPercentage} 
                      onChange={e => setBonusPercentage(e.target.value)} 
                      className="h-16 rounded-3xl font-black bg-white border-blue-100 text-xl text-blue-950 shadow-sm pr-12 focus:ring-blue-100 placeholder:text-blue-100 text-center" 
                      placeholder="0"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-blue-200/40 transition-colors group-focus-within:text-blue-400/60">%</span>
                 </div>
              </div>

              {/* Field 6: Net Nauplii */}
              <div className="space-y-3">
                 <div className="flex items-center gap-3 h-10">
                    <Label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-tight">Net Nauplii</Label>
                 </div>
                 <div className="h-16 px-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl flex items-center justify-center shadow-sm group">
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-indigo-950 leading-none">{netNauplii.toLocaleString()}</span>
                       <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter leading-none">Millions</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Field 7: No of Packs */}
           <div className="space-y-3 max-w-sm">
              <div className="flex items-center gap-3">
                 <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">No. of Packs Packed</Label>
              </div>
              <div className="relative">
                 <Input 
                    type="number" 
                    value={packsPacked} 
                    onChange={e => setPacksPacked(e.target.value)} 
                    className="h-14 rounded-2xl font-black bg-white border-muted-foreground/10 text-xl shadow-sm pr-16" 
                    placeholder="0"
                 />
                 <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/30 uppercase">NOS</span>
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



