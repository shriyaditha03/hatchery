import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Database, Users, Trash2, AlertTriangle, 
    CheckCircle2, Loader2, Info, ArrowRight,
    Calculator, Scale, Activity, Layers, Check
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface BroodstockDiscardFormProps {
    data: any;
    onChange: (data: any) => void;
    activeBroodstockBatchId: string;
    farmId: string;
    selectedTanks?: any[];
}

const BroodstockDiscardForm: React.FC<BroodstockDiscardFormProps> = ({ 
    data, 
    onChange, 
    activeBroodstockBatchId, 
    farmId,
    selectedTanks = []
}) => {
    const [loading, setLoading] = useState(false);
    const [stockingLog, setStockingLog] = useState<any>(null);
    const [observationLogs, setObservationLogs] = useState<any[]>([]);
    const [populatedTanks, setPopulatedTanks] = useState<any[]>([]);
    
    // Initializing state with default values if not present
    useEffect(() => {
        if (!data.discardType || !data.tankDiscards) {
            onChange({
                ...data,
                discardType: data.discardType || 'partial',
                tankDiscards: data.tankDiscards || {},
                discardReason: data.discardReason || '',
                avgBodyWeight: data.avgBodyWeight || '',
                isCompleteDiscard: data.discardType === 'complete' || false
            });
        }
    }, []);

    useEffect(() => {
        if (activeBroodstockBatchId && farmId) {
            fetchBatchData();
        }
    }, [activeBroodstockBatchId, farmId, selectedTanks]);

    const fetchBatchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch ALL relevant logs for this batch on this farm
            const { data: allLogs, error: logError } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('farm_id', farmId)
                .in('activity_type', ['Stocking', 'Observation']);

            if (logError) throw logError;

            // Filter for Stocking Log
            const sLog = (allLogs || []).find(l => {
                const sId = l.stockingId || l.data?.stockingId || l.data?.batchId;
                return l.activity_type === 'Stocking' && sId === activeBroodstockBatchId;
            });
            setStockingLog(sLog);

            // Filter for Observation Logs
            const oLogs = (allLogs || []).filter(l => {
                const sId = l.stockingId || l.data?.stockingId || l.data?.batchId || l.data?.selectedBatchId;
                return l.activity_type === 'Observation' && sId === activeBroodstockBatchId;
            });
            setObservationLogs(oLogs);

            // 2. Fetch populations for the currently selected tanks
            if (selectedTanks.length > 0) {
                const { data: popData, error: popError } = await supabase.rpc('get_active_tank_populations', {
                    p_tank_ids: selectedTanks.map(t => t.id)
                });

                if (popError) throw popError;

                const enriched = selectedTanks.map(t => {
                    const pop = popData?.find((p: any) => p.tank_id === t.id);
                    return {
                        ...t,
                        current_population: parseFloat(pop?.current_population) || 0
                    };
                });
                setPopulatedTanks(enriched);
            } else {
                setPopulatedTanks([]);
            }

        } catch (err) {
            console.error('Error fetching batch data:', err);
            toast.error('Failed to load batch data');
        } finally {
            setLoading(false);
        }
    };

    // Consolidated Calculations (Items a-j)
    const metrics = useMemo(() => {
        const s = stockingLog?.data || {};
        
        // a. Total Booked
        const bookedM = parseInt(s.totalMalesReceived) || 0;
        const bookedF = parseInt(s.totalFemalesReceived) || 0;

        // b. Air Transit Loss
        const airM = parseInt(s.airLossM) || 0;
        const airF = parseInt(s.airLossF) || 0;

        // c. AQF Loss
        const aqfM = parseInt(s.aqfLossM) || 0;
        const aqfF = parseInt(s.aqfLossF) || 0;

        // d. Transit to Hatchery Loss
        const hatchM = parseInt(s.hatcheryLossM) || 0;
        const hatchF = parseInt(s.hatcheryLossF) || 0;

        // e. Total Stocked in Hatchery
        const stockedM = bookedM - airM - aqfM - hatchM;
        const stockedF = bookedF - airF - aqfF - hatchF;

        // f. Recorded Mortality
        let mortM = 0;
        let mortF = 0;
        observationLogs.forEach(log => {
            const obs = log.data || {};
            const tankMort = parseInt(obs.mortalityNo) || parseInt(obs.mortality) || 0;
            const tankInCurrentView = populatedTanks.find(t => t.id === log.tank_id);
            if (tankInCurrentView) {
                if (tankInCurrentView.gender === 'Male' || tankInCurrentView.gender === 'MALE') mortM += tankMort;
                else mortF += tankMort;
            } else {
                mortF += tankMort; // Default fallback
            }
        });

        // g. Total Discarded Now
        let discardNowM = 0;
        let discardNowF = 0;

        if (data.discardType === 'partial') {
            Object.entries(data.tankDiscards || {}).forEach(([tid, count]) => {
                const tank = populatedTanks.find(t => t.id === tid);
                const c = parseInt(count as string) || 0;
                if (tank?.gender === 'Male' || tank?.gender === 'MALE') discardNowM += c;
                else discardNowF += c;
            });
        } else {
            // Complete Discard: Booked - Loss - Mortality
            discardNowM = Math.max(0, stockedM - mortM);
            discardNowF = Math.max(0, stockedF - mortF);
        }

        // h. Reasons for Discard (User Input)
        const reason = data.discardReason || 'Not selected';

        // i. Avg Body Wt. (User Input)
        const avgWt = parseFloat(data.avgBodyWeight) || 0;

        // j. Estimated Biomass
        const totalToDiscard = discardNowM + discardNowF;
        const estBiomass = (totalToDiscard * avgWt) / 1000; // in kg

        return {
            bookedM, bookedF,
            airM, airF,
            aqfM, aqfF,
            hatchM, hatchF,
            stockedM, stockedF,
            mortM, mortF,
            discardNowM, discardNowF,
            reason,
            avgWt,
            totalToDiscard,
            estBiomass
        };
    }, [stockingLog, observationLogs, populatedTanks, data.tankDiscards, data.discardType, data.avgBodyWeight, data.discardReason]);

    const handleDiscardTypeChange = (type: string) => {
        onChange({ 
            ...data, 
            discardType: type, 
            isCompleteDiscard: type === 'complete',
            tankDiscards: type === 'complete' ? {} : (data.tankDiscards || {})
        });
    };

    const handleTankDiscardValue = (tankId: string, value: string) => {
        const newDiscards = { ...data.tankDiscards, [tankId]: value };
        onChange({ ...data, tankDiscards: newDiscards });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-[150px] w-full rounded-3xl" />
                <Skeleton className="h-[400px] w-full rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Header & Mode Selection */}
            <Card className="border-2 border-red-100 shadow-xl overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-red-50/50 border-b border-red-100 pb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[1.25rem] bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-200">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-red-900 tracking-tight">Broodstock Discard</CardTitle>
                                {activeBroodstockBatchId && activeBroodstockBatchId !== 'new' && (
                                  <p className="text-[10px] uppercase font-black text-red-600/60 tracking-widest leading-none">Batch: {activeBroodstockBatchId}</p>
                                )}
                            </div>
                        </div>

                        <RadioGroup 
                            value={data.discardType} 
                            onValueChange={handleDiscardTypeChange}
                            className="flex flex-wrap gap-2"
                        >
                            <Label
                                htmlFor="complete"
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${data.discardType === 'complete' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-muted hover:border-red-200'}`}
                            >
                                <RadioGroupItem value="complete" id="complete" className="sr-only" />
                                <CheckCircle2 className={`w-4 h-4 ${data.discardType === 'complete' ? 'text-white' : 'text-red-300'}`} />
                                <span className="text-xs font-black uppercase">Discard Complete Batch</span>
                            </Label>
                            <Label
                                htmlFor="partial"
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${data.discardType === 'partial' ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-muted hover:border-amber-200'}`}
                            >
                                <RadioGroupItem value="partial" id="partial" className="sr-only" />
                                <Activity className={`w-4 h-4 ${data.discardType === 'partial' ? 'text-white' : 'text-amber-300'}`} />
                                <span className="text-xs font-black uppercase">Partial Discard</span>
                            </Label>
                        </RadioGroup>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    {/* 2. Partial Discard Input Section */}
                    {data.discardType === 'partial' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                             <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-amber-500" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Tank-wise Discard Input</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {populatedTanks.length > 0 ? populatedTanks.map(tank => {
                                    const isMale = tank.gender === 'Male' || tank.gender === 'MALE';
                                    const hasDiscard = !!(data.tankDiscards && data.tankDiscards[tank.id]);
                                    
                                    return (
                                        <div 
                                            key={tank.id} 
                                            className={`p-4 rounded-[2rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between min-h-[180px] 
                                                ${isMale 
                                                    ? (hasDiscard ? 'border-blue-500 bg-blue-50/60 shadow-lg shadow-blue-100' : 'border-blue-100 bg-blue-50/20 hover:border-blue-300') 
                                                    : (hasDiscard ? 'border-pink-500 bg-pink-50/60 shadow-lg shadow-pink-100' : 'border-pink-100 bg-pink-50/20 hover:border-pink-300')
                                                } hover:shadow-md bg-white`}
                                        >
                                            <div className="flex items-start justify-between relative z-10 gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-black font-black text-lg leading-tight break-words pr-1">{tank.name}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 break-words">{tank.sectionName || 'Section'}</p>
                                                </div>
                                                <div className={`flex-shrink-0 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isMale ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-pink-100 text-pink-700 border-pink-200'}`}>
                                                    {tank.gender}
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 space-y-4 relative z-10">
                                                <div className={`flex justify-between items-center p-3 rounded-2xl border border-dashed ${isMale ? 'bg-white/60 border-blue-200' : 'bg-white/60 border-pink-200'}`}>
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Current Pop.</span>
                                                    <span className={`text-base font-black ${isMale ? 'text-blue-900' : 'text-pink-900'}`}>{tank.current_population}</span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Animals to Discard</Label>
                                                    <Input 
                                                        type="number"
                                                        value={(data.tankDiscards && data.tankDiscards[tank.id]) || ''}
                                                        onChange={(e) => handleTankDiscardValue(tank.id, e.target.value)}
                                                        placeholder="0"
                                                        className={`h-12 text-base font-black rounded-2xl bg-white/80 border-2 transition-all focus:bg-white placeholder:font-medium placeholder:opacity-30
                                                            ${isMale 
                                                                ? 'border-blue-100 focus:border-blue-500 focus:ring-blue-500/20' 
                                                                : 'border-pink-100 focus:border-pink-500 focus:ring-pink-500/20'}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.05] ${isMale ? 'bg-blue-600' : 'bg-pink-600'}`} />
                                        </div>
                                    );
                                }) : (

                                    <div className="col-span-full py-10 text-center border-2 border-dashed rounded-[2rem] opacity-60 bg-muted/5">
                                        <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                                        <p className="text-xs font-bold text-muted-foreground italic px-4">
                                            Please select tanks in the "Location & Scope" grid above to view discard inputs.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. CONSOLIDATED DATA TABLE (a-j) */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                             <Calculator className="w-5 h-5 text-red-500" />
                             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Consolidated Production & Loss Summary</h3>
                        </div>

                        <div className="border border-muted-foreground/10 rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-100">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-muted">
                                        <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Metric Description</th>
                                        <th className="py-4 px-6 text-[10px] font-black uppercase text-blue-600 text-center tracking-widest">Male (Qty)</th>
                                        <th className="py-4 px-6 text-[10px] font-black uppercase text-pink-600 text-center tracking-widest">Female (Qty)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">a</span>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Total Animals Booked</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-base font-black text-center text-slate-800">{metrics.bookedM}</td>
                                        <td className="py-4 px-6 text-base font-black text-center text-slate-800">{metrics.bookedF}</td>
                                    </tr>

                                    {[
                                        { id: 'b', label: 'Total Animals Lost in Air Transit', m: metrics.airM, f: metrics.airF, color: 'text-red-500/70' },
                                        { id: 'c', label: 'Total Animals Lost in AQF', m: metrics.aqfM, f: metrics.aqfF, color: 'text-red-500/70' },
                                        { id: 'd', label: 'Total Animals Lost in Transit to Hatchery', m: metrics.hatchM, f: metrics.hatchF, color: 'text-red-500/70' }
                                    ].map(row => (
                                        <tr key={row.id} className="bg-slate-50/30 hover:bg-red-50/30 transition-colors">
                                            <td className="py-3 px-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">{row.id}</span>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase">{row.label}</p>
                                                </div>
                                            </td>
                                            <td className={`py-3 px-6 text-sm font-black text-center ${row.color}`}>{row.m}</td>
                                            <td className={`py-3 px-6 text-sm font-black text-center ${row.color}`}>{row.f}</td>
                                        </tr>
                                    ))}

                                    <tr className="bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-500 flex-shrink-0">e</span>
                                                <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">Total Animals Stocked in Hatchery</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-lg font-black text-center text-indigo-700">{metrics.stockedM}</td>
                                        <td className="py-4 px-6 text-lg font-black text-center text-indigo-700">{metrics.stockedF}</td>
                                    </tr>

                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">f</span>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Total Animals Lost as Mortality</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-base font-black text-center text-red-600">{metrics.mortM}</td>
                                        <td className="py-4 px-6 text-base font-black text-center text-red-600">{metrics.mortF}</td>
                                    </tr>

                                    <tr className={`transition-all ${data.discardType === 'complete' ? 'bg-amber-50/50 font-black' : 'hover:bg-slate-50/50'}`}>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-[10px] font-black text-amber-600 flex-shrink-0">g</span>
                                                <p className={`text-xs font-black uppercase tracking-tight ${data.discardType === 'complete' ? 'text-amber-900' : 'text-slate-900'}`}>Total Animals Discarded Now</p>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-lg font-black text-center text-amber-700">{metrics.discardNowM}</td>
                                        <td className="py-5 px-6 text-lg font-black text-center text-amber-700">{metrics.discardNowF}</td>
                                    </tr>

                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">h</span>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Reasons for Discard</p>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="py-4 px-6 text-[11px] font-black text-right text-slate-600 uppercase italic">
                                            {metrics.reason}
                                        </td>
                                    </tr>

                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">i</span>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Avg. Body Wt.</p>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="py-4 px-6 text-right">
                                            <span className="text-sm font-black text-slate-800">{metrics.avgWt}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">gms</span>
                                        </td>
                                    </tr>

                                    <tr className="bg-slate-900 text-white selection:bg-white/20 selection:text-white">
                                        <td className="py-5 px-6 rounded-bl-[2rem]">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">j</span>
                                                <p className="text-xs font-black uppercase tracking-widest text-white/90">Estimated Biomass</p>
                                            </div>
                                        </td>
                                        <td colSpan={2} className="py-5 px-6 text-right rounded-br-[2rem]">
                                            <span className="text-xl font-black text-amber-400">{metrics.estBiomass.toFixed(2)}</span>
                                            <span className="text-[10px] font-bold text-white/40 uppercase ml-2 tracking-widest">KG</span>
                                        </td>
                                    </tr>
                                </tbody>



                            </table>
                        </div>
                    </div>

                    {/* 4. Final Discard Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-5">
                             <div className="flex items-center gap-2">
                                <Scale className="w-6 h-6 text-red-600/40" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Transaction Inputs</h3>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-black uppercase text-slate-500 tracking-widest ml-1">Reason for Discard *</Label>
                                <Select value={data.discardReason} onValueChange={(v) => onChange({ ...data, discardReason: v })}>
                                    <SelectTrigger className="h-14 rounded-3xl border-slate-200 focus:border-red-500 focus:ring-red-500/20 bg-white shadow-sm font-bold text-slate-800">
                                        <SelectValue placeholder="Select a reason..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                                        <SelectItem value="End of cycle">End of cycle</SelectItem>
                                        <SelectItem value="Lifecycle Complete">Production Lifecycle Complete</SelectItem>
                                        <SelectItem value="Low Nauplii Yield">Low Nauplii Yield</SelectItem>
                                        <SelectItem value="Disease/Health Issues">Disease / Health Issues</SelectItem>
                                        <SelectItem value="Poor Mating Response">Poor Mating Response</SelectItem>
                                        <SelectItem value="Space Optimization">Space Optimization</SelectItem>
                                        <SelectItem value="Other">Other Reasons</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-black uppercase text-slate-500 tracking-widest ml-1">Avg Body Weight (gms) *</Label>
                                <Input 
                                    type="number"
                                    step="0.1"
                                    value={data.avgBodyWeight}
                                    onChange={(e) => onChange({ ...data, avgBodyWeight: e.target.value })}
                                    placeholder="0"
                                    className="h-14 rounded-3xl border-slate-200 focus:border-red-500 focus:ring-red-500/20 font-black text-lg bg-white shadow-sm placeholder:font-medium placeholder:opacity-30"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-end">
                            <div className="bg-red-600 rounded-[2.5rem] p-8 flex flex-col justify-center gap-4 h-full relative overflow-hidden shadow-2xl shadow-red-200 group transition-all hover:scale-[1.01]">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 transition-transform group-hover:scale-125 duration-1000" />
                                
                                <div className="text-center space-y-1 relative z-10">
                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Total Discard Weight</p>
                                    <p className="text-5xl font-black text-white tabular-nums tracking-tighter">{metrics.estBiomass.toFixed(2)} <span className="text-base font-bold text-white/40 ml-1">KG</span></p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md mt-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Live Biomass Estimate</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-8 border-t border-white/10 relative z-10">
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-2">Total Animals</p>
                                        <p className="text-2xl font-black text-white">{metrics.totalToDiscard}</p>
                                    </div>
                                    <div className="h-10 w-px bg-white/10" />
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-2">Unit Weight</p>
                                        <p className="text-2xl font-black text-white">{data.avgBodyWeight || 0}<span className="text-sm ml-0.5 opacity-50">g</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {data.discardType === 'complete' && (
                        <div className="bg-red-50 border-2 border-red-200 border-dashed rounded-[2rem] p-8 flex items-start gap-5 animate-pulse-slow shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 shadow-inner">
                                <AlertTriangle className="w-6 h-6 font-black" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-base font-black text-red-900 uppercase tracking-tight">System-Wide Batch Closure Warning</h4>
                                <p className="text-xs text-red-700/80 font-medium leading-relaxed max-w-2xl">
                                    Proceeding with a "Complete Batch Discard" will permanently archive this batch (ID: {activeBroodstockBatchId}). All related activities across Observation, Spawning, and Sales will be locked. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BroodstockDiscardForm;
