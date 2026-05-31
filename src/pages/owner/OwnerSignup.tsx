import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPicker } from '@/modules/shared/components/MapPicker';
import { toast } from 'sonner';
import { Eye, EyeOff, Waves, Loader2, MapPin, LocateFixed, Check, Sparkles, Heart, Warehouse } from 'lucide-react';

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

const OwnerSignup = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [addressLoading, setAddressLoading] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);

    const [formData, setFormData] = useState({
        hatcheryName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const [address, setAddress] = useState<AddressConfig>({
        plotNumber: '',
        areaName: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        fullAddress: '',
        latitude: null,
        longitude: null,
        plotArea: 0,
        plotLength: 0,
        plotWidth: 0
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleLocationSelect = useCallback(async (lat: number, lng: number, providedAddress?: string) => {
        setAddress(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            fullAddress: providedAddress || prev.fullAddress || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
        }));

        setAddressLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            if (res.ok) {
                const data = await res.json();
                const addr = data.address || {};

                const cleanValue = (val: string | undefined) => {
                    if (!val) return '';
                    const plusCodeRegex = /[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i;
                    let cleaned = val.replace(plusCodeRegex, '').trim();
                    cleaned = cleaned.replace(/Ward\s*(No\s*)?\d+/i, '').trim();
                    return cleaned.replace(/^,|,$/g, '').trim();
                };

                const plotNo = cleanValue(addr.house_number || addr.housenumber || addr.building || addr.office || addr.shop || addr.place);
                const street = cleanValue(addr.road || addr.street || addr.pedestrian || addr.cycleway);
                const areaParts = [
                    addr.suburb,
                    addr.neighbourhood,
                    addr.residential,
                    addr.subdistrict,
                    addr.district,
                    addr.quarter,
                    addr.city_district,
                    addr.village,
                    addr.hamlet
                ].map(cleanValue).filter(Boolean);

                const areaName = areaParts[0] || '';

                setAddress(prev => {
                    const rawDisplayName = data.display_name || '';
                    const newFullAddress = providedAddress || rawDisplayName || prev.fullAddress;

                    const isCoordsOnly = /^Lat:.*Lng:/.test(newFullAddress);
                    let constructedAddress = newFullAddress;

                    if (isCoordsOnly || (rawDisplayName.length < 20 && !rawDisplayName.includes(','))) {
                        constructedAddress = [plotNo, street, areaName, addr.city || addr.town || addr.village, addr.state, addr.postcode]
                            .filter(Boolean)
                            .join(', ');
                    }

                    return {
                        ...prev,
                        plotNumber: plotNo || prev.plotNumber,
                        street: street || prev.street,
                        areaName: areaName || prev.areaName,
                        city: addr.city || addr.town || addr.village || addr.municipality || prev.city,
                        state: addr.state || prev.state,
                        pincode: addr.postcode || prev.pincode,
                        fullAddress: constructedAddress || prev.fullAddress
                    };
                });
            }
        } catch (error) {
            console.error("Failed to fetch address:", error);
        } finally {
            setAddressLoading(false);
        }
    }, []);

    const handlePlotAreaSelect = useCallback((area: number, length: number, width: number) => {
        setAddress(prev => ({
            ...prev,
            plotArea: Math.round(area * 100) / 100,
            plotLength: Math.round(length * 100) / 100,
            plotWidth: Math.round(width * 100) / 100
        }));
        toast.info(`Plot area detected: ${area.toFixed(2)} sqm`);
    }, []);

    const toggleModule = (module: string) => {
        setSelectedModules(prev => 
            prev.includes(module) 
                ? prev.filter(m => m !== module) 
                : [...prev, module]
        );
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // Specific field validation with descriptive toasts
        if (!formData.hatcheryName) return toast.error("Name is required");
        if (!formData.username) return toast.error("Username is required");
        if (!formData.password) return toast.error("Password is required");

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (selectedModules.length === 0) {
            toast.error("Please select at least one module");
            setStep(1);
            return;
        }

        try {
            setLoading(true);

            // 1. Sign Up Auth User
            const emailToUse = formData.email || `${formData.username.toLowerCase().replace(/\s+/g, '')}@shrimpit.local`;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: emailToUse,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        full_name: formData.username,
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Signup failed");

            const userId = authData.user.id;

            // 2. Create Hatchery/Farm with Address Details and selected modules
            const { data: hatcheryData, error: hatcheryError } = await supabase
                .from('hatcheries')
                .insert([{
                    name: formData.hatcheryName,
                    location: 'Unknown',
                    address: null,
                    plot_number: null,
                    area_name: null,
                    latitude: null,
                    longitude: null,
                    plot_area_sqm: null,
                    plot_length_m: null,
                    plot_width_m: null,
                    created_by: userId,
                    modules: selectedModules,
                }])
                .select()
                .single();

            if (hatcheryError) throw hatcheryError;

            // 3. Create Owner Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    auth_user_id: userId,
                    username: formData.username,
                    full_name: formData.username,
                    role: 'owner',
                    hatchery_id: hatcheryData.id,
                    email: emailToUse,
                    phone: formData.phone,
                }]);

            if (profileError) {
                console.error("Profile creation error:", profileError);
                throw new Error(`Failed to create profile: ${profileError.message}`);
            }

            toast.success("Account Created Successfully!");
            navigate('/login');

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    const isFarmSelected = selectedModules.includes('FARMS');
    const isHatcherySelected = selectedModules.includes('LRT') || selectedModules.includes('MATURATION');
    
    let entityLabel = "Farm Name";
    let entityPlaceholder = "e.g. Sunrise Aquaculture Group";
    let pageTitle = "Farm Registration";
    let pageSubtitle = "Create your Farm Account";

    return (
        <div className="min-h-screen ocean-gradient flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-card rounded-2xl p-6 sm:p-8 shadow-2xl my-8 transition-all duration-300">
                <div className="flex flex-col items-center mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Waves className="w-6 h-6 text-primary animate-pulse" />
                        <span className="text-xl font-bold">AquaNexus</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {step === 1 ? "Select Modules" : pageTitle}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {step === 1 ? "Choose which modules will be active for your account" : pageSubtitle}
                    </p>
                </div>

                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {/* FARMS Card */}
                            <div 
                                onClick={() => toggleModule('FARMS')}
                                className={`cursor-pointer border-2 rounded-2xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-200 select-none ${
                                    selectedModules.includes('FARMS') 
                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                                        : 'border-muted hover:border-slate-300 bg-background/50'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl ${selectedModules.includes('FARMS') ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    <Warehouse className="w-6 h-6" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-base text-foreground">Farm / Culture</h3>
                                        {selectedModules.includes('FARMS') && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                                                <Check className="w-3 h-3 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Activate the standalone Farm/Culture module to configure customized grow-out operations, pond tracking, and site management.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 mb-1 pl-1">
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Waves className="w-5 h-5 text-primary" /> Hatchery
                                </h2>
                            </div>

                            {/* LRT Card */}
                            <div 
                                onClick={() => toggleModule('LRT')}
                                className={`cursor-pointer border-2 rounded-2xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-200 select-none ${
                                    selectedModules.includes('LRT') 
                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                                        : 'border-muted hover:border-slate-300 bg-background/50'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl ${selectedModules.includes('LRT') ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    <Waves className="w-6 h-6" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-base text-foreground">Larval Rearing (LRT)</h3>
                                        {selectedModules.includes('LRT') && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                                                <Check className="w-3 h-3 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Track larval cycles, water quality metrics, feeding regimes, Artemia/Algae preparation, stocking, observations, and shifting activities.
                                    </p>
                                </div>
                            </div>

                            {/* MATURATION Card */}
                            <div 
                                onClick={() => toggleModule('MATURATION')}
                                className={`cursor-pointer border-2 rounded-2xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-200 select-none ${
                                    selectedModules.includes('MATURATION') 
                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                                        : 'border-muted hover:border-slate-300 bg-background/50'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl ${selectedModules.includes('MATURATION') ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-base text-foreground">Maturation</h3>
                                        {selectedModules.includes('MATURATION') && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                                                <Check className="w-3 h-3 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Advanced broodstock tracking, sourcing & mating, spawning logs, egg count records, nauplii harvest entries, and sales tracking.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button 
                                type="button" 
                                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
                                disabled={selectedModules.length === 0}
                                onClick={() => setStep(2)}
                            >
                                Continue to Account Details
                            </Button>
                        </div>

                        <div className="text-center">
                            <Link to="/login" className="text-sm text-primary hover:underline">
                                Already have an account? Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-semibold text-lg">Account Details</h3>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    onClick={() => setStep(1)} 
                                    className="p-0 text-xs font-semibold h-auto"
                                >
                                    Modify Selected Modules
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hatcheryName">{entityLabel} *</Label>
                                    <Input id="hatcheryName" value={formData.hatcheryName} onChange={handleChange} placeholder={entityPlaceholder} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username *</Label>
                                    <Input id="username" value={formData.username} onChange={handleChange} placeholder="e.g. raju_owner" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email (Optional)</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="For recovery" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone (Optional)</Label>
                                    <Input id="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPass ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted-foreground">
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm *</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button type="button" variant="outline" className="h-12 w-28" onClick={() => setStep(1)} disabled={loading}>
                                Back
                            </Button>
                            <Button type="submit" className="flex-1 h-12 text-lg shadow-lg shadow-primary/20" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                            </Button>
                        </div>

                        <div className="text-center mt-4">
                            <Link to="/login" className="text-sm text-primary hover:underline">
                                Already have an account? Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default OwnerSignup;
