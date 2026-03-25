import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Calendar, FileText, Download, Camera, Eye, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, getTodayStr, getDateRangeUTC } from '@/lib/date-utils';
import { format } from 'date-fns';

interface ActivityLog {
    id: string;
    activity_type: string;
    created_at: string;
    data: any;
    farm_id: string;
    section_id: string | null;
    tank_id: string | null;
    farms: { name: string; hatchery_id: string } | null;
    sections: { name: string } | null;
    tanks: { name: string } | null;
    profiles: { full_name: string; username: string } | null;
}

const OwnerConsolidatedReports = () => {
    const navigate = useNavigate();
    const { user, activeFarmId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Default to Today
    const [fromDate, setFromDate] = useState(getTodayStr());
    const [toDate, setToDate] = useState(getTodayStr());

    useEffect(() => {
        if (user?.hatchery_id) {
            fetchLogs();
        }
    }, [user, fromDate, toDate, activeFarmId]);

    const fetchLogs = async () => {
        if (!user?.hatchery_id) return;

        try {
            setLoading(true);

            // Create local-safe date range for filtering
            const { startDate, endDate } = getDateRangeUTC(fromDate, toDate);

            const { data, error } = await supabase
                .from('activity_logs')
                .select(`
                    *,
                    profiles (
                        username,
                        full_name
                    ),
                    tanks (
                        name
                    ),
                    sections (
                        name
                    ),
                    farms (
                        name,
                        hatchery_id
                    )
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data) return;

            // 2. Get permissions if Supervisor
            let allowedFarmIds: string[] = [];
            let allowedSectionIds: string[] = [];
            let allowedTankIds: string[] = [];

            if (user.role === 'supervisor') {
                const { data: accessData } = await supabase
                    .from('farm_access')
                    .select('farm_id, section_id, tank_id')
                    .eq('user_id', user.id);
                
                if (accessData) {
                    allowedFarmIds = accessData.filter(a => !a.section_id && !a.tank_id).map(a => a.farm_id);
                    allowedSectionIds = accessData.filter(a => a.section_id && !a.tank_id).map(a => a.section_id!);
                    allowedTankIds = accessData.filter(a => a.tank_id).map(a => a.tank_id!);
                }
            }

            // Filter by hatchery_id and activeFarmId
            let filteredData = data.filter(log => log.farms?.hatchery_id === user.hatchery_id);
            
            if (activeFarmId) {
                filteredData = filteredData.filter(log => log.farm_id === activeFarmId);
            }

            // 3. Supervisor specific sub-filtering (if no activeFarmId or to ensure they have access to it)
            if (user.role === 'supervisor') {
                filteredData = filteredData.filter(log => 
                    allowedFarmIds.includes(log.farm_id) || 
                    (log.section_id && allowedSectionIds.includes(log.section_id)) ||
                    (log.tank_id && allowedTankIds.includes(log.tank_id))
                );
            }

            setLogs(filteredData);
        } catch (err: any) {
            console.error('Error fetching logs:', err);
            toast.error('Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    };

    const formatActivityData = (activityType: string, data: any) => {
        if (!data) return '-';

        const typeLower = activityType.toLowerCase();

        if (typeLower === 'feed') {
            return `${data.feedType || 'N/A'} - ${data.feedQty || '0'} ${data.feedUnit || 'kg'}`;
        } else if (typeLower === 'treatment') {
            return `${data.treatmentType || 'N/A'} - ${data.treatmentDosage || '0'} ${data.treatmentUnit || 'ml'}`;
        } else if (typeLower === 'stocking') {
            return (
                <div className="space-y-0.5">
                    <div>Nauplii: {data.naupliiStocked || '0'}M, Source: {data.broodstockSource || 'N/A'}</div>
                    <div className="text-[9px] text-muted-foreground">
                        Pop: {data.tankStockingNumber || '0'}, Hatchery: {data.hatcheryName || 'N/A'}
                    </div>
                    <div className="text-[9px] text-primary/70 font-semibold">
                        Animal Score: {data.animalConditionScore}/5, Water Score: {data.waterQualityScore}/5
                    </div>
                </div>
            );
        } else if (typeLower === 'observation') {
            return (
                <div className="space-y-0.5">
                    <div>Dead: {data.deadAnimals || '0'}, Pop: {data.presentPopulation || '0'}</div>
                    {data.sample1AvgWt && <div className="text-[9px] text-muted-foreground">Avg Wt: S1:{data.sample1AvgWt}g, S2:{data.sample2AvgWt || '-'}g</div>}
                    <div className="text-[9px] text-primary/70 font-semibold">
                        Animal Score: {data.animalQualityScore}/5, Water Score: {data.waterQualityScore}/5
                    </div>
                </div>
            );
        } else if (typeLower === 'water quality') {
            const waterData = data.waterData || {};
            const params = Object.entries(waterData)
                .filter(([_, value]) => value && value !== '')
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            return <div className="text-[10px] leading-tight">{params || 'No parameters recorded'}</div>;
        } else if (typeLower === 'animal quality') {
            const ratings = data.animalRatings || {};
            const ratingStr = Object.entries(ratings)
                .filter(([_, val]) => val)
                .map(([key, val]) => `${key.replace(/([A-Z])/g, ' $1').trim()}: ${val}`)
                .join(', ');

            return (
                <div className="space-y-0.5">
                    <div>Size/Wt: {data.animalSize || 'N/A'}</div>
                    {ratingStr && <div className="text-[9px] text-muted-foreground line-clamp-1">{ratingStr}</div>}
                    {data.hasDiseaseIdentified === 'Yes' && (
                        <div className="text-[9px] text-red-500 font-bold">Symptoms: {data.diseaseSymptoms}</div>
                    )}
                </div>
            );
        }

        return '-';
    };

    const getVarianceDetails = (log: ActivityLog) => {
        const { data } = log;
        if (!data.planned_data || !data.applied_instruction_id) return null;

        const planned = data.planned_data;
        const actual = {
            item: data.feedType || data.treatmentType || '',
            amount: data.feedQty || data.treatmentDosage || '',
            unit: data.feedUnit || data.treatmentUnit || ''
        };

        const hasDifference = planned.item !== actual.item || 
                            parseFloat(planned.amount) !== parseFloat(actual.amount) || 
                            planned.unit !== actual.unit;

        return { planned, actual, hasDifference };
    };

    const getActivityTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Feed': 'bg-orange-100 text-orange-700',
            'Treatment': 'bg-blue-100 text-blue-700',
            'Water Quality': 'bg-cyan-100 text-cyan-700',
            'Animal Quality': 'bg-rose-100 text-rose-700',
            'Stocking': 'bg-emerald-100 text-emerald-700',
            'Observation': 'bg-purple-100 text-purple-700',
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="ocean-gradient p-4 pb-6 rounded-b-2xl shadow-lg">
                <Breadcrumbs lightTheme className="mb-2" />
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard')}
                        className="text-primary-foreground hover:bg-primary-foreground/10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-foreground" />
                            <h1 className="text-lg font-bold text-primary-foreground leading-none">
                                Consolidated Reports
                            </h1>
                        </div>
                        <p className="text-[10px] text-primary-foreground/70 font-medium mt-1">
                            {fromDate === toDate ? `Today, ${formatDate(new Date(), 'dd MMM')}` : `${formatDate(fromDate, 'dd MMM')} - ${formatDate(toDate, 'dd MMM')}`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-7xl mx-auto">
                {/* Date Range Filter */}
                <div className="glass-card p-4 rounded-2xl border shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex-1 space-y-1.5 w-full sm:w-auto">
                            <Label className="text-xs font-semibold">From Date</Label>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="h-10"
                            />
                        </div>
                        <div className="flex-1 space-y-1.5 w-full sm:w-auto">
                            <Label className="text-xs font-semibold">To Date</Label>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="h-10"
                            />
                        </div>
                        <Button
                            onClick={fetchLogs}
                            className="h-10 gap-2"
                            disabled={loading}
                        >
                            <Calendar className="w-4 h-4" />
                            Apply Filter
                        </Button>

                        {(fromDate !== getTodayStr() || toDate !== getTodayStr()) && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFromDate(getTodayStr());
                                    setToDate(getTodayStr());
                                    // fetchLogs will be triggered by useEffect
                                }}
                                className="h-10 border-dashed hover:bg-muted"
                            >
                                Reset to Today
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                            Showing {logs.length} activities
                        </p>
                        {fromDate === toDate && fromDate === getTodayStr() && (
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                TODAY'S REPORT
                            </span>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Loading reports...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-semibold">No Activities Found</h3>
                        <p className="text-muted-foreground">
                            {fromDate === toDate ? "Nothing recorded yet today." : "No activities recorded in the selected range."}
                        </p>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-bold">Date & Time</TableHead>
                                        <TableHead className="font-bold">Activity Type</TableHead>
                                        <TableHead className="font-bold">Worker</TableHead>
                                        <TableHead className="font-bold">Section</TableHead>
                                        <TableHead className="font-bold">Tank</TableHead>
                                        <TableHead className="font-bold text-center">Variance</TableHead>
                                        <TableHead className="font-bold text-center w-16">Details</TableHead>
                                        <TableHead className="font-bold">Comments</TableHead>
                                        <TableHead className="font-bold">Photo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30">
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold">
                                                        {formatDate(log.created_at, 'dd-MM-yyyy')}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {formatDate(log.created_at, 'hh:mm a')}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getActivityTypeColor(log.activity_type)}`}>
                                                    {log.activity_type === 'Artemia' 
                                                        ? `Artemia (${log.data?.phase === 'post' ? 'After Harvest' : 'Before Harvest'})` 
                                                        : log.activity_type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <span className="text-xs font-semibold text-foreground">
                                                    {log.profiles?.full_name || log.profiles?.username || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {log.sections?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {log.tanks?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(() => {
                                                    const variance = getVarianceDetails(log);
                                                    if (!variance) return <span className="text-[10px] text-muted-foreground italic">Self-initiated</span>;
                                                    return variance.hasDifference ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                            <span className="text-[8px] font-bold text-orange-600 uppercase">Difference</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-[8px] font-bold text-emerald-600 uppercase">Correct</span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center w-16">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                                                    onClick={() => {
                                                        setSelectedLog(log);
                                                        setIsDetailOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                <span className="text-xs text-muted-foreground italic truncate block">
                                                    {log.data?.comments || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {log.data?.photo_url ? (
                                                    <a
                                                        href={log.data.photo_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-8 h-8 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                                                    >
                                                        <img
                                                            src={log.data.photo_url}
                                                            alt="Activity"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground/30"><Camera className="w-3 h-3" /></span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" />
                            Activity Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-6 pt-2">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Recorded Parameters</h3>
                                <div className="grid gap-3">
                                    {Object.entries(selectedLog.data || {}).map(([key, value]: [string, any]) => {
                                        if (['date', 'time', 'ampm', 'comments', 'photo_url'].includes(key)) return null;

                                        // Handle nested objects (like waterData)
                                        if (typeof value === 'object' && value !== null) {
                                            return Object.entries(value).map(([subKey, subValue]: [string, any]) => (
                                                <div key={`${key}-${subKey}`} className="flex justify-between items-center py-2 border-b border-dashed border-muted last:border-0">
                                                    <span className="text-sm text-muted-foreground capitalize">{subKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    <span className="text-sm font-bold text-foreground">{subValue || '—'}</span>
                                                </div>
                                            ));
                                        }

                                        return (
                                            <div key={key} className="flex justify-between items-center py-2 border-b border-dashed border-muted last:border-0">
                                                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                <span className="text-sm font-bold text-foreground">{value || '—'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Variance Comparison Section */}
                            {(() => {
                                const variance = getVarianceDetails(selectedLog);
                                if (!variance) return null;
                                return (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 flex items-center gap-2">
                                            Instruction vs Actual
                                            {variance.hasDifference ? <AlertTriangle className="w-3 h-3 text-orange-500" /> : <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                        </h3>
                                        <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Planned (Supervisor)</p>
                                                <p className="text-sm font-semibold">{variance.planned.item}</p>
                                                <p className="text-lg font-black text-primary">{variance.planned.amount} {variance.planned.unit}</p>
                                            </div>
                                            <div className="border-l border-dashed pl-4">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Recorded (Worker)</p>
                                                <p className="text-sm font-semibold">{variance.actual.item}</p>
                                                <p className={`text-lg font-black ${variance.hasDifference ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                    {variance.actual.amount} {variance.actual.unit}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {selectedLog.data?.comments && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comments</h3>
                                    <div className="bg-muted/30 p-3 rounded-xl text-sm italic text-muted-foreground">
                                        "{selectedLog.data.comments}"
                                    </div>
                                </div>
                            )}

                            {selectedLog.data?.photo_url && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attached Photo</h3>
                                    <div className="rounded-xl overflow-hidden border">
                                        <img src={selectedLog.data.photo_url} alt="Activity" className="w-full h-auto" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OwnerConsolidatedReports;
