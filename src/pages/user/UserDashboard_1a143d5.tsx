import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, FileText, ClipboardList, Utensils, Beaker, Eye, Search, Layers, Waves, MapPin, ChevronDown, Clock, CheckCircle2, Pencil, Trash2, Plus, Scissors, MoveRight } from 'lucide-react';
import logo from '@/assets/aqua-nexus-logo.png';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getTodayStr } from '@/lib/date-utils';

const UserDashboard = () => {
    const { user, logout, activeFarmId, setActiveFarmId, activeSectionId, setActiveSectionId } = useAuth();
    const navigate = useNavigate();
    const [instructions, setInstructions] = useState<any[]>([]);
    const [supervisorInstructions, setSupervisorInstructions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [supervisorMode, setSupervisorMode] = useState<'instruction' | 'activity'>(
        user?.role === 'supervisor' ? 'instruction' : 'activity'
    );

    if (!user) return null;

    // Filter access records to find unique sections across all farms
    const sections = useMemo(() => {
        const allSections = (user.access || [])
            .filter(a => a.section_id)
            .map(a => ({ 
                id: a.section_id as string, 
                name: a.section_name as string,
                farm_id: a.farm_id,
                farm_name: a.farm_name
            }));
        
        // Remove duplicates (in case user has multiple tank-level records for same section)
        return Array.from(new Set(allSections.map(s => s.id)))
            .map(id => allSections.find(s => s.id === id)!);
    }, [user.access]);

    const groupedInstructions = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        instructions.forEach(instr => {
            const sectionName = instr.sections?.name || (instr.farms?.name ? `${instr.farms.name} (Farm Wide)` : 'Other');
            const activityName = instr.activity_type;
            if (!groups[sectionName]) groups[sectionName] = {};
            if (!groups[sectionName][activityName]) groups[sectionName][activityName] = [];
            groups[sectionName][activityName].push(instr);
        });
        return groups;
    }, [instructions]);

    const groupedSupervisorInstructions = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        supervisorInstructions.forEach(instr => {
            const sectionName = instr.sections?.name || (instr.farms?.name ? `${instr.farms.name} (Farm Wide)` : 'Other');
            const activityName = instr.activity_type;
            if (!groups[sectionName]) groups[sectionName] = {};
            if (!groups[sectionName][activityName]) groups[sectionName][activityName] = [];
            groups[sectionName][activityName].push(instr);
        });
        return groups;
    }, [supervisorInstructions]);

    useEffect(() => {
        if (!activeSectionId && sections.length > 0) {
            const first = sections[0];
            setActiveFarmId(first.farm_id);
            setActiveSectionId(first.id);
        }
    }, [activeSectionId, sections]);

    useEffect(() => {
        fetchInstructions();
        if (user?.role === 'supervisor') {
            fetchSupervisorInstructions();
        }

        // Refetch when window gains focus (e.g. after returning from recording an activity)
        const handleFocus = () => {
            fetchInstructions();
            if (user?.role === 'supervisor') fetchSupervisorInstructions();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user?.id, sections.length]);

    const fetchInstructions = async () => {
        try {
            setLoading(true);
            const today = getTodayStr();
            // Removed 3-day limit to ensure incomplete tasks persist until handled
            
            // Get all section IDs the user has access to
            const sectionIds = sections.map(s => s.id);
            const farmIds = Array.from(new Set(sections.map(s => s.farm_id)));

            if (sectionIds.length === 0 && farmIds.length === 0) {
                setInstructions([]);
                return;
            }

            // Fetch all instructions for all assigned sections + farm level instructions
            let query = supabase
                .from('activity_charts')
                .select(`
                    *,
                    farms (name),
                    sections (name),
                    tanks (name)
                `)
                .eq('is_completed', false)
                .lte('scheduled_date', today);

            // Construct the access filter
            const sectionFilter = sectionIds.length > 0 ? `section_id.in.(${sectionIds.join(',')})` : '';
            const farmFilter = farmIds.length > 0 ? `and(farm_id.in.(${farmIds.join(',')}),section_id.is.null,tank_id.is.null)` : '';
            
            let orFilter = '';
            if (sectionFilter && farmFilter) orFilter = `${sectionFilter},${farmFilter}`;
            else orFilter = sectionFilter || farmFilter;

            if (orFilter) {
                query = query.or(orFilter);
            }

            // Also check if assigned specifically to this user or unassigned
            if (user.role === 'worker') {
                query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
            }

            const { data, error } = await query.order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true });

            if (error) throw error;
            setInstructions(data || []);
        } catch (error) {
            console.error('Error fetching instructions:', error);
            toast.error('Failed to load pending tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchSupervisorInstructions = async () => {
        try {
            const today = getTodayStr();
            const { data, error } = await supabase
                .from('activity_charts')
                .select(`*, tanks(name), sections(name), worker:profiles!completed_by(full_name)`)
                .eq('created_by', user?.id)
                .or(`is_completed.eq.false,scheduled_date.eq.${today}`)
                .order('is_completed', { ascending: true })
                .order('scheduled_date', { ascending: true })
                .order('scheduled_time', { ascending: true });
            if (!error) setSupervisorInstructions(data || []);
        } catch (err) {
            console.error('Failed to load supervisor instructions:', err);
        }
    };

    const handleDeleteInstruction = async (id: string) => {
        try {
            const { error } = await supabase.from('activity_charts').delete().eq('id', id);
            if (error) throw error;
            setSupervisorInstructions(prev => prev.filter(i => i.id !== id));
            toast.success('Instruction deleted');
        } catch (err: any) {
            toast.error('Failed to delete: ' + err.message);
        }
    };

    const activeSection = sections.find(s => s.id === activeSectionId);
    const displayLabel = activeSection?.name || 'Select Section';

    const activities = [
        { name: 'Feed', icon: Utensils, route: '/user/activity/feed', color: 'bg-orange-100 text-orange-600' },
        { name: 'Treatment', icon: Beaker, route: '/user/activity/treatment', color: 'bg-blue-100 text-blue-600' },
        { name: 'Water Quality', icon: Waves, route: '/user/activity/water', color: 'bg-cyan-100 text-cyan-600' },
        { name: 'Animal Quality', icon: Search, route: '/user/activity/animal', color: 'bg-rose-100 text-rose-600' },
        { name: 'Stocking', icon: Layers, route: '/user/activity/stocking', color: 'bg-emerald-100 text-emerald-600' },
        { name: 'Observation', icon: Eye, route: '/user/activity/observation', color: 'bg-purple-100 text-purple-600' },
        { name: 'Harvest', icon: Scissors, route: '/user/activity/harvest', color: 'bg-amber-100 text-amber-600' },
        { name: 'Tank Shifting', icon: MoveRight, route: '/user/activity/shifting', color: 'bg-indigo-100 text-indigo-600' },
        { name: 'Artemia', icon: Beaker, route: '/user/activity/artemia', color: 'bg-teal-100 text-teal-600' },
        { name: 'Algae', icon: Waves, route: '/user/activity/algae', color: 'bg-green-100 text-green-700' },
    ];

    const ACTIVITY_ICONS: Record<string, any> = {
        'Feed': Utensils,
        'Treatment': Beaker,
        'Water Quality': Waves,
        'Animal Quality': Search,
        'Stocking': Layers,
        'Observation': Eye,
        'Artemia': Beaker,
        'Algae': Waves,
        'Harvest': Scissors,
        'Tank Shifting': MoveRight
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleSectionSelect = (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        if (section) {
            // We set both so the rest of the app knows the context
            setActiveFarmId(section.farm_id);
            setActiveSectionId(section.id);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header */}
            <div className="ocean-gradient p-4 sm:p-6 pb-12 rounded-b-3xl shadow-lg">
                <Breadcrumbs lightTheme className="mb-4" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg brightness-200 grayscale-0 inverted" />
                        <span className="text-white font-bold text-xl truncate max-w-[220px]">
                            {user.hatchery_name || 'My Hatchery'}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-12 h-12 rounded-full p-0 bg-white/20 hover:bg-white/30 text-white">
                                <User className="w-6 h-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/user/profile')}>
                                <User className="mr-2 h-4 w-4" /> Personal Info
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-6 text-white/90">
                    <p className="text-sm uppercase tracking-wider opacity-80">{user.role}</p>
                    <h2 className="text-2xl font-bold">Hello, {user.name}</h2>
                </div>

                {/* Location Picker for Workers/Supervisors */}
                {(user.role === 'worker' || user.role === 'supervisor') && sections.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2 animate-fade-in">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 h-10 px-4 rounded-xl gap-2 backdrop-blur-sm shadow-inner transition-all hover:scale-[1.02] active:scale-95">
                                    <div className="p-1 px-2 rounded-lg bg-white/20 text-white flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5" />
                                        <span className="text-[10px] uppercase font-black tracking-tighter">Current Section</span>
                                    </div>
                                    <span className="text-xs font-bold">{displayLabel}</span>
                                    <ChevronDown className="w-3 h-3 opacity-60 ml-auto" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 rounded-xl border-white/10 shadow-2xl p-1">
                                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-2">Assigned Sections</DropdownMenuLabel>
                                {sections.map(s => (
                                    <DropdownMenuItem 
                                        key={s.id} 
                                        onClick={() => handleSectionSelect(s.id)}
                                        className={`rounded-lg cursor-pointer py-2 px-3 mb-1 transition-colors ${activeSectionId === s.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-accent'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span>{s.name}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* Mode Toggle for Supervisors */}
            {user.role === 'supervisor' && (
                <div className="px-4 -mt-2 mb-4 animate-fade-in relative z-10">
                    <div className="max-w-[340px] mx-auto flex bg-white/20 p-1 rounded-2xl gap-1 shadow-inner border border-white/20 backdrop-blur-md shadow-lg">
                        <button
                            onClick={() => setSupervisorMode('instruction')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${supervisorMode === 'instruction' ? 'bg-white dark:bg-background shadow-md text-primary scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
                        >
                            <ClipboardList className={`w-3.5 h-3.5 ${supervisorMode === 'instruction' ? 'animate-bounce-subtle' : ''}`} />
                            Instruction Mode
                        </button>
                        <button
                            onClick={() => setSupervisorMode('activity')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${supervisorMode === 'activity' ? 'bg-white dark:bg-background shadow-md text-primary scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
                        >
                            <Pencil className={`w-3.5 h-3.5 ${supervisorMode === 'activity' ? 'animate-pulse' : ''}`} />
                            Activity Mode
                        </button>
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div className={`px-4 ${user.role === 'supervisor' ? '-mt-2' : '-mt-6'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                    {/* 6 Activity Icons */}
                    {activities.map((act) => (
                        <Button
                            key={act.name}
                            variant="outline"
                            className="h-14 flex items-center justify-start gap-3 px-4 bg-card border shadow-sm hover:shadow-md hover:bg-card/90 transition-all rounded-xl"
                            onClick={() => navigate(`${act.route}?mode=${supervisorMode}`)}
                        >
                            <div className={`p-1.5 rounded-lg ${act.color}`}>
                                <act.icon className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-foreground text-xs text-left">
                                {act.name}
                            </span>
                        </Button>
                    ))}

                    {/* 7th Icon: Daily Report (Worker) OR Consolidated Reports (Supervisor) */}
                    <Button
                        variant="outline"
                        className="h-14 flex items-center justify-start gap-3 px-4 bg-card border shadow-sm hover:shadow-md hover:bg-card/90 transition-all rounded-xl"
                        onClick={() => navigate(user.role === 'supervisor' ? '/owner/consolidated-reports' : '/user/daily-report')}
                    >
                        <div className={`p-1.5 rounded-lg ${user.role === 'supervisor' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                            <FileText className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-foreground text-xs text-left">
                            {user.role === 'supervisor' ? 'Reports' : 'Daily Report'}
                        </span>
                    </Button>

                </div>
            </div>

            {/* Today's Tasks/Instructions - For workers OR supervisors in activity mode */}
            {(user.role === 'worker' || (user.role === 'supervisor' && supervisorMode === 'activity')) && (
            <div className="px-4 mt-8 pb-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                        {user.role === 'supervisor' ? 'Record Pending Activities' : 'Pending Instructions'}
                    </h3>
                    {instructions.length > 0 && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {instructions.length} Pending
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : instructions.length === 0 ? (
                    <div className="bg-muted/30 border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-6 h-6 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">No pending tasks</p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">Enjoy your day!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedInstructions).map(([sectionName, activities]) => (
                            <div key={sectionName} className="space-y-4">
                                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b pb-1 border-border/50 flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5" />
                                    {sectionName}
                                </h4>
                                {Object.entries(activities).map(([activityName, instrs]) => {
                                    const Icon = ACTIVITY_ICONS[activityName] || ClipboardList;
                                    return (
                                        <div key={activityName} className="space-y-3 pl-1 sm:pl-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded bg-muted">
                                                    <Icon className="w-3 h-3 text-muted-foreground" />
                                                </div>
                                                <h5 className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider">{activityName}</h5>
                                            </div>
                                            <div className="space-y-3">
                                                {instrs.map((instr) => (
                                                    <div key={instr.id} className="relative group pl-2">
                                                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-primary/40 rounded-full group-hover:bg-primary transition-colors" />
                                                        <div className="bg-card border shadow-sm rounded-2xl p-4 transition-all hover:shadow-md ml-[4px]">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-bold truncate">
                                                                            {instr.tanks?.name ? `Tank ${instr.tanks.name}` : 'Section Wide'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic mb-2">
                                                                        "{instr.planned_data?.instructions || instr.instruction_text || 'No specific notes'}"
                                                                    </p>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${instr.scheduled_date !== getTodayStr() ? 'text-destructive bg-destructive/5 border border-destructive/10' : 'text-primary bg-primary/5'}`}>
                                                                            <Clock className="w-3 h-3" />
                                                                            {instr.scheduled_date !== getTodayStr() ? `${instr.scheduled_date} ${instr.scheduled_time?.slice(0, 5)}` : instr.scheduled_time?.slice(0, 5)}
                                                                        </div>
                                                                        {instr.planned_data?.amount ? (
                                                                            <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 italic">
                                                                                {instr.planned_data.amount} {instr.planned_data.unit} {instr.planned_data.item}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="secondary"
                                                                    className="rounded-xl h-14 w-14 flex-shrink-0 flex flex-col gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                                                    onClick={() => navigate(`/user/activity/${instr.activity_type.toLowerCase().replace(' ','-')}?instruction=${instr.id}&mode=activity`)}
                                                                >
                                                                    <ClipboardList className="w-5 h-5" />
                                                                    <span className="text-[8px] font-black uppercase tracking-tighter">Record</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}

            {/* Supervisor: My Instructions for Today */}
            {user.role === 'supervisor' && supervisorMode === 'instruction' && (
            <div className="px-4 mt-8 pb-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">My Instructions</h3>
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">Completed tasks reset at midnight</p>
                    </div>
                </div>

                {supervisorInstructions.length === 0 ? (
                    <div className="bg-muted/30 border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <ClipboardList className="w-6 h-6 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">No instructions set for today</p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">Tap "New Instruction" to add one</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedSupervisorInstructions).map(([sectionName, activities]) => (
                            <div key={sectionName} className="space-y-4">
                                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b pb-1 border-border/50 flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5" />
                                    {sectionName}
                                </h4>
                                {Object.entries(activities).map(([activityName, instrs]) => {
                                    const Icon = ACTIVITY_ICONS[activityName] || ClipboardList;
                                    return (
                                        <div key={activityName} className="space-y-3 pl-1 sm:pl-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded bg-muted">
                                                    <Icon className="w-3 h-3 text-muted-foreground" />
                                                </div>
                                                <h5 className="text-[10px] font-bold text-foreground/80 uppercase tracking-wider">{activityName}</h5>
                                            </div>
                                            <div className="space-y-3">
                                                {instrs.map((instr) => (
                                                    <div key={instr.id} className={`bg-card border rounded-2xl p-4 shadow-sm transition-all ml-2 ${instr.is_completed ? 'opacity-50 border-green-200 bg-green-50/30' : ''}`}>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {instr.is_completed ? (
                                                                        <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                                                            Γ£ô Done by {instr.worker?.full_name || 'worker'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">ΓÅ│ Pending</span>
                                                                    )}
                                                                    <span className="text-xs font-bold text-foreground truncate">
                                                                        {instr.tanks?.name ? `Tank ${instr.tanks.name}` : 'Section Wide'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                                                        <Clock className="w-3 h-3" />
                                                                        {instr.scheduled_time?.slice(0,5) || 'ΓÇö'}
                                                                    </div>
                                                                    {instr.planned_data?.amount && (
                                                                        <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 font-medium">
                                                                            {instr.planned_data.amount} {instr.planned_data.unit} {instr.planned_data.item}
                                                                        </span>
                                                                    )}
                                                                    {instr.planned_data?.instructions && (
                                                                        <span className="text-[10px] text-muted-foreground italic truncate max-w-[160px]">
                                                                            "{instr.planned_data.instructions}"
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {!instr.is_completed && (
                                                                <div className="flex gap-1.5 flex-shrink-0">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                                                        onClick={() => navigate(`/user/activity/${instr.activity_type.toLowerCase().replace(' ','-')}?editInstruction=${instr.id}`)}
                                                                        title="Edit instruction"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                        onClick={() => handleDeleteInstruction(instr.id)}
                                                                        title="Delete instruction"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default UserDashboard;
