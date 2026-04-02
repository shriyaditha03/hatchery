import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ArrowLeft, Plus, Loader2, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface TypeItem {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    section_category: string;
}

const DEFAULT_FEED_TYPES = ['Starter Feed', 'Grower Feed', 'Finisher Feed', 'Supplement'];
const DEFAULT_TREATMENT_TYPES = ['Probiotics', 'Antibiotics', 'Mineral Supplement', 'Disinfectant', 'Vitamin'];

const ManageTypes = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'feed' | 'treatment'>('feed');
    const [activeModule, setActiveModule] = useState<'LRT' | 'MATURATION'>('LRT');
    
    const [items, setItems] = useState<TypeItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Add/Edit state
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.hatchery_id) {
            fetchItems();
        }
    }, [user, activeTab, activeModule]);

    const fetchItems = async () => {
        if (!user?.hatchery_id) return;
        setLoading(true);
        try {
            const table = activeTab === 'feed' ? 'feed_types' : 'treatment_types';
            const { data, error } = await supabase
                .from(table)
                .select('id, name, description, is_active, section_category')
                .eq('hatchery_id', user.hatchery_id)
                .eq('section_category', activeModule)
                .order('name');
            
            if (error) throw error;
            const fetchedItems = data || [];
            setItems(fetchedItems);

            // Automatically seed defaults if list is empty
            if (fetchedItems.length === 0) {
                handleLoadDefaults();
            }
        } catch (error: any) {
            console.error('Error fetching types:', error);
            toast.error(`Failed to load ${activeTab} types`);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadDefaults = async () => {
        if (!user?.hatchery_id) return;
        
        const defaults = activeTab === 'feed' ? DEFAULT_FEED_TYPES : DEFAULT_TREATMENT_TYPES;
        setSaving(true);
        
        try {
            const table = activeTab === 'feed' ? 'feed_types' : 'treatment_types';
            
            // Check for existing names to avoid duplicates
            const existingNames = items.map(i => i.name.toLowerCase());
            const newDefaults = defaults.filter(name => !existingNames.includes(name.toLowerCase()));
            
            if (newDefaults.length === 0) {
                toast.info("All default types are already present");
                setSaving(false);
                return;
            }

            const { data, error } = await supabase
                .from(table)
                .insert(newDefaults.map(name => ({
                    name,
                    hatchery_id: user.hatchery_id,
                    description: 'Default type',
                    section_category: activeModule
                })))
                .select();

            if (error) throw error;
            
            toast.success(`Loaded ${newDefaults.length} default ${activeTab} types`);
            fetchItems();
        } catch (error: any) {
            console.error('Error loading defaults:', error);
            toast.error(error.message || 'Failed to load defaults');
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim()) {
            toast.error('Name is required');
            return;
        }

        const isDuplicate = items.some(item => 
            item.name.toLowerCase() === newName.trim().toLowerCase()
        );

        if (isDuplicate) {
            toast.error(`A ${activeTab} type with this name already exists`);
            return;
        }
        
        setSaving(true);
        try {
            const table = activeTab === 'feed' ? 'feed_types' : 'treatment_types';
            const { data, error } = await supabase
                .from(table)
                .insert({
                    name: newName.trim(),
                    description: newDesc.trim() || null,
                    hatchery_id: user?.hatchery_id,
                    section_category: activeModule
                })
                .select()
                .single();
                
            if (error) {
                if (error.code === '23505') {
                    throw new Error('A type with this name already exists.');
                }
                throw error;
            }
            
            setItems(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setIsAdding(false);
            setNewName('');
            setNewDesc('');
            toast.success(`Added new ${activeTab} type`);
        } catch (error: any) {
            console.error('Error adding type:', error);
            toast.error(error.message || `Failed to add ${activeTab} type`);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string, updates: Partial<TypeItem>) => {
        try {
            const table = activeTab === 'feed' ? 'feed_types' : 'treatment_types';
            const { error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id);
                
            if (error) {
                if (error.code === '23505') {
                    throw new Error('A type with this name already exists.');
                }
                throw error;
            }
            
            setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
            
            if (updates.name) {
                toast.success('Updated successfully');
                setIsEditing(null);
            } else if (updates.is_active !== undefined) {
                toast.success(`Type ${updates.is_active ? 'enabled' : 'disabled'}`);
            }
        } catch (error: any) {
            console.error('Error updating type:', error);
            toast.error(error.message || 'Failed to update type');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this type? This may affect historical data if it was used.')) {
            return;
        }
        
        try {
            const table = activeTab === 'feed' ? 'feed_types' : 'treatment_types';
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            setItems(prev => prev.filter(item => item.id !== id));
            toast.success('Deleted successfully');
        } catch (error: any) {
            console.error('Error deleting type:', error);
            toast.error('Failed to delete type. It might be in use by existing records.');
        }
    };

    const startEdit = (item: TypeItem) => {
        setIsEditing(item.id);
        setEditName(item.name);
        setEditDesc(item.description || '');
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setEditName('');
        setEditDesc('');
    };

    const saveEdit = (id: string) => {
        if (!editName.trim()) {
            toast.error('Name cannot be empty');
            return;
        }
        handleUpdate(id, { name: editName.trim(), description: editDesc.trim() || null });
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 pb-20">
            <div className="max-w-3xl mx-auto">
                <Breadcrumbs className="mb-4" />
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/owner/dashboard')} className="pl-0 hover:bg-transparent -ml-3">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
                    </Button>
                </div>
                
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                        Manage Types
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure the options available in activity dropdowns for your hatchery.
                    </p>
                </div>

                {/* Custom Tabs */}
                <div className="flex bg-muted/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                            activeTab === 'feed' 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Feed Types
                    </button>
                    <button
                        onClick={() => setActiveTab('treatment')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                            activeTab === 'treatment' 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Treatment Types
                    </button>
                </div>

                {/* Module Selector */}
                <div className="flex bg-blue-50/50 p-1 rounded-xl border border-blue-100/50 overflow-hidden">
                    <button
                        onClick={() => setActiveModule('LRT')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                            activeModule === 'LRT' 
                                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                                : 'text-blue-400 hover:text-blue-600'
                        }`}
                    >
                        LRT Module
                    </button>
                    <button
                        onClick={() => setActiveModule('MATURATION')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                            activeModule === 'MATURATION' 
                                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                                : 'text-blue-400 hover:text-blue-600'
                        }`}
                    >
                        MATURATION Module
                    </button>
                </div>

                <div className="glass-card rounded-2xl border shadow-sm p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold capitalize">{activeTab} Types</h2>
                        <div className="flex gap-2">
                            {!isAdding && (
                                <Button variant="outline" onClick={handleLoadDefaults} size="sm" disabled={saving}>
                                    Load Defaults
                                </Button>
                            )}
                            {!isAdding && (
                                <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
                                    <Plus className="w-4 h-4" /> Add New
                                </Button>
                            )}
                        </div>
                    </div>

                    {isAdding && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 space-y-4">
                            <h3 className="text-sm font-bold text-primary">Add New {activeTab === 'feed' ? 'Feed' : 'Treatment'} Type</h3>
                            <div className="grid gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Name *</Label>
                                    <Input 
                                        value={newName} 
                                        onChange={(e) => setNewName(e.target.value)} 
                                        placeholder={`e.g. ${activeTab === 'feed' ? 'Starter Feed' : 'Probiotics'}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Description (Optional)</Label>
                                    <Input 
                                        value={newDesc} 
                                        onChange={(e) => setNewDesc(e.target.value)} 
                                        placeholder="Short description"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={saving}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleAdd} disabled={saving}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-2" />
                            <p className="text-sm text-muted-foreground">Loading types...</p>
                        </div>
                    ) : items.length === 0 && !isAdding ? (
                        <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed">
                            <p className="text-muted-foreground text-sm">No types configured yet.</p>
                            <Button variant="link" onClick={() => setIsAdding(true)}>Add your first type</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${!item.is_active ? 'bg-muted/30 opacity-70' : 'bg-card hover:border-primary/30 transition-colors'}`}
                                >
                                    {isEditing === item.id ? (
                                        <div className="flex-1 space-y-3 w-full">
                                            <Input 
                                                value={editName} 
                                                onChange={(e) => setEditName(e.target.value)} 
                                                className="h-8"
                                            />
                                            <Input 
                                                value={editDesc} 
                                                onChange={(e) => setEditDesc(e.target.value)} 
                                                placeholder="Description"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground">{item.name}</h3>
                                                {(activeTab === 'feed' ? DEFAULT_FEED_TYPES : DEFAULT_TREATMENT_TYPES).includes(item.name) && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>
                                                )}
                                                {!item.is_active && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Disabled</span>
                                                )}
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1 sm:ml-auto self-end sm:self-auto">
                                        {isEditing === item.id ? (
                                            <>
                                                <Button size="icon" variant="ghost" onClick={() => saveEdit(item.id)} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="h-8 text-xs"
                                                    onClick={() => handleUpdate(item.id, { is_active: !item.is_active })}
                                                >
                                                    {item.is_active ? 'Disable' : 'Enable'}
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-8 w-8">
                                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="h-8 w-8 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageTypes;
