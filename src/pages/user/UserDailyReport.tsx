import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, FileText, Loader2, Utensils, Beaker, Waves, Search, Layers, Eye, Calendar, Pencil, Camera, Info } from 'lucide-react';
import { useActivities, ActivityRecord } from '@/hooks/useActivities';
import { formatDate, isTodayLocal, getNowLocal } from '@/lib/date-utils';

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

const UserDailyReport = () => {
    const navigate = useNavigate();
    const { activities, loading, fetchActivities } = useActivities();

    const [now, setNow] = useState(getNowLocal());
    const [selectedLog, setSelectedLog] = useState<ActivityRecord | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        fetchActivities();
        // Live clock update
        const timer = setInterval(() => setNow(getNowLocal()), 10000);
        return () => clearInterval(timer);
    }, [fetchActivities]);

    const todayActivities = activities.filter(a => isTodayLocal(a.created_at));

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="ocean-gradient p-4 sm:p-6 pb-12 rounded-b-3xl shadow-lg mb-6">
                <div className="max-w-md mx-auto">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard')}
                        className="text-white hover:bg-white/20 mb-4 -ml-2"
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" /> Dashboard
                    </Button>
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FileText className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Daily Report</h1>
                            <p className="opacity-80 flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" /> {formatDate(now, 'eeee, dd-MM-yyyy')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Loading activities...</p>
                    </div>
                ) : todayActivities.length === 0 ? (
                    <div className="bg-card rounded-2xl p-8 text-center border shadow-sm">
                        <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
                        </div>
                        <h2 className="text-lg font-semibold">No records found</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Activities recorded today will appear here for consolidation.
                        </p>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-bold whitespace-nowrap">Time</TableHead>
                                        <TableHead className="font-bold whitespace-nowrap">Activity</TableHead>
                                        <TableHead className="font-bold whitespace-nowrap">Location</TableHead>
                                        <TableHead className="font-bold text-center">Details</TableHead>
                                        <TableHead className="font-bold text-center">Edit</TableHead>
                                        <TableHead className="font-bold">Comments</TableHead>
                                        <TableHead className="font-bold">Photo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {todayActivities.map((act) => (
                                        <TableRow key={act.id} className="hover:bg-muted/30">
                                            <TableCell className="whitespace-nowrap font-medium text-xs">
                                                {formatDate(new Date(act.created_at), 'hh:mm a')}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActivityTypeColor(act.activity_type)}`}>
                                                    {act.activity_type === 'Artemia' 
                                                        ? `Artemia (${act.data?.phase === 'post' ? 'After Harvest' : 'Before Harvest'})` 
                                                        : act.activity_type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[150px]">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold truncate capitalize">
                                                        {act.farms?.name || 'N/A'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground truncate uppercase">
                                                        {act.sections?.name || act.tanks?.sections?.name || 'N/A'} - {act.tanks?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                                                    onClick={() => {
                                                        setSelectedLog(act);
                                                        setIsDetailOpen(true);
                                                    }}
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                                    onClick={() => navigate(`/user/activity/${(act.activity_type || '').toLowerCase()}?edit=${act.id}`)}
                                                    title="Edit Activity"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="max-w-[150px]">
                                                <span className="text-xs text-muted-foreground italic truncate block">
                                                    {act.data?.comments || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {act.data?.photo_url ? (
                                                    <a
                                                        href={act.data.photo_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-8 h-8 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                                                    >
                                                        <img
                                                            src={act.data.photo_url}
                                                            alt="Activity"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground/30"><Camera className="w-3.5 h-3.5" /></span>
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
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl glass-card">
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
                                                <div key={`${key}-${subKey}`} className="flex justify-between items-center py-2 border-b border-dashed border-muted last:border-0 hover:bg-muted/5 transition-colors px-1 rounded-md">
                                                    <span className="text-sm text-muted-foreground capitalize">{subKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    <span className="text-sm font-bold text-foreground">{subValue || '—'}</span>
                                                </div>
                                            ));
                                        }

                                        return (
                                            <div key={key} className="flex justify-between items-center py-2 border-b border-dashed border-muted last:border-0 hover:bg-muted/5 transition-colors px-1 rounded-md">
                                                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                <span className="text-sm font-bold text-foreground">{value || '—'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedLog.data?.comments && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comments</h3>
                                    <div className="bg-muted/50 p-4 rounded-2xl text-sm italic text-muted-foreground">
                                        "{selectedLog.data.comments}"
                                    </div>
                                </div>
                            )}

                            {selectedLog.data?.photo_url && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attached Photo</h3>
                                    <div className="rounded-2xl overflow-hidden border shadow-sm">
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

export default UserDailyReport;
