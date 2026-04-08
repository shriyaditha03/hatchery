import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUpRight, Calculator, CheckCircle2, AlertCircle, Camera, ClipboardList, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface HarvestEntry {
  id: string;
  tankId: string;
  tankName: string;
  population: string;
}

interface HarvestGroup {
  id: string;
  sourceTankId: string;
  sourceTankName: string;
  eggCountMillions?: number;
  harvestedPopulation: string;
  destinations: HarvestEntry[];
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
}: NaupliiHarvestFormProps) => {
  // Use grouped state internally if possible, or derive from flat arrays on mount
  const [groups, setGroups] = useState<HarvestGroup[]>(() => {
    if (data.harvestGroups) return data.harvestGroups;
    
    // Fallback: derive from flat sources/destinations if they exist (for backwards compatibility/editing)
    if (data.sources && data.sources.length > 0) {
      return data.sources.map((s: any) => ({
        id: s.id,
        sourceTankId: s.tankId,
        sourceTankName: s.tankName,
        harvestedPopulation: s.population,
        destinations: data.destinations.filter((d: any) => d.sourceId === s.id)
      }));
    }
    return [];
  });

  const [loading, setLoading] = useState(false);

  const updateData = (updatedGroups: HarvestGroup[]) => {
    // Map back to flat arrays for RecordActivity compatibility
    const sources = updatedGroups.map(g => ({
      id: g.id,
      tankId: g.sourceTankId,
      tankName: g.sourceTankName,
      population: g.harvestedPopulation
    }));

    const destinations = updatedGroups.flatMap(g => 
      g.destinations.map(d => ({ ...d, sourceId: g.id }))
    );

    const totalHarvested = updatedGroups.reduce((sum, g) => sum + (parseFloat(g.harvestedPopulation) || 0), 0);
    const totalDistributed = destinations.reduce((sum, d) => sum + (parseFloat(d.population) || 0), 0);
    
    const summary = {
      totalHarvested: Math.round(totalHarvested * 100) / 100,
      totalDistributed: Math.round(totalDistributed * 100) / 100,
      balance: Math.round((totalHarvested - totalDistributed) * 100) / 100
    };

    onDataChange({
      ...data,
      harvestGroups: updatedGroups,
      sources,
      destinations,
      summary
    });
  };

  // Sync from Egg Count
  const fetchEggCountData = async (forceSync = false) => {
    if (!farmId) return;
    if (groups.length > 0 && !forceSync) return;

    setLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('farm_id', farmId)
        .eq('activity_type', 'Egg Count')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (logs && logs.length > 0) {
        // Flatten entries from all relevant logs
        const allEntries: any[] = [];
        const seenTanks = new Set();

        logs.forEach(log => {
          if (log.data?.entries) {
            log.data.entries.forEach((entry: any) => {
              if (entry.tankId && !seenTanks.has(entry.tankId)) {
                allEntries.push(entry);
                seenTanks.add(entry.tankId);
              }
            });
          }
        });

        const initialGroups: HarvestGroup[] = allEntries.map(entry => {
          const eggsVal = entry.totalEggsMillions || '0';
          return {
            id: Math.random().toString(36).substr(2, 9),
            sourceTankId: entry.tankId,
            sourceTankName: entry.tankName,
            eggCountMillions: parseFloat(eggsVal) || 0,
            harvestedPopulation: eggsVal, // Auto-populate with Egg Count as default
            destinations: [{ id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: eggsVal }]
          };
        });

        if (initialGroups.length > 0) {
          setGroups(initialGroups);
          updateData(initialGroups);
        }
      }
    } catch (err) {
      console.error('Error fetching egg count data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEggCountData();
  }, [farmId]);

  const addGroup = () => {
    const newGroup: HarvestGroup = {
      id: Math.random().toString(36).substr(2, 9),
      sourceTankId: '',
      sourceTankName: '',
      harvestedPopulation: '',
      destinations: [{ id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: '' }]
    };
    const newGroups = [...groups, newGroup];
    setGroups(newGroups);
    updateData(newGroups);
  };

  const removeGroup = (id: string) => {
    const newGroups = groups.filter(g => g.id !== id);
    setGroups(newGroups);
    updateData(newGroups);
  };

  const updateGroup = (id: string, updates: Partial<HarvestGroup>) => {
    const newGroups = groups.map(g => {
      if (g.id === id) {
        if (updates.sourceTankId) {
          let foundName = '';
          availableTanks
            .filter(sec => !farmId || sec.farm_id === farmId)
            .forEach(sec => {
              const t = sec.tanks.find((t:any) => t.id === updates.sourceTankId);
              if (t) foundName = `${sec.name} - ${t.name}`;
            });
          return { ...g, ...updates, sourceTankName: foundName };
        }
        return { ...g, ...updates };
      }
      return g;
    });
    setGroups(newGroups);
    updateData(newGroups);
  };

  const addDestination = (groupId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          destinations: [...g.destinations, { id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: '' }]
        };
      }
      return g;
    });
    setGroups(newGroups);
    updateData(newGroups);
  };

  const updateDestination = (groupId: string, destId: string, updates: Partial<HarvestEntry>) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          destinations: g.destinations.map(d => {
            if (d.id === destId) {
              if (updates.tankId) {
                let foundName = '';
                availableTanks
                  .filter(sec => !farmId || sec.farm_id === farmId)
                  .forEach(sec => {
                    const t = sec.tanks.find((t:any) => t.id === updates.tankId);
                    if (t) foundName = `${sec.name} - ${t.name}`;
                  });
                return { ...d, ...updates, tankName: foundName };
              }
              return { ...d, ...updates };
            }
            return d;
          })
        };
      }
      return g;
    });
    setGroups(newGroups);
    updateData(newGroups);
  };

  const removeDestination = (groupId: string, destId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId && g.destinations.length > 1) {
        return { ...g, destinations: g.destinations.filter(d => d.id !== destId) };
      }
      return g;
    });
    setGroups(newGroups);
    updateData(newGroups);
  };

  const isGroupBalanced = (group: HarvestGroup) => {
    const harvested = parseFloat(group.harvestedPopulation) || 0;
    const distributed = group.destinations.reduce((sum, d) => sum + (parseFloat(d.population) || 0), 0);
    return Math.abs(harvested - distributed) < 0.001;
  };

  const getGroupBalance = (group: HarvestGroup) => {
    const harvested = parseFloat(group.harvestedPopulation) || 0;
    const distributed = group.destinations.reduce((sum, d) => sum + (parseFloat(d.population) || 0), 0);
    return harvested - distributed;
  };

  const totalHarvested = data.summary?.totalHarvested || 0;
  const isBalanced = Math.abs(data.summary?.balance || 0) < 0.001 && totalHarvested > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        
        {/* Consolidated Summary */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <Card className="p-4 bg-emerald-50 border-emerald-100 flex flex-col justify-center shadow-sm relative overflow-hidden h-24">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Calculator className="w-12 h-12 text-emerald-600" />
              </div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Total Nauplii Harvested</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-950">{totalHarvested.toLocaleString()}</span>
                <span className="text-sm font-bold text-emerald-600/60 uppercase">Millions</span>
              </div>
            </Card>
          </div>
          
          {totalHarvested > 0 && (
            <div className={cn(
              "p-4 rounded-2xl border flex flex-col items-center justify-center min-w-[140px] h-24 transition-all animate-in zoom-in-95",
              isBalanced ? "bg-blue-50 border-blue-100" : "bg-rose-50 border-rose-100"
            )}>
              <p className={cn(
                "text-[10px] font-black uppercase tracking-widest mb-1",
                isBalanced ? "text-blue-700" : "text-rose-700"
              )}>
                {isBalanced ? "Fully Distributed" : "Total Balance"}
              </p>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-2xl font-black",
                  isBalanced ? "text-blue-900" : "text-rose-900"
                )}>
                  {Math.abs(data.summary?.balance || 0).toLocaleString()}
                </span>
                {isBalanced ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
              </div>
              {!isBalanced && (
                 <p className="text-[8px] font-bold text-rose-600/60 uppercase mt-1">Pending Sync</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Harvest Groups</h3>
            </div>
            <div className="flex items-center gap-2">
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchEggCountData(true)} 
                className="rounded-xl h-9 font-bold text-[10px] uppercase gap-1.5 text-primary hover:bg-primary/5"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Sync Eggs
              </Button>
              <Button variant="outline" size="sm" onClick={addGroup} className="rounded-xl border-dashed h-9 font-bold text-[10px] uppercase gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Manual Group
              </Button>
            </div>
          </div>

          {loading && groups.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl border border-dashed text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Checking for egg count records...</p>
             </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl border border-dashed text-muted-foreground gap-4">
                <div className="p-3 bg-muted/10 rounded-full">
                   <AlertCircle className="w-5 h-5 opacity-40" />
                </div>
                <div className="text-center">
                   <p className="text-xs font-bold uppercase tracking-wider">No Egg Records Found</p>
                   <p className="text-[10px] opacity-60 mt-1">Please record an Egg Count first or add a group manually.</p>
                </div>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => {
                const balance = getGroupBalance(group);
                const isOver = balance < -0.001;
                
                return (
                  <Card key={group.id} className="p-0 bg-muted/5 border shadow-sm rounded-[2.5rem] overflow-hidden relative group/item">
                    {/* Group Header: Field 1 & 2 */}
                    <div className="p-6 bg-white border-b">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        {/* Field 1: Source */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                             <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Spawning Tank Source</Label>
                             {group.eggCountMillions !== undefined && (
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                   Eggs Recorded: {group.eggCountMillions}M
                                </span>
                             )}
                          </div>
                          {group.sourceTankId && group.sourceTankName ? (
                             <div className="flex items-center gap-4 pl-9">
                                <p className="text-2xl font-black text-foreground">{group.sourceTankName}</p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeGroup(group.id)}
                                  className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 opacity-0 group-hover/item:opacity-100 transition-all border border-rose-100 shadow-sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                             </div>
                          ) : (
                            <div className="flex items-center gap-2 pl-9">
                              <Select value={group.sourceTankId} onValueChange={val => updateGroup(group.id, { sourceTankId: val })}>
                                <SelectTrigger className="h-12 rounded-2xl border-emerald-100 bg-white text-base font-bold w-full sm:w-72 shadow-sm">
                                  <SelectValue placeholder="Select Spawning Tank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTanks
                                    .filter(s => !farmId || s.farm_id === farmId)
                                    .flatMap(s => s.tanks.map((t:any) => (
                                      <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>
                                    )))}
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" onClick={() => removeGroup(group.id)} className="text-rose-600 hover:bg-rose-50 rounded-xl">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Field 2: Output */}
                        <div className="space-y-3 min-w-[240px]">
                           <div className="flex items-center gap-3">
                              <Label className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none">Nauplii Harvested from this Tank *</Label>
                           </div>
                           <div className="relative pl-9">
                              <Input 
                                type="number" 
                                step="0.01"
                                value={group.harvestedPopulation} 
                                onChange={e => updateGroup(group.id, { harvestedPopulation: e.target.value })} 
                                className="h-14 rounded-2xl font-black bg-blue-50/30 border-blue-100 text-xl text-blue-950 focus:border-blue-500 shadow-sm pr-14" 
                                placeholder="0.0"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none opacity-40">
                                 <span className="text-[10px] font-black text-blue-900">MILL</span>
                                 <span className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter">Nauplii</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Destinations: Distribute to Nauplii Tanks */}
                    <div className="p-6 space-y-4 bg-muted/5">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                           <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                           <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Distribute to Nauplii Tanks</h4>
                        </div>
                        {balance !== 0 && (
                           <div className={cn(
                              "text-[9px] font-black px-3 py-1 rounded-full border flex items-center gap-1.5 animate-pulse",
                              isOver ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-blue-50 border-blue-200 text-blue-700"
                           )}>
                              {isOver ? <AlertCircle className="w-3 h-3" /> : <Calculator className="w-3 h-3" />}
                              {isOver ? "Exceeds Harvested!" : `Unallocated: ${balance.toFixed(2)}M`}
                           </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.destinations.map((dest) => (
                          <Card key={dest.id} className="p-4 bg-white border-muted-foreground/10 rounded-2xl relative group/dest">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeDestination(group.id, dest.id)}
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-50 text-rose-600 opacity-0 group-dest:opacity-100 transition-all border border-rose-100 z-10"
                             >
                              <Trash2 className="w-2.5 h-2.5" />
                             </Button>
                             <div className="space-y-3">
                                <div className="space-y-1">
                                   <Label className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Nauplii Tank</Label>
                                   <Select value={dest.tankId} onValueChange={val => updateDestination(group.id, dest.id, { tankId: val })}>
                                      <SelectTrigger className="h-9 rounded-xl border-blue-50 bg-blue-50/20 text-xs font-bold">
                                         <SelectValue placeholder="Select Destination" />
                                      </SelectTrigger>
                                      <SelectContent>
                                         {availableTanks
                                          .filter(s => !farmId || s.farm_id === farmId)
                                          .flatMap(s => s.tanks.map((t:any) => (
                                            <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>
                                          )))}
                                      </SelectContent>
                                   </Select>
                                </div>
                                <div className="space-y-1">
                                   <Label className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Population (mil)</Label>
                                   <div className="relative">
                                      <Input 
                                         type="number" 
                                         value={dest.population} 
                                         onChange={e => updateDestination(group.id, dest.id, { population: e.target.value })} 
                                         className="h-9 rounded-xl font-black bg-muted/20 border-hidden text-sm text-blue-900 pr-10" 
                                         placeholder="0.0"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-300">M</span>
                                   </div>
                                </div>
                             </div>
                          </Card>
                        ))}
                        
                        <Button 
                          variant="outline" 
                          onClick={() => addDestination(group.id)}
                          className="h-auto py-4 rounded-2xl border-dashed border-blue-200 bg-blue-50/10 hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold text-[10px] uppercase flex flex-col gap-2"
                        >
                           <Plus className="w-5 h-5" />
                           Add Nauplii Tank
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
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
