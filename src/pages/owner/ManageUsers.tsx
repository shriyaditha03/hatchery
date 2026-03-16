import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, User, UserPlus, ShieldAlert, Key, Loader2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserProfile {
    id: string;
    username: string;
    role: string;
    full_name: string;
    auth_user_id: string | null;
}

const ManageUsers = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [farms, setFarms] = useState<any[]>([]);
    const [userAccess, setUserAccess] = useState<Record<string, { farms: string[], sections: string[], tanks: string[] }>>({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [selectedFarms, setSelectedFarms] = useState<string[]>([]);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [selectedTanks, setSelectedTanks] = useState<string[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (user?.hatchery_id) {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // 1. Fetch Users
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('hatchery_id', user!.hatchery_id)
                .neq('role', 'owner')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;
            setUsers(profiles || []);

            // 2. Fetch all Farms with full hierarchy
            const { data: hatcheryFarms } = await supabase
                .from('farms')
                .select(`
                    id, 
                    name,
                    sections (
                        id, 
                        name,
                        tanks (id, name)
                    )
                `)
                .eq('hatchery_id', user!.hatchery_id);
            setFarms(hatcheryFarms || []);

            // 3. Fetch all farm access for these users
            const userIds = profiles?.map(p => p.id) || [];
            if (userIds.length > 0) {
                const { data: access } = await supabase
                    .from('farm_access')
                    .select('user_id, farm_id, section_id, tank_id')
                    .in('user_id', userIds);

                const accessMap: Record<string, any> = {};
                access?.forEach(a => {
                    if (!accessMap[a.user_id]) accessMap[a.user_id] = { farms: [], sections: [], tanks: [] };
                    if (a.tank_id) accessMap[a.user_id].tanks.push(a.tank_id);
                    else if (a.section_id) accessMap[a.user_id].sections.push(a.section_id);
                    else accessMap[a.user_id].farms.push(a.farm_id);
                });
                setUserAccess(accessMap);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAccessDialog = (u: UserProfile) => {
        setEditingUser(u);
        const access = userAccess[u.id] || { farms: [], sections: [], tanks: [] };
        setSelectedFarms(access.farms || []);
        setSelectedSections(access.sections || []);
        setSelectedTanks(access.tanks || []);
        setIsAccessDialogOpen(true);
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleToggle = (type: 'farm' | 'section' | 'tank', id: string) => {
        if (type === 'farm') {
            setSelectedFarms(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (type === 'section') {
            setSelectedSections(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedTanks(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const isFarmSelected = (farmId: string) => selectedFarms.includes(farmId);
    const isSectionSelected = (sectionId: string, farmId: string) => 
        isFarmSelected(farmId) || selectedSections.includes(sectionId);
    const isTankSelected = (tankId: string, sectionId: string, farmId: string) => 
        isSectionSelected(sectionId, farmId) || selectedTanks.includes(tankId);

    const handleSaveAccess = async () => {
        if (!editingUser) return;
        try {
            setActionLoading(true);

            // 1. Delete existing access
            const { error: deleteError } = await supabase
                .from('farm_access')
                .delete()
                .eq('user_id', editingUser.id);
            if (deleteError) throw deleteError;

            // 2. Insert new granular access
            const accessData: any[] = [];
            
            selectedFarms.forEach(id => {
                accessData.push({ user_id: editingUser.id, farm_id: id });
            });

            selectedSections.forEach(sid => {
                const farm = farms.find(f => f.sections?.some((s: any) => s.id === sid));
                if (farm && !selectedFarms.includes(farm.id)) {
                    accessData.push({ user_id: editingUser.id, farm_id: farm.id, section_id: sid });
                }
            });

            selectedTanks.forEach(tid => {
                let farmId = '';
                let sectionId = '';
                for (const f of farms) {
                    for (const s of (f.sections || [])) {
                        if (s.tanks?.some((t: any) => t.id === tid)) {
                            farmId = f.id;
                            sectionId = s.id;
                            break;
                        }
                    }
                }
                if (farmId && !selectedFarms.includes(farmId) && !selectedSections.includes(sectionId)) {
                    accessData.push({ user_id: editingUser.id, farm_id: farmId, section_id: sectionId, tank_id: tid });
                }
            });

            if (accessData.length > 0) {
                const { error: insertError } = await supabase
                    .from('farm_access')
                    .insert(accessData);
                if (insertError) throw insertError;
            }

            // 3. Update local state
            setUserAccess(prev => ({
                ...prev,
                [editingUser.id]: { farms: selectedFarms, sections: selectedSections, tanks: selectedTanks }
            }));

            toast.success(`Access updated for ${editingUser.username}`);
            setIsAccessDialogOpen(false);
        } catch (error: any) {
            console.error('Save access error:', error);
            toast.error(error.message || 'Failed to update access');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (userId: string, username: string) => {
        try {
            // 1. Delete associated activity logs first (to avoid foreign key constraint errors)
            const { error: logsError } = await supabase
                .from('activity_logs')
                .delete()
                .eq('user_id', userId);

            if (logsError) throw logsError;

            // 2. Delete the profile (farm_access is set to CASCADE in DB)
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            toast.success(`User "${username}" removed successfully`);
            setUsers(users.filter(u => u.id !== userId));
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to remove user');
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 pb-20">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/owner/dashboard')} className="pl-0 hover:bg-transparent">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
                    </Button>
                    <Button onClick={() => navigate('/owner/add-user')}>
                        <UserPlus className="w-4 h-4 mr-2" /> Add New User
                    </Button>
                </div>

                <div>
                    <h1 className="text-2xl font-bold">Manage Users</h1>
                    <p className="text-muted-foreground">Oversee your hatchery staff</p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading users...</div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-2xl border border-dashed">
                        <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <h3 className="text-lg font-semibold">No Users Found</h3>
                        <p className="text-muted-foreground mb-4">You haven't added any staff members yet.</p>
                        <Button onClick={() => navigate('/owner/add-user')}>Add First User</Button>
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                        <div className="divide-y">
                            {users.map(u => (
                                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.auth_user_id ? 'bg-primary/10 text-primary' : 'bg-yellow-100 text-yellow-600'}`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{u.username}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="capitalize px-2 py-0.5 bg-secondary rounded-full border">{u.role}</span>
                                                <span className="text-green-600 flex items-center gap-1">● Active</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenAccessDialog(u)}
                                            className="text-primary hover:text-primary hover:bg-primary/10"
                                        >
                                            <Key className="w-5 h-5" />
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove User?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove <strong>{u.username}</strong>?
                                                        This action cannot be undone. They will lose access immediately.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(u.id, u.username)} className="bg-destructive hover:bg-destructive/90">
                                                        Remove User
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Access Dialog */}
            <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            Manage Farm Access
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border">
                                <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">{editingUser?.username}</p>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{editingUser?.role}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest pl-1">Assign Permissions</Label>
                            {farms.length === 0 ? (
                                <p className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded-lg border border-yellow-100 italic text-center">No farms created yet.</p>
                            ) : (
                                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                    id={`edit-farm-${farm.id}`}
                                                    checked={isFarmSelected(farm.id)}
                                                    onCheckedChange={() => handleToggle('farm', farm.id)}
                                                />
                                                <Label 
                                                    htmlFor={`edit-farm-${farm.id}`} 
                                                    className="text-sm font-bold flex-1 cursor-pointer py-1"
                                                >
                                                    {farm.name} (Farm)
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
                                                                    id={`edit-section-${section.id}`}
                                                                    checked={isSectionSelected(section.id, farm.id)}
                                                                    disabled={isFarmSelected(farm.id)}
                                                                    onCheckedChange={() => handleToggle('section', section.id)}
                                                                />
                                                                <Label 
                                                                    htmlFor={`edit-section-${section.id}`} 
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
                                                                                id={`edit-tank-${tank.id}`}
                                                                                checked={isTankSelected(tank.id, section.id, farm.id)}
                                                                                disabled={isSectionSelected(section.id, farm.id)}
                                                                                onCheckedChange={() => handleToggle('tank', tank.id)}
                                                                            />
                                                                            <Label 
                                                                                htmlFor={`edit-tank-${tank.id}`} 
                                                                                className={`text-xs cursor-pointer ${isSectionSelected(section.id, farm.id) ? 'opacity-50' : ''}`}
                                                                            >
                                                                                {tank.name} (Tank)
                                                                            </Label>
                                                                        </div>
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
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsAccessDialogOpen(false)} disabled={actionLoading} className="rounded-xl h-12 order-2 sm:order-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveAccess} disabled={actionLoading} className="rounded-xl h-12 shadow-lg shadow-primary/20 order-1 sm:order-2">
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Permissions"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageUsers;
