import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Utensils, Beaker, Waves, Search, Layers, Eye, Scissors, 
    MoveRight, FileText, ChevronDown, LogOut, User, MapPin,
    ClipboardList, Pencil, CheckCircle2, Clock, Trash2,
    Heart, Sparkles, Database, ArrowUpRight, ShoppingCart,
    Loader2, ArrowLeft, ChevronRight, Plus, Droplets
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
        user, loading: authLoading, logout,
        activeFarmId, setActiveFarmId,
        activeSectionId, setActiveSectionId,
        activeBroodstockBatchId, setActiveBroodstockBatchId,
        activeModule, setActiveModule,
        supervisorMode, setSupervisorMode
    } = useAuth();

    const [dashLoading, setDashLoading] = useState(true);
    const [instructions, setInstructions] = useState<any[]>([]);
    const [supervisorInstructions, setSupervisorInstructions] = useState<any[]>([]);
    const [maturationBatches, setMaturationBatches] = useState<any[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(false);

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

    useEffect(() => {
        if (!dashLoading && availableFarms.length > 0) {
            // Greedy auto-selection: find if there's exactly one farm and exactly one section available
            const needsFarmSelection = !activeFarmId && availableFarmsForModule.length === 1;
            const targetFarmId = needsFarmSelection ? availableFarmsForModule[0].id : activeFarmId;

            // Update farm if needed
            if (needsFarmSelection) {
                setActiveFarmId(targetFarmId);
            }

            // Immediately check for section auto-selection using the targetFarmId (even if just set)
            if (targetFarmId && !activeSectionId) {
                const sectionsForTargetFarm = allMySections.filter(s => 
                    s.farm_id === targetFarmId && 
                    (s.farm_category || 'LRT').toUpperCase() === activeModule.toUpperCase()
                );
                
                if (sectionsForTargetFarm.length === 1 && activeModule !== 'MATURATION') {
                    setActiveSectionId(sectionsForTargetFarm[0].id);
                }
            }

            // Section and Farm validation (cleanup)
            const currentFarm = availableFarms.find(f => f.id === activeFarmId);
            if (currentFarm) {
                const dbCat = (currentFarm.category || 'LRT').toUpperCase();
                const mappedCat = dbCat === 'FARM' ? 'FARMS' : dbCat;
                if (mappedCat !== activeModule.toUpperCase()) {
                    if (availableFarmsForModule.length === 1) {
                        setActiveFarmId(availableFarmsForModule[0].id);
                    } else {
                        setActiveFarmId(null);
                    }
                    setActiveSectionId(null);
                    setActiveBroodstockBatchId(null);
                }
            }

            const currentSection = allMySections.find(s => s.id === activeSectionId);
            const isWrongFarmOrModule = currentSection && (
                currentSection.farm_id !== activeFarmId || 
                (currentSection.farm_category === 'FARM' ? 'FARMS' : (currentSection.farm_category || 'LRT').toUpperCase()) !== activeModule.toUpperCase()
            );
            
            if (activeSectionId && isWrongFarmOrModule) {
                setActiveSectionId(null);
            }
        }
    }, [availableFarms, availableFarmsForModule, allMySections, filteredSections, activeFarmId, activeSectionId, dashLoading, activeModule, setActiveFarmId, setActiveSectionId, setActiveBroodstockBatchId]);

    // Maturation Batches Fetching
    useEffect(() => {
        if (!authLoading && activeModule === 'MATURATION' && activeFarmId) {
            fetchMaturationBatches();
        }
    }, [activeModule, activeFarmId, authLoading]);

    const fetchMaturationBatches = async () => {
        if (!activeFarmId) return;
        setBatchesLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .in('activity_type', ['Stocking', 'Sourcing & Mating', 'Broodstock Discard', 'Nauplii Harvest', 'Nauplii Sale'])
                .eq('farm_id', activeFarmId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Extract unique batch IDs and check for closure
            const batchesList: any[] = [];
            const seenIds = new Set();
            const closedIds = new Set();

            (data || []).forEach(log => {
                const isCompleteDiscard = log.activity_type === 'Broodstock Discard' && (log.data?.isCompleteDiscard || log.data?.is_complete_discard);
                const isBatchClosedSale = log.activity_type === 'Nauplii Sale' && (log.data?.isBatchClosed || log.data?.is_batch_closed);
                
                if (isCompleteDiscard || isBatchClosedSale) {
                    const sId = log.stocking_id || log.stockingId || log.data?.stockingId || log.data?.stocking_id || log.data?.batchId || log.data?.batch_id;
                    // Only track closure for Maturation broodstock IDs (BS_ prefix)
                    if (sId && sId.startsWith('BS_')) closedIds.add(sId);
                }
            });

            (data || []).forEach(log => {
                const sId = log.stocking_id || log.stockingId || log.data?.stockingId || log.data?.stocking_id || log.data?.batchId || log.data?.batch_id;
                // Only show Maturation broodstock batches (BS_ prefix) — exclude LRT stocking IDs
                if (sId && sId.startsWith('BS_') && !seenIds.has(sId)) {
                    seenIds.add(sId);
                    batchesList.push({
                        id: sId,
                        name: sId,
                        is_closed: closedIds.has(sId),
                        log: log
                    });
                }
            });

            setMaturationBatches(batchesList);

            // Auto-select if exactly 1 open batch, or only 1 batch total
            const openBatches = batchesList.filter(b => !b.is_closed);
            if (openBatches.length === 1 && !activeBroodstockBatchId) {
                setActiveBroodstockBatchId(openBatches[0].id);
            } else if (batchesList.length === 1 && !activeBroodstockBatchId) {
                setActiveBroodstockBatchId(batchesList[0].id);
            }
        } catch (err) {
            console.error('Error fetching maturation batches:', err);
        } finally {
            setBatchesLoading(false);
        }
    };

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
            setDashLoading(false);
            return;
        }

        setDashLoading(true);
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
                activity_type: (instr.planned_data?.item === 'Check Tray' || instr.planned_data?.checkTrayData) ? 'Check Tray' : instr.activity_type,
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
            setDashLoading(false);
        }
    };

    const fetchSupervisorInstructions = async () => {
        try {
            const today = getTodayStr();
            // 1. Fetch raw instructions
            const { data: rawData, error: fetchError } = await supabase
                .from('activity_charts')
                .select('*')
                .eq('created_by', user?.id)
                .or(`is_completed.eq.false,scheduled_date.eq.${today}`)
                .order('is_completed', { ascending: true })
                .order('scheduled_date', { ascending: true })
                .order('scheduled_time', { ascending: true });
            
            if (fetchError) throw fetchError;
            if (!rawData || rawData.length === 0) {
                setSupervisorInstructions([]);
                return;
            }

            // 2. Fetch related data for manual join
            const farmIds = Array.from(new Set(rawData.map(c => c.farm_id).filter(id => !!id)));
            const sectionIds = Array.from(new Set(rawData.map(c => c.section_id).filter(id => !!id)));
            const tankIds = Array.from(new Set(rawData.map(c => c.tank_id).filter(id => !!id)));
            const workerIds = Array.from(new Set(rawData.map(c => c.assigned_to).filter(id => !!id)));

            const [
                { data: farms }, 
                { data: sections }, 
                { data: tanks },
                { data: workers }
            ] = await Promise.all([
                supabase.from('farms').select('id, name').in('id', farmIds),
                supabase.from('sections').select('id, name').in('id', sectionIds),
                supabase.from('tanks').select('id, name').in('id', tankIds),
                supabase.from('profiles').select('id, full_name').in('id', workerIds)
            ]);

            // 3. Combine in memory
            const mapped = rawData.map((instr: any) => ({
                ...instr,
                activity_type: (instr.planned_data?.item === 'Check Tray' || instr.planned_data?.checkTrayData) ? 'Check Tray' : instr.activity_type,
                farms: farms?.find(f => f.id === instr.farm_id) || null,
                sections: sections?.find(s => s.id === instr.section_id) || null,
                tanks: tanks?.find(t => t.id === instr.tank_id) || null,
                worker: workers?.find(w => w.id === instr.assigned_to) || null
            }));

            setSupervisorInstructions(mapped);
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
    const activeBatch = maturationBatches.find(b => b.id === activeBroodstockBatchId);
    
    const displaySectionLabel = activeSection?.name || 'Select Section';
    const displayBatchLabel = activeBatch?.name || (activeBroodstockBatchId === 'new' ? 'New Batch' : 'Select Broodstock Batch');
    const displayFarmLabel = activeFarm?.name || 'Select Farm';

    const ACTIVITY_ICONS: Record<string, any> = {
        'Feed': Utensils,
        'Treatment': Beaker,
        'Water Quality': Waves,
        'Stocking': Layers,
        'Animals Sampling & Observation': Eye,
        'Artemia': Beaker,
        'Algae': Waves,
        'Harvest': Scissors,
        'Tank Shifting': MoveRight,
        'Sourcing & Mating': Heart,
        'Spawning': Sparkles,
        'Egg Count': Database,
        'Nauplii Harvest': ArrowUpRight,
        'Nauplii Sale': ShoppingCart,
        'Broodstock Discard': Trash2,
        'Water Management': Droplets,
        'Order Booking': ShoppingCart
    };

    const activities = useMemo(() => {
        const base = [
            { name: 'Feed', icon: Utensils, route: '/user/activity/feed', color: 'bg-orange-100 text-orange-600' },
            { name: 'Treatment', icon: Beaker, route: '/user/activity/treatment', color: 'bg-blue-100 text-blue-600' },
            { name: 'Water Quality', icon: Waves, route: '/user/activity/water', color: 'bg-cyan-100 text-cyan-600' },
            { name: 'Stocking', icon: Layers, route: '/user/activity/stocking', color: 'bg-emerald-100 text-emerald-600' },
            { name: 'Animals Sampling & Observation', icon: Eye, route: '/user/activity/animals-sampling', color: 'bg-purple-100 text-purple-600' },
            { name: 'Harvest', icon: Scissors, route: '/user/activity/harvest', color: 'bg-amber-100 text-amber-600' },
            { name: 'Tank Shifting', icon: MoveRight, route: '/user/activity/shifting', color: 'bg-indigo-100 text-indigo-600' },
            { name: 'Artemia', icon: Beaker, route: '/user/activity/artemia', color: 'bg-teal-100 text-teal-600' },
            { name: 'Algae', icon: Waves, route: '/user/activity/algae', color: 'bg-green-100 text-green-700' },
            { name: 'Water Management', icon: Droplets, route: '/user/activity/water-management', color: 'bg-sky-100 text-sky-600' },
            { name: 'Order Booking', icon: ShoppingCart, route: '/user/activity/order-booking', color: 'bg-rose-100 text-rose-600' },
        ];

        if (activeModule.toUpperCase() === 'MATURATION') {
            const maturationBase = base.filter(a => 
                a.name !== 'Artemia' && a.name !== 'Algae' && a.name !== 'Harvest' && a.name !== 'Tank Shifting' && a.name !== 'Water Management' && a.name !== 'Order Booking'
            );
            return [
                ...maturationBase,
                { name: 'Sourcing & Mating', icon: Heart, route: '/user/activity/mating', color: 'bg-pink-100 text-pink-600' },
                { name: 'Spawning', icon: Sparkles, route: '/user/activity/spawning', color: 'bg-amber-100 text-amber-600' },
                { name: 'Egg Count', icon: Database, route: '/user/activity/egg-count', color: 'bg-indigo-100 text-indigo-600' },
                { name: 'Nauplii Harvest', icon: ArrowUpRight, route: '/user/activity/nauplii-harvest', color: 'bg-emerald-100 text-emerald-600' },
                { name: 'Nauplii Sale', icon: ShoppingCart, route: '/user/activity/nauplii-sale', color: 'bg-blue-100 text-blue-600' },
                { name: 'Order Booking', icon: ShoppingCart, route: '/user/activity/order-booking', color: 'bg-rose-100 text-rose-600' },
                { name: 'Water Management', icon: Droplets, route: '/user/activity/water-management', color: 'bg-sky-100 text-sky-600' },
                { name: 'Broodstock Discard', icon: Trash2, route: '/user/activity/broodstock-discard', color: 'bg-red-100 text-red-600' }
            ];
        } else if (activeModule.toUpperCase() === 'FARMS') {
            return [
                 { name: 'Stocking', icon: Layers, route: '/user/activity/stocking', color: 'bg-emerald-100 text-emerald-600' },
                 { name: 'Animals Sampling & Observation', icon: Eye, route: '/user/activity/animals-sampling', color: 'bg-purple-100 text-purple-600' },
                 { name: 'Feed', icon: Utensils, route: '/user/activity/feed', color: 'bg-orange-100 text-orange-600' },
                 { name: 'Check Tray', icon: Search, route: '/user/activity/check-tray', color: 'bg-yellow-100 text-yellow-600' },
                 { name: 'Treatment', icon: Beaker, route: '/user/activity/treatment', color: 'bg-blue-100 text-blue-600' },
                 { name: 'Water Quality', icon: Waves, route: '/user/activity/water', color: 'bg-cyan-100 text-cyan-600' },
                 { name: 'Harvest', icon: Scissors, route: '/user/activity/harvest', color: 'bg-amber-100 text-amber-600' },
                 { name: 'Tank Shift', icon: MoveRight, route: '/user/activity/shifting', color: 'bg-indigo-100 text-indigo-600' },
                 { name: 'Water Management', icon: Droplets, route: '/user/activity/water-management', color: 'bg-sky-100 text-sky-600' }
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

                {/* Module Toggle - Two-level: Hatchery | Farm */}
                {(() => {
                    const userMods = user?.modules || ['LRT', 'MATURATION'];
                    const hatcheryMods = userMods.filter((m: string) => m === 'LRT' || m === 'MATURATION');
                    const hasFarms = userMods.includes('FARMS');
                    const hasHatchery = hatcheryMods.length > 0;
                    const isInHatchery = activeModule === 'LRT' || activeModule === 'MATURATION';
                    const isInFarm = activeModule === 'FARMS';

                    // Only FARMS — single badge
                    if (!hasHatchery && hasFarms) {
                        return (
                            <div className="mt-4 flex justify-center">
                                <span className="bg-black/20 text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm shadow-sm flex items-center gap-1.5 border border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    FARM MANAGEMENT
                                </span>
                            </div>
                        );
                    }

                    // Only one hatchery module, no FARMS — single badge
                    if (hasHatchery && hatcheryMods.length === 1 && !hasFarms) {
                        return (
                            <div className="mt-4 flex justify-center">
                                <span className="bg-black/20 text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm shadow-sm flex items-center gap-1.5 border border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {hatcheryMods[0]} MODULE
                                </span>
                            </div>
                        );
                    }

                    // LRT + MATURATION only (no FARMS) — plain two-tab toggle
                    if (hasHatchery && hatcheryMods.length === 2 && !hasFarms) {
                        return (
                            <div className="mt-4 flex justify-center">
                                <Tabs value={activeModule} onValueChange={(v: any) => setActiveModule(v)} className="w-full max-w-[280px]">
                                    <TabsList className="grid w-full grid-cols-2 bg-black/20 text-white rounded-xl h-8 p-0.5">
                                        <TabsTrigger value="LRT" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary font-bold transition-all text-[10px]">LRT</TabsTrigger>
                                        <TabsTrigger value="MATURATION" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary font-bold transition-all text-[10px]">MATURATION</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        );
                    }

                    // Has FARMS + at least one hatchery module — two-level toggle
                    return (
                        <div className="mt-4 flex flex-col items-center gap-2">
                            {/* Top-level: Hatchery | Farm */}
                            <Tabs
                                value={isInFarm ? 'FARM' : 'HATCHERY'}
                                onValueChange={(val) => {
                                    if (val === 'FARM') {
                                        setActiveModule('FARMS');
                                    } else {
                                        setActiveModule((hatcheryMods[0] || 'LRT') as 'LRT' | 'MATURATION');
                                    }
                                }}
                                className="w-full max-w-[240px]"
                            >
                                <TabsList className="grid w-full grid-cols-2 bg-black/20 text-white rounded-xl h-8 p-0.5">
                                    <TabsTrigger value="HATCHERY" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary font-bold transition-all text-[11px]">
                                        HATCHERY
                                    </TabsTrigger>
                                    <TabsTrigger value="FARM" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary font-bold transition-all text-[11px]">
                                        FARM
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* Sub-level: LRT | MATURATION (only when in hatchery mode and both exist) */}
                            {isInHatchery && (
                                hatcheryMods.length === 2 ? (
                                    <Tabs value={activeModule} onValueChange={(v: any) => setActiveModule(v)} className="w-full max-w-[220px]">
                                        <TabsList className="grid w-full grid-cols-2 bg-white/5 text-white rounded-lg h-7 p-0.5 border border-white/10">
                                            <TabsTrigger value="LRT" className="rounded-md data-[state=active]:bg-white/20 data-[state=active]:text-white font-bold transition-all text-[10px]">LRT</TabsTrigger>
                                            <TabsTrigger value="MATURATION" className="rounded-md data-[state=active]:bg-white/20 data-[state=active]:text-white font-bold transition-all text-[10px]">MATURATION</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                ) : (
                                    <span className="text-white/70 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        {hatcheryMods[0]}
                                    </span>
                                )
                            )}
                        </div>
                    );
                })()}

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {/* Select Farm */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!hasAccessToModule}>
                            <Button variant="outline" data-testid="farm-select" className="flex-1 justify-between bg-white/10 text-white border-0 h-10 font-bold backdrop-blur-sm">
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
                                    const farmModule = (f.category || 'LRT').toUpperCase() as 'LRT' | 'MATURATION' | 'FARMS';
                                    if (farmModule !== activeModule) setActiveModule(farmModule);
                                }}>
                                    {f.name} ({f.category})
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Select Section or Broodstock Batch */}
                    {activeModule !== 'MATURATION' ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild disabled={!activeFarmId || filteredSections.length === 0}>
                                <Button variant="outline" data-testid="tank-select" className="flex-1 justify-between bg-white/10 text-white border-0 h-10 font-bold backdrop-blur-sm">
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
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild disabled={!activeFarmId}>
                                <Button variant="outline" className="flex-1 justify-between bg-white/10 text-white border-0 h-10 font-bold backdrop-blur-sm">
                                    <div className="flex items-center gap-2 truncate">
                                        <Database className="w-4 h-4 opacity-70" />
                                        <span className="truncate">{batchesLoading ? 'Loading Batches...' : displayBatchLabel}</span>
                                        {activeBatch?.is_closed && (
                                            <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm flex-shrink-0 animate-pulse">Closed</span>
                                        )}
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="min-w-[20rem] w-auto max-w-md max-h-80 overflow-y-auto">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    <span>Select Active Batch</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[9px] font-black uppercase tracking-tighter text-primary hover:bg-primary/5 px-2"
                                        onClick={() => {
                                            setActiveBroodstockBatchId('new');
                                            navigate('/user/activity/stocking?category=MATURATION&mode=activity');
                                        }}>
                                        <Plus className="w-3 h-3 mr-1" /> Create New
                                    </Button>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {/* Removed redundant 'new' batch option - the '+ Create New' button above is sufficient */}
                                {maturationBatches.map(b => (
                                    <DropdownMenuItem key={b.id} onClick={() => setActiveBroodstockBatchId(b.id)} className={`flex items-center gap-3 py-3 px-3 transition-colors ${activeBroodstockBatchId === b.id ? "bg-muted/50 font-black border-l-4 border-primary" : b.is_closed ? "bg-red-50/50 hover:bg-red-100/50" : "hover:bg-muted/30"}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${b.is_closed ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs ${b.is_closed ? "text-red-700 font-bold" : ""}`}>{b.name}</span>
                                                {b.is_closed && (
                                                    <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Closed</span>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-medium text-muted-foreground truncate">
                                                ID: {b.id.slice(0, 15)}...
                                            </span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                                {maturationBatches.length === 0 && !batchesLoading && (
                                    <div className="p-4 text-center">
                                        <p className="text-[10px] text-muted-foreground font-medium">No active batches found</p>
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
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
                <div className="px-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/40 shadow-xl text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-2xl ocean-gradient flex items-center justify-center shadow-lg shadow-blue-200/50">
                            <MapPin className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">Select an Assigned Farm</h3>
                            <p className="text-sm text-slate-500 mt-2 px-6 leading-relaxed">
                                Please choose a farm from the dropdown above to continue working.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (!activeSectionId && activeModule !== 'MATURATION') ? (
                <div className="px-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/40 shadow-xl text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <Layers className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">Select a Section</h3>
                            <p className="text-sm text-slate-500 mt-2 px-6 leading-relaxed">
                                {filteredSections.length > 0 
                                    ? "Please choose a section from the dropdown above to continue working."
                                    : "No sections are assigned to you in this farm. Please contact your manager."}
                            </p>
                        </div>
                    </div>
                </div>
            ) : ((!activeBroodstockBatchId || (activeBroodstockBatchId !== 'new' && !maturationBatches.find(b => b.id === activeBroodstockBatchId))) && activeModule === 'MATURATION') ? (
                <div className="px-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/40 shadow-xl text-center flex flex-col items-center justify-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                            <Database className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">
                                {activeBroodstockBatchId === 'new' ? 'Create New BS Batch' : 'Select a Batch ID'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-2 px-6 leading-relaxed">
                            {activeBroodstockBatchId === 'new' 
                                    ? 'Fill out the stocking form to initialize this batch. The ID will be auto-generated based on supplier details.' 
                                    : maturationBatches.length > 0 
                                        ? 'Choose one of your active batches below or start a new one.'
                                        : 'Please choose an active Broodstock Batch from the dropdown above to continue working. Tanks will be auto-populated based on the selected batch.'}
                            </p>
                        </div>

                        {batchesLoading ? (
                            <div className="flex flex-col items-center gap-2 mt-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Finding active batches...</p>
                            </div>
                        ) : activeBroodstockBatchId !== 'new' && maturationBatches.length > 0 && (
                            <div className="w-full max-w-sm space-y-2 mt-2">
                                {maturationBatches.filter(b => !b.is_closed).map(batch => (
                                    <Button
                                        key={batch.id}
                                        variant="outline"
                                        className="w-full h-14 justify-start gap-3 bg-white border-dashed border-2 hover:border-primary hover:bg-primary/5 rounded-2xl px-4 group transition-all"
                                        onClick={() => setActiveBroodstockBatchId(batch.id)}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="text-xs font-bold text-slate-700">{batch.name}</span>
                                            <span className="text-[9px] text-slate-400">ID: {batch.id.slice(0, 12)}...</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-primary transition-colors" />
                                    </Button>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                            <Button 
                                variant={activeBroodstockBatchId === 'new' ? 'default' : 'ghost'} 
                                className={`h-11 px-6 rounded-xl font-bold transition-all group ${activeBroodstockBatchId === 'new' ? 'ocean-gradient border-none shadow-md shadow-indigo-200' : 'text-primary hover:bg-primary/5'}`} 
                                onClick={() => navigate(`/user/activity/stocking?category=MATURATION&mode=activity`)}>
                                <Plus className={`w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-300 ${activeBroodstockBatchId === 'new' ? 'text-white' : ''}`} /> 
                                {activeBroodstockBatchId === 'new' ? 'Create New Stocking' : 'Start New Broodstock Stocking'}
                            </Button>

                            {!batchesLoading && (
                                <Button
                                    variant="ghost"
                                    className="h-11 px-6 rounded-xl text-slate-400 hover:text-slate-600 font-medium text-xs gap-2"
                                    onClick={() => fetchMaturationBatches()}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Re-sync Batches
                                </Button>
                            )}
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
                                className="h-14 justify-start gap-2 bg-card border shadow-sm rounded-xl px-2.5 hover:shadow-md hover:bg-card/90 transition-all whitespace-normal"
                                onClick={() => navigate(`${act.route}?mode=${user?.role === 'supervisor' ? supervisorMode : 'activity'}&section=${activeSectionId || ''}&batch=${activeBroodstockBatchId || ''}&category=${activeModule}`)}
                            >
                                <div className={`p-1.5 rounded-lg shrink-0 ${act.color}`}><act.icon className="w-4 h-4" /></div>
                                <span className="text-[11px] sm:text-xs font-semibold text-foreground text-left leading-tight break-words">{act.name}</span>
                            </Button>
                        ))}
                        <Button 
                            variant="outline" 
                            data-testid="daily-report-button"
                            className="h-14 justify-start gap-2 bg-card border shadow-sm hover:shadow-md hover:bg-card/90 transition-all rounded-xl px-2.5 whitespace-normal" 
                            onClick={() => navigate(user?.role === 'supervisor' ? '/owner/consolidated-reports' : '/user/daily-report')}
                        >
                            <div className="p-1.5 rounded-lg shrink-0 bg-indigo-100 text-indigo-700"><FileText className="w-4 h-4" /></div>
                            <span className="text-[11px] sm:text-xs font-semibold text-foreground text-left leading-tight break-words">{user?.role === 'supervisor' ? 'Reports' : 'Daily Report'}</span>
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

                {dashLoading ? (
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
