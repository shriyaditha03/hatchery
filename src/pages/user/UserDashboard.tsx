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
import { 
  Plus, Search, ClipboardList, Check, ArrowRightLeft, 
  Droplet, Thermometer, Wind, Activity, Heart, Sparkles,
  RefreshCcw, LogOut, ChevronRight, User, Settings, Info,
  ExternalLink, Menu, X, Filter, BarChart3, TrendingDown,
  Tractor, Scale, Trash2, Calendar, Utensils, Beaker, Eye, Layers, Waves, MapPin, ChevronDown, Clock, CheckCircle2, Pencil, Scissors, MoveRight, FileText, Database, ArrowUpRight, ShoppingCart
} from 'lucide-react';
import logo from '@/assets/aqua-nexus-logo.png';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getTodayStr } from '@/lib/date-utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ACTIVITY_ICONS: Record<string, any> = {
  'Feed': Utensils,
  'Treatment': Beaker,
  'Water Quality': Waves,
  'Animal Quality': Activity,
  'Stocking': Plus,
  'Observation': Eye,
  'Artemia': Droplet,
  'Algae': Wind,
  'Harvest': Scissors,
  'Tank Shifting': ArrowRightLeft,
  'Sourcing & Mating': Heart,
  'Spawning': Sparkles
};

const UserDashboard = () => {
    const { 
        user, 
        logout, 
        activeFarmId, 
        setActiveFarmId, 
        activeSectionId, 
        setActiveSectionId,
        activeModule,
        setActiveModule,
        supervisorMode,
        setSupervisorMode
    } = useAuth();
    const navigate = useNavigate();
    const [instructions, setInstructions] = useState<any[]>([]);
    const [supervisorInstructions, setSupervisorInstructions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    if (!user) return null;

    // Filter access records to find unique sections across all farms
    const sections = useMemo(() => {
        const allSections = (user.access || [])
            .filter(a => a.section_id)
            .map(a => ({ 
                id: a.section_id as string, 
                name: a.section_name as string,
                farm_id: a.farm_id,
                farm_name: a.farm_name,
                farm_category: a.farm_category
            }));
        
        // Remove duplicates (in case user has multiple tank-level records for same section)
        return Array.from(new Set(allSections.map(s => s.id)))
            .map(id => allSections.find(s => s.id === id)!);
    }, [user.access]);

    // Current module's sections
    const filteredSections = useMemo(() => {
        return sections.filter(s => (s.farm_category || 'LRT').toUpperCase() === activeModule.toUpperCase());
    }, [sections, activeModule]);

    const filteredInstructions = useMemo(() => {
        return instructions.filter(instr => (instr.farms?.category || 'LRT').toUpperCase() === activeModule.toUpperCase());
    }, [instructions, activeModule]);

    const filteredSupervisorInstructions = useMemo(() => {
        return supervisorInstructions.filter(instr => (instr.farms?.category || 'LRT').toUpperCase() === activeModule.toUpperCase());
    }, [supervisorInstructions, activeModule]);

    const groupedInstructions = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        filteredInstructions.forEach(instr => {
            const sectionName = instr.sections?.name || (instr.farms?.name ? `${instr.farms.name} (Farm Wide)` : 'Other');
            const activityName = instr.activity_type;
            if (!groups[sectionName]) groups[sectionName] = {};
            if (!groups[sectionName][activityName]) groups[sectionName][activityName] = [];
            groups[sectionName][activityName].push(instr);
        });
        return groups;
    }, [filteredInstructions]);

    const groupedSupervisorInstructions = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        filteredSupervisorInstructions.forEach(instr => {
            const sectionName = instr.sections?.name || (instr.farms?.name ? `${instr.farms.name} (Farm Wide)` : 'Other');
            const activityName = instr.activity_type;
            if (!groups[sectionName]) groups[sectionName] = {};
            if (!groups[sectionName][activityName]) groups[sectionName][activityName] = [];
            groups[sectionName][activityName].push(instr);
        });
        return groups;
    }, [filteredSupervisorInstructions]);

    // EFFECT: When tab is manually changed, if current section doesn't match the new module,
    // auto-select the first section of that new module.
    useEffect(() => {
        if (sections.length > 0) {
            const currentActiveInModule = filteredSections.find(s => s.id === activeSectionId);
            if (!currentActiveInModule) {
                const first = filteredSections[0];
                if (first) {
                    setActiveFarmId(first.farm_id);
                    setActiveSectionId(first.id);
                }
            }
        }
    }, [activeModule, filteredSections, sections, activeSectionId]);

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
                setLoading(false);
                return;
            }

            // Fetch all instructions for all assigned sections + farm level instructions
            let query = supabase
                .from('activity_charts')
                .select(`
                    *,
                    farms (name, category),
                    sections (name),
                    tanks (name)
                `)
                .eq('is_completed', false)
                .lte('scheduled_date', today);

            // Construct the access filter
            const sectionFilter = sectionIds.length > 0 ? `section_id.in.(${sectionIds.join(',')})` : '';
            const farmFilter = farmIds.length > 0 ? `and(farm_id.in.(${farmIds.join(',')}),section_id.is.null,tank_id.is.null)` : '';
            
            let accessOr = '';
            if (sectionFilter && farmFilter) accessOr = `${sectionFilter},${farmFilter}`;
            else accessOr = sectionFilter || farmFilter;

            if (accessOr) {
                // If worker, combine access filter with assignment filter in a single .or()
                // PostgREST doesn't support nested OR/AND cleanly without complex strings,
                // but we can use multiple .or() calls as they are implicitly ANDed.
                query = query.or(accessOr);
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
                .select(`*, farms(name), tanks(name), sections(name), worker:profiles!completed_by(full_name)`)
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

    const activities = useMemo(() => {
        const base = [
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

        if (activeModule.toUpperCase() === 'MATURATION') {
            const maturationBase = base.filter(a => 
                a.name !== 'Artemia' && 
                a.name !== 'Algae' && 
                a.name !== 'Harvest' && 
                a.name !== 'Tank Shifting'
            );
            return [
                ...maturationBase,
                { name: 'Sourcing & Mating', icon: Heart, route: '/user/activity/mating', color: 'bg-pink-100 text-pink-600' },
                { name: 'Spawning', icon: Sparkles, route: '/user/activity/spawning', color: 'bg-amber-100 text-amber-600' },
                { name: 'Egg Count', icon: Database, route: '/user/activity/egg-count', color: 'bg-indigo-100 text-indigo-600' },
                { name: 'Nauplii Harvest', icon: ArrowUpRight, route: '/user/activity/nauplii-harvest', color: 'bg-emerald-100 text-emerald-600' },
                { name: 'Nauplii Sale', icon: ShoppingCart, route: '/user/activity/nauplii-sale', color: 'bg-blue-100 text-blue-600' }
            ];
        }
        return base;
    }, [activeModule]);

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
        'Tank Shifting': MoveRight,
        'Nauplii Sale': ShoppingCart
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
            <div className="ocean-gradient p-3 sm:p-4 pb-6 rounded-b-3xl shadow-lg">
                <Breadcrumbs lightTheme className="mb-2" />
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

                <div className="mt-2 flex items-center justify-between">
                    <div className="text-white/90">
                        <p className="text-xs uppercase tracking-wider opacity-70">{user?.role === 'supervisor' ? 'Supervisor' : 'Worker'} Portal</p>
                        <h2 className="text-lg font-bold">Welcome, {user.name}</h2>
                    </div>
                </div>

                {/* Module Toggle */}
                <div className="mt-3 flex justify-center">
                    <Tabs value={activeModule} onValueChange={(val: any) => setActiveModule(val)} className="w-full max-w-[280px]">
                        <TabsList className="grid w-full grid-cols-2 bg-white/10 text-white rounded-xl h-8 p-0.5">
                            <TabsTrigger 
                                value="LRT" 
                                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary font-bold transition-all text-xs"
                            >
                                LRT
                            </TabsTrigger>
                            <TabsTrigger 
                                value="MATURATION" 
                                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary font-bold transition-all text-xs"
                            >
                                MATURATION
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="mt-3 flex flex-col gap-1">
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Active Section</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-64 justify-between bg-white/10 hover:bg-white/20 text-white border-none h-9 font-semibold text-sm">
                                {displayLabel}
                                <ChevronDown className="h-4 w-4 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full sm:w-64">
                            <DropdownMenuLabel>Switch Section</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {sections.map((section) => (
                                <DropdownMenuItem 
                                    key={section.id} 
                                    onClick={() => {
                                        const secModule = (section.farm_category || 'LRT').toUpperCase() as 'LRT' | 'MATURATION';
                                        setActiveFarmId(section.farm_id);
                                        setActiveSectionId(section.id);
                                        // Manually switch module when explicitly picking a section
                                        if (secModule !== activeModule) {
                                            setActiveModule(secModule);
                                        }
                                    }}
                                    className={section.id === activeSectionId ? "font-bold bg-muted" : ""}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm">{section.name} (Farm: {section.farm_name})</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            {sections.length === 0 && (
                                <DropdownMenuItem disabled>
                                    No sections assigned to you
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
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
                    {activities.map((act) => {
                        const Icon = act.icon;
                        return (
                            <Button
                                key={act.name}
                                variant="outline"
                                className="h-14 flex items-center justify-start gap-3 px-4 bg-card border shadow-sm hover:shadow-md hover:bg-card/90 transition-all rounded-xl"
                                onClick={() => {
                                    const sectionToUse = filteredSections.find(s => s.id === activeSectionId) || filteredSections[0];
                                    const targetSectionId = sectionToUse?.id || activeSectionId;
                                    navigate(`${act.route}?mode=${supervisorMode}&section=${targetSectionId}&category=${activeModule}`);
                                }}
                            >
                                <div className={`p-1.5 rounded-lg ${act.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-foreground text-xs text-left">
                                    {act.name}
                                </span>
                            </Button>
                        );
                    })}

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
                    {filteredInstructions.length > 0 && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {filteredInstructions.length} Pending
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : filteredInstructions.length === 0 ? (
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
                                                                    onClick={() => navigate(`/user/activity/${instr.activity_type.toLowerCase().replace(/\s+/g, '-')}?instruction=${instr.id}&mode=activity`)}
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

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : filteredSupervisorInstructions.length === 0 ? (
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
                                                                            ✓ Done by {instr.worker?.full_name || 'worker'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">⏳ Pending</span>
                                                                    )}
                                                                    <span className="text-xs font-bold text-foreground truncate">
                                                                        {instr.tanks?.name ? `Tank ${instr.tanks.name}` : 'Section Wide'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                                                        <Clock className="w-3 h-3" />
                                                                        {instr.scheduled_time?.slice(0,5) || '—'}
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
                                                                        onClick={() => navigate(`/user/activity/${instr.activity_type.toLowerCase().replace(/\s+/g, '-')}?editInstruction=${instr.id}`)}
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
