import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Database, Calculator, CheckCircle2, FlaskConical, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface EggCountEntry {
  id: string;
  tankId: string;
  tankName: string;
  spawnedCount: string;
  totalEggsMillions: string;
  fertilizationPercent: string;
  batchNumber?: string;
  isAutoPopulated?: boolean;
}

interface EggCountFormProps {
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
}

const EggCountForm = ({
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
}: EggCountFormProps) => {
  const [entries, setEntries] = useState<EggCountEntry[]>(data.entries || []);
  const [loading, setLoading] = useState(false);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Fetch recent Spawning activity to auto-populate
  const fetchSpawningData = async (forceSync = false) => {
    if (!farmId) return;
    if (entries.length > 0 && !forceSync) return;
    
    setLoading(true);
    try {
      // Fetch Spawning activities from the last 24 hours for this farm
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('farm_id', farmId)
        .eq('activity_type', 'Spawning')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (logs && logs.length > 0) {
        // Group by tank_id to get only the LATEST spawning for each tank
        const latestByTank: Record<string, any> = {};
        logs.forEach(log => {
          if (!latestByTank[log.tank_id]) {
            latestByTank[log.tank_id] = log;
          }
        });

        const initialEntries: EggCountEntry[] = Object.values(latestByTank)
          .filter(log => (parseFloat(log.data?.spawnedCount) || 0) > 0)
          .map(log => {
            // Find tank name from availableTanks - ONLY FOR CURRENT FARM
            let tName = 'Unknown Tank';
            availableTanks
              .filter(s => !farmId || s.farm_id === farmId)
              .forEach(s => {
                const t = s.tanks.find((t: any) => t.id === log.tank_id);
                if (t) tName = `${s.name} - ${t.name}`;
              });

            return {
              id: Math.random().toString(36).substr(2, 9),
              tankId: log.tank_id,
              tankName: tName,
              spawnedCount: log.data?.spawnedCount || '0',
              totalEggsMillions: '',
              fertilizationPercent: '',
              batchNumber: log.data?.batchNumber || '',
              isAutoPopulated: true
            };
          });

        if (initialEntries.length > 0) {
          setEntries(initialEntries);
          updateData({ entries: initialEntries });
        }
      }
    } catch (err) {
      console.error('Error fetching spawning data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSpawningData();
  }, [farmId]);

  // Perform Refined Auto-Calculations
  useEffect(() => {
    let totalEggsValue = 0;
    let totalAnimalsValue = 0;
    let totalFertilizedValue = 0;

    entries.forEach(entry => {
      const eggs = parseFloat(entry.totalEggsMillions) || 0;
      const animals = parseFloat(entry.spawnedCount) || 0;
      const fert = parseFloat(entry.fertilizationPercent) || 0;

      totalEggsValue += eggs;
      totalAnimalsValue += animals;
      totalFertilizedValue += (eggs * (fert / 100));
    });

    const avgFertilization = totalEggsValue > 0 ? (totalFertilizedValue / totalEggsValue) * 100 : 0;
    const eggsPerAnimal = totalAnimalsValue > 0 ? (totalEggsValue * 1000000 / totalAnimalsValue) : 0;

    const summary = {
      totalEggs: Math.round(totalEggsValue * 100) / 100,
      totalFertilized: Math.round(totalFertilizedValue * 100) / 100,
      avgFertilization: Math.round(avgFertilization * 100) / 100,
      eggsPerAnimal: Math.round(eggsPerAnimal)
    };

    // Only update if summary or entries changed significantly
    if (JSON.stringify(data.summary) !== JSON.stringify(summary) || JSON.stringify(data.entries) !== JSON.stringify(entries)) {
      onDataChange({ ...data, entries, summary });
    }
  }, [entries]);

  const addEntry = () => {
    setEntries([...entries, { 
      id: Math.random().toString(36).substr(2, 9), 
      tankId: '', 
      tankName: '', 
      spawnedCount: '', 
      totalEggsMillions: '', 
      fertilizationPercent: '',
      batchNumber: '',
      isAutoPopulated: false
    }]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<EggCountEntry>) => {
    const newList = entries.map(e => {
      if (e.id === id) {
        if (updates.tankId) {
          let foundName = '';
          availableTanks
            .filter(s => !farmId || s.farm_id === farmId)
            .forEach(s => {
              const t = s.tanks.find((t:any) => t.id === updates.tankId);
              if (t) foundName = `${s.name} - ${t.name}`;
            });
          return { ...e, ...updates, tankName: foundName };
        }
        return { ...e, ...updates };
      }
      return e;
    });
    setEntries(newList);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* Field 2: Consolidated Summary Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <div className="p-2 bg-indigo-100 rounded-xl">
                <Calculator className="w-4 h-4 text-indigo-600" />
             </div>
             <h3 className="text-sm font-bold uppercase tracking-wider">Consolidated Data</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-indigo-100 flex flex-col justify-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <Database className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Total Egg</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-950">{(data.summary?.totalEggs || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-indigo-600 opacity-50 uppercase tracking-tighter">Millions</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-blue-100 flex flex-col justify-center shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <FlaskConical className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Ferti Egg</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-950">{(data.summary?.totalFertilized || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-blue-600 opacity-50 uppercase tracking-tighter">Millions</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-emerald-100 flex flex-col justify-center shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-5 text-emerald-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Avg Fert%</p>
              <p className="text-2xl font-black text-emerald-950">{(data.summary?.avgFertilization || 0).toFixed(1)}%</p>
            </Card>

            <Card className="p-4 bg-white border-amber-100 flex flex-col justify-center shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-5 text-amber-600">
                <Database className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Egg per Animal</p>
              <p className="text-2xl font-black text-amber-950">{(data.summary?.eggsPerAnimal || 0).toLocaleString()}</p>
            </Card>
          </div>
        </div>

        <div className="h-px bg-muted-foreground/10 mx-4" />

        {/* Field 1: Spawning Tank Inputs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Database className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Spawning Tank Data</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchSpawningData(true)} 
                className="rounded-xl h-9 font-bold text-[10px] uppercase gap-1.5 text-primary hover:bg-primary/5"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Sync Spawns
              </Button>
              <Button variant="outline" size="sm" onClick={addEntry} className="rounded-xl border-dashed h-9 font-bold text-[10px] uppercase gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Manually
              </Button>
            </div>
          </div>

          {loading && entries.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl border border-dashed text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Syncing recent spawning data...</p>
             </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl border border-dashed text-muted-foreground gap-4">
                <div className="p-3 bg-muted/10 rounded-full">
                   <AlertCircle className="w-5 h-5 opacity-40" />
                </div>
                <div className="text-center">
                   <p className="text-xs font-bold uppercase tracking-wider">No active spawns found</p>
                   <p className="text-[10px] opacity-60 mt-1">Please record a Spawning activity first or add tanks manually.</p>
                </div>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <Card key={entry.id} className="p-6 bg-muted/5 border shadow-sm rounded-[2rem] group transition-all hover:bg-muted/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeEntry(entry.id)}
                      className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 opacity-0 group-hover:opacity-100 transition-all z-10 border border-rose-100 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Header: Tank and Population */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-muted-foreground/10">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none">Spawning Tank</Label>
                        {entry.tankId && entry.tankName ? (
                          <p className="text-lg font-black text-foreground ml-1">{entry.tankName}</p>
                        ) : (
                          <Select value={entry.tankId} onValueChange={val => updateEntry(entry.id, { tankId: val })}>
                            <SelectTrigger className="h-10 rounded-xl border-muted-foreground/20 bg-white text-sm font-bold w-full sm:w-64">
                              <SelectValue placeholder="Select Tank" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTanks
                                .filter(s => s.section_type === 'SPAWNING' && (!farmId || s.farm_id === farmId))
                                .flatMap(s => s.tanks.map((t:any) => (
                                  <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>
                                )))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-1">
                         <div className="bg-primary/5 px-3 py-1 rounded-xl border border-primary/10 flex items-center gap-2">
                            <Database className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-black text-primary uppercase">{entry.batchNumber || 'NO BATCH'}</span>
                         </div>
                         <div className="bg-white/50 px-4 py-2 rounded-2xl border flex flex-col items-center justify-center min-w-[120px]">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter mb-0.5">Animals Spawned</span>
                            <div className="flex items-center gap-1.5">
                               {entry.isAutoPopulated ? (
                                  <span className="text-xl font-black text-foreground">{entry.spawnedCount}</span>
                               ) : (
                                  <Input 
                                     type="number" 
                                     value={entry.spawnedCount} 
                                     onChange={e => updateEntry(entry.id, { spawnedCount: e.target.value })} 
                                     className="h-8 w-16 text-center font-black bg-transparent border-none p-0 focus-visible:ring-0" 
                                     placeholder="0"
                                  />
                               )}
                               <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase">Females</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    {/* Inputs: Egg and Fert% */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                           <Label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Total Egg Count (Millions) *</Label>
                           {parseFloat(entry.totalEggsMillions) > 0 && (
                             <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">Input Required</span>
                           )}
                        </div>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={entry.totalEggsMillions} 
                            onChange={e => updateEntry(entry.id, { totalEggsMillions: e.target.value })} 
                            className="h-14 rounded-2xl font-black bg-white border-indigo-100 text-xl text-indigo-900 focus:border-indigo-500 shadow-sm pr-12" 
                            placeholder="0.0"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none">
                            <span className="text-[10px] font-black text-indigo-300">MILL</span>
                            <span className="text-[8px] font-bold text-indigo-200 uppercase tracking-tighter">Eggs</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                           <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Fertilization % *</Label>
                           {parseFloat(entry.fertilizationPercent) > 90 && (
                             <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                           )}
                        </div>
                        <div className="relative">
                          <Input 
                            type="number" 
                            value={entry.fertilizationPercent} 
                            onChange={e => updateEntry(entry.id, { fertilizationPercent: e.target.value })} 
                            className="h-14 rounded-2xl font-black bg-white border-emerald-100 text-xl text-emerald-950 focus:border-emerald-500 shadow-sm pr-12" 
                            placeholder="95"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-300 opacity-40">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity Photo */}
        <div className="space-y-1.5 pt-4 border-t border-dashed">
          <Label className="text-xs">Activity Photo (Optional)</Label>
          <ImageUpload value={photoUrl} onUpload={onPhotoUrlChange} />
        </div>

        {/* Comments */}
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

export default EggCountForm;
