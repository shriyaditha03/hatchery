import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Utensils, Beaker, Waves, Search, Layers, Eye, Scissors, 
    MoveRight, FileText, ChevronDown, LogOut, User, MapPin,
    ClipboardList, Pencil, CheckCircle2, Clock, Trash2,
    Heart, Sparkles, Database, ArrowUpRight, ShoppingCart,
    Loader2, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import logo from '../../assets/aqua-nexus-logo.png';

const UserDashboard = () => {
    const navigate = useNavigate();
    const { 
        user, logout,
        activeFarmId, setActiveFarmId,
        activeSectionId, setActiveSectionId,
        activeModule, setActiveModule,
        supervisorMode, setSupervisorMode
    } = useAuth();

    const [loading, setLoading] = useState(true);
    const [instructions, setInstructions] = useState<any[]>([]);
    const [supervisorInstructions, setSupervisorInstructions] = useState<any[]>([]);

    const availableFarms = useMemo(() => {
        const farmMap: Record<string, any> = {};
        (user?.access || []).forEach(a => {
            if (!farmMap[a.farm_id]) {
                farmMap[a.farm_id] = {
                    id: a.farm_id,
                    name: a.farm_name,
                    category: a.farm_category
                };
            }
        });
        return Object.values(farmMap).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [user?.access]);

    const availableFarmsForModule = useMemo(() => {
        return availableFarms.filter(f => (f.category || 'LRT').toUpperCase() === activeModule.toUpperCase());
    }, [availableFarms, activeModule]);

    const hasAccessToModule = availableFarmsForModule.length > 0;

    const allMySections = useMemo(() => {
        const sectionsList = (user?.access || [])
            .filter(a => a.section_id)
            .map(a => ({
                id: a.section_id,
                name: a.section_name,
                farm_id: a.farm_id,
                farm_category: a.farm_category
            }));
        
        // De-duplicate
        const seen = new Set();
        return sectionsList.filter(s => {
            const key = `${s.id}-${s.farm_id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [user?.access]);

    const filteredSections = useMemo(() => {
        return allMySections.filter(s => 
            s.farm_id === activeFarmId && 
            (s.farm_category || 'LRT').toUpperCase() === activeModule.toUpperCase()
        );
    }, [allMySections, activeFarmId, activeModule]);

    const getTodayStr = () => {
        return new Date().toISOString().split('T')[0];
    };

    // State validation logic
    useEffect(() => {
        if (!loading && availableFarms.length > 0) {
            const currentFarm = availableFarms.find(f => f.id === activeFarmId);
            
            // If active farm doesn't match current module, clear the selection or auto-select if exactly 1
            if (currentFarm && (currentFarm.category || 'LRT').toUpperCase() !== activeModule.toUpperCase()) {
                if (availableFarmsForModule.length === 1) {
                    setActiveFarmId(availableFarmsForModule[0].id);
                } else {
                    setActiveFarmId(null);
                }
                setActiveSectionId(null);
            } else if (!activeFarmId && availableFarmsForModule.length === 1) {
                setActiveFarmId(availableFarmsForModule[0].id);
            }
            
            const currentSection = allMySections.find(s => s.id === activeSectionId);
            const isWrongFarm = currentSection && currentSection.farm_id !== activeFarmId;
            
            if (activeSectionId && isWrongFarm) {
                setActiveSectionId(null);
            }
        }
    }, [availableFarms, availableFarmsForModule, allMySections, activeFarmId, activeSectionId, loading, activeModule, setActiveFarmId, setActiveSectionId]);

    useEffect(() => {
        if (user) {
            fetchInstructions();
            if (user.role === 'supervisor') fetchSupervisorInstructions();
        }
    }, [user?.id, activeFarmId, activeSectionId]);

    const fetchInstructions = async () => {
        if (!user || (!user.hatchery_id && !user.id)) return;
        
        // Don't load instructions until a farm is selected
        if (!activeFarmId) {
            setInstructions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const today = getTodayStr();
        
        try {
            // 1. Fetch raw instructions filtered by farm first, then optionally section
            let query = supabase
                .from('activity_charts')
                .select('*')
                .eq('is_completed', false)
                .eq('farm_id', activeFarmId)
                .lte('scheduled_date', today);

            // Instructions always show for the whole farm - section is just for recording context
            if (user.role === 'worker') {
                query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
            }

            const { data: chartData, error: chartError } = await query.order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true });
            if (chartError) throw chartError;

            // 2. Fetch farm names and categories separately to "manual join"
            const farmIds = Array.from(new Set(chartData.map(c => c.farm_id).filter(id => !!id)));
            const sectionIds = Array.from(new Set(chartData.map(c => c.section_id).filter(id => !!id)));
            const tankIds = Array.from(new Set(chartData.map(c => c.tank_id).filter(id => !!id)));

            const [{ data: farms }, { data: sections }, { data: tanks }] = await Promise.all([
                supabase.from('farms').select('id, name, category').in('id', farmIds),
                supabase.from('sections').select('id, name').in('id', sectionIds),
                supabase.from('tanks').select('id, name').in('id', tankIds)
            ]);

            // 3. Combine them manually
            const mappedInstructions = chartData.map((instr: any) => ({
                ...instr,
                farms: farms?.find(f => f.id === instr.farm_id) || null,
                sections: sections?.find(s => s.id === instr.section_id) || null,
                tanks: tanks?.find(t => t.id === instr.tank_id) || null
            }));

            setInstructions(mappedInstructions);
            (window as any).TASK_DEBUG_ERROR = null; // Clear error
        } catch (error: any) {
            console.error('Error fetching instructions:', error);
            (window as any).TASK_DEBUG_ERROR = error.message || 'Unknown Error';
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

    const activeFarm = availableFarms.find(f => f.id === activeFarmId);
    const activeSection = allMySections.find(s => s.id === activeSectionId);
    
    const displaySectionLabel = activeSection?.name || 'Select Section';
    const displayFarmLabel = activeFarm?.name || 'Select Farm';

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
        'Sourcing & Mating': Heart,
        'Spawning': Sparkles,
        'Egg Count': Database,
        'Nauplii Harvest': ArrowUpRight,
        'Nauplii Sale': ShoppingCart
    };

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
                a.name !== 'Artemia' && a.name !== 'Algae' && a.name !== 'Harvest' && a.name !== 'Tank Shifting'
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

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header */}
            <div className="ocean-gradient p-3 sm:p-4 pb-6 rounded-b-3xl shadow-lg">
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        {logo && <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg brightness-200" />}
                        <span className="font-bold text-xl">{user?.hatchery_name || 'AquaNexus'}</span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white p-0">
                                <User className="w-6 h-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/user/profile')}>Profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4 text-white">
                    <p className="text-xs opacity-70 uppercase tracking-widest">{user?.role} Portal</p>
                    <h2 className="text-lg font-bold">Welcome, {user?.name || user?.username}</h2>
                </div>

                {/* Module Toggle */}
                <div className="mt-4 flex justify-center">
                    <Tabs value={activeModule} onValueChange={(v: any) => setActiveModule(v)} className="w-[280px]">
                        <TabsList className="grid grid-cols-2 bg-black/20 text-white rounded-xl h-8">
                            <TabsTrigger value="LRT" className="text-[10px] font-bold">LRT</TabsTrigger>
                            <TabsTrigger value="MATURATION" className="text-[10px] font-bold">MATURATION</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {/* Select Farm */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!hasAccessToModule}>
                            <Button variant="outline" className="flex-1 justify-between bg-white/10 text-white border-0 h-10 font-bold backdrop-blur-sm">
                                <div className="flex items-center gap-2 truncate">
                                    <MapPin className="w-4 h-4 opacity-70" />
                                    <span>{hasAccessToModule ? displayFarmLabel : 'No Access'}</span>
                                </div>
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                            {availableFarmsForModule.map(f => (
                                <DropdownMenuItem key={f.id} onClick={() => {
                                    setActiveFarmId(f.id);
                                    const farmModule = (f.category || 'LRT').toUpperCase() as 'LRT' | 'MATURATION';
                                    if (farmModule !== activeModule) setActiveModule(farmModule);
                                }}>
                                    {f.name} ({f.category})
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Select Section */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!activeFarmId || filteredSections.length === 0}>
                            <Button variant="outline" className="flex-1 justify-between bg-white/10 text-white border-0 h-10 font-bold backdrop-blur-sm">
                                <div className="flex items-center gap-2 truncate">
                                    <Layers className="w-4 h-4 opacity-70" />
                                    <span>{displaySectionLabel}</span>
                                </div>
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                            {filteredSections.map(s => (
                                <DropdownMenuItem key={s.id} onClick={() => setActiveSectionId(s.id)}>{s.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {!hasAccessToModule ? (
                <div className="px-4 mt-8">
                    <div className="bg-card p-8 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center gap-4">
                        <Database className="w-12 h-12 text-muted-foreground opacity-50" />
                        <div>
                            <h3 className="font-bold text-lg">No Access to {activeModule}</h3>
                            <p className="text-sm text-muted-foreground mt-1 px-2">
                                You haven't been assigned to any {activeModule} farms or sections. Please contact your owner to grant you access.
                            </p>
                        </div>
                    </div>
                </div>
            ) : !activeFarmId ? (
                <div className="px-4 mt-8">
                    <div className="bg-card p-6 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center gap-3">
                        <MapPin className="w-10 h-10 text-primary opacity-80" />
                        <div>
                            <h3 className="font-bold text-lg">Select an Assigned Farm</h3>
                            <p className="text-xs text-muted-foreground mt-1 px-4">
                                Please choose a farm from the dropdown above to continue working.
                            </p>
                        </div>
                    </div>
                </div>
            ) : !activeSectionId ? (
                <div className="px-4 mt-8">
                    <div className="bg-card p-6 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center gap-3">
                        <Layers className="w-10 h-10 text-primary opacity-80" />
                        <div>
                            <h3 className="font-bold text-lg">Select a Section</h3>
                            <p className="text-xs text-muted-foreground mt-1 px-4">
                                {filteredSections.length > 0 
                                    ? "Please choose a section from the dropdown above to continue working."
                                    : "No sections are assigned to you in this farm. Please contact your manager."}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <>

            {/* Supervisor Modes */}
            {user?.role === 'supervisor' && (
                <div className="px-4 mt-4 relative z-10 flex justify-center">
                    <Tabs value={supervisorMode} onValueChange={(v: any) => setSupervisorMode(v)} className="w-[280px]">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800 text-slate-300 rounded-xl h-8 p-0.5 shadow-sm">
                            <TabsTrigger 
                                value="instruction"
                                className="text-[10px] font-bold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                <ClipboardList className={`w-3 h-3 ${supervisorMode === 'instruction' ? 'animate-bounce-subtle' : ''}`} />
                                Instruction
                            </TabsTrigger>
                            <TabsTrigger 
                                value="activity"
                                className="text-[10px] font-bold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
                            >
                                <Pencil className={`w-3 h-3 ${supervisorMode === 'activity' ? 'animate-pulse' : ''}`} />
                                Activity
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            )}

            {/* Grid */}
            <div className="px-4 mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activities.map(act => (
                        <Button 
                            key={act.name} 
                            variant="outline" 
                            className="h-14 justify-start gap-3 bg-card border shadow-sm rounded-xl px-3 hover:shadow-md hover:bg-card/90 transition-all"
                            onClick={() => navigate(`${act.route}?mode=${user?.role === 'supervisor' ? supervisorMode : 'activity'}&section=${activeSectionId}&category=${activeModule}`)}
                        >
                            <div className={`p-1.5 rounded-lg ${act.color}`}><act.icon className="w-4 h-4" /></div>
                            <span className="text-xs font-semibold text-foreground text-left">{act.name}</span>
                        </Button>
                    ))}
                    <Button variant="outline" className="h-14 justify-start gap-3 bg-card border shadow-sm hover:shadow-md hover:bg-card/90 transition-all rounded-xl px-3" onClick={() => navigate(user?.role === 'supervisor' ? '/owner/consolidated-reports' : '/user/daily-report')}>
                        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700"><FileText className="w-4 h-4" /></div>
                        <span className="text-xs font-semibold text-foreground text-left">{user?.role === 'supervisor' ? 'Reports' : 'Daily Report'}</span>
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
                    <div className="bg-muted/30 border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center mt-2">
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
                                                                            ✓ Done by {instr.worker?.full_name || 'worker'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">⌛ Pending</span>
                                                                    )}
                                                                    <span className="text-xs font-bold text-foreground truncate">
                                                                        {instr.tanks?.name ? `Tank ${instr.tanks.name}` : 'Section Wide'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                                                        <Clock className="w-3 h-3" />
                                                                        {instr.scheduled_time?.slice(0,5) || '--:--'}
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
                </>
            )}
        </div>
    );
};

export default UserDashboard;
