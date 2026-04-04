import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUpRight, Calculator, CheckCircle2, AlertCircle, Camera, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ImageUpload from '@/modules/shared/components/ImageUpload';

interface HarvestEntry {
  id: string;
  tankId: string;
  tankName: string;
  population: string;
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
}: NaupliiHarvestFormProps) => {
  const [sources, setSources] = useState<HarvestEntry[]>(data.sources || [
    { id: '1', tankId: '', tankName: '', population: '' }
  ]);
  const [destinations, setDestinations] = useState<HarvestEntry[]>(data.destinations || [
    { id: '1', tankId: '', tankName: '', population: '' }
  ]);

  const updateData = (updates: any) => {
    onDataChange({ ...data, ...updates });
  };

  // Perform Balancing Calculations
  useEffect(() => {
    const totalHarvested = sources.reduce((sum, s) => sum + (parseFloat(s.population) || 0), 0);
    const totalDistributed = destinations.reduce((sum, d) => sum + (parseFloat(d.population) || 0), 0);
    const balance = totalHarvested - totalDistributed;

    const summary = {
      totalHarvested: Math.round(totalHarvested * 100) / 100,
      totalDistributed: Math.round(totalDistributed * 100) / 100,
      balance: Math.round(balance * 100) / 100
    };

    updateData({ sources, destinations, summary });
  }, [sources, destinations]);

  const addSource = () => {
    setSources([...sources, { id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: '' }]);
  };

  const removeSource = (id: string) => {
    if (sources.length > 1) setSources(sources.filter(s => s.id !== id));
  };

  const updateSource = (id: string, updates: Partial<HarvestEntry>) => {
    setSources(sources.map(s => {
      if (s.id === id) {
        if (updates.tankId) {
          let foundName = '';
          availableTanks.forEach(sec => {
            const t = sec.tanks.find((t:any) => t.id === updates.tankId);
            if (t) foundName = `${sec.name} - ${t.name}`;
          });
          return { ...s, ...updates, tankName: foundName };
        }
        return { ...s, ...updates };
      }
      return s;
    }));
  };

  const addDestination = () => {
    setDestinations([...destinations, { id: Math.random().toString(36).substr(2, 9), tankId: '', tankName: '', population: '' }]);
  };

  const removeDestination = (id: string) => {
    if (destinations.length > 1) setDestinations(destinations.filter(d => d.id !== id));
  };

  const updateDestination = (id: string, updates: Partial<HarvestEntry>) => {
    setDestinations(destinations.map(d => {
      if (d.id === id) {
        if (updates.tankId) {
          let foundName = '';
          availableTanks.forEach(sec => {
            const t = sec.tanks.find((t:any) => t.id === updates.tankId);
            if (t) foundName = `${sec.name} - ${t.name}`;
          });
          return { ...d, ...updates, tankName: foundName };
        }
        return { ...d, ...updates };
      }
      return d;
    }));
  };

  const isBalanced = Math.abs(data.summary?.balance || 0) < 0.001 && (data.summary?.totalHarvested || 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border shadow-sm space-y-8">
        {/* Summary Section */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border-emerald-100 flex flex-col justify-center shadow-sm">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Harvested</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-900">{(data.summary?.totalHarvested || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-600/60 uppercase">mil</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-blue-100 flex flex-col justify-center shadow-sm">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Distributed</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900">{(data.summary?.totalDistributed || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-blue-600/60 uppercase">mil</span>
              </div>
            </Card>

            <Card className={cn(
              "p-4 flex flex-col justify-center border transition-colors shadow-sm",
              isBalanced ? "bg-white border-green-200" : (data.summary?.balance !== 0 ? "bg-white border-rose-200" : "bg-white border-muted-foreground/10")
            )}>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-1",
                isBalanced ? "text-green-600" : (data.summary?.balance !== 0 ? "text-rose-600" : "text-muted-foreground")
              )}>
                {isBalanced ? "Balanced" : "Balance"}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-2xl font-black",
                    isBalanced ? "text-green-900" : (data.summary?.balance !== 0 ? "text-rose-900" : "text-foreground/50")
                  )}>
                    {(data.summary?.balance || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold opacity-60">mil</span>
                </div>
                {isBalanced ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  data.summary?.balance !== 0 && <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Source Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Plus className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">1. Select Spawning Tank</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={addSource} className="text-emerald-600 hover:bg-emerald-50 h-8 font-bold text-[10px] uppercase">
              <Plus className="w-3 h-3 mr-1" /> Add Tanks
            </Button>
          </div>

          <div className="space-y-3">
            {sources.map((source) => (
              <Card key={source.id} className="p-3 bg-muted/20 border-none rounded-2xl group transition-all hover:bg-muted/30 relative">
                {sources.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSource(source.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Spawning Tank</Label>
                    <Select value={source.tankId} onValueChange={val => updateSource(source.id, { tankId: val })}>
                      <SelectTrigger className="h-9 rounded-xl border-emerald-100 bg-background/50 text-xs font-semibold">
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
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Population (mil) *</Label>
                    <Input 
                      type="number" 
                      value={source.population} 
                      onChange={e => updateSource(source.id, { population: e.target.value })} 
                      className="h-9 rounded-xl font-bold bg-background/50 border-muted-foreground/10 text-xs text-emerald-600" 
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Destination Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">2. Shifted To Nauplii Tank</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={addDestination} className="text-blue-600 hover:bg-blue-50 h-8 font-bold text-[10px] uppercase">
              <Plus className="w-3 h-3 mr-1" /> Add Tanks
            </Button>
          </div>

          <div className="space-y-3">
            {destinations.map((dest) => (
              <Card key={dest.id} className="p-3 bg-muted/20 border-none rounded-2xl group transition-all hover:bg-muted/30 relative">
                {destinations.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDestination(dest.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-100 text-rose-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Nauplii Tank</Label>
                    <Select value={dest.tankId} onValueChange={val => updateDestination(dest.id, { tankId: val })}>
                      <SelectTrigger className="h-9 rounded-xl border-blue-100 bg-background/50 text-xs font-semibold">
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
                    <Label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Population (mil) *</Label>
                    <Input 
                      type="number" 
                      value={dest.population} 
                      onChange={e => updateDestination(dest.id, { population: e.target.value })} 
                      className="h-9 rounded-xl font-bold bg-background/50 border-muted-foreground/10 text-xs text-blue-600" 
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </Card>
            ))}
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

export default NaupliiHarvestForm;
