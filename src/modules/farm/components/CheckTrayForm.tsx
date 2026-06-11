import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Eye, Award, Info, AlertTriangle } from 'lucide-react';
import ImageUpload from '@/modules/shared/components/ImageUpload';

interface TrayEntry {
  id: number;
  score: string; // '1' | '2' | '3' | '4' | '5'
}

interface CheckTrayFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  photoUrl?: string;
  onPhotoUrlChange?: (val: string) => void;
  isPlanningMode?: boolean;
}

const TRAY_OPTIONS = [
  { value: '5', label: '5. No Feed < 2%', description: 'Excellent Consumption' },
  { value: '4', label: '4. Trace Feed Residual <10%', description: 'Good Consumption' },
  { value: '3', label: '3. Moderate Feed Residual - 25 to 50%', description: 'Moderate Consumption' },
  { value: '2', label: '2. High Feed Residual 75%', description: 'Poor Consumption' },
  { value: '0', label: '0. No Feed Consumption 0%', description: 'Critical (No Consumption)' }
];

const getScoreColor = (score: string) => {
  switch (score) {
    case '5': return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400';
    case '4': return 'border-teal-200 bg-teal-50 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400';
    case '3': return 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400';
    case '2': return 'border-orange-200 bg-orange-50 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400';
    case '0': return 'border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400';
    default: return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const getScoreBadge = (score: string) => {
  switch (score) {
    case '5': return 'bg-emerald-500 text-white';
    case '4': return 'bg-teal-500 text-white';
    case '3': return 'bg-amber-500 text-white';
    case '2': return 'bg-orange-500 text-white';
    case '0': return 'bg-rose-500 text-white';
    default: return 'bg-slate-400 text-white';
  }
};

const CheckTrayForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  photoUrl,
  onPhotoUrlChange,
  isPlanningMode = false
}: CheckTrayFormProps) => {

  const [numTrays, setNumTrays] = useState<string>(() => data.numTrays || '');
  const [trays, setTrays] = useState<TrayEntry[]>(() => data.trays || []);

  // Sync changes from parent data prop (e.g. when an instruction is applied)
  useEffect(() => {
    if (data.numTrays !== undefined && data.numTrays !== numTrays) {
      setNumTrays(data.numTrays || '');
    }
    if (data.trays && JSON.stringify(data.trays) !== JSON.stringify(trays)) {
      setTrays(data.trays || []);
    }
  }, [data.numTrays, data.trays]);

  const handleNumTraysChange = (val: string) => {
    setNumTrays(val);
    const num = parseInt(val) || 0;
    const currentTrays = [...trays];

    if (num > currentTrays.length) {
      for (let i = currentTrays.length; i < num; i++) {
        currentTrays.push({ id: i + 1, score: '' });
      }
    } else if (num < currentTrays.length) {
      currentTrays.splice(num);
    }
    setTrays(currentTrays);
  };

  const handleTrayScoreChange = (idx: number, score: string) => {
    const updated = [...trays];
    updated[idx] = { ...updated[idx], score };
    setTrays(updated);
  };

  const validTrays = trays.filter(t => t.score !== '');
  const averageScore = validTrays.length > 0
    ? parseFloat((validTrays.reduce((sum, t) => sum + parseInt(t.score), 0) / validTrays.length).toFixed(2))
    : 0;

  useEffect(() => {
    onDataChange({
      ...data,
      numTrays,
      trays,
      averageScore
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numTrays, trays, averageScore]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Check Tray Details Section */}
      <div className="glass-card rounded-2xl p-5 border border-sky-100/50 bg-white/70 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 mb-2">
          <div className="bg-sky-500/10 p-2 rounded-xl text-sky-600">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Check Tray Settings</h2>
            <p className="text-[10px] text-muted-foreground">Select the number of trays and record feed consumption scores</p>
          </div>
        </div>

        {/* Choose number of trays */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Choose Number of Check Trays *</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={numTrays}
            onChange={e => handleNumTraysChange(e.target.value)}
            placeholder="e.g. 4"
            className="h-11 rounded-xl font-bold"
          />
        </div>

        {/* Tray Rows */}
        {trays.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Trays Assessment</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trays.map((tray, idx) => (
                <div 
                  key={tray.id} 
                  className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 ${getScoreColor(tray.score)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">Check Tray #{tray.id}</span>
                    {tray.score && (
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${getScoreBadge(tray.score)}`}>
                        {TRAY_OPTIONS.find(o => o.value === tray.score)?.description}
                      </span>
                    )}
                  </div>
                  <Select
                    value={tray.score}
                    onValueChange={val => handleTrayScoreChange(idx, val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 font-semibold text-slate-800 text-xs">
                      <SelectValue placeholder="Select Tray Score" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TRAY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs rounded-lg">
                          <span className="font-bold">{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculated summary metrics */}
        {trays.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed">
            <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/50 space-y-1">
              <span className="text-[10px] font-bold text-sky-800/70 uppercase">Total Checked Trays</span>
              <p className="text-lg font-black text-sky-800">{trays.length}</p>
              <p className="text-[8px] text-sky-600/70">{validTrays.length} of {trays.length} scores entered</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800/70 uppercase">Average Check Tray Score</span>
              <p className="text-lg font-black text-emerald-800">
                {averageScore > 0 ? `${averageScore} / 5` : '—'}
              </p>
              <p className="text-[8px] text-emerald-600/70">Calculated average of entered check tray scores</p>
            </div>
          </div>
        )}
      </div>

      {/* Notes & Upload Section */}
      <div className="glass-card rounded-2xl p-5 border border-sky-100/50 bg-white/70 shadow-sm space-y-4">
        {/* Upload Files */}
        {!isPlanningMode && onPhotoUrlChange && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Upload Files (Lab Reports / Photos)</Label>
            <ImageUpload 
              value={photoUrl} 
              onUpload={onPhotoUrlChange}
            />
          </div>
        )}

        {/* Notes / Comments */}
        <div className="space-y-1.5 pt-2 border-t border-dashed">
          <Label className="text-xs font-bold text-slate-700">{isPlanningMode ? 'Instructions' : 'Notes'}</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder={isPlanningMode ? "Add instructions for the check tray team..." : "Add general notes..."}
            rows={4}
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default CheckTrayForm;
