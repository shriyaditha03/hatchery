import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface TankShiftingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  availableTanks: any[];
  isPlanningMode?: boolean;
  sourceTankId?: string;
  stockedTankIds?: string[];
  fetchLatestPopulation?: (tid: string) => Promise<number>;
}

const TankShiftingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  availableTanks,
  isPlanningMode = false,
  sourceTankId,
  stockedTankIds = [],
  fetchLatestPopulation
}: TankShiftingFormProps) => {
  const [destinations, setDestinations] = useState<any[]>(data.destinations || [{ id: Date.now() }]);

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  const updateDestinations = (newDests: any[]) => {
    setDestinations(newDests);
    handleChange('destinations', newDests);
  };

  const addDestination = () => {
    updateDestinations([...destinations, { id: Date.now() }]);
  };

  const removeDestination = (id: number) => {
    if (destinations.length > 1) {
      updateDestinations(destinations.filter(d => d.id !== id));
    }
  };

  const handleDestChange = async (id: number, updates: Record<string, any>) => {
    if (updates.tankId) {
      if (stockedTankIds.includes(updates.tankId)) {
        const confirmed = window.confirm('You are mixing 2 Tanks, are you sure you want to go ahead');
        if (!confirmed) {
          return; // Cancel the selection
        }
        if (fetchLatestPopulation) {
          const pop = await fetchLatestPopulation(updates.tankId);
          updates.currentPopulation = pop.toString();
        }
      } else {
        updates.currentPopulation = '0';
      }
    }

    const newDests = destinations.map(d => {
      if (d.id === id) {
        return { ...d, ...updates };
      }
      return d;
    });
    updateDestinations(newDests);
  };

  // Calculate total shifted
  const totalShifted = destinations.reduce((sum, d) => sum + (parseFloat(d.populationToShift || '0') || 0), 0);
  const remainingInSource = (parseFloat(data.sourcePopulation || '0') || 0) - totalShifted;

  useEffect(() => {
    if (data.totalShifted !== totalShifted || data.remainingInSource !== remainingInSource) {
        onDataChange({ ...data, totalShifted, remainingInSource });
    }
  }, [totalShifted, remainingInSource]);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Tank Shifting Details</h2>
      </div>

      {/* Source Info */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-dashed space-y-3">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Source Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Source Population</Label>
            <p className="text-sm font-black text-foreground">{data.sourcePopulation || '0'}</p>
          </div>
          <div className="space-y-1 text-right">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Remaining After Shift</Label>
            <p className={`text-sm font-black ${remainingInSource < 0 ? 'text-destructive' : 'text-primary'}`}>{remainingInSource}</p>
          </div>
        </div>
      </div>

      {/* Destinations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">4. Destination Tanks ({destinations.length})</Label>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addDestination}
                className="h-8 rounded-lg text-[10px] font-bold gap-1 border-primary/20 hover:bg-primary/5 hover:border-primary"
            >
                <Plus className="w-3 h-3" /> Add Tank
            </Button>
        </div>

        {destinations.map((dest, index) => (
          <div key={dest.id} className="p-4 rounded-2xl border border-primary/10 bg-primary/5 space-y-4 relative group">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Destination {index + 1}</span>
                {destinations.length > 1 && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeDestination(dest.id)}
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Destination Section */}
              <div className="space-y-1.5">
                <Label className="text-xs">5. Destination Section</Label>
                <Select 
                    value={dest.sectionId || ''} 
                    onValueChange={(val) => {
                        handleDestChange(dest.id, { sectionId: val, tankId: '' }); // Update section and reset tank
                    }}
                >
                  <SelectTrigger id="dest-section-select" className="h-10 rounded-xl" data-testid="dest-section-select">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableTanks.map((section: any) => (
                      <SelectItem key={section.id} value={section.id} className="text-xs">
                        {section.farm_name} - {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination Tank */}
              <div className="space-y-1.5">
                <Label className="text-xs">6. Destination Tank</Label>
                <Select 
                    value={dest.tankId || ''} 
                    onValueChange={(val) => handleDestChange(dest.id, { tankId: val })}
                    disabled={!dest.sectionId}
                >
                  <SelectTrigger id="dest-tank-select" className="h-10 rounded-xl" data-testid="dest-tank-select">
                    <SelectValue placeholder="Select tank" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableTanks.find(s => s.id === dest.sectionId)?.tanks
                      .filter((tank: any) => tank.id !== sourceTankId)
                      .map((tank: any) => (
                      <SelectItem key={tank.id} value={tank.id} className="text-xs">
                        {tank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Population in Destination (Auto-loaded) */}
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="current-pop">7. Current Population</Label>
                <Input
                  id="current-pop"
                  type="number"
                  value={dest.currentPopulation || '0'}
                  readOnly
                  className="h-10 rounded-xl bg-muted/20"
                />
              </div>

              {/* Population to shift */}
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="pop-to-shift">Population to Shift *</Label>
                <Input
                  id="pop-to-shift"
                  type="number"
                  value={dest.populationToShift || ''}
                  onChange={(e) => handleDestChange(dest.id, { populationToShift: e.target.value })}
                  placeholder="0"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 8. Notes */}
      <div className="space-y-2 pt-2 border-t border-dashed">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">
          {isPlanningMode ? 'Instructions' : '8. Notes'}
        </Label>
        <Textarea
          value={comments}
          onChange={e => onCommentsChange(e.target.value)}
          placeholder={isPlanningMode ? 'Add instructions for shifting...' : 'Any notes about the shift...'}
          rows={3}
          className="rounded-xl resize-none"
        />
      </div>
    </div>
  );
};

export default TankShiftingForm;
