import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';

const AddUser = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [farms, setFarms] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'worker' as 'worker' | 'supervisor',
        selectedFarms: [] as string[],
        selectedSections: [] as string[],
        selectedTanks: [] as string[],
    });

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchFarms();
    }, [user]);

    const fetchFarms = async () => {
        if (!user?.hatchery_id) return;
        const { data } = await supabase
            .from('farms')
            .select(`
                id, 
                name,
                category,
                sections (
                    id, 
                    name,
                    tanks (id, name)
                )
            `)
            .eq('hatchery_id', user.hatchery_id);
        if (data) setFarms(data);
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleToggle = (type: 'farm' | 'section' | 'tank', id: string) => {
        setFormData(prev => {
            const key = type === 'farm' ? 'selectedFarms' : type === 'section' ? 'selectedSections' : 'selectedTanks';
            const selected = prev[key].includes(id)
                ? prev[key].filter(i => i !== id)
                : [...prev[key], id];
            return { ...prev, [key]: selected };
        });
    };

    const isFarmSelected = (farmId: string) => formData.selectedFarms.includes(farmId);
    const isSectionSelected = (sectionId: string, farmId: string) => 
        isFarmSelected(farmId) || formData.selectedSections.includes(sectionId);
    const isTankSelected = (tankId: string, sectionId: string, farmId: string) => 
        isSectionSelected(sectionId, farmId) || formData.selectedTanks.includes(tankId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.hatchery_id) return;

        if (!formData.username.trim() || !formData.password.trim() || 
            (formData.selectedFarms.length === 0 && formData.selectedSections.length === 0 && formData.selectedTanks.length === 0)) {
            toast.error("Please fill in all fields and select at least one permission");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        try {
            setLoading(true);

            // 1. Create Auth User using a secondary client (to not log out current owner)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error("Supabase URL or Anon Key is missing in environment variables.");
            }

            const { createClient } = await import('@supabase/supabase-js');
            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });

            const emailToUse = `${formData.username.toLowerCase().trim().replace(/\s+/g, '')}@shrimphatchery.com`;

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: emailToUse,
                password: formData.password,
            });

            if (authError) {
                console.error("Auth Signup Error:", authError);
                throw authError;
            }
            if (!authData.user) throw new Error("User creation failed in Supabase Auth.");

            // 2. Activate profile via RPC
            const { error: claimError } = await supabase.rpc('activate_user_profile', {
                username_input: formData.username.trim(),
                user_id_input: authData.user.id,
                email_input: emailToUse
            });

            if (claimError) {
                console.error("Profile claim error:", claimError);
            }

            // 3. Ensure profile exists and has correct info (Role, Hatchery, etc.)
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', formData.username.trim())
                .maybeSingle();

            let targetProfileId;

            if (existingProfile) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        auth_user_id: authData.user.id,
                        email: emailToUse,
                        role: formData.role,
                        hatchery_id: user?.hatchery_id
                    })
                    .eq('username', formData.username.trim());

                if (updateError) throw updateError;
                targetProfileId = existingProfile.id;
            } else {
                const { data: newProfile, error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        username: formData.username.trim(),
                        role: formData.role,
                        hatchery_id: user?.hatchery_id,
                        full_name: formData.username,
                        auth_user_id: authData.user.id,
                        email: emailToUse
                    }])
                    .select()
                    .single();

                if (profileError) throw profileError;
                targetProfileId = newProfile.id;
            }

            // 4. Assign Farm Access (Sync selection)
            // First, clear existing access if any (prevents duplicate key errors)
            await supabase
                .from('farm_access')
                .delete()
                .eq('user_id', targetProfileId);

            if (formData.selectedFarms.length > 0 || formData.selectedSections.length > 0 || formData.selectedTanks.length > 0) {
                const accessData: any[] = [];
                
                // Add Farm Level Access
                formData.selectedFarms.forEach(id => {
                    accessData.push({ user_id: targetProfileId, farm_id: id });
                });

                // Add Section Level Access (if parent farm not selected)
                formData.selectedSections.forEach(sid => {
                    const farm = farms.find(f => f.sections.some((s: any) => s.id === sid));
                    if (farm && !formData.selectedFarms.includes(farm.id)) {
                        accessData.push({ user_id: targetProfileId, farm_id: farm.id, section_id: sid });
                    }
                });

                // Add Tank Level Access (if parent section/farm not selected)
                formData.selectedTanks.forEach(tid => {
                    let farmId = '';
                    let sectionId = '';
                    for (const f of farms) {
                        for (const s of f.sections) {
                            if (s.tanks.some((t: any) => t.id === tid)) {
                                farmId = f.id;
                                sectionId = s.id;
                                break;
                            }
                        }
                    }
                    if (farmId && !formData.selectedFarms.includes(farmId) && !formData.selectedSections.includes(sectionId)) {
                        accessData.push({ user_id: targetProfileId, farm_id: farmId, section_id: sectionId, tank_id: tid });
                    }
                });

                if (accessData.length > 0) {
                    const { error: accessError } = await supabase
                        .from('farm_access')
                        .insert(accessData);

                    if (accessError) throw accessError;
                }
            }

            toast.success(`User "${formData.username}" created successfully!`);
            navigate('/owner/dashboard');

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/owner/dashboard')} className="pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
                </Button>

                <div>
                    <h1 className="text-2xl font-bold">Add New User</h1>
                    <p className="text-muted-foreground">Create a user account and assign permissions</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl shadow-sm border">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username *</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="e.g. farm_worker_1"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Set Password *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Min. 6 characters"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">User Role *</Label>
                        <Select 
                            value={formData.role} 
                            onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                        >
                            <SelectTrigger id="role" className="bg-background">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="worker">Worker</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Supervisors and Workers both follow the same permission layout below.
                        </p>
                    </div>


                    <div className="space-y-3">
                        <Label>Assign Permissions *</Label>
                        <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
                            Assign at Farm, Section or Tank level. Selecting a parent automatically includes all its children.
                        </p>
                        {farms.length === 0 ? (
                            <p className="text-sm text-yellow-600">No farms created yet.</p>
                        ) : (
                            <div className="space-y-1 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {farms.map(farm => (
                                    <div key={farm.id} className="border rounded-lg overflow-hidden border-muted/50">
                                        <div className={`flex items-center gap-2 p-2 hover:bg-accent transition-colors ${isFarmSelected(farm.id) ? 'bg-primary/5' : ''}`}>
                                            <button 
                                                type="button"
                                                onClick={() => toggleExpand(farm.id)} 
                                                className="p-1 hover:bg-muted rounded"
                                            >
                                                {expanded[farm.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                            <Checkbox
                                                id={`farm-${farm.id}`}
                                                checked={isFarmSelected(farm.id)}
                                                onCheckedChange={() => handleToggle('farm', farm.id)}
                                            />
                                            <Label 
                                                htmlFor={`farm-${farm.id}`} 
                                                className="text-sm font-bold flex-1 cursor-pointer py-1"
                                            >
                                                {farm.name} ({farm.category || 'Farm'})
                                            </Label>
                                        </div>
                                        
                                        {expanded[farm.id] && (
                                            <div className="bg-muted/30 pl-8 pr-2 py-1 space-y-1">
                                                {farm.sections?.map((section: any) => (
                                                    <div key={section.id} className="space-y-1">
                                                        <div className="flex items-center gap-2 py-1">
                                                            <button 
                                                                type="button"
                                                                onClick={() => toggleExpand(section.id)} 
                                                                className="p-0.5 hover:bg-muted rounded"
                                                            >
                                                                {expanded[section.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                            </button>
                                                            <Checkbox
                                                                id={`section-${section.id}`}
                                                                checked={isSectionSelected(section.id, farm.id)}
                                                                disabled={isFarmSelected(farm.id)}
                                                                onCheckedChange={() => handleToggle('section', section.id)}
                                                            />
                                                            <Label 
                                                                htmlFor={`section-${section.id}`} 
                                                                className={`text-xs flex-1 cursor-pointer ${isFarmSelected(farm.id) ? 'opacity-50' : 'font-medium'}`}
                                                            >
                                                                {section.name} (Section)
                                                            </Label>
                                                        </div>

                                                        {expanded[section.id] && (
                                                            <div className="pl-6 space-y-1 pb-2 border-l border-muted-foreground/10 ml-1.5">
                                                                {section.tanks?.map((tank: any) => (
                                                                    <div key={tank.id} className="flex items-center gap-2 py-0.5">
                                                                        <Checkbox
                                                                            id={`tank-${tank.id}`}
                                                                            checked={isTankSelected(tank.id, section.id, farm.id)}
                                                                            disabled={isSectionSelected(section.id, farm.id)}
                                                                            onCheckedChange={() => handleToggle('tank', tank.id)}
                                                                        />
                                                                        <Label 
                                                                            htmlFor={`tank-${tank.id}`} 
                                                                            className={`text-xs cursor-pointer ${isSectionSelected(section.id, farm.id) ? 'opacity-50' : ''}`}
                                                                        >
                                                                            {tank.name} (Tank)
                                                                        </Label>                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {(!farm.sections || farm.sections.length === 0) && (
                                                    <p className="text-[10px] text-muted-foreground py-1">No sections available</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || !formData.username}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add User'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default AddUser;
