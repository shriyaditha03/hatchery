import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface HarvestFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  isPlanningMode?: boolean;
}

const HarvestForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  isPlanningMode = false
}: HarvestFormProps) => {
  const [harvestMode, setHarvestMode] = useState<'population' | 'bag'>(data.harvestMode || 'population');

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  // Auto-calculate harvested population if in bag mode
  useEffect(() => {
    if (harvestMode === 'bag') {
      const bagSize = parseFloat(data.spoonBagSize || '0');
      const bagCount = parseFloat(data.spoonBagCount || '0');
      const total = bagSize * bagCount;
      if (!isNaN(total) && total.toString() !== data.harvestedPopulation) {
        handleChange('harvestedPopulation', total.toString());
      }
    }
  }, [data.spoonBagSize, data.spoonBagCount, harvestMode]);

  // Auto-calculate population after harvest
  useEffect(() => {
    const before = parseFloat(data.populationBeforeHarvest || '0');
    const harvested = parseFloat(data.harvestedPopulation || '0');
    const after = before - harvested;
    if (!isNaN(after) && !data.isAfterPopulationManuallyEdited) {
       const afterStr = Math.max(0, after).toString();
       if (afterStr !== data.populationAfterHarvest) {
          handleChange('populationAfterHarvest', afterStr);
       }
    }
  }, [data.populationBeforeHarvest, data.harvestedPopulation, data.isAfterPopulationManuallyEdited]);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-5 animate-fade-in-up">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Harvest Details</h2>

      {/* 1. Population Before Harvest */}
      <div className="space-y-1.5">
        <Label className="text-xs">1. Population (Before Harvest)</Label>
        <Input
          type="number"
          value={data.populationBeforeHarvest || ''}
          readOnly
          placeholder="Loading..."
          className="h-11 bg-muted/20"
        />
        <p className="text-[10px] text-muted-foreground">Auto-loaded from latest Stocking/Observation record</p>
      </div>

      {/* 2. Harvest Method Toggle */}
      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
        <div className="space-y-0.5">
          <Label className="text-xs font-bold">Harvest Method</Label>
          <p className="text-[10px] text-muted-foreground">Choose how to enter harvest data</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold ${harvestMode === 'population' ? 'text-primary' : 'text-muted-foreground'}`}>Direct Population</span>
          <Switch 
            checked={harvestMode === 'bag'} 
            onCheckedChange={(checked) => {
              const mode = checked ? 'bag' : 'population';
              setHarvestMode(mode);
              handleChange('harvestMode', mode);
            }} 
          />
          <span className={`text-[10px] font-bold ${harvestMode === 'bag' ? 'text-primary' : 'text-muted-foreground'}`}>Spoon / Bag Count</span>
        </div>
      </div>

      {/* 3 & 4 & 5. Harvested Data */}
      {harvestMode === 'bag' ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1.5">
            <Label className="text-xs">4. Spoon / Bag Qty (Size)</Label>
            <Input
              type="number"
              value={data.spoonBagSize || ''}
              onChange={e => handleChange('spoonBagSize', e.target.value)}
              placeholder="Qty per bag"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">5. Number of Spoons / Bags</Label>
            <Input
              type="number"
              value={data.spoonBagCount || ''}
              onChange={e => handleChange('spoonBagCount', e.target.value)}
              placeholder="Total bags"
              className="h-11"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
          <Label className="text-xs">3. To Harvest *</Label>
          <Input
            type="number"
            value={data.harvestedPopulation || ''}
            onChange={e => handleChange('harvestedPopulation', e.target.value)}
            placeholder="Enter harvested number"
            className="h-11"
          />
        </div>
      )}

      {/* 6. Population After Harvest */}
      <div className="space-y-1.5 pt-2 border-t border-dashed">
        <div className="flex justify-between items-center">
            <Label className="text-xs">6. Population After Harvest</Label>
            {data.isAfterPopulationManuallyEdited && (
                <span className="text-[9px] font-bold text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">Manual Edit</span>
            )}
        </div>
        <Input
          type="number"
          value={data.populationAfterHarvest || ''}
          onChange={e => {
            const val = e.target.value;
            onDataChange((prev: any) => ({
              ...prev,
              populationAfterHarvest: val,
              isAfterPopulationManuallyEdited: true
            }));
          }}
          placeholder="Calculated automatically"
          className={`h-11 ${data.isAfterPopulationManuallyEdited ? 'border-amber-500/50' : ''}`}
        />
        <p className="text-[10px] text-muted-foreground">Auto-generated (Before - Harvested) but editable</p>
      </div>

      {/* 7. Notes */}
      <div className="space-y-1.5 pt-2 border-t border-dashed">
        <Label className="text-xs">{isPlanningMode ? 'Instructions' : '7. Notes'}</Label>
        <Textarea
          value={comments}
          onChange={e => onCommentsChange(e.target.value)}
          placeholder={isPlanningMode ? "Add instructions for the harvesting team..." : "Add any notes about this harvest..."}
          rows={3}
          className="rounded-xl"
        />
      </div>
    </div>
  );
};

export default HarvestForm;
