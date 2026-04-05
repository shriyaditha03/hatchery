import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/modules/shared/components/Breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    User, LogOut, PlusCircle, Warehouse, Users,
    Utensils, Beaker, Eye, Search, Layers, UserPlus, Waves, FileText, ChevronDown, Tags,
    FlaskConical, Leaf, MapPin, Scissors, MoveRight, Heart, Sparkles, ShoppingCart, ArrowUpRight
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import logo from '@/assets/aqua-nexus-logo.png';

const OwnerDashboard = () => {
    const { user, logout, activeFarmId, setActiveFarmId, activeModule, setActiveModule } = useAuth();
    const navigate = useNavigate();
    const [farms, setFarms] = useState<any[]>([]);

    useEffect(() => {
        if (user?.hatchery_id) {
            supabase
                .from('farms')
                .select('id, name, category')
                .eq('hatchery_id', user.hatchery_id)
                .order('created_at', { ascending: true })
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error fetching farms:', error);
                        return;
                    }
                    
                    const farmsData = data || [];
                    setFarms(farmsData);
                    
                    const farmsInModule = farmsData.filter(f => (f.category || 'LRT').toUpperCase() === activeModule.toUpperCase());
                    
                    // Do not auto-select if there is no activeFarmId, EXCEPT if there's exactly 1 farm
                    // Just validate if the current activeFarmId still exists
                    if (activeFarmId) {
                        const currentFarm = farmsData.find(f => f.id === activeFarmId);
                        if (!currentFarm) {
                            setActiveFarmId(farmsInModule.length === 1 ? farmsInModule[0].id : null);
                        } else if ((currentFarm.category || 'LRT').toUpperCase() !== activeModule.toUpperCase()) {
                            // If the cached farm belongs to a different module than the cached module, switch module
                            setActiveModule((currentFarm.category || 'LRT').toUpperCase() as 'LRT' | 'MATURATION');
                        }
                    } else if (farmsInModule.length === 1) {
                        setActiveFarmId(farmsInModule[0].id);
                    }
                });
        }
    }, [user, activeModule]); // Removed activeFarmId/setActiveFarmId from dependency map to avoid loops on auto-clear


    // Handle module switch
    const handleModuleChange = (module: string) => {
        const newModule = module as 'LRT' | 'MATURATION';
        setActiveModule(newModule);
        
        // If current active farm project is not in the new module, clear selection or auto-select if exactly 1
        const currentFarm = farms.find(f => f.id === activeFarmId);
        if (!currentFarm || (currentFarm.category || 'LRT').toUpperCase() !== newModule.toUpperCase()) {
            const newModuleFarms = farms.filter(f => (f.category || 'LRT').toUpperCase() === newModule.toUpperCase());
            if (newModuleFarms.length === 1) {
                setActiveFarmId(newModuleFarms[0].id);
            } else {
                setActiveFarmId(null);
            }
        }
    };

    if (!user) return null;

    const lrtActivities = [
        { name: 'Feed', icon: Utensils, route: '/owner/reports/feed', color: 'bg-orange-100 text-orange-600' },
        { name: 'Treatment', icon: Beaker, route: '/owner/reports/treatment', color: 'bg-blue-100 text-blue-600' },
        { name: 'Water Quality', icon: Waves, route: '/owner/reports/water', color: 'bg-cyan-100 text-cyan-600' },
        { name: 'Animal Quality', icon: Search, route: '/owner/reports/animal', color: 'bg-rose-100 text-rose-600' },
        { name: 'Stocking', icon: Layers, route: '/owner/reports/stocking', color: 'bg-emerald-100 text-emerald-600' },
        { name: 'Observation', icon: Eye, route: '/owner/reports/observation', color: 'bg-purple-100 text-purple-600' },
        { name: 'Harvest', icon: Scissors, route: '/owner/reports/harvest', color: 'bg-amber-100 text-amber-600' },
        { name: 'Tank Shifting', icon: MoveRight, route: '/owner/reports/shifting', color: 'bg-indigo-100 text-indigo-600' },
        { name: 'Artemia', icon: FlaskConical, route: '/owner/reports/artemia', color: 'bg-teal-100 text-teal-600' },
        { name: 'Algae', icon: Leaf, route: '/owner/reports/algae', color: 'bg-green-100 text-green-700' },
    ];
    
    const maturationActivities = [
        { name: 'Feed', icon: Utensils, route: '/owner/reports/feed', color: 'bg-orange-100 text-orange-600' },
        { name: 'Treatment', icon: Beaker, route: '/owner/reports/treatment', color: 'bg-blue-100 text-blue-600' },
        { name: 'Water Quality', icon: Waves, route: '/owner/reports/water', color: 'bg-cyan-100 text-cyan-600' },
        { name: 'Animal Quality', icon: Search, route: '/owner/reports/animal', color: 'bg-rose-100 text-rose-600' },
        { name: 'Stocking', icon: Layers, route: '/owner/reports/stocking', color: 'bg-emerald-100 text-emerald-600' },
        { name: 'Observation', icon: Eye, route: '/owner/reports/observation', color: 'bg-purple-100 text-purple-600' },
        { name: 'Sourcing & Mating', icon: Heart, route: '/owner/reports/sourcing & mating', color: 'bg-rose-100 text-rose-600' },
        { name: 'Spawning', icon: Sparkles, route: '/owner/reports/spawning', color: 'bg-amber-100 text-amber-600' },
        { name: 'Egg Count', icon: Layers, route: '/owner/reports/egg count', color: 'bg-blue-100 text-blue-600' },
        { name: 'Nauplii Harvest', icon: ArrowUpRight, route: '/owner/reports/nauplii harvest', color: 'bg-emerald-100 text-emerald-600' },
        { name: 'Nauplii Sale', icon: ShoppingCart, route: '/owner/reports/nauplii sale', color: 'bg-indigo-100 text-indigo-600' },
    ];

    const activities = activeModule === 'MATURATION' ? maturationActivities : lrtActivities;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const filteredFarms = farms.filter(f => (f.category || 'LRT').toUpperCase() === activeModule.toUpperCase());
    const activeFarm = farms.find(f => f.id === activeFarmId);
    const activeFarmName = activeFarm?.name || 'Select Farm';

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header */}
            <div className="ocean-gradient p-3 sm:p-4 pb-6 rounded-b-3xl shadow-lg">
                <Breadcrumbs lightTheme className="mb-2" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg brightness-200 grayscale-0 inverted" />
                        <span className="text-white font-bold text-xl">
                            {user.hatchery_name || 'Hatchery'}
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
                            <DropdownMenuItem onClick={() => navigate('/owner/farms')}>
                                <Warehouse className="mr-2 h-4 w-4" /> Manage Farms
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/owner/manage-users')}>
                                <Users className="mr-2 h-4 w-4" /> Manage Users
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/owner/consolidated-reports')}>
                                <FileText className="mr-2 h-4 w-4" /> Consolidated Reports
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/owner/profile')}>
                                <User className="mr-2 h-4 w-4" /> Personal Info
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/owner/manage-types')}>
                                <Tags className="mr-2 h-4 w-4" /> Manage Types
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
                        <p className="text-xs uppercase tracking-wider opacity-70">Owner Portal</p>
                        <h2 className="text-lg font-bold">Welcome, {user.name}</h2>
                    </div>
                </div>

                {/* Module Toggle */}
                <div className="mt-3 flex justify-center">
                    <Tabs value={activeModule} onValueChange={handleModuleChange} className="w-full max-w-[280px]">
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
                    <label className="text-white/70 text-xs font-semibold uppercase tracking-wider">Active Farm</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-64 justify-between bg-white/10 hover:bg-white/20 text-white border-none h-9 font-semibold text-sm">
                                {activeFarmName}
                                <ChevronDown className="h-4 w-4 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full sm:w-64">
                            <DropdownMenuLabel>Switch Farm</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {filteredFarms.length > 0 ? (
                                filteredFarms.map(farm => (
                                    <DropdownMenuItem 
                                        key={farm.id} 
                                        onClick={() => setActiveFarmId(farm.id)}
                                        className={farm.id === activeFarmId ? "font-bold bg-muted" : ""}
                                    >
                                        <Warehouse className="mr-2 h-4 w-4 opacity-50" /> {farm.name}
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>No {activeModule} farms</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/owner/create-farm')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Farm
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {activeFarm?.address && (
                        <p className="text-white/60 text-[10px] mt-1 flex items-center gap-1 ml-1 animate-in fade-in slide-in-from-top-1 duration-500">
                            <MapPin className="w-3 h-3" /> {activeFarm.address}
                        </p>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="px-4 -mt-6 relative z-10">
                {filteredFarms.length === 0 ? (
                    <div className="bg-card p-8 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center gap-4">
                        <Warehouse className="w-12 h-12 text-muted-foreground opacity-50" />
                        <div>
                            <h3 className="font-bold text-lg">No {activeModule} Farms</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                You haven't created any {activeModule} farms yet.
                            </p>
                        </div>
                        <Button onClick={() => navigate('/owner/create-farm')} className="mt-2 text-xs h-9">
                            <PlusCircle className="w-4 h-4 mr-2"/> Create {activeModule} Farm
                        </Button>
                    </div>
                ) : !activeFarm ? (
                    <div className="bg-card p-6 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center gap-3">
                        <Warehouse className="w-10 h-10 text-primary opacity-80" />
                        <div>
                            <h3 className="font-bold text-lg">Select a Farm</h3>
                            <p className="text-xs text-muted-foreground mt-1 px-4">
                                Please select a farm from the dropdown above to view its dashboard.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {/* 6 Activity Icons */}
                        {activities.map((act) => {
                            const Icon = act.icon;
                            return (
                                <Button
                                    key={act.name}
                                    variant="outline"
                                    className="h-14 flex items-center justify-start gap-3 px-4 bg-card border shadow-sm hover:shadow-md hover:bg-card/90 transition-all rounded-xl"
                                    onClick={() => navigate(act.route)}
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
                    </div>
                )}
            </div>

            {/* Quick Actions Footer */}
            <div className="px-4 mt-10">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Quick Management</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="ghost" className="h-20 flex flex-col bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 rounded-2xl text-blue-700 gap-2" onClick={() => navigate('/owner/add-user')}>
                        <UserPlus className="w-6 h-6" />
                        <span className="text-[10px] font-bold">Add Staff</span>
                    </Button>
                    <Button variant="ghost" className="h-20 flex flex-col bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 rounded-2xl text-emerald-700 gap-2" onClick={() => navigate('/owner/create-farm')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="text-[10px] font-bold">New Farm</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
