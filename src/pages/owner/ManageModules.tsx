import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, PlusCircle, Trash2, Loader2, Layers, FlaskConical, Sprout } from 'lucide-react';
import Breadcrumbs from '@/modules/shared/components/Breadcrumbs';

const ALL_MODULES = [
    {
        id: 'LRT',
        label: 'LRT',
        subtitle: 'Larval Rearing Technology',
        description: 'Manage larval rearing tanks, water quality, feed, artemia, algae, and harvest operations.',
        icon: FlaskConical,
        color: 'blue',
        bgGradient: 'from-blue-500/10 to-cyan-500/10',
        borderColor: 'border-blue-200',
        activeBorder: 'border-blue-500',
        iconBg: 'bg-blue-100 text-blue-600',
        badgeBg: 'bg-blue-100 text-blue-700',
    },
    {
        id: 'MATURATION',
        label: 'Maturation',
        subtitle: 'Broodstock Management',
        description: 'Track broodstock, spawning, egg counts, nauplii harvest, and maturation activities.',
        icon: Layers,
        color: 'purple',
        bgGradient: 'from-purple-500/10 to-pink-500/10',
        borderColor: 'border-purple-200',
        activeBorder: 'border-purple-500',
        iconBg: 'bg-purple-100 text-purple-600',
        badgeBg: 'bg-purple-100 text-purple-700',
    },
    {
        id: 'FARMS',
        label: 'Farm',
        subtitle: 'Grow-out Farm Management',
        description: 'Manage grow-out ponds, stocking, feeding, water quality, and harvest for farms.',
        icon: Sprout,
        color: 'emerald',
        bgGradient: 'from-emerald-500/10 to-teal-500/10',
        borderColor: 'border-emerald-200',
        activeBorder: 'border-emerald-500',
        iconBg: 'bg-emerald-100 text-emerald-600',
        badgeBg: 'bg-emerald-100 text-emerald-700',
    },
];

const ManageModules = () => {
    const navigate = useNavigate();
    const { user, setActiveModule, activeModule } = useAuth();
    const [saving, setSaving] = useState(false);
    const [pendingModules, setPendingModules] = useState<string[]>(user?.modules || ['LRT', 'MATURATION']);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    const currentModules = user?.modules || ['LRT', 'MATURATION'];
    const hasChanges = JSON.stringify([...pendingModules].sort()) !== JSON.stringify([...currentModules].sort());

    const toggleModule = (moduleId: string) => {
        if (pendingModules.includes(moduleId)) {
            if (pendingModules.length <= 1) {
                toast.error('You must have at least one module active.');
                return;
            }
            setConfirmRemove(moduleId);
        } else {
            setPendingModules(prev => [...prev, moduleId]);
            toast.success(`${moduleId === 'FARMS' ? 'Farm' : moduleId} module added. Save to apply changes.`);
        }
    };

    const confirmRemoveModule = () => {
        if (!confirmRemove) return;
        setPendingModules(prev => prev.filter(m => m !== confirmRemove));
        setConfirmRemove(null);
    };

    const handleSave = async () => {
        if (!user?.hatchery_id) return;
        if (pendingModules.length === 0) {
            toast.error('You must have at least one module active.');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from('hatcheries')
                .update({ modules: pendingModules })
                .eq('id', user.hatchery_id);

            if (error) throw error;

            // If current active module was removed, switch to first available
            if (!pendingModules.includes(activeModule)) {
                setActiveModule(pendingModules[0] as any);
            }

            toast.success('Modules updated! Please refresh to apply all changes.');
            // Give a moment then reload to re-fetch user context
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update modules');
        } finally {
            setSaving(false);
        }
    };

    const activeModuleMeta = ALL_MODULES.filter(m => pendingModules.includes(m.id));
    const availableModuleMeta = ALL_MODULES.filter(m => !pendingModules.includes(m.id));

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 pb-24">
            <div className="max-w-2xl mx-auto space-y-6">
                <Breadcrumbs className="mb-2" />

                <Button variant="ghost" onClick={() => navigate('/owner/dashboard')} className="pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
                </Button>

                <div>
                    <h1 className="text-2xl font-bold">Manage Modules</h1>
                    <p className="text-muted-foreground text-sm mt-1">Add or remove modules from your account. Changes apply to all users in your hatchery.</p>
                </div>

                {/* Active Modules */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Active Modules</h2>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{activeModuleMeta.length}</span>
                    </div>
                    <div className="space-y-3">
                        {activeModuleMeta.map(mod => {
                            const Icon = mod.icon;
                            return (
                                <div
                                    key={mod.id}
                                    className={`relative bg-gradient-to-br ${mod.bgGradient} border-2 ${mod.activeBorder} rounded-2xl p-4 flex items-center gap-4 transition-all`}
                                >
                                    <div className={`w-12 h-12 rounded-xl ${mod.iconBg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-base">{mod.label}</h3>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${mod.badgeBg}`}>ACTIVE</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">{mod.subtitle}</p>
                                        <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed hidden sm:block">{mod.description}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleModule(mod.id)}
                                        className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 h-9 px-3 text-xs"
                                        disabled={pendingModules.length <= 1}
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Available Modules */}
                {availableModuleMeta.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-muted-foreground" />
                            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Available to Add</h2>
                        </div>
                        <div className="space-y-3">
                            {availableModuleMeta.map(mod => {
                                const Icon = mod.icon;
                                return (
                                    <div
                                        key={mod.id}
                                        className={`relative bg-card border-2 border-dashed ${mod.borderColor} rounded-2xl p-4 flex items-center gap-4 opacity-70 hover:opacity-90 transition-all`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${mod.iconBg} opacity-60 flex items-center justify-center flex-shrink-0`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-base">{mod.label}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">{mod.subtitle}</p>
                                            <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed hidden sm:block">{mod.description}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleModule(mod.id)}
                                            className="flex-shrink-0 h-9 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                        >
                                            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Save Button */}
                {hasChanges && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex justify-center gap-3 z-50">
                        <Button variant="outline" onClick={() => setPendingModules(currentModules)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="px-8">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )}

                {/* Confirm Remove Dialog */}
                {confirmRemove && (() => {
                    const mod = ALL_MODULES.find(m => m.id === confirmRemove);
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-card rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
                                <h3 className="font-bold text-lg">Remove {mod?.label} Module?</h3>
                                <p className="text-sm text-muted-foreground">
                                    This will hide the <strong>{mod?.label}</strong> module from your dashboard. 
                                    Your existing farms and data will <strong>not be deleted</strong> — you can re-add the module anytime to access them.
                                </p>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setConfirmRemove(null)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" className="flex-1" onClick={confirmRemoveModule}>
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default ManageModules;
