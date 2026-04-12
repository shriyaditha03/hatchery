import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Database, Users, Heart, Sparkles, 
    ArrowBigDown, ShoppingCart, Loader2,
    Trash2, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BroodstockDiscardFormProps {
    data: any;
    onChange: (data: any) => void;
}

const BroodstockDiscardForm: React.FC<BroodstockDiscardFormProps> = ({ data, onChange }) => {
    const { activeBroodstockBatchId, activeFarmId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({
        initialCount: 0,
        totalMated: 0,
        totalSpawned: 0,
        totalEggs: 0,
        totalFertilized: 0,
        totalNauplii: 0,
        totalSold: 0,
        totalDiscarded: 0
    });

    useEffect(() => {
        if (activeBroodstockBatchId && activeFarmId) {
            fetchBatchSummary();
        }
    }, [activeBroodstockBatchId, activeFarmId]);

    const fetchBatchSummary = async () => {
        setLoading(true);
        try {
            const { data: logs, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('farm_id', activeFarmId)
                .or(`stockingId.eq.${activeBroodstockBatchId},data->>stockingId.eq.${activeBroodstockBatchId}`);

            if (error) throw error;

            const newSummary = {
                initialCount: 0,
                totalMated: 0,
                totalSpawned: 0,
                totalEggs: 0,
                totalFertilized: 0,
                totalNauplii: 0,
                totalSold: 0,
                totalDiscarded: 0
            };

            logs?.forEach(log => {
                const type = log.activity_type;
                const logData = log.data || {};

                if (type === 'Stocking') {
                    newSummary.initialCount = parseInt(logData.totalFemale) || 0;
                } else if (type === 'Sourcing & Mating') {
                    newSummary.totalMated += parseInt(logData.matedCount) || 0;
                } else if (type === 'Spawning') {
                    newSummary.totalSpawned += parseInt(logData.spawnedCount) || 0;
                } else if (type === 'Egg Count') {
                    newSummary.totalEggs += parseFloat(logData.summary?.totalEggs) || 0;
                    newSummary.totalFertilized += parseFloat(logData.summary?.totalFertilized) || 0;
                } else if (type === 'Nauplii Harvest') {
                    newSummary.totalNauplii += parseFloat(logData.summary?.totalNaupliiMil) || 0;
                } else if (type === 'Nauplii Sale') {
                    newSummary.totalSold += parseFloat(logData.summary?.netNaupliiSaleMil) || 0;
                    newSummary.totalDiscarded += parseFloat(logData.summary?.totalDiscardMil) || 0;
                }
            });

            setSummary(newSummary);
            onChange({
                ...data,
                stockingId: activeBroodstockBatchId,
                summary: newSummary
            });
        } catch (err) {
            console.error('Error fetching batch summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReasonChange = (reason: string) => {
        onChange({ ...data, discardReason: reason });
    };

    if (!activeBroodstockBatchId) {
        return (
            <div className="p-8 text-center bg-muted/30 border border-dashed rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Please select a Broodstock Batch from the dashboard first.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-2 border-red-100 shadow-md overflow-hidden">
                <CardHeader className="bg-red-50/50 pb-4 border-b border-red-100">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                        <Trash2 className="w-5 h-5" />
                        Broodstock Batch Discharge
                    </CardTitle>
                    <p className="text-xs text-red-600/70 font-medium">Batch ID: <span className="font-bold underline">{activeBroodstockBatchId}</span></p>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <Skeleton className="h-16 w-full rounded-xl" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-muted/30 p-4 rounded-2xl border flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Initial Broodstock</p>
                                        <p className="text-xl font-black">{summary.initialCount} <span className="text-[10px] font-medium opacity-50">Females</span></p>
                                    </div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-2xl border flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                                        <Heart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Mated</p>
                                        <p className="text-xl font-black">{summary.totalMated} <span className="text-[10px] font-medium opacity-50">Females</span></p>
                                    </div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-2xl border flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Spawns</p>
                                        <p className="text-xl font-black">{summary.totalSpawned} <span className="text-[10px] font-medium opacity-50">Records</span></p>
                                    </div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-2xl border flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Eggs</p>
                                        <p className="text-xl font-black">{summary.totalEggs.toFixed(2)} <span className="text-[10px] font-medium opacity-50">Mil</span></p>
                                        <p className="text-[9px] text-green-600 font-bold italic">{(summary.totalFertilized).toFixed(2)} Mil Fertilized</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <ShoppingCart className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-emerald-800 uppercase">Net Nauplii Sold</p>
                                        <p className="text-2xl font-black text-emerald-900">{summary.totalSold.toFixed(2)} <span className="text-xs opacity-60">Mil</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Discarded</p>
                                    <p className="text-lg font-bold text-red-600">{summary.totalDiscarded.toFixed(2)} Mil</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason for Discharge / Final Observations</Label>
                                <Textarea 
                                    value={data.discardReason}
                                    onChange={(e) => handleReasonChange(e.target.value)}
                                    placeholder="Enter reason for closing this batch (e.g., end of lifecycle, low production, disease clearance)..."
                                    rows={4}
                                    className="resize-none border-red-100 focus:border-red-500 focus:ring-red-500 rounded-xl"
                                />
                            </div>

                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-800 uppercase">Critical Action</p>
                                    <p className="text-[10px] text-red-700/70 font-medium">
                                        Recording this activity will finalize the Broodstock Batch logs. All tanks associated with this batch should be cleared before proceeding. 
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BroodstockDiscardForm;
