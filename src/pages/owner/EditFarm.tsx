import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Layers, Cylinder, Plus, Check, Trash2, Copy, ChevronDown, ChevronUp, Utensils, Waves } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TankConfig {
    id?: string;
    name: string;
    type: 'FRP' | 'CONCRETE';
    shape: 'CIRCLE' | 'RECTANGLE';
    gender?: 'MALE' | 'FEMALE';
    length: number;
    width: number;
    height: number;
    radius: number;
    volume: number;
    area: number;
}

interface SectionConfig {
    id?: string;
    name: string;
    type?: 'ANIMAL' | 'SPAWNING' | 'NAUPLII' | 'LRT';
    tanks: TankConfig[];
}

const DuplicateTankPopover = ({ onDuplicate }: { onDuplicate: (count: number) => void }) => {
    const [count, setCount] = useState<number | string>(1);
    const [open, setOpen] = useState(false);

    const handleDuplicate = () => {
        const num = Number(count);
        if (num > 0 && !isNaN(num)) {
            onDuplicate(num);
            setOpen(false);
            setCount(1);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 transition-colors" title="Duplicate Tank">
                    <Copy className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60" align="end">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm">Duplicate Tank</h4>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            min="1" 
                            max="50"
                            value={count} 
                            onChange={(e) => setCount(e.target.value)} 
                            className="h-9"
                        />
                        <Button size="sm" onClick={handleDuplicate}>Copy</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const EditFarm = () => {
    const { id: farmId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [farmName, setFarmName] = useState('');
    const [farmCategory, setFarmCategory] = useState<'LRT' | 'MATURATION'>('LRT');
    const [sections, setSections] = useState<SectionConfig[]>([]);
    const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

    useEffect(() => {
        if (farmId) {
            fetchFarmData();
        }
    }, [farmId]);

    const fetchFarmData = async () => {
        try {
            setLoading(true);

            // 1. Get Farm
            const { data: farm, error: farmError } = await supabase
                .from('farms')
                .select('*')
                .eq('id', farmId)
                .single();

            if (farmError) throw farmError;
            setFarmName(farm.name);
            setFarmCategory(farm.category || 'LRT');

            // 2. Get Sections
            const { data: sectionsData, error: sectionError } = await supabase
                .from('sections')
                .select('*')
                .eq('farm_id', farmId)
                .order('created_at');

            if (sectionError) throw sectionError;

            // 3. Get Tanks
            const { data: tanksData, error: tankError } = await supabase
                .from('tanks')
                .select('*')
                .eq('farm_id', farmId)
                .order('name');

            if (tankError) throw tankError;

            // 4. Map to local state
            const mappedSections: SectionConfig[] = sectionsData.map(s => ({
                id: s.id,
                name: s.name,
                type: s.section_type || (farm.category === 'MATURATION' ? 'ANIMAL' : 'LRT'),
                tanks: tanksData
                    .filter(t => t.section_id === s.id)
                    .map(t => ({
                        id: t.id,
                        name: t.name,
                        gender: t.gender || null,
                        type: t.type as 'FRP' | 'CONCRETE',
                        shape: t.shape as 'CIRCLE' | 'RECTANGLE',
                        length: t.length || 0,
                        width: t.width || 0,
                        height: t.height || 0,
                        radius: t.radius || 0,
                        volume: t.volume_litres || 0,
                        area: t.area_sqm || 0
                    }))
            }));

            setSections(mappedSections);
        } catch (error: any) {
            console.error('Error fetching farm:', error);
            toast.error("Failed to load farm details");
            navigate('/owner/farms');
        } finally {
            setLoading(false);
        }
    };

    const calculateTank = (tank: TankConfig): { volume: number, area: number } => {
        let volume = 0;
        let area = 0;
        const h = Number(tank.height) || 0;

        if (tank.shape === 'RECTANGLE') {
            const l = Number(tank.length) || 0;
            const w = Number(tank.width) || 0;
            area = l * w;
            volume = area * h * 1000;
        } else {
            const r = Number(tank.radius) || 0;
            area = Math.PI * Math.pow(r, 2);
            volume = area * h * 1000;
        }

        return {
            volume: Math.round(volume * 100) / 100,
            area: Math.round(area * 100) / 100
        };
    };

    const updateTank = (sIdx: number, tIdx: number, updates: Partial<TankConfig>) => {
        setSections(prev => {
            const newSections = [...prev];
            const tank = { ...newSections[sIdx].tanks[tIdx], ...updates };
            const { volume, area } = calculateTank(tank);
            newSections[sIdx].tanks[tIdx] = { ...tank, volume, area };
            return newSections;
        });
    };

    const getTankPrefix = (section: SectionConfig, sIdx: number) => {
        const sNumMatch = section.name.match(/\d+/);
        const sNum = sNumMatch ? sNumMatch[0] : (sIdx + 1);

        if (section.type === 'ANIMAL') return `AS${sNum}`;
        if (section.type === 'SPAWNING') return `SS${sNum}`;
        if (section.type === 'NAUPLII') return `NS${sNum}`;
        return `S${sNum}`;
    };

    const addSectionByType = (type: 'ANIMAL' | 'SPAWNING' | 'NAUPLII' | 'LRT') => {
        const typeLabel = type === 'ANIMAL' ? 'Animal' : type === 'SPAWNING' ? 'Spawning' : type === 'NAUPLII' ? 'Nauplii' : 'Section';
        
        // Find the max number currently used for this type to avoid duplicates
        const existingNumbers = sections
            .filter(s => s.type === type)
            .map(s => {
                const match = s.name.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            });
        const nextNum = Math.max(0, ...existingNumbers) + 1;
        
        const newSection: SectionConfig = {
            name: `${typeLabel} Section ${nextNum}`,
            type: type,
            tanks: []
        };
        setSections(prev => [...prev, newSection]);
        toast.success(`Added ${typeLabel} Section ${nextNum}`);
    };

    const addSection = () => {
        setSections(prev => [
            ...prev,
            { name: `New Section ${prev.length + 1}`, type: 'LRT', tanks: [] }
        ]);
    };

    const removeSection = (sIdx: number) => {
        setSections(prev => prev.filter((_, idx) => idx !== sIdx));
    };

    const addTank = (sIdx: number, gender?: 'MALE' | 'FEMALE') => {
        setSections(prev => {
            const newSections = [...prev];
            const currentSection = newSections[sIdx];
            const currentTanks = currentSection.tanks;
            
            const prefix = getTankPrefix(currentSection, sIdx);
            
            let tankName = '';
            if (currentSection.type === 'ANIMAL' && gender) {
                const genderCode = gender === 'MALE' ? 'MT' : 'FT';
                const genderTanks = currentTanks.filter(t => t.gender === gender);
                tankName = `${prefix}_${genderCode}${genderTanks.length + 1}`;
            } else {
                tankName = `${prefix}_T${currentTanks.length + 1}`;
            }

            newSections[sIdx].tanks.push({
                name: tankName,
                gender: gender,
                type: 'FRP',
                shape: 'RECTANGLE',
                length: 0,
                width: 0,
                height: 0,
                radius: 0,
                volume: 0,
                area: 0
            });
            return newSections;
        });
        // Expand the section when adding a tank
        const sectionId = sections[sIdx].id || `new-sec-${sIdx}`;
        setCollapsedSections(prev => prev.filter(id => id !== sectionId));
    };

    const removeTank = (sIdx: number, tIdx: number) => {
        setSections(prev => {
            const newSections = [...prev];
            newSections[sIdx].tanks = newSections[sIdx].tanks.filter((_, idx) => idx !== tIdx);
            return newSections;
        });
    };

    const duplicateTank = (sIdx: number, tIdx: number, count: number) => {
        setSections(prev => {
            const newSections = [...prev];
            const currentSection = newSections[sIdx];
            const currentTanks = currentSection.tanks;
            const tankToCopy = currentTanks[tIdx];
            const prefix = getTankPrefix(currentSection, sIdx);

            const newTanks = Array.from({ length: count }).map((_, i) => {
                let newName = '';
                if (tankToCopy.gender) {
                    const genderCode = tankToCopy.gender === 'MALE' ? 'MT' : 'FT';
                    const existingGenderCount = currentTanks.filter(t => t.gender === tankToCopy.gender).length;
                    newName = `${prefix}_${genderCode}${existingGenderCount + i + 1}`;
                } else {
                    newName = `${prefix}_T${currentTanks.length + i + 1}`;
                }
                return { ...tankToCopy, id: undefined, name: newName };
            });

            newSections[sIdx].tanks = [...currentTanks, ...newTanks];
            return newSections;
        });
        const sectionId = sections[sIdx].id || `new-sec-${sIdx}`;
        setCollapsedSections(prev => prev.filter(id => id !== sectionId));
        toast.success(`Duplicated tank ${count} times`);
    };

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => 
            prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
        );
    };

    const renderTankCard = (tank: TankConfig, sIdx: number, tIdx: number) => (
        <Card key={tank.id || `tank-${sIdx}-${tIdx}`} className="rounded-2xl border-none shadow-md overflow-hidden bg-card/50">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 w-1/2">
                        <div className={`w-2 h-2 rounded-full ${tank.gender === 'MALE' ? 'bg-blue-500' : tank.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-muted'}`} />
                        <Input
                            className="font-bold border-none bg-transparent p-0 text-md focus-visible:ring-0"
                            value={tank.name}
                            onChange={(e) => updateTank(sIdx, tIdx, { name: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <DuplicateTankPopover onDuplicate={(count) => duplicateTank(sIdx, tIdx, count)} />
                        <Button variant="ghost" size="icon" onClick={() => removeTank(sIdx, tIdx)} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Type</Label>
                        <Select value={tank.type} onValueChange={(val: any) => updateTank(sIdx, tIdx, { type: val })}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FRP">FRP</SelectItem>
                                <SelectItem value="CONCRETE">Concrete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Shape</Label>
                        <Select value={tank.shape} onValueChange={(val: any) => updateTank(sIdx, tIdx, { shape: val })}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CIRCLE">Circular</SelectItem>
                                <SelectItem value="RECTANGLE">Rectangular</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className={`grid ${tank.shape === 'CIRCLE' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'} gap-3`}>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Height (m)</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.1"
                            className="h-9 text-xs"
                            value={tank.height || ''}
                            onChange={(e) => updateTank(sIdx, tIdx, { height: Number(e.target.value) })}
                        />
                    </div>
                    {tank.shape === 'CIRCLE' ? (
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Radius (m)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.1"
                                className="h-9 text-xs"
                                value={tank.radius || ''}
                                onChange={(e) => updateTank(sIdx, tIdx, { radius: Number(e.target.value) })}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Length (m)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className="h-9 text-xs"
                                    value={tank.length || ''}
                                    onChange={(e) => updateTank(sIdx, tIdx, { length: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Width (m)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className="h-9 text-xs"
                                    value={tank.width || ''}
                                    onChange={(e) => updateTank(sIdx, tIdx, { width: Number(e.target.value) })}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className={`pt-1 grid ${tank.shape === 'CIRCLE' ? 'grid-cols-2' : 'grid-cols-3'} gap-3 border-t border-dashed mt-1`}>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Volume</p>
                        <p className="font-bold text-primary text-sm">{tank.volume.toLocaleString()} L</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Area</p>
                        <p className="font-bold text-primary text-sm">{tank.area.toLocaleString()} m²</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const handleSubmit = async () => {
        if (!user?.hatchery_id || !farmId) return;
        if (!farmName.trim()) {
            toast.error("Farm name is required");
            return;
        }

        try {
            setSaving(true);

            // 0. Check for duplicate farm name
            const { data: existingFarm, error: checkError } = await supabase
                .from('farms')
                .select('id')
                .eq('hatchery_id', user.hatchery_id)
                .eq('name', farmName.trim())
                .neq('id', farmId)
                .maybeSingle();
            
            if (checkError) throw checkError;
            if (existingFarm) {
                toast.error("A farm with this name already exists in your hatchery");
                setSaving(false);
                return;
            }

            // 0.1 Check for duplicate section names
            const sectionNames = sections.map(s => s.name.trim().toLowerCase());
            const duplicateSection = sectionNames.find((name, index) => sectionNames.indexOf(name) !== index);
            if (duplicateSection) {
                toast.error(`Duplicate section name: "${sections[sectionNames.indexOf(duplicateSection)].name}"`);
                setSaving(false);
                return;
            }

            const { error: farmError } = await supabase
                .from('farms')
                .update({ name: farmName, category: farmCategory })
                .eq('id', farmId);
            if (farmError) throw farmError;

            // Get existing IDs from DB to detect deletions
            const { data: dbSections } = await supabase.from('sections').select('id').eq('farm_id', farmId);
            const { data: dbTanks } = await supabase.from('tanks').select('id').eq('farm_id', farmId);

            const activeSectionIds = sections.map(s => s.id).filter(Boolean) as string[];
            const activeTankIds = sections.flatMap(s => s.tanks.map(t => t.id)).filter(Boolean) as string[];

            // 2. Perform Deletions
            const sectionsToDelete = dbSections?.filter(s => !activeSectionIds.includes(s.id)).map(s => s.id) || [];
            const tanksToDelete = dbTanks?.filter(t => !activeTankIds.includes(t.id)).map(t => t.id) || [];

            if (tanksToDelete.length > 0) {
                // Delete quality records first (non-cascading FK references to tank_id)
                await supabase.from('stocking_animal_quality').delete().in('tank_id', tanksToDelete);
                await supabase.from('stocking_water_quality').delete().in('tank_id', tanksToDelete);
                // Delete associated logs
                await supabase.from('activity_logs').delete().in('tank_id', tanksToDelete);
                await supabase.from('tanks').delete().in('id', tanksToDelete);
            }
            if (sectionsToDelete.length > 0) {
                // Delete quality records first (non-cascading FK references to section_id)
                await supabase.from('stocking_animal_quality').delete().in('section_id', sectionsToDelete);
                await supabase.from('stocking_water_quality').delete().in('section_id', sectionsToDelete);
                // Delete associated logs
                await supabase.from('activity_logs').delete().in('section_id', sectionsToDelete);
                await supabase.from('sections').delete().in('id', sectionsToDelete);
            }

            // 3. Process Sections and Tanks (Upsert)
            for (const section of sections) {
                let currentSectionId = section.id;

                if (!currentSectionId) {
                    // Create new section
                    const { data: newSec, error: secErr } = await supabase
                        .from('sections')
                        .insert([{ farm_id: farmId, name: section.name, section_type: (section.type === 'LRT') ? null : section.type }])
                        .select().single();
                    if (secErr) throw secErr;
                    currentSectionId = newSec.id;
                } else {
                    // Update existing section
                    const { error: secErr } = await supabase
                        .from('sections')
                        .update({ name: section.name, section_type: (section.type === 'LRT') ? null : section.type })
                        .eq('id', currentSectionId);
                    if (secErr) throw secErr;
                }

                // Upsert Tanks for this section
                const tanksToUpsert = section.tanks.map(tank => {
                    const t: any = {
                        farm_id: farmId,
                        section_id: currentSectionId,
                        name: tank.name,
                        gender: tank.gender || null,
                        type: tank.type,
                        shape: tank.shape,
                        length: tank.shape === 'RECTANGLE' ? tank.length : null,
                        width: tank.shape === 'RECTANGLE' ? tank.width : null,
                        height: tank.height,
                        radius: tank.shape === 'CIRCLE' ? tank.radius : null,
                        volume_litres: tank.volume,
                        area_sqm: tank.area
                    };
                    if (tank.id) t.id = tank.id;
                    return t;
                });

                const { error: tankErr } = await supabase.from('tanks').upsert(tanksToUpsert);
                if (tankErr) throw tankErr;
            }

            toast.success("Farm configuration updated!");
            navigate('/owner/farms');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 pb-24">
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/owner/farms')} className="pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back to Manage Farms
                </Button>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold">Edit Farm Configuration</h1>
                        <p className="text-muted-foreground">Modify sections and individual tanks</p>
                    </div>
                </div>

                <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="farmName">Farm Name</Label>
                                <Input
                                    id="farmName"
                                    value={farmName}
                                    onChange={(e) => setFarmName(e.target.value)}
                                    placeholder="e.g. Block A"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="farmCategory">Module Type</Label>
                                <Select value={farmCategory} onValueChange={(val: any) => setFarmCategory(val)}>
                                    <SelectTrigger id="farmCategory">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LRT">LRT (Larval Rearing)</SelectItem>
                                        <SelectItem value="MATURATION">Maturation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    {sections.map((section, sIdx) => {
                        const sectionId = section.id || `new-sec-${sIdx}`;
                        const isCollapsed = collapsedSections.includes(sectionId);
                        const totalVolume = section.tanks.reduce((sum, t) => sum + (Number(t.volume) || 0), 0);
                        const totalArea = section.tanks.reduce((sum, t) => sum + (Number(t.area) || 0), 0);
                        
                        return (
                        <div key={sectionId} className="space-y-4">
                            <div className="glass-card p-3 sm:p-4 rounded-2xl border-l-4 border-l-primary flex flex-col md:flex-row md:items-center justify-between shadow-md cursor-pointer hover:bg-muted/10 transition-colors sticky top-2 z-30 bg-background/95 backdrop-blur-md gap-3" onClick={() => toggleSection(sectionId)}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
                                        <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                className="h-7 sm:h-9 font-bold bg-transparent border-none text-base sm:text-lg p-0 focus-visible:ring-0 w-full max-w-[150px] sm:max-w-64 truncate"
                                                value={section.name}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const newSections = [...sections];
                                                    newSections[sIdx].name = e.target.value;
                                                    setSections(newSections);
                                                }}
                                            />
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {section.type === 'ANIMAL' ? (
                                                    <div className="flex gap-1.5 md:gap-2 flex-wrap">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => addTank(sIdx, 'MALE')}
                                                            className="h-7 sm:h-8 px-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[9px] sm:text-[10px] rounded-lg transition-all"
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" /> MALE
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => addTank(sIdx, 'FEMALE')}
                                                            className="h-7 sm:h-8 px-2 border border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100 font-bold text-[9px] sm:text-[10px] rounded-lg transition-all"
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" /> FEMALE
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => addTank(sIdx)}
                                                        className="h-7 sm:h-8 px-2 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold text-[9px] sm:text-[10px] rounded-lg transition-all"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> TANK
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-1 md:mt-0 flex-wrap">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 text-[10px] sm:text-xs">
                                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                                        </Button>
                                    </div>
                                    <div className="ml-1 text-muted-foreground flex-shrink-0">
                                        {isCollapsed ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </div>
                                </div>
                            </div>

                            {!isCollapsed && (
                                <div className="grid gap-4 animate-in slide-in-from-top-2 duration-300">
                                    {section.type === 'ANIMAL' ? (
                                        <div className="space-y-6">
                                            {/* Male Subsection */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Male Tanks</h3>
                                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-100 to-transparent" />
                                                </div>
                                                <div className="grid gap-4">
                                                    {section.tanks.filter(t => t.gender === 'MALE').map((tank) => {
                                                        const tIdx = section.tanks.findIndex(t => t === tank);
                                                        return renderTankCard(tank, sIdx, tIdx);
                                                    })}
                                                    {section.tanks.filter(t => t.gender === 'MALE').length === 0 && (
                                                        <p className="text-[10px] text-muted-foreground italic px-3 py-4 bg-muted/5 rounded-xl border border-dashed text-center">No male tanks added.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Female Subsection */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-pink-600">Female Tanks</h3>
                                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-pink-100 to-transparent" />
                                                </div>
                                                <div className="grid gap-4">
                                                    {section.tanks.filter(t => t.gender === 'FEMALE').map((tank) => {
                                                        const tIdx = section.tanks.findIndex(t => t === tank);
                                                        return renderTankCard(tank, sIdx, tIdx);
                                                    })}
                                                    {section.tanks.filter(t => t.gender === 'FEMALE').length === 0 && (
                                                        <p className="text-[10px] text-muted-foreground italic px-3 py-4 bg-muted/5 rounded-xl border border-dashed text-center">No female tanks added.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {section.tanks.map((tank, tIdx) => renderTankCard(tank, sIdx, tIdx))}
                                            {section.tanks.length === 0 && (
                                                <div className="py-8 bg-muted/20 border border-dashed rounded-2xl text-center">
                                                    <p className="text-xs text-muted-foreground font-medium italic">No tanks added to this section yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Section Capacity Summary Footer */}
                                    <div className="mt-2 bg-muted/20 rounded-xl p-3 border border-dashed border-muted flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        <span>Section Total Capacity</span>
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-emerald-500" /> <span className="text-foreground">{totalVolume.toLocaleString()} L</span></span>
                                            <span className="flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-blue-500" /> <span className="text-foreground">{totalArea.toLocaleString()} m²</span></span>
                                        </div>
                                    </div>
                                </div>
                                )}
                        </div>
                    );
                    })}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        {farmCategory === 'MATURATION' ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => addSectionByType('ANIMAL')}
                                    className="flex-1 border-dashed border-2 py-8 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex flex-col gap-1"
                                >
                                    <Plus className="w-5 h-5 text-primary/40" />
                                    <span className="font-bold text-[10px] uppercase tracking-wider">Add Animal Section</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => addSectionByType('SPAWNING')}
                                    className="flex-1 border-dashed border-2 py-8 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex flex-col gap-1"
                                >
                                    <Plus className="w-5 h-5 text-primary/40" />
                                    <span className="font-bold text-[10px] uppercase tracking-wider">Add Spawning Section</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => addSectionByType('NAUPLII')}
                                    className="flex-1 border-dashed border-2 py-8 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex flex-col gap-1"
                                >
                                    <Plus className="w-5 h-5 text-primary/40" />
                                    <span className="font-bold text-[10px] uppercase tracking-wider">Add Nauplii Section</span>
                                </Button>
                            </>
                        ) : (
                            <Button onClick={addSection} className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold transition-all">
                                <Plus className="w-5 h-5 mr-2" /> Add New Section
                            </Button>
                        )}
                    </div>
                </div>

                <div className="h-10" />

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex justify-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full max-w-lg h-12 rounded-xl text-md font-bold shadow-xl shadow-primary/20"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                            <div className="flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" /> Save Changes
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditFarm;
