import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Breadcrumbs from '@/modules/shared/components/Breadcrumbs';
import { ArrowLeft, Plus, Loader2, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface TypeItem {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    section_category?: string;
}

const DEFAULT_FEED_TYPES = ['Starter Feed', 'Grower Feed', 'Finisher Feed', 'Supplement'];
const DEFAULT_TREATMENT_TYPES = ['Probiotics', 'Antibiotics', 'Mineral Supplement', 'Disinfectant', 'Vitamin'];
const DEFAULT_VANNAMEI_GENETIC_TYPES = ['SIS Hardy Line', 'SIS Growth Line', 'Syaqua', 'KonaBay', 'Others'];
const DEFAULT_TIGER_GENETIC_TYPES = ['Moana', 'Unibio', 'Others'];

// Sort items so defaults appear in their preset order, custom items appended alphabetically
const sortByDefaultOrder = (items: any[], defaultOrder: string[]) =>
    [...items].sort((a, b) => {
        const aIdx = defaultOrder.indexOf(a.name);
        const bIdx = defaultOrder.indexOf(b.name);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
    });

const ManageTypes = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'feed' | 'treatment' | 'vannamei_genetic' | 'tiger_genetic'>('feed');
    const userModules = user?.modules || ['LRT', 'MATURATION'];
    const hatcheryMods = userModules.filter((m: string) => m === 'LRT' || m === 'MATURATION');
    const hasFarms = userModules.includes('FARMS');
    const hasHatchery = hatcheryMods.length > 0;

    const defaultModule: 'LRT' | 'MATURATION' | 'FARMS' = hasFarms && !hasHatchery
        ? 'FARMS'
        : (hatcheryMods[0] as 'LRT' | 'MATURATION') || 'LRT';

    const [activeModule, setActiveModule] = useState<'LRT' | 'MATURATION' | 'FARMS'>(defaultModule);
    const isInHatchery = activeModule === 'LRT' || activeModule === 'MATURATION';
    const isInFarm = activeModule === 'FARMS';
    
    const [items, setItems] = useState<TypeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTableMissing, setIsTableMissing] = useState(false);
    
    // Add/Edit state
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // If activeModule is not FARMS, reset tab to feed if it was one of the genetic ones
    useEffect(() => {
        if (activeModule !== 'FARMS' && (activeTab === 'vannamei_genetic' || activeTab === 'tiger_genetic')) {
            setActiveTab('feed');
        }
    }, [activeModule]);

    useEffect(() => {
        if (user?.hatchery_id) {
            fetchItems();
        }
    }, [user, activeTab, activeModule]);

    const fetchItems = async () => {
        if (!user?.hatchery_id) return;
        setLoading(true);
        try {
            let table = 'feed_types';
            let isGenetic = false;
            let speciesFilter = '';

            if (activeTab === 'feed') {
                table = 'feed_types';
            } else if (activeTab === 'treatment') {
                table = 'treatment_types';
            } else if (activeTab === 'vannamei_genetic') {
                table = 'genetic_line_types';
                isGenetic = true;
                speciesFilter = 'Litopenaeus Vannamei (Vannamei)';
            } else if (activeTab === 'tiger_genetic') {
                table = 'genetic_line_types';
                isGenetic = true;
                speciesFilter = 'Penaeus Monodon (Tiger)';
            }

            const selectCols = isGenetic
                ? 'id, name, description, is_active'
                : 'id, name, description, is_active, section_category';

            let query = supabase
                .from(table)
                .select(selectCols);

            if (isGenetic) {
                query = query
                    .eq('hatchery_id', user.hatchery_id)
                    .eq('species', speciesFilter);
            } else {
                query = query
                    .eq('hatchery_id', user.hatchery_id)
                    .eq('section_category', activeModule);
            }

            // Genetic types: order by created_at to preserve insertion order; feed/treatment: alphabetical
            const { data, error } = isGenetic ? await query.order('created_at') : await query.order('name');
            
            if (error) {
                if (isGenetic && (error.code === 'PGRST205' || error.message?.includes('relation') || error.message?.includes('does not exist'))) {
                    setIsTableMissing(true);
                    const defaults = activeTab === 'vannamei_genetic' ? DEFAULT_VANNAMEI_GENETIC_TYPES : DEFAULT_TIGER_GENETIC_TYPES;
                    setItems(defaults.map((name, index) => ({
                        id: `default-${index}`,
                        name,
                        description: 'Default genetic line',
                        is_active: true,
                    })));
                    return;
                }
                throw error;
            }

            setIsTableMissing(false);
            const fetchedItems = data || [];

            // Apply default-order sort for genetic tabs
            if (isGenetic) {
                const defaultOrder = activeTab === 'vannamei_genetic' ? DEFAULT_VANNAMEI_GENETIC_TYPES : DEFAULT_TIGER_GENETIC_TYPES;
                setItems(sortByDefaultOrder(fetchedItems, defaultOrder));
            } else {
                setItems(fetchedItems);
            }

            // Automatically seed defaults if list is empty
            if (fetchedItems.length === 0) {
                handleLoadDefaults();
            }
        } catch (error: any) {
            console.error('Error fetching types:', error);
            toast.error(`Failed to load ${activeTab.replace('_', ' ')} types`);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadDefaults = async () => {
        if (!user?.hatchery_id) return;
        if (isTableMissing) {
            toast.warning("Cannot load defaults because the table is missing from your database.");
            return;
        }
        
        let defaults = DEFAULT_FEED_TYPES;
        let table = 'feed_types';
        let isGenetic = false;
        let speciesFilter = '';

        if (activeTab === 'feed') {
            defaults = DEFAULT_FEED_TYPES;
            table = 'feed_types';
        } else if (activeTab === 'treatment') {
            defaults = DEFAULT_TREATMENT_TYPES;
            table = 'treatment_types';
        } else if (activeTab === 'vannamei_genetic') {
            defaults = DEFAULT_VANNAMEI_GENETIC_TYPES;
            table = 'genetic_line_types';
            isGenetic = true;
            speciesFilter = 'Litopenaeus Vannamei (Vannamei)';
        } else if (activeTab === 'tiger_genetic') {
            defaults = DEFAULT_TIGER_GENETIC_TYPES;
            table = 'genetic_line_types';
            isGenetic = true;
            speciesFilter = 'Penaeus Monodon (Tiger)';
        }

        setSaving(true);
        
        try {
            const existingNames = items.map(i => i.name.toLowerCase());
            const newDefaults = defaults.filter(name => !existingNames.includes(name.toLowerCase()));
            
            if (newDefaults.length === 0) {
                toast.info("All default types are already present");
                setSaving(false);
                return;
            }

            const insertRows = newDefaults.map(name => {
                const row: any = {
                    name,
                    hatchery_id: user.hatchery_id,
                    description: 'Default type'
                };
                if (isGenetic) {
                    row.species = speciesFilter;
                } else {
                    row.section_category = activeModule;
                }
                return row;
            });

            const { data, error } = await supabase
                .from(table)
                .insert(insertRows)
                .select();

            if (error) throw error;
            
            toast.success(`Loaded ${newDefaults.length} default types`);
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

        if (isTableMissing) {
            toast.error("Cannot add new items: Database table is missing.");
            return;
        }

        const isDuplicate = items.some(item => 
            item.name.toLowerCase() === newName.trim().toLowerCase()
        );

        if (isDuplicate) {
            toast.error(`A type with this name already exists`);
            return;
        }
        
        setSaving(true);
        try {
            let table = 'feed_types';
            let isGenetic = false;
            let speciesFilter = '';

            if (activeTab === 'feed') {
                table = 'feed_types';
            } else if (activeTab === 'treatment') {
                table = 'treatment_types';
            } else if (activeTab === 'vannamei_genetic') {
                table = 'genetic_line_types';
                isGenetic = true;
                speciesFilter = 'Litopenaeus Vannamei (Vannamei)';
            } else if (activeTab === 'tiger_genetic') {
                table = 'genetic_line_types';
                isGenetic = true;
                speciesFilter = 'Penaeus Monodon (Tiger)';
            }

            const insertRow: any = {
                name: newName.trim(),
                description: newDesc.trim() || null,
                hatchery_id: user?.hatchery_id
            };

            if (isGenetic) {
                insertRow.species = speciesFilter;
            } else {
                insertRow.section_category = activeModule;
            }

            const { data, error } = await supabase
                .from(table)
                .insert(insertRow)
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
            toast.success(`Added new type`);
        } catch (error: any) {
            console.error('Error adding type:', error);
            toast.error(error.message || `Failed to add type`);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string, updates: Partial<TypeItem>) => {
        if (isTableMissing) {
            toast.error("Cannot update: Database table is missing.");
            return;
        }

        try {
            let table = 'feed_types';
            if (activeTab === 'feed') {
                table = 'feed_types';
            } else if (activeTab === 'treatment') {
                table = 'treatment_types';
            } else if (activeTab === 'vannamei_genetic' || activeTab === 'tiger_genetic') {
                table = 'genetic_line_types';
            }

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
        if (isTableMissing) {
            toast.error("Cannot delete: Database table is missing.");
            return;
        }

        if (!confirm('Are you sure you want to delete this type? This may affect historical data if it was used.')) {
            return;
        }
        
        try {
            let table = 'feed_types';
            if (activeTab === 'feed') {
                table = 'feed_types';
            } else if (activeTab === 'treatment') {
                table = 'treatment_types';
            } else if (activeTab === 'vannamei_genetic' || activeTab === 'tiger_genetic') {
                table = 'genetic_line_types';
            }

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
                        Configure the options available in activity dropdowns for your firm.
                    </p>
                </div>

                {/* Custom Tabs */}
                <div className="flex bg-muted/50 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex-1 min-w-[100px] py-2 text-sm font-semibold rounded-lg transition-colors ${
                            activeTab === 'feed' 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Feed Types
                    </button>
                    <button
                        onClick={() => setActiveTab('treatment')}
                        className={`flex-1 min-w-[120px] py-2 text-sm font-semibold rounded-lg transition-colors ${
                            activeTab === 'treatment' 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Treatment Types
                    </button>
                    {isInFarm && (
                        <>
                            <button
                                onClick={() => setActiveTab('vannamei_genetic')}
                                className={`flex-1 min-w-[170px] py-2 text-sm font-semibold rounded-lg transition-colors ${
                                    activeTab === 'vannamei_genetic' 
                                        ? 'bg-white text-primary shadow-sm' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Vannamei Genetic Lines
                            </button>
                            <button
                                onClick={() => setActiveTab('tiger_genetic')}
                                className={`flex-1 min-w-[150px] py-2 text-sm font-semibold rounded-lg transition-colors ${
                                    activeTab === 'tiger_genetic' 
                                        ? 'bg-white text-primary shadow-sm' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Tiger Genetic Lines
                            </button>
                        </>
                    )}
                </div>

                {/* Module Selector — two-level Hatchery | Farm */}
                {(() => {
                    // Only FARMS, no hatchery
                    if (!hasHatchery && hasFarms) {
                        return (
                            <div className="flex bg-blue-50/50 p-1 rounded-xl border border-blue-100/50">
                                <span className="flex-1 py-2 text-xs font-bold rounded-lg text-center bg-blue-600 text-white shadow-md">
                                    Farm Module
                                </span>
                            </div>
                        );
                    }

                    // Only one hatchery mod, no FARMS
                    if (hasHatchery && hatcheryMods.length === 1 && !hasFarms) {
                        return (
                            <div className="flex bg-blue-50/50 p-1 rounded-xl border border-blue-100/50">
                                <span className="flex-1 py-2 text-xs font-bold rounded-lg text-center bg-blue-600 text-white shadow-md">
                                    {hatcheryMods[0]} Module
                                </span>
                            </div>
                        );
                    }

                    // LRT + MATURATION only, no FARMS
                    if (hasHatchery && hatcheryMods.length === 2 && !hasFarms) {
                        return (
                            <div className="flex bg-blue-50/50 p-1 rounded-xl border border-blue-100/50 overflow-hidden">
                                {hatcheryMods.map((mod: string) => (
                                    <button key={mod}
                                        onClick={() => setActiveModule(mod as any)}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                                            activeModule === mod
                                                ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                                                : 'text-blue-400 hover:text-blue-600'
                                        }`}
                                    >
                                        {mod} Module
                                    </button>
                                ))}
                            </div>
                        );
                    }

                    // Has FARMS + at least one hatchery mod — two-level
                    return (
                        <div className="space-y-2">
                            {/* Top level: Hatchery | Farm */}
                            <div className="flex bg-blue-50/50 p-1 rounded-xl border border-blue-100/50 overflow-hidden">
                                <button
                                    onClick={() => setActiveModule((hatcheryMods[0] || 'LRT') as any)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                                        isInHatchery
                                            ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                                            : 'text-blue-400 hover:text-blue-600'
                                    }`}
                                >
                                    Hatchery
                                </button>
                                <button
                                    onClick={() => setActiveModule('FARMS')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                                        isInFarm
                                            ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                                            : 'text-blue-400 hover:text-blue-600'
                                    }`}
                                >
                                    Farm
                                </button>
                            </div>

                            {/* Sub-level: LRT | MATURATION — only when in hatchery and both exist */}
                            {isInHatchery && hatcheryMods.length === 2 && (
                                <div className="flex bg-blue-50/30 p-0.5 rounded-lg border border-blue-100/30 overflow-hidden">
                                    {hatcheryMods.map((mod: string) => (
                                        <button key={mod}
                                            onClick={() => setActiveModule(mod as any)}
                                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all duration-300 ${
                                                activeModule === mod
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'text-blue-400 hover:text-blue-600'
                                            }`}
                                        >
                                            {mod}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {isTableMissing && (activeTab === 'vannamei_genetic' || activeTab === 'tiger_genetic') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                        <strong>Notice:</strong> Database table <code>genetic_line_types</code> is not yet created. 
                        Showing default genetic lines in read-only mode. To enable adding, editing, or deleting custom genetic lines, please apply the database migration.
                    </div>
                )}

                <div className="glass-card rounded-2xl border shadow-sm p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold capitalize">
                            {activeTab === 'vannamei_genetic' 
                                ? 'Vannamei Genetic Lines' 
                                : activeTab === 'tiger_genetic' 
                                    ? 'Tiger Genetic Lines' 
                                    : `${activeTab} Types`}
                        </h2>
                        <div className="flex gap-2">
                            {!isAdding && !isTableMissing && (
                                <Button variant="outline" onClick={handleLoadDefaults} size="sm" disabled={saving}>
                                    Load Defaults
                                </Button>
                            )}
                            {!isAdding && !isTableMissing && (
                                <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
                                    <Plus className="w-4 h-4" /> Add New
                                </Button>
                            )}
                        </div>
                    </div>

                    {isAdding && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 space-y-4">
                            <h3 className="text-sm font-bold text-primary">
                                Add New {
                                    activeTab === 'feed'
                                        ? 'Feed'
                                        : activeTab === 'treatment'
                                            ? 'Treatment'
                                            : 'Genetic Line'
                                } Type
                            </h3>
                            <div className="grid gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Name *</Label>
                                    <Input 
                                        value={newName} 
                                        onChange={(e) => setNewName(e.target.value)} 
                                        placeholder={`e.g. ${
                                            activeTab === 'feed' 
                                                ? 'Starter Feed' 
                                                : activeTab === 'treatment'
                                                    ? 'Probiotics'
                                                    : activeTab === 'vannamei_genetic'
                                                        ? 'SIS Hardy Line'
                                                        : 'Moana (Moana Technologies)'
                                        }`}
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
                            {!isTableMissing && (
                                <Button variant="link" onClick={() => setIsAdding(true)}>Add your first type</Button>
                            )}
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
                                                {(() => {
                                                    let defaults = DEFAULT_FEED_TYPES;
                                                    if (activeTab === 'feed') defaults = DEFAULT_FEED_TYPES;
                                                    else if (activeTab === 'treatment') defaults = DEFAULT_TREATMENT_TYPES;
                                                    else if (activeTab === 'vannamei_genetic') defaults = DEFAULT_VANNAMEI_GENETIC_TYPES;
                                                    else if (activeTab === 'tiger_genetic') defaults = DEFAULT_TIGER_GENETIC_TYPES;
                                                    
                                                    return defaults.includes(item.name);
                                                })() && (
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
                                        {isTableMissing && (activeTab === 'vannamei_genetic' || activeTab === 'tiger_genetic') ? (
                                            <span className="text-xs text-muted-foreground italic bg-muted/40 px-2 py-1 rounded">Read-only (Default)</span>
                                        ) : isEditing === item.id ? (
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
