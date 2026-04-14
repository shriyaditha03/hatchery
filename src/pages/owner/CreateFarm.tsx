import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Layers, Cylinder, Plus, Check, Trash2, Copy, ChevronDown, ChevronUp, Utensils, Waves, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TankConfig {
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
    name: string;
    type: 'ANIMAL' | 'SPAWNING' | 'NAUPLII' | 'LRT';
    tanks: TankConfig[];
}

interface AddressConfig {
    plotNumber: string;
    areaName: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    latitude: number | null;
    longitude: number | null;
    plotArea: number;
    plotLength: number;
    plotWidth: number;
}

const TankCountInput = ({ count, onChange }: { count: number, onChange: (val: number) => void }) => {
    const [val, setVal] = useState<string | number>(count);

    useEffect(() => {
        setVal(count);
    }, [count]);

    return (
        <Input
            type="number"
            min="0"
            max="100"
            value={val}
            onChange={(e) => {
                const v = e.target.value;
                setVal(v);
                const num = parseInt(v);
                if (!isNaN(num) && num >= 0) {
                    onChange(num);
                }
            }}
            onBlur={() => {
                if (val === '' || isNaN(Number(val))) {
                    setVal(count);
                }
            }}
            className="w-14 h-7 text-center font-bold text-xs bg-transparent border-none focus-visible:ring-0"
        />
    );
};

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

const CreateFarm = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [farmName, setFarmName] = useState('');
    const [farmCategory, setFarmCategory] = useState<'LRT' | 'MATURATION'>('LRT');
    const [sectionCount, setSectionCount] = useState<number | string>(1);
    
    // Maturation specific counts
    const [animalCount, setAnimalCount] = useState<number | string>(1);
    const [spawningCount, setSpawningCount] = useState<number | string>(1);
    const [naupliiCount, setNaupliiCount] = useState<number | string>(1);

    const [sections, setSections] = useState<SectionConfig[]>([]);
    const [collapsedSections, setCollapsedSections] = useState<number[]>([]);

    const calculateTank = (tank: TankConfig): { volume: number, area: number } => {
        let volume = 0;
        let area = 0;
        const h = Number(tank.height) || 0;

        if (tank.shape === 'CIRCLE') {
            const r = Number(tank.radius) || 0;
            area = Math.PI * Math.pow(r, 2);
            volume = area * h * 1000;
        } else {
            const l = Number(tank.length) || 0;
            const w = Number(tank.width) || 0;
            area = l * w;
            volume = area * h * 1000;
        }

        return {
            volume: Math.round(volume * 100) / 100,
            area: Math.round(area * 100) / 100
        };
    };

    const getFarmPrefix = (name: string) => {
        if (!name) return 'F';
        const words = name.trim().split(/\s+/);
        const initials = words.map(w => w.match(/[a-zA-Z]/)?.[0]?.toUpperCase()).filter(Boolean).join('');
        const numbers = name.match(/\d+/g)?.join('') || '';
        return `${initials}${numbers}` || 'F';
    };

    const handleContinueToSetup = () => {
        if (!farmName.trim()) {
            toast.error("Please enter a farm name");
            return;
        }

        // Initialize sections
        let newSections: SectionConfig[] = [];
        
        if (farmCategory === 'MATURATION') {
            // Build dynamic sections based on individual counts
            const aCount = Number(animalCount) || 0;
            const sCount = Number(spawningCount) || 0;
            const nCount = Number(naupliiCount) || 0;

            for (let i = 0; i < aCount; i++) {
                newSections.push({ name: `Animal Section ${i + 1}`, type: 'ANIMAL', tanks: [] });
            }
            for (let i = 0; i < sCount; i++) {
                newSections.push({ name: `Spawning Section ${i + 1}`, type: 'SPAWNING', tanks: [] });
            }
            for (let i = 0; i < nCount; i++) {
                newSections.push({ name: `Nauplii Section ${i + 1}`, type: 'NAUPLII', tanks: [] });
            }
        } else {
            const count = Number(sectionCount) || 1;
            newSections = Array.from({ length: count }).map((_, sIdx) => ({
                name: `Section ${sIdx + 1}`,
                type: 'LRT',
                tanks: []
            }));
        }

        setSections(newSections);
        setStep(2);
    };

    const getTankPrefix = (section: SectionConfig, sIdx: number) => {
        const sNumMatch = section.name.match(/\d+/);
        const sNum = sNumMatch ? sNumMatch[0] : (sIdx + 1);

        if (section.type === 'ANIMAL') return `AS${sNum}`;
        if (section.type === 'SPAWNING') return `SS${sNum}`;
        if (section.type === 'NAUPLII') return `NS${sNum}`;
        return `S${sNum}`;
    };

    const addTank = (sIdx: number, gender?: 'MALE' | 'FEMALE', customName?: string) => {
        setSections(prev => {
            const newSections = [...prev];
            const currentSection = newSections[sIdx];
            const currentTanks = currentSection.tanks;
            
            const prefix = getTankPrefix(currentSection, sIdx);
            const farmPrefix = getFarmPrefix(farmName);
            
            let tankName = customName;
            if (!tankName) {
                if (currentSection.type === 'ANIMAL' && gender) {
                    const genderCode = gender === 'MALE' ? 'MT' : 'FT';
                    const genderTanks = currentTanks.filter(t => t.gender === gender);
                    tankName = farmCategory === 'MATURATION' 
                        ? `${farmPrefix}_${prefix}_${genderCode}${genderTanks.length + 1}`
                        : `${prefix}_${genderCode}${genderTanks.length + 1}`;
                } else {
                    tankName = farmCategory === 'MATURATION'
                        ? `${farmPrefix}_${prefix}_T${currentTanks.length + 1}`
                        : `${prefix}_T${currentTanks.length + 1}`;
                }
            }

            const newTank: TankConfig = {
                name: tankName,
                gender: gender,
                type: currentTanks[currentTanks.length - 1]?.type || 'FRP',
                shape: 'RECTANGLE',
                length: 0,
                width: 0,
                height: 0,
                radius: 0,
                volume: 0,
                area: 0
            };
            newSections[sIdx].tanks = [...currentTanks, newTank];
            return newSections;
        });
        setCollapsedSections(prev => prev.filter(idx => idx !== sIdx));
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
        setCollapsedSections(prev => prev.filter(idx => idx !== sections.length));
        toast.success(`Added ${typeLabel} Section ${nextNum}`);
    };

    const addSection = () => {
        const newSection: SectionConfig = {
            name: `Section ${sections.length + 1}`,
            tanks: []
        };
        setSections(prev => [...prev, newSection]);
        // Expand the newly added section
        setCollapsedSections(prev => prev.filter(idx => idx !== sections.length));
        toast.success("Added new section");
    };

    const updateTankCount = (sIdx: number, count: number) => {
        setSections(prev => {
            const newSections = [...prev];
            const currentTanks = newSections[sIdx].tanks;

            if (count > currentTanks.length) {
                // Add tanks
                const additionalCount = count - currentTanks.length;
                const prefix = getTankPrefix(newSections[sIdx], sIdx);
                const farmPrefix = getFarmPrefix(farmName);
                const additionalTanks = Array.from({ length: additionalCount }).map((_, i) => {
                    const name = farmCategory === 'MATURATION'
                        ? `${farmPrefix}_${prefix}_T${currentTanks.length + i + 1}`
                        : `S${sIdx + 1}_T${currentTanks.length + i + 1}`;

                    return {
                        name: name,
                        type: (currentTanks[0]?.type || 'FRP') as 'FRP' | 'CONCRETE',
                        shape: 'RECTANGLE' as 'CIRCLE' | 'RECTANGLE',
                        length: 0,
                        width: 0,
                        height: 0,
                        radius: 0,
                        volume: 0,
                        area: 0
                    };
                });
                newSections[sIdx].tanks = [...currentTanks, ...additionalTanks];
            } else if (count < currentTanks.length) {
                // Remove tanks
                newSections[sIdx].tanks = currentTanks.slice(0, Math.max(0, count));
            }

            return newSections;
        });
    };

    const updateTank = (sIdx: number, tIdx: number, updates: Partial<TankConfig>) => {
        setSections(prev => {
            const newSections = [...prev];
            const tank = { ...newSections[sIdx].tanks[tIdx], ...updates };

            // Re-calculate volume/area
            const { volume, area } = calculateTank(tank);
            newSections[sIdx].tanks[tIdx] = { ...tank, volume, area };

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
                const farmPrefix = getFarmPrefix(farmName);
                if (tankToCopy.gender) {
                    const genderCode = tankToCopy.gender === 'MALE' ? 'MT' : 'FT';
                    const existingGenderCount = currentTanks.filter(t => t.gender === tankToCopy.gender).length;
                    newName = farmCategory === 'MATURATION'
                        ? `${farmPrefix}_${prefix}_${genderCode}${existingGenderCount + i + 1}`
                        : `${prefix}_${genderCode}${existingGenderCount + i + 1}`;
                } else {
                    newName = farmCategory === 'MATURATION'
                        ? `${farmPrefix}_${prefix}_T${currentTanks.length + i + 1}`
                        : `${prefix}_T${currentTanks.length + i + 1}`;
                }
                return { ...tankToCopy, name: newName };
            });

            newSections[sIdx].tanks = [...currentTanks, ...newTanks];
            return newSections;
        });
        setCollapsedSections(prev => prev.filter(idx => idx !== sIdx));
        toast.success(`Duplicated tank ${count} times`);
    };

    const toggleSection = (sIdx: number) => {
        setCollapsedSections(prev => 
            prev.includes(sIdx) ? prev.filter(idx => idx !== sIdx) : [...prev, sIdx]
        );
    };

    const handleSubmit = async () => {
        if (!user?.hatchery_id) return;

        // Validation: Ensure at least one tank exists total
        const totalTanks = sections.reduce((acc, s) => acc + s.tanks.length, 0);
        if (totalTanks === 0) {
            toast.error("Please add at least one tank to your farm");
            return;
        }

        try {
            setLoading(true);

            // 0. Check for duplicate farm name
            const { data: existingFarm, error: checkError } = await supabase
                .from('farms')
                .select('id')
                .eq('hatchery_id', user.hatchery_id)
                .eq('name', farmName.trim())
                .maybeSingle();
            
            if (checkError) throw checkError;
            if (existingFarm) {
                toast.error("A farm with this name already exists in your hatchery");
                setLoading(false);
                return;
            }

            // 0.1 Check for duplicate section names
            const sectionNames = sections.map(s => s.name.trim().toLowerCase());
            const duplicateSection = sectionNames.find((name, index) => sectionNames.indexOf(name) !== index);
            if (duplicateSection) {
                toast.error(`Duplicate section name: "${sections[sectionNames.indexOf(duplicateSection)].name}"`);
                setLoading(false);
                return;
            }

            // 1. Create Farm
            const { data: farm, error: farmError } = await supabase
                .from('farms')
                .insert([{ hatchery_id: user.hatchery_id, name: farmName, category: farmCategory }])
                .select().single();

            if (farmError) throw farmError;

            // 2. Create Sections
            const { data: dbSections, error: sectionError } = await supabase
                .from('sections')
                .insert(sections.map(s => ({ 
                    farm_id: farm.id, 
                    name: s.name, 
                    section_type: (s.type === 'LRT') ? null : s.type 
                })))
                .select();

            if (sectionError) throw sectionError;

            // 3. Create Tanks
            const tanksToCreate: any[] = [];
            dbSections.forEach((dbSec, idx) => {
                const configTanks = sections[idx].tanks;
                configTanks.forEach(ct => {
                    tanksToCreate.push({
                        farm_id: farm.id,
                        section_id: dbSec.id,
                        name: ct.name,
                        gender: ct.gender || null,
                        type: ct.type,
                        shape: ct.shape,
                        length: ct.shape === 'RECTANGLE' ? ct.length : null,
                        width: ct.shape === 'RECTANGLE' ? ct.width : null,
                        height: ct.height,
                        radius: ct.shape === 'CIRCLE' ? ct.radius : null,
                        volume_litres: ct.volume,
                        area_sqm: ct.area
                    });
                });
            });

            if (tanksToCreate.length > 0) {
                const { error: tankError } = await supabase.from('tanks').insert(tanksToCreate);
                if (tankError) throw tankError;
            }

            toast.success("Farm created successfully!");
            navigate('/owner/dashboard');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create farm");
        } finally {
            setLoading(false);
        }
    };

    const renderTankCard = (tank: TankConfig, sIdx: number, tIdx: number) => (
        <Card key={tIdx} className="rounded-2xl border shadow-sm overflow-hidden bg-card/40 transition-all hover:bg-card">
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center bg-muted/20 -mx-4 -mt-4 px-4 py-3 border-b mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {tIdx + 1}
                        </div>
                        <Input
                            className="font-bold border-none bg-transparent p-0 text-sm focus-visible:ring-0 h-auto"
                            value={tank.name}
                            onChange={(e) => updateTank(sIdx, tIdx, { name: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <DuplicateTankPopover onDuplicate={(count) => duplicateTank(sIdx, tIdx, count)} />
                        {tank.gender && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${tank.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                {tank.gender}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Material Type</Label>
                        <Select value={tank.type} onValueChange={(val: any) => updateTank(sIdx, tIdx, { type: val })}>
                            <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-muted shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FRP">FRP</SelectItem>
                                <SelectItem value="CONCRETE">Concrete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Shape</Label>
                        <Select value={tank.shape} onValueChange={(val: any) => updateTank(sIdx, tIdx, { shape: val })}>
                            <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-muted shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECTANGLE">Rectangular</SelectItem>
                                <SelectItem value="CIRCLE">Circular</SelectItem>
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
                            className="h-10 text-xs rounded-xl shadow-none"
                            value={tank.height || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (e.target.value === '' || val >= 0) {
                                    updateTank(sIdx, tIdx, { height: e.target.value === '' ? 0 : val });
                                }
                            }}
                        />
                    </div>
                    {tank.shape === 'CIRCLE' ? (
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Radius (m)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.1"
                                className="h-10 text-xs rounded-xl shadow-none"
                                value={tank.radius || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (e.target.value === '' || val >= 0) {
                                        updateTank(sIdx, tIdx, { radius: e.target.value === '' ? 0 : val });
                                    }
                                }}
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
                                    className="h-10 text-xs rounded-xl shadow-none"
                                    value={tank.length || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (e.target.value === '' || val >= 0) {
                                            updateTank(sIdx, tIdx, { length: e.target.value === '' ? 0 : val });
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Width (m)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className="h-10 text-xs rounded-xl shadow-none"
                                    value={tank.width || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (e.target.value === '' || val >= 0) {
                                            updateTank(sIdx, tIdx, { width: e.target.value === '' ? 0 : val });
                                        }
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3 border-t border-dashed">
                    <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Total Volume</p>
                        <p className="font-extrabold text-primary text-md">{tank.volume.toLocaleString()} <span className="text-[10px] font-bold">LITRES</span></p>
                    </div>
                    <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Surface Area</p>
                        <p className="font-extrabold text-primary text-md">{tank.area.toLocaleString()} <span className="text-[10px] font-bold">m²</span></p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 pb-24">
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => step === 1 ? navigate('/owner/dashboard') : setStep(1)} className="pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-5 h-5 mr-1" /> {step === 1 ? 'Back to Dashboard' : 'Back to General Info'}
                </Button>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold">Create New Farm</h1>
                        <p className="text-muted-foreground text-sm">
                            {step === 1 ? 'Step 1: Farm Structure' : 'Step 2: Tank Configuration'}
                        </p>
                    </div>
                    <div className="flex gap-1.5 pb-1">
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 1 ? 'bg-primary' : 'bg-primary/20'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 2 ? 'bg-primary' : 'bg-primary/20'}`} />
                    </div>
                </div>

                {step === 1 ? (
                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="farmName" className="font-semibold">Farm Name</Label>
                                <Input
                                    id="farmName"
                                    value={farmName}
                                    onChange={(e) => setFarmName(e.target.value)}
                                    placeholder="e.g. Block A"
                                    className="h-12 text-md"
                                />
                                <p className="text-[10px] text-muted-foreground">Give your farm a memorable name</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="farmCategory" className="font-semibold">Module Type</Label>
                                <Select value={farmCategory} onValueChange={(val: any) => {
                                    setFarmCategory(val);
                                    if (val === 'MATURATION') {
                                        setSectionCount(3);
                                    } else {
                                        setSectionCount(1);
                                    }
                                }}>
                                    <SelectTrigger id="farmCategory" className="h-12 text-md rounded-xl">
                                        <SelectValue placeholder="Select Module Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LRT">LRT (Larval Rearing)</SelectItem>
                                        <SelectItem value="MATURATION">Maturation</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">Choose the appropriate module for this farm</p>
                            </div>

                            {farmCategory === 'MATURATION' ? (
                                <div className="space-y-4">
                                     <Label className="font-semibold">Configure Initial Sections</Label>
                                     <div className="grid grid-cols-3 gap-3">
                                         {/* Animal Sections */}
                                         <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                                             <Label className="text-[10px] font-black text-primary uppercase tracking-widest">Animal</Label>
                                             <Input
                                                 type="number"
                                                 min="0"
                                                 max="20"
                                                 value={animalCount}
                                                 onChange={(e) => setAnimalCount(e.target.value)}
                                                 className="h-10 text-center font-black text-lg bg-background rounded-xl ring-offset-background focus-visible:ring-primary/20"
                                             />
                                         </div>
                                         {/* Spawning Sections */}
                                         <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                                             <Label className="text-[10px] font-black text-primary uppercase tracking-widest">Spawning</Label>
                                             <Input
                                                 type="number"
                                                 min="0"
                                                 max="20"
                                                 value={spawningCount}
                                                 onChange={(e) => setSpawningCount(e.target.value)}
                                                 className="h-10 text-center font-black text-lg bg-background rounded-xl ring-offset-background focus-visible:ring-primary/20"
                                             />
                                         </div>
                                         {/* Nauplii Sections */}
                                         <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                                             <Label className="text-[10px] font-black text-primary uppercase tracking-widest">Nauplii</Label>
                                             <Input
                                                 type="number"
                                                 min="0"
                                                 max="20"
                                                 value={naupliiCount}
                                                 onChange={(e) => setNaupliiCount(e.target.value)}
                                                 className="h-10 text-center font-black text-lg bg-background rounded-xl ring-offset-background focus-visible:ring-primary/20"
                                             />
                                         </div>
                                     </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="font-semibold">Number of Sections</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={sectionCount}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setSectionCount('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num) && num >= 1 && num <= 50) {
                                                    setSectionCount(num);
                                                }
                                            }
                                        }}
                                        className="h-12 text-md w-full"
                                    />
                                    <p className="text-[10px] text-muted-foreground">You can add more sections later</p>
                                </div>
                            )}

                            <Button onClick={handleContinueToSetup} className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                                Continue to Tank Setup <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Tank Setup</h2>
                            <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-primary/20 animate-pulse">
                                {farmCategory} MODULE
                            </span>
                        </div>
                        {sections.map((section, sIdx) => {
                            const totalVolume = section.tanks.reduce((sum, t) => sum + (Number(t.volume) || 0), 0);
                            const totalArea = section.tanks.reduce((sum, t) => sum + (Number(t.area) || 0), 0);
                            
                            return (
                            <div key={sIdx} className="space-y-4">
                                <div className="glass-card p-3 sm:p-4 rounded-2xl border-l-4 border-l-primary flex flex-col md:flex-row md:items-center justify-between shadow-md cursor-pointer hover:bg-muted/10 transition-colors sticky top-2 z-30 bg-background/95 backdrop-blur-md gap-3" onClick={() => toggleSection(sIdx)}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
                                            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    className="h-7 sm:h-8 font-bold border-none bg-transparent p-0 text-base sm:text-lg focus-visible:ring-0 w-full max-w-[150px] sm:max-w-64 truncate"
                                                    value={section.name}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        const newSections = [...sections];
                                                        newSections[sIdx].name = e.target.value;
                                                        setSections(newSections);
                                                    }}
                                                />
                                                {collapsedSections.includes(sIdx) && (
                                                    <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                                                        <span className="text-[9px] sm:text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                                                            {section.tanks.length}T
                                                        </span>
                                                        <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            <Utensils className="w-2.5 h-2.5" /> {totalVolume.toLocaleString()}L
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Configure {section.type === 'LRT' ? 'LRT' : section.type} Section</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-1 md:mt-0 flex-wrap">
                                        <div onClick={(e) => e.stopPropagation()} className="flex gap-2 items-center flex-wrap">
                                            {section.type === 'ANIMAL' ? (
                                                <div className="flex gap-1.5 md:gap-2 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => addTank(sIdx, 'MALE')}
                                                        className="h-8 sm:h-9 px-2 sm:px-3 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[10px] sm:text-xs rounded-xl transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Male
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => addTank(sIdx, 'FEMALE')}
                                                        className="h-8 sm:h-9 px-2 sm:px-3 border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white font-bold text-[10px] sm:text-xs rounded-xl transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Female
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => addTank(sIdx)}
                                                    className="h-8 sm:h-9 px-3 border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-[10px] sm:text-xs rounded-xl transition-all"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Tank
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 bg-muted/40 p-0.5 sm:p-1 rounded-xl border border-muted" onClick={(e) => e.stopPropagation()}>
                                            <TankCountInput
                                                count={section.tanks.length}
                                                onChange={(val) => updateTankCount(sIdx, val)}
                                            />
                                        </div>
                                        <div className="ml-1 text-muted-foreground flex-shrink-0">
                                            {collapsedSections.includes(sIdx) ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        </div>
                                    </div>
                                </div>
                                 {!collapsedSections.includes(sIdx) && (
                                    <div className="grid gap-6 pl-4 border-l-2 border-dashed border-muted ml-5 animate-in slide-in-from-top-2 duration-300">
                                        {section.tanks.length === 0 ? (
                                            <div className="py-8 bg-muted/20 border border-dashed rounded-2xl text-center">
                                                <p className="text-xs text-muted-foreground font-medium italic">No tanks added to this section yet.</p>
                                            </div>
                                        ) : section.type === 'ANIMAL' ? (
                                            <div className="space-y-8">
                                                {/* Male Subsection */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">Male Tanks</h3>
                                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-100 to-transparent" />
                                                    </div>
                                                    <div className="grid gap-4">
                                                        {section.tanks.filter(t => t.gender === 'MALE').map((tank) => {
                                                            const tIdx = section.tanks.findIndex(t => t === tank);
                                                            return renderTankCard(tank, sIdx, tIdx);
                                                        })}
                                                        {section.tanks.filter(t => t.gender === 'MALE').length === 0 && (
                                                            <p className="text-[10px] text-muted-foreground italic px-3">No male tanks added.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Female Subsection */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-pink-600">Female Tanks</h3>
                                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-pink-100 to-transparent" />
                                                    </div>
                                                    <div className="grid gap-4">
                                                        {section.tanks.filter(t => t.gender === 'FEMALE').map((tank) => {
                                                            const tIdx = section.tanks.findIndex(t => t === tank);
                                                            return renderTankCard(tank, sIdx, tIdx);
                                                        })}
                                                        {section.tanks.filter(t => t.gender === 'FEMALE').length === 0 && (
                                                            <p className="text-[10px] text-muted-foreground italic px-3">No female tanks added.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Uncategorized (if any) */}
                                                {section.tanks.filter(t => !t.gender).length > 0 && (
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Other Tanks</h3>
                                                        <div className="grid gap-4">
                                                            {section.tanks.filter(t => !t.gender).map((tank) => {
                                                                const tIdx = section.tanks.findIndex(t => t === tank);
                                                                return renderTankCard(tank, sIdx, tIdx);
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid gap-4">
                                                {section.tanks.map((tank, tIdx) => renderTankCard(tank, sIdx, tIdx))}
                                            </div>
                                        )}

                                        {/* Section Capacity Summary Footer */}
                                        <div className="mt-2 bg-muted/20 rounded-xl p-3 border border-dashed border-muted flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            <span>{section.name} Summary</span>
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1.5">
                                                    <Utensils className="w-3.5 h-3.5 text-emerald-500" /> 
                                                    <span className="text-foreground">{totalVolume.toLocaleString()} L</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Waves className="w-3.5 h-3.5 text-blue-500" /> 
                                                    <span className="text-foreground">{totalArea.toLocaleString()} m²</span>
                                                </span>
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
                                <Button
                                    variant="outline"
                                    onClick={() => addSectionByType('LRT')}
                                    className="w-full border-dashed border-2 py-8 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary transition-all flex flex-col gap-1"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span className="font-bold text-sm uppercase tracking-wider">Add New Section</span>
                                </Button>
                            )}
                        </div>

                        <div className="h-12" />

                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-50 shadow-2xl">
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full max-w-lg mx-auto block h-14 rounded-2xl text-md font-bold shadow-xl shadow-primary/25 transition-all active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
                                    <div className="flex items-center justify-center gap-2 uppercase tracking-wide">
                                        <Check className="w-6 h-6" /> Finalize & Create Farm
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateFarm;

