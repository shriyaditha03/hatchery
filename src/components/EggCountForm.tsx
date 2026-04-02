import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Database, Calculator, CheckCircle2, FlaskConical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ImageUpload from '@/components/ImageUpload';

interface EggCountEntry {
  id: string;
  tankId: string;
  tankName: string;
  spawnedCount: string;
  totalEggsMillions: string;
  fertilizationPercent: string;
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
}: EggCountFormProps) => {
  const [entries, setEntries] = useState<EggCountEntry[]>(data.entries || [
    { id: '1', tankId: '', tankName: '', spawnedCount: '', totalEggsMillions: '', fertilizationPercent: '' }
  ]);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Perform Auto-Calculations
  useEffect(() => {
    let totalEggs = 0;
    let totalAnimals = 0;
    let weightedFertSum = 0;

    entries.forEach(entry => {
      const eggs = parseFloat(entry.totalEggsMillions) || 0;
      const animals = parseFloat(entry.spawnedCount) || 0;
      const fert = parseFloat(entry.fertilizationPercent) || 0;

      totalEggs += eggs;
      totalAnimals += animals;
      weightedFertSum += (eggs * fert);
    });

    const avgFertilization = totalEggs > 0 ? (weightedFertSum / totalEggs) : 0;
    const totalFertilized = (totalEggs * avgFertilization) / 100; // Actually total fertilized in millions
    // Wait, Note 9 says "Fertilized Egg Count". Usually this is Millions * %
    const totalFertilisedMillions = (totalEggs * (avgFertilization / 100));
    const fertilizedPerAnimal = totalAnimals > 0 ? (totalFertilisedMillions * 1000000 / totalAnimals) : 0;

    const summary = {
      totalEggs: Math.round(totalEggs * 100) / 100,
      avgFertilization: Math.round(avgFertilization * 100) / 100,
      totalFertilized: Math.round(totalFertilisedMillions * 100) / 100,
      fertilizedPerAnimal: Math.round(fertilizedPerAnimal)
    };

    updateData({ entries, summary });
  }, [entries]);

  const addEntry = () => {
    setEntries([...entries, { 
      id: Math.random().toString(36).substr(2, 9), 
      tankId: '', 
      tankName: '', 
      spawnedCount: '', 
      totalEggsMillions: '', 
      fertilizationPercent: '' 
    }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, updates: Partial<EggCountEntry>) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        if (updates.tankId) {
          // Find tank name
          let foundName = '';
          availableTanks.forEach(s => {
            const t = s.tanks.find((t:any) => t.id === updates.tankId);
            if (t) foundName = `${s.name} - ${t.name}`;
          });
          return { ...e, ...updates, tankName: foundName };
        }
        return { ...e, ...updates };
      }
      return e;
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        {/* Summary Cards */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 bg-white border-indigo-100 flex flex-col justify-center shadow-sm">
              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Total Eggs</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-indigo-900">{(data.summary?.totalEggs || 0).toLocaleString()}</span>
                <span className="text-[9px] font-bold text-indigo-600/60 uppercase">M</span>
              </div>
            </Card>
            <Card className="p-3 bg-white border-emerald-100 flex flex-col justify-center shadow-sm">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Avg Fert %</p>
              <p className="text-xl font-black text-emerald-900">{(data.summary?.avgFertilization || 0).toFixed(1)}%</p>
            </Card>
            <Card className="p-3 bg-white border-blue-100 flex flex-col justify-center shadow-sm">
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Fert. Eggs</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-blue-900">{(data.summary?.totalFertilized || 0).toLocaleString()}</span>
                <span className="text-[9px] font-bold text-blue-600/60 uppercase">M</span>
              </div>
            </Card>
            <Card className="p-3 bg-white border-amber-100 flex flex-col justify-center shadow-sm">
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Eggs / Animal</p>
              <p className="text-xl font-black text-amber-900">{(data.summary?.fertilizedPerAnimal || 0).toLocaleString()}</p>
            </Card>
          </div>
        </div>

        {/* Tank Entries */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Database className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Spawning Tank Results</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={addEntry} className="text-primary hover:bg-primary/5 h-8 font-bold text-[10px] uppercase">
              <Plus className="w-3 h-3 mr-1" /> Add Tank
            </Button>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-3 bg-muted/20 border-none rounded-2xl group transition-all hover:bg-muted/30 relative">
                {entries.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeEntry(entry.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Spawning Tank *</Label>
                    <Select value={entry.tankId} onValueChange={val => updateEntry(entry.id, { tankId: val })}>
                      <SelectTrigger className="h-9 rounded-xl border-muted-foreground/20 bg-background/50 text-xs font-semibold">
                        <SelectValue placeholder="Select Tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTanks.flatMap(s => s.tanks.map((t:any) => (
                          <SelectItem key={t.id} value={t.id}>{s.name} - {t.name}</SelectItem>
                        )))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Animals</Label>
                    <Input 
                      type="number" 
                      value={entry.spawnedCount} 
                      onChange={e => updateEntry(entry.id, { spawnedCount: e.target.value })} 
                      className="h-9 rounded-xl font-bold bg-background/50 border-muted-foreground/10 text-xs" 
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Eggs (M) *</Label>
                    <Input 
                      type="number" 
                      value={entry.totalEggsMillions} 
                      onChange={e => updateEntry(entry.id, { totalEggsMillions: e.target.value })} 
                      className="h-9 rounded-xl font-bold bg-blue-50/50 border-blue-100 text-xs text-blue-600" 
                      placeholder="0.0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Fert % *</Label>
                    <Input 
                      type="number" 
                      value={entry.fertilizationPercent} 
                      onChange={e => updateEntry(entry.id, { fertilizationPercent: e.target.value })} 
                      className="h-9 rounded-xl font-bold bg-emerald-50/50 border-emerald-100 text-xs text-emerald-600" 
                      placeholder="95"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Activity Photo */}
        <div className="space-y-1.5">
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
