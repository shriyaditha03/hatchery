import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator, ShoppingCart, Camera, ClipboardList, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface TankEntry {
  id: string;
  tankId: string;
  tankName: string;
  population: string;
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
}: NaupliiSaleFormProps) => {
  const [naupliiTanks, setNaupliiTanks] = useState<TankEntry[]>(data.naupliiTanks || [
    { id: '1', tankId: '', tankName: '', population: '' }
  ]);
  const [bonusPercentage, setBonusPercentage] = useState<string>(data.bonusPercentage || '0');
  const [packsPacked, setPacksPacked] = useState<string>(data.packsPacked || '');
  const [availablePopulations, setAvailablePopulations] = useState<Record<string, number>>({});

  // Fetch current populations for all tanks in the section
  useEffect(() => {
    const fetchPopulations = async () => {
      const allTankIds = availableTanks.flatMap(s => s.tanks.map((t: any) => t.id));
      if (allTankIds.length > 0) {
        try {
          const { data: popData, error } = await supabase.rpc('get_active_tank_populations', { p_tank_ids: allTankIds });
          if (!error && popData) {
            const popMap: Record<string, number> = {};
            popData.forEach((d: any) => {
              popMap[d.tank_id] = parseFloat(d.current_population) || 0;
            });
            setAvailablePopulations(popMap);
          }
        } catch (err) {
          console.error('Error fetching populations:', err);
        }
      }
    };
    fetchPopulations();
  }, [availableTanks]);

  // Auto-calculation of Gross and Net Nauplii
  useEffect(() => {
    const gross = naupliiTanks.reduce((sum, t) => sum + (parseFloat(t.population) || 0), 0);
    const bonus = parseFloat(bonusPercentage) || 0;
    const net = gross * (1 + bonus / 100);

    onDataChange({
      ...data,
      naupliiTanks,
      bonusPercentage,
      packsPacked,
      totalGross: Math.round(gross * 100) / 100,
      netNauplii: Math.round(net * 100) / 100
    });
  }, [naupliiTanks, bonusPercentage, packsPacked]);

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
          availableTanks.forEach(sec => {
            const tank = sec.tanks.find((tk: any) => tk.id === updates.tankId);
            if (tank) foundName = `${sec.name} - ${tank.name}`;
          });
          return { ...t, ...updates, tankName: foundName };
        }
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* 3. Select Nauplii Tanks (Editable) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">3. Select Nauplii Tanks</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={addTank} className="text-primary hover:bg-primary/5 h-8 font-bold text-[10px] uppercase">
              <Plus className="w-3 h-3 mr-1" /> Add Tanks
            </Button>
          </div>

          <div className="space-y-3">
            {naupliiTanks.map((entry) => (
              <Card key={entry.id} className="p-3 bg-muted/20 border-none rounded-2xl group transition-all hover:bg-muted/30 relative">
                {naupliiTanks.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeTank(entry.id)}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Nauplii Tank</Label>
                    <Select value={entry.tankId} onValueChange={val => updateTank(entry.id, { tankId: val })}>
                      <SelectTrigger className="h-9 rounded-xl border-primary/10 bg-background/50 text-xs font-semibold">
                        <SelectValue placeholder="Select Tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTanks.flatMap(s => s.tanks.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>
                        )))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1 flex items-center justify-between">
                      <span>Population (mil) *</span>
                      {entry.tankId && availablePopulations[entry.tankId] > 0 && (
                        <span className="text-[8px] text-emerald-600 font-bold lowercase">Max: {availablePopulations[entry.tankId]} mil</span>
                      )}
                    </Label>
                    <Input 
                      type="number" 
                      value={entry.population} 
                      onChange={e => updateTank(entry.id, { population: e.target.value })} 
                      className="h-9 rounded-xl font-bold bg-background/50 border-muted-foreground/10 text-xs text-primary focus:ring-primary/30" 
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 4, 5, 6, 7. Totals & Packaging */}
        <div className="pt-4 border-t border-dashed space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 4. Total Gross Nauplii */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">4. Total Gross Nauplii (mil)</Label>
              <div className="h-11 px-4 flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl shadow-inner shadow-emerald-900/5 transition-all group hover:bg-emerald-50">
                <span className="text-xl font-black text-emerald-900 leading-none">{(data.totalGross || 0).toLocaleString()}</span>
                <Calculator className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 5. Bonus % */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">5. Bonus %</Label>
              <div className="relative group">
                <Input
                  type="number"
                  value={bonusPercentage}
                  onChange={e => setBonusPercentage(e.target.value)}
                  placeholder="0"
                  className="h-11 rounded-xl font-bold px-4 border-blue-100 focus:border-blue-300 focus:ring-blue-100 bg-blue-50/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-300/60">%</span>
              </div>
            </div>

            {/* 6. Net Nauplii */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">6. Net Nauplii (mil)</Label>
              <div className="h-11 px-4 flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl shadow-inner shadow-blue-900/5 transition-all group hover:bg-blue-50">
                <span className="text-xl font-black text-blue-900 leading-none">{(data.netNauplii || 0).toLocaleString()}</span>
                <TrendingUp className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>

          {/* 7. No of Packs packed */}
          <div className="space-y-1.5 max-w-[200px]">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">7. No of Packs packed</Label>
            <div className="relative group">
              <Input
                type="number"
                value={packsPacked}
                onChange={e => setPacksPacked(e.target.value)}
                placeholder="0"
                className="h-11 rounded-xl font-bold px-4 pr-12 border-muted-foreground/10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/40 uppercase">Nos</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
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

export default NaupliiSaleForm;



