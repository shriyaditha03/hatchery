import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, ClipboardList, Check, ListChecks, Database, User, ChevronDown, Droplets } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  CheckCircle2, 
  FlaskConical, 
  AlertCircle,
  Clock,
  Calendar,
  Users,
  Camera,
  MessageSquare,
  ArrowRight,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RatingScale from '@/modules/shared/components/RatingScale';
import StockingForm from '@/modules/shared/components/StockingForm';
import ObservationForm from '@/modules/shared/components/ObservationForm';
import AnimalSamplingForm from '@/modules/shared/components/AnimalSamplingForm';
import ArtemiaForm from '@/modules/lrt/components/ArtemiaForm';
import AlgaeForm from '@/modules/lrt/components/AlgaeForm';
import HarvestForm from '@/modules/lrt/components/HarvestForm';
import OrderBookingForm from '@/modules/lrt/components/OrderBookingForm';
import TankShiftingForm from '@/modules/lrt/components/TankShiftingForm';
import SourcingMatingForm from '@/modules/maturation/components/SourcingMatingForm';
import SpawningForm from '@/modules/maturation/components/SpawningForm';
import EggCountForm from '@/modules/maturation/components/EggCountForm';
import NaupliiHarvestForm from '@/modules/maturation/components/NaupliiHarvestForm';
import NaupliiSaleForm from '@/modules/maturation/components/NaupliiSaleForm';
import BroodstockDiscardForm from '@/modules/maturation/components/BroodstockDiscardForm';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import Breadcrumbs from '@/modules/shared/components/Breadcrumbs';
import { ANIMAL_RATING_FIELDS, waterFields, WATER_QUALITY_RANGES } from '@/modules/shared/constants/activity';
import { toast } from 'sonner';
import { formatDate, getNowLocal, getTodayStr } from '@/lib/date-utils';
import { useActivities } from '@/hooks/useActivities';

const TIME_SLOTS = [
  "0am - 4am",
  "4am - 8am",
  "8am - 12pm",
  "12pm - 4pm",
  "4pm - 8pm",
  "8pm - 12am"
];

const TANKS = ['T1', 'T2', 'T3', 'T4'];
const ACTIVITIES = ['Feed', 'Treatment', 'Water Quality', 'Stocking', 'Animals Sampling & Observation', 'Artemia', 'Algae', 'Harvest', 'Tank Shifting', 'Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard', 'Water Management', 'Order Booking'] as const;
type ActivityType = typeof ACTIVITIES[number];

const FEED_TYPES = ['Starter Feed', 'Grower Feed', 'Finisher Feed', 'Supplement'];
const FEED_UNITS = ['kg', 'gms', 'L', 'ml'];
const TREATMENT_TYPES = ['Probiotics', 'Antibiotics', 'Mineral Supplement', 'Disinfectant', 'Vitamin'];
const TREATMENT_UNITS = ['ml', 'L', 'gms', 'kg', 'ppm'];
const MAINTENANCE_ACTIVITIES = ['Feed', 'Treatment', 'Water Quality', 'Animals Sampling & Observation'];




const TimeInputGroup = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
  const [hStr, mStr] = (value || "00:00").split(':');
  const hNum = parseInt(hStr) || 0;
  const m = mStr || "00";
  const isPM = hNum >= 12;
  const displayH = (hNum % 12).toString().padStart(2, '0');

  const update = (newH: string, newM: string, newPM: boolean) => {
    let hour = parseInt(newH) % 12;
    if (newPM) hour += 12;
    onChange(`${hour.toString().padStart(2, '0')}:${newM}`);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase font-black text-sky-700/60 ml-1 tracking-widest">{label}</Label>
      <div className="flex items-center gap-1.5 bg-sky-50/50 p-2 rounded-[1.25rem] border border-sky-100/50 shadow-inner">
        <div className="flex-1">
          <Select value={displayH} onValueChange={(v) => update(v, m, isPM)}>
            <SelectTrigger className="h-12 bg-white rounded-xl border-none shadow-sm font-black text-base text-center justify-center focus:ring-2 focus:ring-sky-500/20">
               <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-sky-100 shadow-xl">
              {['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map(v => (
                <SelectItem key={v} value={v} className="rounded-lg font-bold">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[8px] text-center mt-1 font-black text-sky-900/30 uppercase tracking-tighter">Hour</p>
        </div>
        <span className="font-black text-sky-200 mb-4">:</span>
        <div className="flex-1">
          <Select value={m} onValueChange={(v) => update(displayH, v, isPM)}>
            <SelectTrigger className="h-12 bg-white rounded-xl border-none shadow-sm font-black text-base text-center justify-center focus:ring-2 focus:ring-sky-500/20">
               <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-sky-100 shadow-xl">
              {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(v => (
                <SelectItem key={v} value={v} className="rounded-lg font-bold">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[8px] text-center mt-1 font-black text-sky-900/30 uppercase tracking-tighter">Min</p>
        </div>
        <div className="flex flex-col gap-1 ml-1 self-start">
           <button 
             type="button"
             onClick={() => update(displayH, m, false)}
             className={`px-3 h-6 rounded-lg text-[10px] font-black transition-all ${!isPM ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-400 opacity-60'}`}
           >AM</button>
           <button 
             type="button"
             onClick={() => update(displayH, m, true)}
             className={`px-3 h-6 rounded-lg text-[10px] font-black transition-all ${isPM ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-sky-400 opacity-60'}`}
           >PM</button>
        </div>
      </div>
    </div>
  );
};


const RecordActivity = () => {

  const navigate = useNavigate();
  const { 
    user, 
    activeFarmId,
    activeSectionId, 
    setActiveFarmId,
    setActiveSectionId, 
    activeModule,
    setActiveModule,
    activeBroodstockBatchId,
    setActiveBroodstockBatchId,
    logout,
    fetchUserAccess 
  } = useAuth();

  const hatcheryId = user?.hatchery_id;
  const [searchParams] = useSearchParams();
  const { type } = useParams();
  const editId = searchParams.get('edit');
  const instructionIdParam = searchParams.get('instruction');
  const editInstructionId = searchParams.get('editInstruction');
  const modeParam = searchParams.get('mode');
  const sectionParam = searchParams.get('section');
  const categoryParam = searchParams.get('category');
  const { addActivity, updateActivity } = useActivities();
  const [loading, setLoading] = useState(false);
  const [availableTanks, setAvailableTanks] = useState<any[]>([]);
  const [stockedTankIds, setStockedTankIds] = useState<string[]>([]);
  const [dbFeedTypes, setDbFeedTypes] = useState<string[]>(FEED_TYPES);
  const [dbTreatmentTypes, setDbTreatmentTypes] = useState<string[]>(TREATMENT_TYPES);
  const [tankPopulations, setTankPopulations] = useState<Record<string, number>>({});
  const [tankWaterVolumes, setTankWaterVolumes] = useState<Record<string, number>>({});
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionParam || '');

  const [date, setDate] = useState(getTodayStr());
  const [time, setTime] = useState(formatDate(getNowLocal(), 'HH:mm'));
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(formatDate(getNowLocal(), 'a') as 'AM' | 'PM');
  const [isLiveTime, setIsLiveTime] = useState(!editId); // Auto-update time if not editing
  const [tankId, setTankId] = useState('');
  const [activity, setActivity] = useState<ActivityType | ''>('');
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [closedBatchIds, setClosedBatchIds] = useState<Set<string>>(new Set());
  const [batchRelatedTankIds, setBatchRelatedTankIds] = useState<string[]>([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [activeInstructions, setActiveInstructions] = useState<any[]>([]);
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);
  const [selectedInstructionData, setSelectedInstructionData] = useState<any | null>(null);
  const [isPlanningMode, setIsPlanningMode] = useState(() => {
    if (user?.role === 'worker') return false;
    if (editInstructionId) return true;
    if (instructionIdParam) return false;
    if (modeParam === 'instruction') return true;
    if (modeParam === 'activity') return false;
    return user?.role === 'supervisor';
  });

  // Sync isPlanningMode when user/params change
  useEffect(() => {
    if (user?.role === 'worker') {
      setIsPlanningMode(false);
    } else if (editInstructionId) {
      setIsPlanningMode(true);
    } else if (instructionIdParam) {
      setIsPlanningMode(false);
    } else if (modeParam === 'instruction') {
      setIsPlanningMode(true);
    } else if (modeParam === 'activity') {
      setIsPlanningMode(false);
    } else if (user) {
      setIsPlanningMode(user.role === 'supervisor');
    }
  }, [user, editInstructionId, instructionIdParam, modeParam]);

  // Set initial activity and section from URL parameters
  useEffect(() => {
    if (sectionParam && sectionParam !== activeSectionId) {
      setSelectedSectionId(sectionParam);
      setActiveSectionId(sectionParam);
    }
  }, [sectionParam]);

  useEffect(() => {
    if ((categoryParam === 'MATURATION' || categoryParam === 'LRT') && categoryParam !== activeModule) {
      setActiveModule(categoryParam);
      return;
    }
    const lrtActivities = ['Artemia', 'Algae', 'Harvest', 'Tank Shifting', 'Order Booking'];
    const maturationActivities = ['Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard'];
    if (activity && lrtActivities.includes(activity) && activeModule !== 'LRT') {
      setActiveModule('LRT');
    } else if (activity && maturationActivities.includes(activity) && activeModule !== 'MATURATION') {
      setActiveModule('MATURATION');
    }
  }, [categoryParam, activity, activeModule, setActiveModule]);

  useEffect(() => {
    if (type && !editId && !instructionIdParam && !editInstructionId) {
      const typeMap: Record<string, ActivityType> = {
        'feed': 'Feed',
        'treatment': 'Treatment',
        'water': 'Water Quality',
        'animal': 'Animal Quality',
        'stocking': 'Stocking',
        'observation': 'Observation',
        'animals-sampling': 'Animals Sampling & Observation',
        'artemia': 'Artemia',
        'algae': 'Algae',
        'harvest': 'Harvest',
        'shifting': 'Tank Shifting',
        'tank-shifting': 'Tank Shifting',
        'mating': 'Sourcing & Mating',
        'sourcing-mating': 'Sourcing & Mating',
        'spawning': 'Spawning',
        'egg-count': 'Egg Count',
        'nauplii-harvest': 'Nauplii Harvest',
        'nauplii-sale': 'Nauplii Sale',
        'broodstock-discard': 'Broodstock Discard',
        'discard': 'Broodstock Discard',
        'water-mgmt': 'Water Management',
        'animal-sampling': 'Animals Sampling & Observation'
      };
      
      const mappedActivity = typeMap[type.toLowerCase()];
      if (mappedActivity) {
        setActivity(mappedActivity);
      }
    }
  }, [type, availableTanks.length]);
  const [selectionScope, setSelectionScope] = useState<'single' | 'all' | 'custom'>('single');
  const [selectedTankIds, setSelectedTankIds] = useState<string[]>([]);
  const [availableAlgaeSourceIds, setAvailableAlgaeSourceIds] = useState<string[]>([]);
  const [availableAlgaeSourceDetails, setAvailableAlgaeSourceDetails] = useState<any[]>([]);
  const [availableArtemiaPreHarvestIds, setAvailableArtemiaPreHarvestIds] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [isRedirectedFromObservation, setIsRedirectedFromObservation] = useState(false);
  const [sourcingMatingData, setSourcingMatingData] = useState<any>({
    sourceTanks: [],
    matingTankId: '',
    matedCount: '',
    balanceCount: 0,
    totalSourced: 0,
    matedDestinations: [],
    returnDestinations: []
  });
  const [spawningData, setSpawningData] = useState<any>({
    tankId: '',
    spawnedCount: '',
    balanceCount: '',
    totalFemales: 0,
    returnDestinations: []
  });
  const [broodstockDiscardData, setBroodstockDiscardData] = useState<any>({
    stockingId: '',
    discardType: 'partial',
    discardReason: '',
    tankDiscards: {},
    avgBodyWeight: '',
    summary: {
      initialCount: 0,
      totalMated: 0,
      totalSpawned: 0,
      totalEggs: 0,
      totalNauplii: 0,
      totalSold: 0
    }
  });
  const [eggCountData, setEggCountData] = useState<any>({
    entries: [],
    summary: { totalEggs: 0, totalFertilized: 0, avgFertilization: 0, eggsPerAnimal: 0 }
  });
  const [naupliiHarvestData, setNaupliiHarvestData] = useState<any>({
    selectedBatchId: '',
    harvestTanks: [],
    naupliiDestinations: [],
    summary: { totalHarvested: 0, totalShifted: 0, totalBatchEggs: 0, totalBatchSpawned: 0, hatchability: 0, naupliiPerAnimal: 0 }
  });
  const [naupliiSaleData, setNaupliiSaleData] = useState<any>({
    saleTanks: [],
    bonusPercentage: '0',
    packsPacked: '',
    totalGross: 0,
    totalDiscard: 0,
    netNauplii: 0
  });

  const activeSection = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
  const activeFarmCategory = useMemo(() => {
    if (categoryParam) return categoryParam;
    const lrtActivities = ['Artemia', 'Algae', 'Harvest', 'Tank Shifting', 'Order Booking'];
    const maturationActivities = ['Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard'];
    if (activity && lrtActivities.includes(activity)) return 'LRT';
    if (activity && maturationActivities.includes(activity)) return 'MATURATION';
    return activeSection?.farm_category || activeModule || 'LRT';
  }, [categoryParam, activity, activeSection?.farm_category, activeModule]);
  const currentFarmId = useMemo(() => {
    const baseId = selectedFarmId || activeFarmId;
    const isPageLRT = activeFarmCategory === 'LRT' || activeFarmCategory === 'LRI';
    if (baseId) {
      const farmAccess = user?.access?.find(a => a.farm_id === baseId);
      if (farmAccess) {
        const isFarmLRT = farmAccess.farm_category === 'LRT' || farmAccess.farm_category === 'LRI';
        if (isFarmLRT === isPageLRT) {
          return baseId;
        }
      }
    }
    const matching = user?.access?.find(a => {
      const isAccessLRT = a.farm_category === 'LRT' || a.farm_category === 'LRI';
      return isPageLRT ? isAccessLRT : a.farm_category === activeFarmCategory;
    });
    return matching?.farm_id || '';
  }, [selectedFarmId, activeFarmId, activeFarmCategory, user?.access]);
  const isFarmModule = activeFarmCategory === 'FARMS' || activeFarmCategory === 'FARM';
  const isBatchClosed = activeFarmCategory === 'MATURATION' && activeBroodstockBatchId && activeBroodstockBatchId !== 'new' && closedBatchIds.has(activeBroodstockBatchId) && activity !== 'Stocking';
  const currentSelectedTanks = useMemo(() => {
    if (activeFarmCategory === 'MATURATION' && !editId) {
      let effectiveTankIds: string[] = [];
      const sectionId = selectedSectionId || activeSectionId;

      if (selectionScope === 'all') {
        const allSectionTanks = sectionId
          ? (availableTanks.find(s => s.id === sectionId)?.tanks || []).map((t: any) => t.id)
          : availableTanks.filter(s => s.farm_id === currentFarmId).flatMap(s => s.tanks || []).map((t: any) => t.id);
        
        effectiveTankIds = batchRelatedTankIds.length > 0
          ? allSectionTanks.filter((id: string) => batchRelatedTankIds.includes(id))
          : allSectionTanks;
      } else if (selectionScope === 'custom') {
        effectiveTankIds = selectedTankIds;
      } else {
        effectiveTankIds = tankId ? [tankId] : [];
      }

      return effectiveTankIds
        .map(tid => {
          const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tid));
          const tank = section?.tanks.find((t: any) => t.id === tid);
          return tank ? { ...tank, sectionName: section?.name } : null;
        })
        .filter(Boolean);
    }
    return [];
  }, [activeFarmCategory, editId, selectionScope, selectedTankIds, tankId, selectedSectionId, activeSectionId, availableTanks, batchRelatedTankIds, activeFarmId, selectedFarmId]);

  // For Maturation farms, filter sections by type based on the selected activity
  const getMaturationSectionFilter = (act: string): string[] | null => {
    if (!act) return null; // no filter
    switch (act) {
      case 'Stocking':
        return ['ANIMAL'];
      case 'Sourcing & Mating':
      case 'Spawning':
        return ['ANIMAL', 'SPAWNING'];
      case 'Egg Count':
        return ['SPAWNING'];
      case 'Nauplii Harvest':
        return ['SPAWNING', 'NAUPLII'];
      case 'Nauplii Sale':
        return ['NAUPLII'];
      default:
        return null; // Feed, Treatment, Water Quality, Observation -> all sections
    }
  };

  const filteredSections = availableTanks.filter(s => currentFarmId ? s.farm_id === currentFarmId : true);

  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<{id: string, name: string}[]>([]);
  const isSpecialActivity = activity === 'Algae' || activity === 'Artemia' || activity === 'Egg Count' || activity === 'Nauplii Harvest' || activity === 'Nauplii Sale' || activity === 'Sourcing & Mating' || activity === 'Spawning' || activity === 'Water Management' || activity === 'Order Booking' || (activity === 'Broodstock Discard' && broodstockDiscardData.discardType === 'complete') || (activity === 'Stocking' && activeFarmCategory === 'MATURATION');

  // Live Time Update Effect
  useEffect(() => {
    if (!isLiveTime || editId) return;

    const timer = setInterval(() => {
      const now = getNowLocal();
      setDate(getTodayStr());
      setTime(formatDate(now, 'HH:mm'));
      setAmpm(formatDate(now, 'a') as 'AM' | 'PM');
    }, 10000); // Update every 10 seconds to keep it fresh

    return () => clearInterval(timer);
  }, [isLiveTime, editId]);

  useEffect(() => {
    const fetchBatches = async () => {
      if ((activeFarmCategory === 'MATURATION' || activeFarmCategory === 'LRT' || activeFarmCategory === 'LRI') && currentFarmId) {
        await fetchAvailableBatches(currentFarmId);
      }
    };
    fetchBatches();
    fetchTanks();
  }, [user, activity, currentFarmId]);

  const fetchTanks = async () => {
    if (!user || !user.access) return;
    setLoading(true);
    try {
      const accessData = user.access;
      const farmIds = Array.from(new Set(accessData.map(a => a.farm_id).filter(Boolean)));

      if (farmIds.length === 0) {
        setAvailableTanks([]);
        setLoading(false);
        return;
      }

      // 1. Fetch ALL Sections for these farms (include section_type for Maturation filtering)
      const { data: sections, error: secError } = await supabase
        .from('sections')
        .select('id, name, farm_id, section_type, farms(name, category)')
        .in('farm_id', farmIds);
      
      if (secError) throw secError;

      // 2. Fetch Tanks for these sections (include gender for Maturation ANIMAL sections and volume_litres)
      const allSecIds = sections.map(s => s.id);
      const { data: tanks, error: tankError } = await supabase
        .from('tanks')
        .select('id, name, section_id, gender, volume_litres')
        .in('section_id', allSecIds);
      if (tankError) throw tankError;

      // 3. Map them together
      const finalSections = sections.map(sec => {
        const farmObj = Array.isArray(sec.farms) ? sec.farms[0] : sec.farms;
        return {
          id: sec.id,
          name: sec.name,
          farm_name: (farmObj as any)?.name || 'Unknown Farm',
          farm_id: sec.farm_id,
          farm_category: (farmObj as any)?.category || 'LRT',
          section_type: (sec as any).section_type || null,
          tanks: (tanks?.filter(t => t.section_id === sec.id) || []).map(t => ({
            ...t,
            gender: (t as any).gender || null
          }))
        };
      });

      console.log(`RecordActivity Debug: Fetched ${finalSections.length} sections and ${tanks?.length || 0} tanks total.`);
      setAvailableTanks(finalSections);

      // 4. Check population status (Optional/Helper)
      const allTankIds = tanks?.map(t => t.id) || [];
      if (allTankIds.length > 0) {
        const { data: popData } = await supabase.rpc('get_active_tank_populations', { p_tank_ids: allTankIds });
        if (popData) {
           const stockedIds = popData.filter((d: any) => parseFloat(d.current_population) > 0).map((d: any) => d.tank_id);
           setStockedTankIds(stockedIds);

           const popMap: Record<string, number> = {};
           popData.forEach((d: any) => {
             popMap[d.tank_id] = parseFloat(d.current_population) || 0;
           });
           setTankPopulations(popMap);
        }
      }

      // 5. Check water volumes
      if (allTankIds.length > 0) {
        const { data: waterLogs } = await supabase
          .from('activity_logs')
          .select('data, created_at')
          .in('farm_id', farmIds)
          .eq('activity_type', 'Water Management')
          .order('created_at', { ascending: false });

        // Initialize all tanks to 0 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â only populate from actual Water Management activity logs
        const latestVolumes: Record<string, number> = {};

        const foundTanks = new Set<string>();
        
        if (waterLogs) {
          for (const log of waterLogs) {
            const data = log.data;
            if (!data) continue;
            
            if (data.flowOperation === 'Water Filling') {
              if (data.sourceType === 'tank' && data.sourceTankIds?.length > 0) {
                const sourceId = data.sourceTankIds[0];
                if (!foundTanks.has(sourceId)) {
                  latestVolumes[sourceId] = data.sourceFinalVolume || 0;
                  foundTanks.add(sourceId);
                }
              }
              if (data.fillTargets) {
                data.fillTargets.forEach((target: any) => {
                  if (target.tankId && !foundTanks.has(target.tankId)) {
                    latestVolumes[target.tankId] = target.finalVolume || 0;
                    foundTanks.add(target.tankId);
                  }
                });
              }
            } else if (data.flowOperation === 'Water Exchange') {
              if (data.exchangeSourceTankId) {
                const sourceId = data.exchangeSourceTankId;
                if (!foundTanks.has(sourceId)) {
                  latestVolumes[sourceId] = data.sourceFinalVolume || 0;
                  foundTanks.add(sourceId);
                }
              }
              if (data.exchangeTargets) {
                data.exchangeTargets.forEach((target: any) => {
                  if (target.tankId && !foundTanks.has(target.tankId)) {
                    latestVolumes[target.tankId] = target.finalVolume || 0;
                    foundTanks.add(target.tankId);
                  }
                });
              }
            } else if (data.flowOperation === 'Drain / Clean') {
              if (data.drainTargets) {
                data.drainTargets.forEach((target: any) => {
                  if (target.tankId && !foundTanks.has(target.tankId)) {
                    latestVolumes[target.tankId] = target.finalVolume || 0;
                    foundTanks.add(target.tankId);
                  }
                });
              }
            } else if (data.flowOperation === 'Recirculation') {
              if (data.recirculationTargets) {
                data.recirculationTargets.forEach((target: any) => {
                  if (target.tankId && !foundTanks.has(target.tankId)) {
                    latestVolumes[target.tankId] = target.finalVolume || 0;
                    foundTanks.add(target.tankId);
                  }
                });
              }
            }
          }
        }
        setTankWaterVolumes(latestVolumes);
      }
    } catch (err: any) {
      console.error('Error fetching tanks:', err);
      (window as any).TANK_FETCH_ERROR = err.message || 'Unknown Error';
      toast.error('Failed to load tanks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available Stocking IDs for Maturation
  useEffect(() => {
    if ((activeFarmCategory === 'MATURATION' || activeFarmCategory === 'LRT' || activeFarmCategory === 'LRI') && currentFarmId) {
      fetchAvailableBatches(currentFarmId);
    }
  }, [currentFarmId, activeFarmCategory]);

  const fetchAvailableBatches = async (farmIdToUse: string) => {
    try {
      const farmCategoryMap: Record<string, string> = {};
      user?.access?.forEach((a: any) => {
        if (a.farm_id && a.farm_category) {
          farmCategoryMap[a.farm_id] = a.farm_category;
        }
      });

      const { data, error } = await supabase
        .from('activity_logs')
        .select('activity_type, stocking_id, data, farm_id')
        .eq('farm_id', farmIdToUse)
        .in('activity_type', ['Stocking', 'Broodstock Discard']);
      
      if (!error && data) {
        const ids: string[] = [];
        const closed = new Set<string>();
        const isCurrentLRT = activeFarmCategory === 'LRT' || activeFarmCategory === 'LRI';

        data.forEach((d: any) => {
          const farmCat = farmCategoryMap[d.farm_id] || 'LRT';
          const isLogLRT = farmCat === 'LRT' || farmCat === 'LRI';

          if (isLogLRT !== isCurrentLRT) {
            return;
          }

          const sId = d.stocking_id || d.data?.stockingId || d.data?.batchId;
          if (sId) {
            // Broodstock IDs (starting with BS_) belong only to Maturation, not LRT
            const isBS = sId.startsWith('BS_');
            if (isCurrentLRT && isBS) {
              return;
            }
            if (!isCurrentLRT && !isBS) {
              return;
            }

            if (d.activity_type === 'Stocking') {
                ids.push(sId);
            }
            if (d.activity_type === 'Broodstock Discard' && (d.data?.isCompleteDiscard || d.data?.is_complete_discard)) {
                closed.add(sId);
            }
          }
        });

        // Only show batches that are not closed
        const activeIds = Array.from(new Set(ids)).filter(id => !closed.has(id));
        setAvailableBatches(activeIds);
        setClosedBatchIds(closed);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  // Set default section for maintenance activities in Maturation
  useEffect(() => {
    const isMaintenance = activity && MAINTENANCE_ACTIVITIES.includes(activity);
    if (isMaintenance && activeFarmCategory === 'MATURATION' && availableTanks.length > 0 && !selectedSectionId && !editId) {
      const farmSections = availableTanks.filter(s => s.farm_id === currentFarmId);
      
      // Prefer ANIMAL section, fallback to first section of the farm
      const defaultSec = farmSections.find(s => s.section_type === 'ANIMAL') || farmSections[0];
      if (defaultSec) {
        setSelectedSectionId(defaultSec.id);
        console.log(`RecordActivity: Defaulted section to ${defaultSec.name} for ${activity}`);
      }
    }
  }, [activity, availableTanks, activeFarmCategory, selectedFarmId, activeFarmId]);
  
  // Fetch tanks related to the active batch for filtering
  useEffect(() => {
    if (activeFarmCategory === 'MATURATION' && activeBroodstockBatchId) {
       fetchBatchRelatedTanks(activeBroodstockBatchId);
    } else {
       setBatchRelatedTankIds([]);
    }
  }, [activeBroodstockBatchId, activeFarmCategory, activeFarmId, selectedFarmId]);

  const fetchBatchRelatedTanks = async (batchId: string) => {
    setIsBatchLoading(true);
    try {
      // Fetch tanks that have ever been associated with this batch
      const { data, error } = await supabase
        .from('activity_logs')
        .select('tank_id, stocking_id, data')
        .eq('farm_id', selectedFarmId || activeFarmId)
        .or(`stocking_id.eq.${batchId},data->>stockingId.eq.${batchId},data->>batchId.eq.${batchId}`);
      
      if (!error && data) {
        const ids = data.map((d: any) => d.tank_id).filter(Boolean);
        setBatchRelatedTankIds(Array.from(new Set(ids)));
      }
    } catch (err) {
      console.error('Error fetching batch related tanks:', err);
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Load Feed and Treatment Types from DB
  useEffect(() => {
    if (user?.hatchery_id) {
      supabase.from('feed_types')
        .select('name')
        .eq('hatchery_id', user.hatchery_id)
        .eq('is_active', true)
        .eq('section_category', activeModule) // Filter by active module
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setDbFeedTypes(data.map(d => d.name));
          } else {
            setDbFeedTypes(FEED_TYPES);
          }
        });

      supabase.from('treatment_types')
        .select('name')
        .eq('hatchery_id', user.hatchery_id)
        .eq('is_active', true)
        .eq('section_category', activeModule) // Filter by active module
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setDbTreatmentTypes(data.map(d => d.name));
          } else {
            setDbTreatmentTypes(TREATMENT_TYPES);
          }
        });
    }
  }, [user, activeModule]);

  // Load available workers for assignment (only in planning mode)
  useEffect(() => {
    if (!isPlanningMode || !user?.hatchery_id) {
      setAvailableWorkers([]);
      return;
    }

    const currentFarmId = selectedFarmId || activeFarmId;

    // For owners: they can see all profiles via RLS, so the join works.
    // For supervisors: profiles RLS blocks them from seeing other workers' profiles in joins.
    // Solution: Owners use farm_access join; supervisors always use hatchery-level query.
    if (user.role === 'owner' && currentFarmId) {
      // Owner: get workers assigned to this specific farm
      supabase.from('farm_access')
        .select('user_id, profiles!inner(id, full_name, username, role)')
        .eq('farm_id', currentFarmId)
        .then(({ data, error }) => {
          if (!error && data) {
            const seen = new Set<string>();
            const workers: {id: string, name: string}[] = [];
            data.forEach((row: any) => {
              const p = row.profiles;
              if (p && !seen.has(p.id) && p.id !== user?.id && (p.role === 'worker' || p.role === 'supervisor')) {
                seen.add(p.id);
                workers.push({ id: p.id, name: p.full_name || p.username });
              }
            });
            setAvailableWorkers(workers);
          } else {
            setAvailableWorkers([]);
          }
        });
    } else {
      // Supervisor or no farm selected: get all workers in the hatchery
      // Supervisors can see profiles via the "Select Profiles" policy if they share a hatchery
      // But the policy requires auth_user_id = auth.uid() OR is_hatchery_owner ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â so supervisors 
      // can only see their own profile. We need a workaround.
      
      // Use farm_access to get user_ids first (supervisor can see their own farm_access rows),
      // then get names from the access data we already have in AuthContext.
      if (currentFarmId) {
        // Get user_ids from farm_access for this farm (visible to supervisor via RLS)
        supabase.from('farm_access')
          .select('user_id')
          .eq('farm_id', currentFarmId)
          .then(async ({ data: accessData, error: accessError }) => {
            if (accessError || !accessData) {
              setAvailableWorkers([]);
              return;
            }
            const userIds = accessData.map((a: any) => a.user_id).filter((id: string) => id !== user?.id);
            if (userIds.length === 0) {
              setAvailableWorkers([]);
              return;
            }
            // Now try to get profile names ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â this may fail for supervisors due to RLS
            const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, username, role')
              .in('id', userIds)
              .in('role', ['worker', 'supervisor']);
            
            if (!profileError && profiles && profiles.length > 0) {
              setAvailableWorkers(profiles.map(p => ({ id: p.id, name: p.full_name || p.username })));
            } else {
              // RLS blocked profile access ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â use user_ids with generic names
              setAvailableWorkers(userIds.map((id: string, i: number) => ({ id, name: `Worker ${i + 1}` })));
            }
          });
      } else {
        // No farm selected ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â try hatchery-level query
        supabase.from('profiles')
          .select('id, full_name, username, role')
          .eq('hatchery_id', user.hatchery_id)
          .in('role', ['worker', 'supervisor'])
          .neq('id', user.id)
          .then(({ data, error }) => {
            if (!error && data) {
              setAvailableWorkers(data.map(p => ({ id: p.id, name: p.full_name || p.username })));
            } else {
              setAvailableWorkers([]);
            }
          });
      }
    }
  }, [isPlanningMode, user, selectedFarmId, activeFarmId]);

  // Handle instruction link from dashboard - load as soon as user is ready (don't wait for tanks)
  useEffect(() => {
    if (instructionIdParam && user) {
      handleInitialInstruction(instructionIdParam);
    }
  }, [instructionIdParam, user?.id]);

  // Handle edit instruction from supervisor dashboard
  useEffect(() => {
    if (editInstructionId && availableTanks.length > 0) {
      handleLoadInstructionForEdit(editInstructionId);
    }
  }, [editInstructionId, availableTanks]);

  const handleInitialInstruction = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('activity_charts')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        // Set basic context
        if (data.farm_id) {
          setSelectedFarmId(data.farm_id);
          setActiveFarmId(data.farm_id);
        }
        if (data.section_id) {
          setSelectedSectionId(data.section_id);
          setActiveSectionId(data.section_id);
        }
        if (data.tank_id) {
          setSelectionScope('single');
          setTankId(data.tank_id);
        } else if (data.section_id) {
          setSelectionScope('all');
        }

        setSelectedInstructionId(data.id);
        setSelectedInstructionData(data); // Store the data directly
        setAssignedTo(data.assigned_to || null);
        setActivity(data.activity_type as ActivityType);
        applyInstruction(data);
        setIsPlanningMode(false);
        toast.info(`Applied instruction for ${data.activity_type}`);
      }
    } catch (err) {
      console.error('Error loading initial instruction:', err);
    }
  };

  const handleLoadInstructionForEdit = async (id: string) => {
    try {
      const { data, error } = await supabase.from('activity_charts').select('*').eq('id', id).single();
      if (!error && data) {
        setIsPlanningMode(true);
        if (data.farm_id) {
          setSelectedFarmId(data.farm_id);
          setActiveFarmId(data.farm_id);
        }
        if (data.section_id) {
          setSelectedSectionId(data.section_id);
          setActiveSectionId(data.section_id);
        }
        if (data.tank_id) { setSelectionScope('single'); setTankId(data.tank_id); }
        else if (data.section_id) { setSelectionScope('all'); }
        setAssignedTo(data.assigned_to || null);
        const pd = data.planned_data || {};
        const actType = data.activity_type as ActivityType;
        setActivity(actType);
        if (actType === 'Feed') { setFeedType(pd.item || ''); setFeedQty(pd.amount || ''); setFeedUnit(pd.unit || 'gms'); }
        if (actType === 'Treatment') { setTreatmentType(pd.item || ''); setTreatmentDosage(pd.amount || ''); setTreatmentUnit(pd.unit || 'ml'); }
        if (actType === 'Algae' && pd.algaeData) setAlgaeData(pd.algaeData);
        if (actType === 'Artemia' && pd.artemiaData) setArtemiaData(pd.artemiaData);
        if (actType === 'Stocking' && pd.stockingData) setStockingData(pd.stockingData);
        if (actType === 'Observation' && pd.observationData) setObservationData(pd.observationData);
        if (actType === 'Harvest' && pd.harvestData) setHarvestData(pd.harvestData);
        if (actType === 'Tank Shifting' && pd.tankShiftingData) setTankShiftingData(pd.tankShiftingData);
        if (actType === 'Nauplii Sale' && pd.naupliiSaleData) setNaupliiSaleData(pd.naupliiSaleData);
        if (actType === 'Order Booking' && pd.orderBookingData) setOrderBookingData(pd.orderBookingData);
        
        if (pd.instructions) setComments(pd.instructions);
        if (data.scheduled_time) setTime(data.scheduled_time.slice(0, 5));
        toast.info('Editing instruction ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â make changes and save.');
      }
    } catch (err) {
      console.error('Error loading instruction for edit:', err);
    }
  };

  // Fetch active instructions when section/tank/activity/date changes
  useEffect(() => {
    const sectionId = selectedSectionId || activeSectionId;
    if (sectionId && activity && date && !editId && availableTanks.length > 0) {
      checkForInstructions();
    } else if (!editId && (!sectionId || !activity)) {
      setActiveInstructions([]);
    }
  }, [tankId, selectedSectionId, activeSectionId, activity, date, availableTanks]);

  const checkForInstructions = async () => {
    try {
      const sectionId = selectedSectionId || activeSectionId;
      if (!sectionId) return;

      const currentSection = availableTanks.find(s => s.id === sectionId);
      if (!currentSection) return;

      // Fetch all instructions for this section or the whole farm
      let query = supabase
        .from('activity_charts')
        .select('*')
        .or(`section_id.eq.${sectionId},and(farm_id.eq.${currentSection.farm_id},section_id.is.null,tank_id.is.null),tank_id.in.(${currentSection.tanks.map((t: any) => `"${t.id}"`).join(',')})`)
        .eq('activity_type', activity)
        .eq('scheduled_date', date)
        .eq('is_completed', false);

      // If worker, only show unassigned or tasks assigned specifically to them
      if (user?.role === 'worker') {
        query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
      }

      const { data, error } = await query.order('scheduled_time', { ascending: true });

      if (!error && data) {
        // Filter instructions based on selection scope
        if (selectionScope === 'single' && tankId) {
          // In single mode, only show if it's general to section/farm OR specific to this tank
          const filtered = data.filter(instr => !instr.tank_id || instr.tank_id === tankId);
          setActiveInstructions(filtered);
        } else {
          // In All/Custom mode, show everything for the section
          setActiveInstructions(data);
        }
      } else {
        setActiveInstructions([]);
      }
    } catch (err) {
      console.error('Error checking instructions:', err);
    }
  };

  const applyInstruction = (instruction: any) => {
    if (!instruction) return;
    const { planned_data, tank_id: instrTankId, activity_type: instrActivity, section_id: instrSectionId, farm_id: instrFarmId } = instruction;
    
    // Switch to correct context if available in the instruction
    if (instrFarmId) {
      setSelectedFarmId(instrFarmId);
      setActiveFarmId(instrFarmId);
    }
    if (instrSectionId) {
      setSelectedSectionId(instrSectionId);
      setActiveSectionId(instrSectionId);
    }

    if (instrTankId) {
      setSelectionScope('single');
      setTankId(instrTankId);
      setSelectedTankIds([instrTankId]);
    } else if (instrSectionId) {
      setSelectionScope('all');
    }

    const currentAct = instrActivity || activity;

    if (currentAct === 'Feed') {
      setFeedType(planned_data.item);
      setFeedQty(planned_data.amount);
      setFeedUnit(planned_data.unit);
      if (planned_data.timeSlot) setTimeSlot(planned_data.timeSlot);
    } else if (currentAct === 'Treatment') {
      setTreatmentType(planned_data.item);
      setTreatmentDosage(planned_data.amount);
      setTreatmentUnit(planned_data.unit);
      if (planned_data.timeSlot) setTimeSlot(planned_data.timeSlot);
    } else if (currentAct === 'Algae' && planned_data.algaeData) {
      setAlgaeData(planned_data.algaeData);
    } else if (currentAct === 'Artemia' && planned_data.artemiaData) {
      setArtemiaData(planned_data.artemiaData);
    } else if (currentAct === 'Stocking' && planned_data.stockingData) {
      setStockingData(planned_data.stockingData);
    } else if (currentAct === 'Observation' && planned_data.observationData) {
      setObservationData(planned_data.observationData);
    } else if (currentAct === 'Harvest' && planned_data.harvestData) {
      setHarvestData(planned_data.harvestData);
    } else if (currentAct === 'Tank Shifting' && planned_data.tankShiftingData) {
      setTankShiftingData(planned_data.tankShiftingData);
    } else if (currentAct === 'Nauplii Sale' && planned_data.naupliiSaleData) {
      setNaupliiSaleData(planned_data.naupliiSaleData);
    } else if (currentAct === 'Order Booking' && planned_data.orderBookingData) {
      setOrderBookingData(planned_data.orderBookingData);
    } else if (currentAct === 'Animals Sampling & Observation' && planned_data.animalSamplingData) {
      setAnimalSamplingData(planned_data.animalSamplingData);
    }
    
    setSelectedInstructionId(instruction.id);
    setSelectedInstructionData(instruction);
    toast.success('Instruction applied!');
  };

  // Pre-fill data if editing
  useEffect(() => {
    if (editId) {
      loadActivityData();
    }
  }, [editId]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) throw error;
      if (data) {
        setDate(data.data.date || formatDate(data.created_at, 'yyyy-MM-dd'));
        setTime(data.data.time || formatDate(data.created_at, 'hh:mm'));
        setAmpm(data.data.ampm || (formatDate(data.created_at, 'a') as 'AM' | 'PM'));
        if (data.data.timeSlot) setTimeSlot(data.data.timeSlot);
        setTankId(data.tank_id);
        setSelectedSectionId(data.section_id || '');
        setSelectedFarmId(data.farm_id || '');
        setComments(data.data.comments || '');
        setPhotoUrl(data.data.photo_url || '');

        // Pre-fill activity specific fields
        const actType = data.activity_type;
        setActivity(actType as ActivityType);

        if (actType === 'Feed') {
          setFeedType(data.data.feedType || '');
          setFeedQty(data.data.feedQty || '');
          setFeedUnit(data.data.feedUnit || 'kg');
        } else if (actType === 'Treatment') {
          setTreatmentType(data.data.treatmentType || '');
          setTreatmentDosage(data.data.treatmentDosage || '');
          setTreatmentUnit(data.data.treatmentUnit || 'ml');
        } else if (actType === 'Water Quality') {
          setWaterData(data.data.waterData || {});
        } else if (actType === 'Animal Quality') {
          setAnimalSize(data.data.animalSize || '');
          setAnimalStage(data.data.animalStage || '');
          setAnimalDoc(data.data.animalDoc || '');
          setAnimalRatings(data.data.animalRatings || {});
          setHasDiseaseIdentified(data.data.hasDiseaseIdentified || '');
          setDiseaseSymptoms(data.data.diseaseSymptoms || '');
          setAdditionalObservations(data.data.additionalObservations || data.data.otherAnimal || '');
        } else if (actType === 'Stocking') {
          setStockingData(data.data);
        } else if (actType === 'Observation') {
          setObservationData(data.data);
        } else if (actType === 'Harvest') {
          setHarvestData(data.data);
        } else if (actType === 'Tank Shifting') {
          setTankShiftingData(data.data);
        } else if (actType === 'Order Booking') {
          setOrderBookingData(data.data);
        } else if (actType === 'Sourcing & Mating') {
          setSourcingMatingData(data.data);
        } else if (actType === 'Spawning') {
          setSpawningData(data.data);
        } else if (actType === 'Egg Count') {
          setEggCountData(data.data);
        } else if (actType === 'Nauplii Harvest') {
          setNaupliiHarvestData(data.data);
        } else if (actType === 'Nauplii Sale') {
          setNaupliiSaleData(data.data);
        } else if (actType === 'Water Management') {
          setWaterMgmtData(data.data);
        } else if (actType === 'Animals Sampling & Observation') {
          setAnimalSamplingData(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading activity:', err);
      toast.error('Failed to load activity details');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill section if in context and not editing
  useEffect(() => {
    if (activeSectionId && !editId && availableTanks.length > 0) {
      if (availableTanks.some(s => s.id === activeSectionId)) {
        setSelectedSectionId(activeSectionId);
      }
    }
  }, [activeSectionId, editId, availableTanks]);

  // Derive section from tank if missing (for older records)
  useEffect(() => {
    if (editId && tankId && !selectedSectionId && availableTanks.length > 0) {
      for (const sec of availableTanks) {
        if (sec.tanks.some((t: any) => t.id === tankId)) {
          setSelectedSectionId(sec.id);
          break;
        }
      }
    }
  }, [editId, tankId, selectedSectionId, availableTanks]);

  // Auto-fetch Stocking data for Observation and Animals Sampling & Observation (single-tank mode only)
  useEffect(() => {
    const isSamplingOrObs = activity === 'Observation' || activity === 'Animals Sampling & Observation';
    if (isSamplingOrObs && tankId && !editId) {
      fetchLatestStockingData(tankId);
    }
  }, [activity, tankId, date]);

  // Maturation Observation: build tankEntries whenever scope/selection changes
  useEffect(() => {
    if (activeFarmCategory !== 'MATURATION' || activity !== 'Observation' || editId) return;

    const currentFarmId = selectedFarmId || activeFarmId;
    const sectionId = selectedSectionId || activeSectionId;

    // Resolve which tanks to show based on scope
    let effectiveTankIds: string[] = [];

    if (selectionScope === 'all') {
      const allSectionTanks = sectionId
        ? (availableTanks.find(s => s.id === sectionId)?.tanks || []).map((t: any) => t.id)
        : availableTanks.filter(s => s.farm_id === currentFarmId).flatMap(s => s.tanks || []).map((t: any) => t.id);
      effectiveTankIds = batchRelatedTankIds.length > 0
        ? allSectionTanks.filter((id: string) => batchRelatedTankIds.includes(id))
        : allSectionTanks;
    } else if (selectionScope === 'custom') {
      effectiveTankIds = selectedTankIds;
    } else {
      effectiveTankIds = tankId ? [tankId] : [];
    }

    if (effectiveTankIds.length === 0) {
      setObservationData((prev: any) => ({ ...prev, tankEntries: [] }));
      return;
    }

    let isCancelled = false;

    const buildEntries = async () => {
      const entries = await Promise.all(
        effectiveTankIds.map(async (tid) => {
          const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tid));
          const tank = section?.tanks.find((t: any) => t.id === tid);
          const farmId = section?.farm_id || currentFarmId;

          const { data, error } = await supabase
            .from('activity_logs')
            .select('data, activity_type')
            .eq('tank_id', tid)
            .in('activity_type', ['Stocking', 'Observation'])
            .eq('farm_id', farmId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let originalPopM = '0';
          let originalPopF = '0';
          let stockingId = '';

          if (!error && data && data.data) {
            const isStocking = data.activity_type === 'Stocking';
            originalPopM = isStocking ? (data.data.totalMales || '0') : (data.data.presentPopulationM || '0');
            originalPopF = isStocking ? (data.data.totalFemales || '0') : (data.data.presentPopulationF || '0');
            stockingId = data.data.stockingId || '';
          }

          return {
            tankId: tid,
            tankName: tank?.name || tid,
            sectionName: section?.name || '',
            originalPopM,
            originalPopF,
            moults: '',
            mortalityNo: '',
            avgBodyWt: '',
            stockingId,
          };
        })
      );

      if (isCancelled) return;

      // Preserve user-entered data for tanks already in the list
      setObservationData((prev: any) => {
        const prevEntries: any[] = prev.tankEntries || [];
        const merged = entries.map(e => {
          const existing = prevEntries.find(p => p.tankId === e.tankId);
          return existing
            ? { ...e, moults: existing.moults, mortalityNo: existing.mortalityNo, avgBodyWt: existing.avgBodyWt }
            : e;
        });
        return { ...prev, tankEntries: merged };
      });
    };

    buildEntries();

    return () => { isCancelled = true; };
  }, [activeFarmCategory, activity, selectionScope, selectedTankIds, tankId, editId, availableTanks, activeFarmId, selectedFarmId, selectedSectionId, activeSectionId, batchRelatedTankIds]);

  const fetchLatestStockingData = async (tid: string) => {
    try {
      // Clear previous stocking data before fetching new
      setObservationData(prev => ({
        ...prev,
        tankStockingNumber: undefined,
        naupliiStockedMillion: undefined
      }));
      setAnimalSamplingData(prev => ({
        ...prev,
        stockingDate: undefined,
        doc: undefined,
        stockingPopulation: undefined,
        presentPopulation: undefined,
        stockingId: undefined
      }));

      const tankSection = availableTanks.find(s => s.tanks.some((t: any) => t.id === tid));
      const currentFarmId = tankSection?.farm_id || selectedFarmId || activeFarmId;
      
      if (!currentFarmId) {
        console.warn('No farm ID found for tank:', tid);
      }
      
      // Fetch latest stocking record
      const { data: stockingLog, error: stockingError } = await supabase
        .from('activity_logs')
        .select('data, created_at')
        .eq('tank_id', tid)
        .eq('activity_type', 'Stocking')
        .eq('farm_id', currentFarmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestPop = await fetchLatestPopulation(tid);

      if (!stockingError && stockingLog && stockingLog.data) {
        const stockingId = stockingLog.data.stockingId;
        const stockingDate = stockingLog.data.date;
        const stockingPop = stockingLog.data.tankStockingNumber || stockingLog.data.naupliiStocked || stockingLog.data.totalMales || '0';
        
        let doc: number | undefined = undefined;
        if (stockingDate && date) {
          const sDate = new Date(stockingDate);
          const cDate = new Date(date);
          sDate.setHours(0,0,0,0);
          cDate.setHours(0,0,0,0);
          const diffTime = cDate.getTime() - sDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          doc = diffDays >= 0 ? diffDays : 0;
        }

        setObservationData(prev => ({
          ...prev,
          stockingId: stockingId,
          broodstockSource: stockingLog.data.broodstockSource,
          broodstockType: stockingLog.data.broodstockType,
          sex: stockingLog.data.sex,
          hatcheryName: stockingLog.data.hatcheryName,
          tankStockingNumber: stockingLog.data.tankStockingNumber,
          presentPopulation: latestPop.toString(),
          naupliiStockedMillion: stockingLog.data.naupliiStocked || stockingLog.data.naupliiStockedMillion
        }));

        setAnimalSamplingData(prev => ({
          ...prev,
          stockingId: stockingId,
          stockingDate: stockingDate,
          doc: doc,
          stockingPopulation: stockingPop,
          presentPopulation: latestPop.toString(),
          naupliiStocked: stockingLog.data.naupliiStocked,
          originalPop: stockingPop,
          broodstockSource: stockingLog.data.broodstockSource,
          broodstockType: stockingLog.data.broodstockType,
          hatcheryName: stockingLog.data.hatcheryName
        }));
      }
    } catch (err) {
      console.error('Error fetching stocking data:', err);
    }
  };

  const fetchLatestPopulation = async (tid: string) => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('data, activity_type')
        .eq('tank_id', tid)
        .in('activity_type', ['Stocking', 'Observation', 'Animals Sampling & Observation', 'Harvest', 'Tank Shifting'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.data) {
        let population = 0;
        if (data.activity_type === 'Stocking') {
          population = activeFarmCategory === 'MATURATION' 
            ? parseFloat(data.data.totalMales || '0') + parseFloat(data.data.totalFemales || '0')
            : parseFloat(data.data.tankStockingNumber || '0');
        } else if (data.activity_type === 'Observation' || data.activity_type === 'Animals Sampling & Observation') {
          population = activeFarmCategory === 'MATURATION' 
            ? parseFloat(data.data.presentPopulationM || '0') + parseFloat(data.data.presentPopulationF || '0')
            : parseFloat(data.data.presentPopulation || '0');
        } else if (data.activity_type === 'Harvest') {
          population = parseFloat(data.data.populationAfterHarvest || '0');
        } else if (data.activity_type === 'Tank Shifting') {
           if (data.data.sourceTankId === tid) {
               population = parseFloat(data.data.remainingInSource || '0');
           } else {
               const dest = (data.data.destinations || []).find((d: any) => d.tankId === tid);
               population = parseFloat(dest?.populationToShift || '0') + parseFloat(dest?.currentPopulation || '0');
           }
        }
        return population;
      }
    } catch (err) {
      console.error('Error fetching latest population:', err);
    }
    return 0;
  };

  const fetchHarvestPreloadData = async (tid: string) => {
    try {
      const tankSection = availableTanks.find(s => s.tanks.some((t: any) => t.id === tid));
      const currentFarmId = tankSection?.farm_id || selectedFarmId || activeFarmId;
      
      // 1. Fetch latest stocking log
      let stockingDate = '';
      let stockingPopulation = 0;
      if (currentFarmId) {
        const { data: stockingLog } = await supabase
          .from('activity_logs')
          .select('data')
          .eq('tank_id', tid)
          .eq('activity_type', 'Stocking')
          .eq('farm_id', currentFarmId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stockingLog && stockingLog.data) {
          stockingDate = stockingLog.data.date || '';
          stockingPopulation = parseFloat(stockingLog.data.tankStockingNumber || stockingLog.data.naupliiStocked || '0');
        }
      }

      // 2. Fetch latest population before harvest
      const latestPop = await fetchLatestPopulation(tid);

      // 3. Fetch latest average body weight (ABW) from Observation/Sampling
      let averageBodyWeight = 0;
      if (currentFarmId) {
        const { data: latestObs } = await supabase
          .from('activity_logs')
          .select('data')
          .eq('tank_id', tid)
          .in('activity_type', ['Animals Sampling & Observation', 'Observation'])
          .eq('farm_id', currentFarmId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestObs && latestObs.data) {
          averageBodyWeight = parseFloat(latestObs.data.sample1AvgWt || latestObs.data.avgBodyWt || latestObs.data.abw || '0');
        }
      }

      let doc: number | undefined = undefined;
      if (stockingDate && date) {
        const sDate = new Date(stockingDate);
        const cDate = new Date(date);
        sDate.setHours(0,0,0,0);
        cDate.setHours(0,0,0,0);
        const diffTime = cDate.getTime() - sDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        doc = diffDays >= 0 ? diffDays : 0;
      }

      // Preharvest estimated biomass (Present Population * ABW) / 1000
      const estimatedBiomass = averageBodyWeight > 0 ? (latestPop * averageBodyWeight) / 1000 : 0;

      setHarvestData((prev: any) => ({
        ...prev,
        stockingDate,
        doc,
        stockingPopulation,
        populationBeforeHarvest: latestPop.toString(),
        preharvestPopulationEstimate: latestPop,
        averageBodyWeight,
        preharvestEstimatedBiomass: parseFloat(estimatedBiomass.toFixed(2))
      }));
    } catch (err) {
      console.error('Error preloading harvest data:', err);
    }
  };

  // Auto-fetch Population / Preload details for Harvest & Tank Shifting
  useEffect(() => {
    if (activity === 'Harvest' && tankId && !editId) {
      fetchHarvestPreloadData(tankId);
    } else if (activity === 'Tank Shifting' && tankId && !editId) {
      fetchLatestPopulation(tankId).then(pop => {
        setTankShiftingData(prev => ({ ...prev, sourcePopulation: pop.toString() }));
      });
    }
  }, [activity, tankId, editId, date]);

  // Pre-fill activity from URL (if not editing)
  useEffect(() => {
    if (type && !editId) {
      const map: Record<string, ActivityType> = {
        'feed': 'Feed',
        'treatment': 'Treatment',
        'water': 'Water Quality',
        'water quality': 'Water Quality',
        'animal': 'Animal Quality',
        'animal quality': 'Animal Quality',
        'stocking': 'Stocking',
        'observation': 'Observation',
        'artemia': 'Artemia',
        'algae': 'Algae',
        'harvest': 'Harvest',
        'tank shifting': 'Tank Shifting',
        'shifting': 'Tank Shifting',
        'sourcing & mating': 'Sourcing & Mating',
        'spawning': 'Spawning',
        'egg count': 'Egg Count',
        'nauplii harvest': 'Nauplii Harvest',
        'nauplii sale': 'Nauplii Sale',
        'broodstock discard': 'Broodstock Discard',
        'water management': 'Water Management',
        'water-management': 'Water Management',
        'order booking': 'Order Booking',
        'order-booking': 'Order Booking',
      };
      if (map[type.toLowerCase()]) {
        setActivity(map[type.toLowerCase()]);
      }
    }
  }, [type, editId]);

  // Auto-set selectionScope to 'all' for Maturation Stocking
  // Auto-set selectionScope to 'custom' for Maturation Observation
  useEffect(() => {
    if (activeFarmCategory === 'MATURATION' && activity === 'Stocking' && !editId) {
      setSelectionScope('all');
    } else if (activeFarmCategory === 'MATURATION' && activity === 'Observation' && !editId) {
      setSelectionScope('custom');
    }
  }, [activeFarmCategory, activity]);

  // Feed fields
  const [feedType, setFeedType] = useState('');
  const [feedQty, setFeedQty] = useState('');
  const [feedUnit, setFeedUnit] = useState(isFarmModule ? 'kg' : 'gms');

  // Treatment fields
  const [treatmentType, setTreatmentType] = useState('');
  const [treatmentDosage, setTreatmentDosage] = useState('');
  const [treatmentUnit, setTreatmentUnit] = useState('ml');

  // Animal quality fields
  const [animalSize, setAnimalSize] = useState('');
  const [animalStage, setAnimalStage] = useState('');
  const [animalDoc, setAnimalDoc] = useState('');
  const [animalRatings, setAnimalRatings] = useState<Record<string, number>>({});
  const [hasDiseaseIdentified, setHasDiseaseIdentified] = useState<'Yes' | 'No' | ''>('');
  const [diseaseSymptoms, setDiseaseSymptoms] = useState('');
  const [additionalObservations, setAdditionalObservations] = useState('');

  // Water quality fields
  const [waterData, setWaterData] = useState<Record<string, string>>({});

  // Stocking & Observation extra data
  const [stockingData, setStockingData] = useState<any>({});
  const [observationData, setObservationData] = useState<any>({});
  const [animalSamplingData, setAnimalSamplingData] = useState<any>({});

  // Artemia & Algae data
  const [artemiaData, setArtemiaData] = useState<any>({ phase: 'pre' });
  const [algaeData, setAlgaeData] = useState<any>({ phase: 'new' });
  const [harvestData, setHarvestData] = useState<any>({});
  const [orderBookingData, setOrderBookingData] = useState<any>({});
  const [tankShiftingData, setTankShiftingData] = useState<any>({ destinations: [{ id: Date.now() }] });

  // Water Management data
  const [waterMgmtData, setWaterMgmtData] = useState<any>({
    flowOperation: '',
    sourceType: '', // 'sea', 'fresh', 'tank'
    sourceTankIds: [],
    sourceScope: 'single', // 'single', 'all', 'custom'
    sourceVolumeAvailable: 0,
    selectedSectionFilter: 'all',
    fillTargets: [], // Array of { tankId: string, volumeToFill: number, finalVolume: number }
    totalVolumeToFill: 0,
    sourceFinalVolume: 0,
    waterQualityScore: 0,
    waterQualityData: {},
    // New fields for Exchange
    exchangeUnit: 'volume', // 'volume' or 'percent'
    exchangeSourceTankId: '',
    exchangeTargets: [], // Array of { tankId: string, tankName: string, exchangeAmount: number, finalVolume: number }
    // New fields for Drain
    drainUnit: 'volume',
    drainTargets: [], // Array of { tankId: string, tankName: string, drainAmount: number, finalVolume: number }
    // New fields for Recirculation
    recirculationUnit: 'percent',
    recirculationTargets: [], // Array of { tankId: string, tankName: string, recircHours: string, startTime: string, endTime: string, timeMode: 'duration' | 'slot' }
    // New fields for Drain / Clean
    cleanTargets: [], // Array of { tankId: string, tankName: string }
    cleanSectionFilter: 'all',
    cleanQuality: {
      surface: 0,
      paint: 0,
      cleanliness: 0,
      dryStatus: 0,
      lastWashDate: ''
    },
    // New fields for Observations
    observationTargets: [], // Array of { tankId: string, tankName: string }
    observationScope: 'single', // 'single', 'all', 'custom'
    observationSectionFilter: 'all',
    observationQuality: {
      surface: 0,
      paint: 0,
      cleanliness: 0,
      dryStatus: 0,
      lastWashDate: ''
    },
    // New fields for Treatment
    treatmentTargets: [], // Array of { tankId: string, tankName: string }
    treatmentSectionFilter: 'all',
    treatmentType: '',
    treatmentDosage: '',
    treatmentUnit: 'ml'
  });

  // Water Quality Calculation for Water Management
  const waterMgmtValues = waterFields.map(field => {
    const valStr = String(waterMgmtData.waterQualityData?.[field] || '').trim();
    if (valStr === '') return null;
    const val = parseFloat(valStr);
    if (isNaN(val)) return 10;
    const range = WATER_QUALITY_RANGES[field] || '';
    let isOk = true;
    if (field === 'Vibrio Count') {
      isOk = val < 1000;
    } else if (field === 'Yellow Green Bacteria') {
      isOk = val < 100;
    } else if (range === '[Nil]') {
      isOk = val === 0;
    } else if (range.includes(' - ')) {
      const matches = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (matches) { isOk = val >= parseFloat(matches[1]) && val <= parseFloat(matches[2]); }
    } else if (range.includes('>')) {
      const matches = range.match(/>\s*(\d+\.?\d*)/);
      if (matches) isOk = val > parseFloat(matches[1]);
    } else if (range.includes('<')) {
      const matches = range.match(/<\s*(\d+\.?\d*)/);
      if (matches) isOk = val < parseFloat(matches[1]);
    }
    return isOk ? 10 : 0;
  });

  const waterMgmtFilledCount = waterMgmtValues.filter(v => v !== null).length;
  const waterMgmtAvg = waterMgmtFilledCount > 0
    ? waterMgmtValues.filter(v => v !== null).reduce((a, b) => (a || 0) + (b || 0), 0) / waterMgmtFilledCount
    : 0;

  const cleanQualityAvg = useMemo(() => {
    const { surface, paint, cleanliness, dryStatus } = waterMgmtData.cleanQuality || {};
    const scores = [surface, paint, cleanliness, dryStatus].filter(s => s > 0);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [waterMgmtData.cleanQuality]);

  const observationQualityAvg = useMemo(() => {
    const { surface, paint, cleanliness, dryStatus } = waterMgmtData.observationQuality || {};
    const scores = [surface, paint, cleanliness, dryStatus].filter(s => s > 0);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [waterMgmtData.observationQuality]);

  const [comments, setComments] = useState('');


  // Fetch recent Artemia Pre-Harvest IDs for linking
  useEffect(() => {
    if (activity === 'Artemia') {
      const fetchPreHarvestIds = async () => {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select('data')
            .eq('activity_type', 'Artemia')
            .eq('farm_id', activeFarmId || selectedFarmId)
            .order('created_at', { ascending: false })
            .limit(100);

          if (!error && data) {
            const preIds: string[] = [];
            const harvestedIds: string[] = [];
            
            data.forEach((d: any) => {
              const phase = d.data?.phase;
              if (phase === 'pre') {
                if (d.data.samples && Array.isArray(d.data.samples)) {
                  d.data.samples.forEach((s: any) => {
                    if (s.sampleId) preIds.push(s.sampleId);
                  });
                } else if (d.data.sampleId) {
                  preIds.push(d.data.sampleId);
                }
              } else if (phase === 'post') {
                if (d.data.linkedSampleIds && Array.isArray(d.data.linkedSampleIds)) {
                  harvestedIds.push(...d.data.linkedSampleIds);
                } else if (d.data.linkedSampleId) {
                  harvestedIds.push(d.data.linkedSampleId);
                }
              }
            });

            // Only show IDs that haven't been harvested yet
            const availableIds = preIds.filter(id => !harvestedIds.includes(id));
            setAvailableArtemiaPreHarvestIds([...new Set(availableIds)]);
          }
        } catch (err) {
          console.error('Error fetching artemia ids:', err);
        }
      };
      fetchPreHarvestIds();
    }
  }, [activity, activeFarmId, selectedFarmId]);

  // Fetch recent Algae Sample IDs for inoculum source
  useEffect(() => {
    if (activity === 'Algae') {
      const fetchAlgaeSourceIds = async () => {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select('data, created_at')
            .eq('activity_type', 'Algae')
            .eq('farm_id', activeFarmId || selectedFarmId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (!error && data) {
            const ids: string[] = [];
            const details: any[] = [];
            
            data.forEach((d: any) => {
              const species = d.data?.algaeSpecies || '';
              if (d.data?.samples && Array.isArray(d.data.samples)) {
                d.data.samples.forEach((s: any) => {
                  if (s.sampleId && !ids.includes(s.sampleId)) {
                    ids.push(s.sampleId);
                    details.push({ 
                      id: s.sampleId, 
                      species,
                      inoculumSourceId: s.inoculumSourceId,
                      inoculumQuantity: s.inoculumQuantity,
                      inoculumUnit: s.inoculumUnit,
                      createdAt: d.created_at,
                      date: d.data?.date
                    });
                  }
                });
              }
            });
            // Sorted IDs
            setAvailableAlgaeSourceIds([...new Set(ids)].sort());
            
            // Unique Details
            const uniqueDetails = details.filter((item, index, self) => 
               index === self.findIndex((t) => t.id === item.id)
            );
            setAvailableAlgaeSourceDetails(uniqueDetails);
          }
        } catch (err) {
          console.error('Error fetching algae source ids:', err);
        }
      };
      fetchAlgaeSourceIds();
    }
  }, [activity, activeFarmId, selectedFarmId]);

  // Auto-populate Inoculum Source ID for Algae - ONLY if not already set
  useEffect(() => {
    if (activity === 'Algae' && !editId && !algaeData.inoculumSourceId) {
      const fetchLatestAlgae = async () => {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select('data')
            .eq('activity_type', 'Algae')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data?.data?.samples && Array.isArray(data.data.samples) && data.data.samples.length > 0) {
            // Default to the first sample ID of the latest Algae log as a suggestion
            const latestId = data.data.samples[0].sampleId;
            if (latestId) {
               setAlgaeData(prev => ({ ...prev, inoculumSourceId: latestId }));
            }
          }
        } catch (err) {
          console.error('Error fetching latest algae record:', err);
        }
      };
      fetchLatestAlgae();
    }
  }, [activity, editId]);

  const buildData = (): Record<string, any> => {
    const baseData = { date, time, ampm, timeSlot, comments, photo_url: photoUrl };
    switch (activity) {
      case 'Feed': return { ...baseData, feedType, feedQty, feedUnit, timeSlot };
      case 'Treatment': return { ...baseData, treatmentType, treatmentDosage, treatmentUnit, timeSlot };
      case 'Water Quality': return { ...baseData, waterData };
      case 'Animal Quality': return { ...baseData, animalSize, animalStage, animalDoc, animalRatings, hasDiseaseIdentified, diseaseSymptoms, additionalObservations };
      case 'Stocking': return { ...baseData, ...stockingData, photo_url: photoUrl };
      case 'Observation': return { ...baseData, ...observationData, photo_url: photoUrl };
      case 'Artemia': return { ...baseData, ...artemiaData, photo_url: photoUrl };
      case 'Algae': return { ...baseData, ...algaeData };
      case 'Harvest': return { ...baseData, ...harvestData };
      case 'Order Booking': return { ...baseData, ...orderBookingData };
      case 'Tank Shifting': return { ...baseData, ...tankShiftingData };
      case 'Sourcing & Mating': return { ...baseData, ...sourcingMatingData };
      case 'Spawning': return { ...baseData, ...spawningData };
      case 'Egg Count': return { ...baseData, ...eggCountData };
      case 'Nauplii Harvest': return { ...baseData, ...naupliiHarvestData };
      case 'Nauplii Sale': return { ...baseData, ...naupliiSaleData };
      case 'Broodstock Discard': return { ...baseData, ...broodstockDiscardData };
      case 'Water Management': return { ...baseData, ...waterMgmtData };
      case 'Animals Sampling & Observation': return { ...baseData, ...animalSamplingData, photo_url: photoUrl };
      default: return baseData;
    }
  };

  const handleSaveInstruction = async () => {
    if (!activity) {
      toast.error('Please select an activity');
      return;
    }

    let targets = [];
    const isSpecialActivity = activity === 'Algae' || activity === 'Artemia' || ['Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard', 'Water Management'].includes(activity);

    if (selectionScope === 'all') {
      targets = [null]; // One record for the whole section
    } else if (selectionScope === 'custom') {
      targets = selectedTankIds;
    } else {
      targets = [tankId];
    }

    if (!isSpecialActivity && selectionScope !== 'all') {
      if (targets.length === 0 || (targets.length === 1 && !targets[0])) {
        toast.error('Please select at least one tank');
        return;
      }
    } else if (isSpecialActivity) {
      // For Algae/Artemia, if no targets, create one record with null tank
      if (targets.length === 0 || (targets.length === 1 && !targets[0])) {
        targets = [null];
      }
    }

    try {
      setLoading(true);
      const records = targets.map(tId => {
        let farmId = activeFarmId;
        let sectionId = selectedSectionId || activeSectionId || null;
        
        if (tId) {
          const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tId));
          if (section) {
            sectionId = section.id || null;
            farmId = section.farm_id || null;
          }
        } else if (sectionId) {
          const section = availableTanks.find(s => s.id === sectionId);
          if (section) {
            farmId = section.farm_id || null;
          }
        }

        if (activity === 'Stocking') {
          if (!stockingData.stockingId) {
            toast.error('Stocking ID is required');
            return;
          }
        }

        if (activity === 'Algae') {
          const phase = algaeData.phase || 'new';
          if (phase === 'new') {
            if (!algaeData.algaeSpecies) {
              toast.error('Algae Species is required');
              return;
            }
            if (!algaeData.containerSize) {
              toast.error('Container Size is required');
              return;
            }
            // Skip inoculumQuantity/age/assessment validation for planning
          } else if (phase === 'discard') {
            if (!algaeData.discardSampleId) {
              toast.error('Please select a sample to discard');
              return;
            }
            // Logic for discardReason will be handled by worker
          } else if (phase === 'verify') {
            if (!algaeData.verifySampleId) {
              toast.error('Please select a sample to verify');
              return;
            }
            // Logic for cell count/quality will be handled by worker
          }
        }

        if (activity === 'Harvest' && !harvestData.populationBeforeHarvest) {
          toast.error('Population before harvest is required');
          return;
        }
        if (activity === 'Tank Shifting' && !tankShiftingData.sourcePopulation) {
          toast.error('Source population is required');
          return;
        }

        if (activity === 'Artemia') {
          if (artemiaData.phase === 'pre') {
            if (!artemiaData.numberOfSamples) {
              toast.error('Number of Samples is required');
              return;
            }
            const samples = artemiaData.samples || [];
            if (samples.length === 0) {
              toast.error('At least one sample is required');
              return;
            }
            for (let i = 0; i < samples.length; i++) {
              if (!samples[i].sampleId) {
                toast.error(`Sample ID for Sample ${i + 1} is required`);
                return;
              }
              if (!samples[i].quantity) {
                toast.error(`Quantity for Sample ${i + 1} is required`);
                return;
              }
            }
          } else {
            const selectedIds = artemiaData.linkedSampleIds || [];
            if (selectedIds.length === 0) {
              toast.error('Please choose at least one Pre-Harvest ID');
              return;
            }
            // Technical metrics (harvestStage, cellsHarvested, harvestWeight) are hidden during planning mode
            // and will be filled by the worker later.
          }
        }

        if ((activity === 'Feed' || activity === 'Treatment') && !timeSlot) {
          toast.error('Time Slot is required for Feed/Treatment');
          return;
        }

        // Derive hatchery_id: use user's hatchery, fallback to farm's hatchery
        let hatcheryId = user?.hatchery_id || null;
        if (!hatcheryId && farmId) {
          const farmSection = availableTanks.find(s => s.farm_id === farmId);
          if (farmSection?.hatchery_id) hatcheryId = farmSection.hatchery_id;
        }

        if (!hatcheryId) {
          toast.error('Hatchery info missing. Please log out and log in again.');
          return null;
        }

        const record = {
          hatchery_id: hatcheryId,
          farm_id: farmId,
          section_id: sectionId,
          tank_id: tId || null,
          activity_type: activity === 'Broodstock Discard' ? 'Observation' : activity.trim(),
          scheduled_date: date,
          scheduled_time: time,
          planned_data: {
            item: activity === 'Feed' ? feedType : (activity === 'Treatment' ? treatmentType : 'Instruction'),
            amount: activity === 'Feed' ? feedQty : (activity === 'Treatment' ? treatmentDosage : ''),
            unit: activity === 'Feed' ? feedUnit : (activity === 'Treatment' ? treatmentUnit : ''),
            timeSlot: (activity === 'Feed' || activity === 'Treatment') ? timeSlot : undefined,
            instructions: comments,
            stockingData: activity === 'Stocking' ? stockingData : undefined,
            observationData: activity === 'Observation' ? observationData : undefined,
            artemiaData: activity === 'Artemia' ? artemiaData : undefined,
            algaeData: activity === 'Algae' ? algaeData : undefined,
            harvestData: activity === 'Harvest' ? harvestData : undefined,
            tankShiftingData: activity === 'Tank Shifting' ? tankShiftingData : undefined,
            sourcingMatingData: activity === 'Sourcing & Mating' ? sourcingMatingData : undefined,
            spawningData: activity === 'Spawning' ? spawningData : undefined,
            eggCountData: activity === 'Egg Count' ? eggCountData : undefined,
            naupliiHarvestData: activity === 'Nauplii Harvest' ? naupliiHarvestData : undefined,
            naupliiSaleData: activity === 'Nauplii Sale' ? naupliiSaleData : undefined,
            broodstockDiscardData: activity === 'Broodstock Discard' ? broodstockDiscardData : undefined,
            animalSamplingData: activity === 'Animals Sampling & Observation' ? animalSamplingData : undefined
          },
          created_by: user?.id || null,
          is_completed: false,
          assigned_to: assignedTo || null
        };

        console.log('DEBUG - Saving Instruction Record:', record);
        return record;
      }).filter(Boolean);

      if (editInstructionId) {
        // UPDATE existing instruction
        const plannedData = {
          item: activity === 'Feed' ? feedType : (activity === 'Treatment' ? treatmentType : 'Instruction'),
          amount: activity === 'Feed' ? feedQty : (activity === 'Treatment' ? treatmentDosage : ''),
          unit: activity === 'Feed' ? feedUnit : (activity === 'Treatment' ? treatmentUnit : ''),
          timeSlot: (activity === 'Feed' || activity === 'Treatment') ? timeSlot : undefined,
          instructions: comments,
          stockingData: activity === 'Stocking' ? stockingData : undefined,
          observationData: activity === 'Observation' ? observationData : undefined,
          artemiaData: activity === 'Artemia' ? artemiaData : undefined,
          algaeData: activity === 'Algae' ? algaeData : undefined,
          sourcingMatingData: activity === 'Sourcing & Mating' ? sourcingMatingData : undefined,
          broodstockDiscardData: activity === 'Broodstock Discard' ? broodstockDiscardData : undefined,
          animalSamplingData: activity === 'Animals Sampling & Observation' ? animalSamplingData : undefined
        };
        console.log('DEBUG - Updating Instruction:', { id: editInstructionId, plannedData, time, date });
        const { error } = await supabase
          .from('activity_charts')
          .update({ planned_data: plannedData, scheduled_time: time, scheduled_date: date, assigned_to: assignedTo || null })
          .eq('id', editInstructionId);
        if (error) throw error;
        toast.success('Instruction updated!');
      } else {
        // INSERT new instructions
        console.log('DEBUG - Inserting multiple records:', records);
        const { error } = await supabase.from('activity_charts').insert(records);
        if (error) {
          console.error('SERVER ERROR - INSERT:', error);
          throw error;
        }
        toast.success(targets.length > 1 ? `${targets.length} instructions scheduled!` : 'Instruction scheduled successfully!');
      }

      if (activity === 'Stocking' && isRedirectedFromObservation) {
        toast.success('Instruction scheduled & returning to Animals Sampling & Observation');
        setActivity('Animals Sampling & Observation');
        setPhotoUrl(''); // Clear stocking photo
        setComments(''); // Clear stocking instructions
        setIsRedirectedFromObservation(false);
        setLoading(false);
        return;
      }

      setTimeout(() => navigate(user?.role === 'owner' ? '/owner/dashboard' : '/user/dashboard'), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save instruction");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let normalizedData: any = null;

    // Basic validation
    if (selectionScope === 'single' && !tankId) {
      const activitiesWithInternalSelection = ['Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard', 'Water Management'];
      if (isSpecialActivity && !selectedSectionId && !activeSectionId && !activitiesWithInternalSelection.includes(activity)) {
        toast.error('Please select a section for this activity');
        return;
      }
      if (!isSpecialActivity && !activitiesWithInternalSelection.includes(activity)) {
        toast.error('Please select a tank');
        return;
      }
    }
    if (!activity) {
      toast.error('Please select an activity');
      return;
    }


    if (activity === 'Feed' && (!feedQty.trim() || !feedType.trim() || !timeSlot)) {
      toast.error('Feed Type, Quantity, and Time Slot are required');
      return;
    }

    if (activity === 'Treatment' && (!treatmentType.trim() || !treatmentDosage.trim() || !timeSlot)) {
      toast.error('Treatment Type, Dosage, and Time Slot are required');
      return;
    }

    if (activity === 'Stocking') {
      const isFarmModule = activeFarmCategory === 'FARMS' || activeFarmCategory === 'FARM';
      
      let requiredFields: string[];
      if (isFarmModule) {
        // Farm module uses seed-specific fields instead of broodstock/nauplii fields
        requiredFields = ['stockingId', 'seedSpecies', 'seedGeneticLine', 'hatcheryName', 'seedStage', 'tankStockingNumber', 'animalConditionScore', 'waterQualityScore'];
      } else if (activeFarmCategory === 'MATURATION') {
        // Maturation: naupliiStocked is not required (hidden)
        requiredFields = ['stockingId', 'broodstockSource', 'hatcheryName', 'tankStockingNumber', 'animalConditionScore', 'waterQualityScore'];
      } else {
        // LRT and others: stockingId is required
        requiredFields = ['stockingId', 'broodstockSource', 'hatcheryName', 'tankStockingNumber', 'naupliiStocked', 'animalConditionScore', 'waterQualityScore'];
      }
        
      const missing = requiredFields.filter(f => {
        let val = stockingData[f];
        // Special case: check both name variations for water quality
        if (f === 'waterQualityScore' && (val === undefined || val === null || val === '')) {
          val = stockingData['waterComplianceScore'];
        }
        // Special case: check both name variations for animal quality
        if (f === 'animalConditionScore' && (val === undefined || val === null || val === '')) {
          val = stockingData['animalQualityScore'];
        }
        return val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '');
      });
      if (missing.length > 0) {
        toast.error('Please fill in all stocking details (including Animal and Water Quality assessments)');
        return;
      }
    }

    if (activity === 'Observation') {
      normalizedData = { ...observationData };
      const isMaturation = activeFarmCategory === 'MATURATION';

      if (isMaturation && !editId) {
        // Maturation: validate that we have at least one tank entry
        const entries = normalizedData.tankEntries || [];
        if (entries.length === 0) {
          toast.error('Please select at least one tank');
          return;
        }

        // Also validate quality scores for Maturation Observation
        if (!normalizedData.animalQualityScore || !normalizedData.waterQualityScore) {
          toast.error('Animal and Water Quality assessments are required');
          return;
        }
      } else {
        const requiredFields = isMaturation
            ? ['animalQualityScore', 'waterQualityScore', 'presentPopulationM', 'presentPopulationF']
            : ['animalQualityScore', 'waterQualityScore', 'presentPopulation'];

        const missing = requiredFields.filter(f => {
            const val = normalizedData[f];
            return val === undefined || val === null || val === '' || (typeof val === 'string' && !val.trim()) || val === 0;
        });

        if (missing.length > 0) {
          toast.error('Please fill in all observation details (including Quality assessments)');
          return;
        }
      }

      // Update state with normalized data before proceeding to save
      setObservationData(normalizedData);
    }


    if (activity === 'Animal Quality') {
      if (!animalStage.trim()) {
        toast.error('Stage is required');
        return;
      }
      if (!animalDoc.trim()) {
        toast.error('DOC is required');
        return;
      }
      if (!animalSize.trim()) {
        toast.error('Animal Size and Avg. Wt. is required');
        return;
      }
      const missingRatings = ANIMAL_RATING_FIELDS.filter(f => !animalRatings[f.key]);
      if (missingRatings.length > 0) {
        toast.error('Please provide all animal quality ratings');
        return;
      }
      if (!hasDiseaseIdentified) {
        toast.error('Please specify if disease was identified');
        return;
      }
      if (hasDiseaseIdentified === 'Yes' && !diseaseSymptoms.trim()) {
        toast.error('Disease symptoms are required when disease is detected');
        return;
      }
    }

    if (activity === 'Water Quality') {
      const missing = waterFields.filter(f => !waterData[f]?.trim());
      if (missing.length > 0) {
        toast.error(`Please fill all water quality parameters: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`);
        return;
      }
    }

    if (activity === 'Algae') {
      if (algaeData.phase === 'discard') {
        if (!algaeData.discardSampleId) {
          toast.error('Please select a sample to discard');
          return;
        }
        if (!algaeData.discardReason?.trim()) {
          toast.error('Reason for discarding is required');
          return;
        }
      } else if (algaeData.phase === 'verify') {
        if (!algaeData.verifySampleId) {
          toast.error('Please select a sample to verify');
          return;
        }
        if (!algaeData.verifyCellCount) {
          toast.error('Cell count is required');
          return;
        }
        if (!algaeData.verifyCellQuality) {
          toast.error('Cell quality is required');
          return;
        }
      } else {
        if (!algaeData.algaeSpecies) {
          toast.error('Algae Species is required');
          return;
        }
        if (!algaeData.containerSize) {
          toast.error('Container Size is required');
          return;
        }
        const samples = algaeData.samples || [];
        const activeSamples = samples.filter((s: any) => s.status !== 'discard');
        const missingQty = activeSamples.some((s: any) => !s.inoculumQuantity);
        if (missingQty) {
          toast.error('Inoculum Quantity is required for all active samples');
          return;
        }
        const isAnySampleMissingData = activeSamples.some((s: any) =>
          !s.cellCountPerMl || !s.cellSize || !s.cellShape || !s.cellColour
        );
        if (isAnySampleMissingData) {
          toast.error('Please fill in all sample assessment fields (Cell Count, Size, Shape, and Colour)');
          return;
        }
      }
    }

    if (activity === 'Harvest') {
      if (!harvestData.weatherReport) {
        toast.error('Weather report is required');
        return;
      }
      if (!harvestData.harvestType) {
        toast.error('Harvest Type is required');
        return;
      }
      if (!harvestData.harvestedBiomass) {
        toast.error('Harvested biomass in Kgs is required');
        return;
      }

      // Samples validation
      const samplesList = harvestData.samples || [];
      if (samplesList.length === 0) {
        toast.error('At least one ABW sample is required');
        return;
      }
      const hasInvalidSample = samplesList.some((s: any) => !s.weight || parseFloat(s.weight) <= 0 || !s.count || parseFloat(s.count) <= 0);
      if (hasInvalidSample) {
        toast.error('Please enter a valid Weight and Number of Animals for all samples');
        return;
      }

      if (!harvestData.harvestedPopulation) {
        toast.error('Harvested population calculation is required');
        return;
      }
      if (harvestData.harvestType === 'Partial') {
        if (harvestData.populationAfterHarvest === undefined || harvestData.populationAfterHarvest === null || harvestData.populationAfterHarvest === '') {
          toast.error('Postharvest population estimate is required for Partial Harvest');
          return;
        }
        if (harvestData.biomassAfterHarvest === undefined || harvestData.biomassAfterHarvest === null || harvestData.biomassAfterHarvest === '') {
          toast.error('Postharvest biomass estimate is required for Partial Harvest');
          return;
        }
      }

      // Buyer & Payment validations
      if (!harvestData.buyerName) {
        toast.error('Buyer Name is required');
        return;
      }
      if (!harvestData.buyerContact) {
        toast.error('Buyer Contact Details (mobile) is required');
        return;
      }
      if (harvestData.buyerContact.length !== 10) {
        toast.error('Buyer mobile number must be exactly 10 digits');
        return;
      }
      if (harvestData.agreedPrice === undefined || harvestData.agreedPrice === null || harvestData.agreedPrice === '') {
        toast.error('Agreed Price/Kg is required');
        return;
      }
      if (harvestData.receivedAmount === undefined || harvestData.receivedAmount === null || harvestData.receivedAmount === '') {
        toast.error('Received Amount is required');
        return;
      }
    }

    if (activity === 'Order Booking') {
      if (!orderBookingData.customerName) {
        toast.error('Customer Name is required');
        return;
      }
      if (!orderBookingData.bookingId) {
        toast.error('Booking ID is required');
        return;
      }
      if (!orderBookingData.phoneNumber || orderBookingData.phoneNumber.length !== 10) {
        toast.error('Phone Number must be exactly 10 digits');
        return;
      }
      if (!orderBookingData.whatsappNumber || orderBookingData.whatsappNumber.length !== 10) {
        toast.error('Whatsapp Number must be exactly 10 digits');
        return;
      }
      if (!orderBookingData.alternateContact) {
        toast.error('Alternate Contact Details are required');
        return;
      }
      if (!orderBookingData.farmLocation) {
        toast.error('Farm Location / Address is required');
        return;
      }
      const numBatches = parseInt(orderBookingData.numBatches || '0');
      if (numBatches <= 0) {
        toast.error('Number of Batches required must be at least 1');
        return;
      }

      // Validate batches list
      const batches = orderBookingData.batches || [];
      if (batches.length === 0) {
        toast.error('At least one Batch Specification is required');
        return;
      }
      for (let i = 0; i < batches.length; i++) {
        const b = batches[i];
        if (!b.geneticLine) {
          toast.error(`Genetic Line is required for Batch #${i + 1}`);
          return;
        }
        if (!b.seedQuantityGross || parseFloat(b.seedQuantityGross) <= 0) {
          toast.error(`Valid Seed Quantity is required for Batch #${i + 1}`);
          return;
        }
        if (!b.salinity) {
          toast.error(`Salinity is required for Batch #${i + 1}`);
          return;
        }
        if (!b.deliveryDate1 || !b.deliveryDate2) {
          toast.error(`Both Delivery range dates are required for Batch #${i + 1}`);
          return;
        }
      }

      if (!orderBookingData.orderStatus) {
        toast.error('Status of Order is required');
        return;
      }
      if (!orderBookingData.priorityNumber) {
        toast.error('Priority Number Allocation is required');
        return;
      }

      // Confirmed status allocations validation
      if (orderBookingData.orderStatus === 'Confirmed') {
        if (!orderBookingData.orderId) {
          toast.error('Order ID is required for Confirmed status');
          return;
        }
        if (!orderBookingData.allocatedStockingId) {
          toast.error('Allocated Batch/Stocking ID is required for Confirmed status');
          return;
        }
        const allocatedTanks = orderBookingData.allocatedTanks || [];
        if (allocatedTanks.length === 0) {
          toast.error('At least one Tank Allocation is required for Confirmed status');
          return;
        }
        for (let i = 0; i < allocatedTanks.length; i++) {
          const t = allocatedTanks[i];
          if (!t.tankId) {
            toast.error(`Tank selection is required for Allocation #${i + 1}`);
            return;
          }
          if (!t.presentLarvalStage) {
            toast.error(`Present Larval Stage is required for Allocation #${i + 1}`);
            return;
          }
          if (!t.grossExpected || parseFloat(t.grossExpected) <= 0) {
            toast.error(`Valid Gross Expected Qty is required for Allocation #${i + 1}`);
            return;
          }
          if (!t.larvalStagePacking) {
            toast.error(`Larval Stage at Packing is required for Allocation #${i + 1}`);
            return;
          }
        }
      }

      // Payment validations
      if (orderBookingData.bonusAgreed === undefined || orderBookingData.bonusAgreed === null || orderBookingData.bonusAgreed === '') {
        toast.error('Bonus Agreed is required');
        return;
      }
      if (orderBookingData.netQty === undefined || orderBookingData.netQty === null || orderBookingData.netQty === '') {
        toast.error('Net Qty (in Million) is required');
        return;
      }
      if (orderBookingData.unitPriceAgreed === undefined || orderBookingData.unitPriceAgreed === null || orderBookingData.unitPriceAgreed === '') {
        toast.error('Unit Price Agreed is required');
        return;
      }
      if (orderBookingData.advanceReceived === undefined || orderBookingData.advanceReceived === null || orderBookingData.advanceReceived === '') {
        toast.error('Advance Received is required');
        return;
      }
    }

    if (activity === 'Water Management') {
      if (!waterMgmtData.flowOperation) {
        toast.error('Please select a Water Flow Operation');
        return;
      }
      if (waterMgmtData.flowOperation === 'Water Filling') {
        // Validate source: either an external type (sea/fresh) or internal tank(s) selected
        const hasExternalSource = waterMgmtData.sourceType === 'sea' || waterMgmtData.sourceType === 'fresh';
        const hasInternalSource = waterMgmtData.sourceType === 'tank' && (waterMgmtData.sourceTankIds || []).length > 0;
        if (!hasExternalSource && !hasInternalSource) {
          toast.error('Please select a source (External: Sea/Fresh water, or Internal: choose a tank)');
          return;
        }
        if (waterMgmtData.fillTargets.length === 0) {
          toast.error('Please select at least one tank to fill');
          return;
        }
        const hasZeroFill = waterMgmtData.fillTargets.some((t: any) => (t.volumeToFill || 0) === 0);
        if (hasZeroFill) {
          toast.error('Please enter a fill amount for all selected tanks');
          return;
        }
        if (waterMgmtData.totalVolumeToFill > waterMgmtData.sourceVolumeAvailable) {
          toast.error(`Total fill (${waterMgmtData.totalVolumeToFill.toLocaleString()} L) exceeds available source volume (${waterMgmtData.sourceVolumeAvailable.toLocaleString()} L). Please reduce fill amounts.`);
          return;
        }
      }

      if (waterMgmtData.flowOperation === 'Water Exchange') {
        if (!waterMgmtData.exchangeSourceTankId) {
          toast.error('Please select a Source Tank for exchange');
          return;
        }
        if (waterMgmtData.exchangeTargets.length === 0) {
          toast.error('Please select at least one target tank for exchange');
          return;
        }
        const hasZeroExchange = waterMgmtData.exchangeTargets.some((t: any) => (t.exchangeAmount || 0) === 0);
        if (hasZeroExchange) {
          toast.error('Please enter an exchange amount for all selected tanks');
          return;
        }
        if (waterMgmtData.totalVolumeToFill > waterMgmtData.sourceVolumeAvailable) {
          toast.error(`Total exchange (${waterMgmtData.totalVolumeToFill.toLocaleString()} L) exceeds available source volume (${waterMgmtData.sourceVolumeAvailable.toLocaleString()} L).`);
          return;
        }
      }

      if (waterMgmtData.flowOperation === 'Drain / Clean') {
        if (waterMgmtData.cleanTargets.length === 0) {
          toast.error('Please select at least one tank to drain / clean');
          return;
        }
        const { surface, paint, cleanliness, dryStatus, lastWashDate } = waterMgmtData.cleanQuality || {};
        if (!surface || !paint || !cleanliness || !dryStatus) {
          toast.error('Please provide all quality scores (1-10)');
          return;
        }
        if (!lastWashDate) {
          toast.error('Please provide the last clean/wash date');
          return;
        }
      }

      if (waterMgmtData.flowOperation === 'Observations') {
        if (waterMgmtData.observationTargets.length === 0) {
          toast.error('Please select at least one tank to observe');
          return;
        }
        const { surface, paint, cleanliness, dryStatus, lastWashDate } = waterMgmtData.observationQuality || {};
        if (!surface || !paint || !cleanliness || !dryStatus) {
          toast.error('Please provide all quality scores (1-10)');
          return;
        }
        if (!lastWashDate) {
          toast.error('Please provide the last clean/wash date');
          return;
        }
      }

      if (waterMgmtData.flowOperation === 'Treatment') {
        if (waterMgmtData.treatmentTargets.length === 0) {
          toast.error('Please select at least one tank for treatment');
          return;
        }
        if (!waterMgmtData.treatmentType?.trim() || !waterMgmtData.treatmentDosage?.trim() || !timeSlot) {
          toast.error('Treatment Type, Dosage, and Time Slot are required');
          return;
        }
      }

      if (waterMgmtData.flowOperation === 'Recirculation') {
        if (waterMgmtData.recirculationTargets.length === 0) {
          toast.error('Please select at least one tank for recirculation');
          return;
        }
        const hasMissingTime = waterMgmtData.recirculationTargets.some((t: any) => {
          const mode = t.timeMode || 'duration';
          if (mode === 'duration') return !t.recircHours?.trim();
          return !t.startTime?.trim() || !t.endTime?.trim();
        });
        if (hasMissingTime) {
          toast.error('Please provide Recirculation Time details for all selected tanks');
          return;
        }
      }
    }

    if (activity === 'Tank Shifting') {
      const invalid = (tankShiftingData.destinations || []).some((d: any) => !d.tankId || !d.populationToShift);
      if (invalid) {
        toast.error('All destination tanks and populations must be specified');
        return;
      }
      if (!tankShiftingData.sourcePopulation) {
        toast.error('Source population is required');
        return;
      }
    }

    if (activity === 'Artemia') {
      if (artemiaData.phase === 'pre') {
        if (!artemiaData.sampleId) {
          toast.error('Sample ID is required');
          return;
        }
        if (!artemiaData.cystWeight) {
          toast.error('Cyst Weight is required');
          return;
        }
        if (!artemiaData.numberOfSamples) {
          toast.error('Number of Samples is required');
          return;
        }
      } else {
        if (!artemiaData.linkedSampleId) {
          toast.error('Please choose a Pre-Harvest ID');
          return;
        }
        if (!artemiaData.harvestStage) {
          toast.error('Harvest Stage is required');
          return;
        }
        if (!artemiaData.cellsHarvested) {
          toast.error('Cells Harvested is required');
          return;
        }
        if (!artemiaData.harvestWeight) {
          toast.error('Harvest Weight is required');
          return;
        }
      }
    }

    if (activity === 'Sourcing & Mating' && !isPlanningMode) {
      const { sourceTanks, matingTanks, matedDestinations, returnDestinations } = sourcingMatingData;
      const totalSourced = (sourceTanks || []).reduce((sum: number, s: any) => sum + (parseFloat(s.femaleCount) || 0), 0);
      const totalMated = (matingTanks || []).reduce((sum: number, t: any) => sum + (parseFloat(t.femalesMated) || 0), 0);
      const nonMatedBalance = Math.max(0, totalSourced - totalMated);
      const totalToSpawning = (matedDestinations || []).reduce((sum: number, d: any) => sum + (parseFloat(d.count) || 0), 0);
      const totalReturned = (returnDestinations || []).reduce((sum: number, d: any) => sum + (parseFloat(d.count) || 0), 0);

      if (totalSourced === 0) {
        toast.error('Please enter how many females were sourced from each tank');
        return;
      }
      if (totalMated === 0) {
        toast.error('Please enter females mated in at least one male tank');
        return;
      }
      if (Math.abs(totalToSpawning - totalMated) > 0.001) {
        toast.error(`Spawning Allocation Error: You mated ${totalMated} females, but you are trying to shift ${totalToSpawning} to spawning tanks. These must match.`);
        return;
      }
      if (totalReturned !== nonMatedBalance) {
        toast.error(`Animals returned to female tanks (${totalReturned}) must equal non-mated balance (${nonMatedBalance})`);
        return;
      }
    }

    if (activity === 'Nauplii Harvest' && !isPlanningMode) {
      const { harvestTanks = [], naupliiDestinations = [], summary = {} } = naupliiHarvestData;
      const totalHarvested = harvestTanks.reduce((sum: number, t: any) => sum + (parseFloat(t.harvestedMil) || 0), 0);
      const totalShifted = naupliiDestinations.reduce((sum: number, d: any) => sum + (parseFloat(d.shiftedMil) || 0), 0);
      
      if (totalHarvested === 0) {
        toast.error('Please record at least one harvested amount');
        return;
      }
      if (totalShifted === 0) {
        toast.error('Please record at least one shifted amount');
        return;
      }
      if (Math.abs(totalHarvested - totalShifted) > 0.01) {
        toast.error(`Allocations not balanced. Difference: ${(totalHarvested - totalShifted).toFixed(2)} mil`);
        return;
      }
    }

    if (activity === 'Egg Count' && !isPlanningMode) {
      const { entries } = eggCountData;
      const validEntries = entries.filter((e: any) => e.tankId && e.totalEggsMillions);
      if (validEntries.length === 0) {
        toast.error('Please record results for at least one tank');
        return;
      }
    }

    if (activity === 'Spawning' && !isPlanningMode) {
      const { spawningTanks = [], returnDestinations, totalInitialShifted } = spawningData;
      
      if (!spawningTanks || spawningTanks.length === 0) {
        toast.error('Please select a batch with valid spawning tanks');
        return;
      }

      // NEW: Check for individual tank exceedance
      const exceedingTank = spawningTanks.find((t: any) => (parseFloat(t.spawnedCount) || 0) > (parseFloat(t.shiftedCount) || 0));
      if (exceedingTank) {
        toast.error(`Spawned count in ${exceedingTank.tankName} exceeds the available ${exceedingTank.shiftedCount} females`);
        return;
      }
      
      const totalFemales = parseFloat(totalInitialShifted) || 0;
      const totalRedistributed = (returnDestinations || []).reduce((sum: number, d: any) => sum + (parseFloat(d.count) || 0), 0);
      
      if (totalFemales === 0) {
        toast.error('No animals found in the selected spawning tanks');
        return;
      }
      
      if (totalRedistributed !== totalFemales) {
        toast.error(`Total females (${totalFemales}) must match total redistributed (${totalRedistributed})`);
        return;
      }
    }

    let targets = [];

    // Maturation Observation: targets come directly from tankEntries (one log per tank)
    if (activeFarmCategory === 'MATURATION' && activity === 'Observation' && !editId) {
      const entries = (normalizedData || observationData).tankEntries || [];
      targets = entries.map((e: any) => e.tankId).filter(Boolean);
    } else if (selectionScope === 'all') {
      const sectionId = selectedSectionId || activeSectionId;
      const activeSection = availableTanks.find(s => s.id === sectionId);
      if (activeSection) {
        targets = activeSection.tanks
          .filter((t: any) => {
            if (activity === 'Stocking' && !editId) return !stockedTankIds.includes(t.id);
            return editId || stockedTankIds.includes(t.id);
          })
          .map((t: any) => t.id);
      } else if (activeFarmCategory === 'MATURATION') {
        targets = filteredSections.flatMap(s => s.tanks)
          .filter((t: any) => {
            if (activity === 'Stocking' && !editId) return !stockedTankIds.includes(t.id);
            return editId || stockedTankIds.includes(t.id);
          })
          .map((t: any) => t.id);
      }
    } else if (selectionScope === 'custom') {
      targets = selectedTankIds.filter(id => {
        if (activity === 'Stocking' && !editId) return !stockedTankIds.includes(id);
        return editId || stockedTankIds.includes(id);
      });
    } else {
      targets = [tankId];
    }

    if (!isSpecialActivity) {
      if (targets.length === 0 || (targets.length === 1 && !targets[0])) {
        toast.error('Please select at least one tank');
        return;
      }
    } else {
      if (targets.length === 0 || (targets.length === 1 && !targets[0])) {
        targets = [null];
      }
    }

    try {
      setLoading(true);
      
      if (editId) {
        let farmId = activeFarmId;
        let sectionId = selectedSectionId;
        if (tankId) {
          const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tankId));
          if (section) {
            sectionId = section.id;
            farmId = section.farm_id;
          }
        }

        await updateActivity(editId, {
          tank_id: tankId,
          section_id: sectionId || null,
          farm_id: farmId || null,
          activity_type: activity as any,
          data: buildData()
        });
        toast.success('Activity updated!');
      } else {
        // Track unique instructions marked as completed to avoid redundant calls
        const completedInstructionIds = new Set<string>();

        // 1. Mark the explicitly selected instruction as completed if present
        if (selectedInstructionId) {
          console.log('Attempting to complete selected instruction:', selectedInstructionId);
          try {
            const { data: updateData, error: updateError } = await supabase
              .from('activity_charts')
              .update({ is_completed: true, completed_at: new Date().toISOString(), completed_by: user?.id })
              .eq('id', selectedInstructionId)
              .select();
            
            if (updateError) {
              console.error('SERVER ERROR - Task Update:', updateError);
              toast.error('Task status update failed: ' + updateError.message);
            } else if (!updateData || updateData.length === 0) {
              console.warn('REJECTED - No rows updated for instruction:', selectedInstructionId);
              toast.error('Could not mark task as done - check permissions');
            } else {
              console.log('SUCCESS - Task marked done:', selectedInstructionId);
              completedInstructionIds.add(selectedInstructionId);
              // Toast shown at the end after all saves complete
            }
          } catch (err) {
            console.error('EXCEPTION - during task update:', err);
          }
        }

        // 2. Loop through targets for bulk recording
        const promises = targets.map(async (tId) => {
          let sId = tId ? null : (selectedSectionId || activeSectionId);
          let fId = activeFarmId;

          if (tId) {
            // Find the section this tank belongs to
            const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tId));
            sId = section?.id || sId;
            fId = section?.farm_id || fId;
          } else if (sId) {
            const section = availableTanks.find(s => s.id === sId);
            fId = section?.farm_id || fId;
          }

          // Use freshly normalized data for Observation if it was just calculated
          let currentBuildData = (activity === 'Observation' && normalizedData) ? { date, time, ampm, timeSlot, comments, ...normalizedData, photo_url: photoUrl } : buildData();

          // Maturation Observation: inject per-tank data into each log
          if (activeFarmCategory === 'MATURATION' && activity === 'Observation' && !editId) {
            const entries = (normalizedData || observationData).tankEntries || [];
            const entry = entries.find((e: any) => e.tankId === tId);
            if (entry) {
              const popM = parseFloat(entry.originalPopM || '0');
              const popF = parseFloat(entry.originalPopF || '0');
              const totalPop = popM + popF;
              const mort = parseFloat(entry.mortalityNo || '0');
              const avgWt = parseFloat(entry.avgBodyWt || '0');

              // Distribute mortality proportionally M/F
              let mortM = 0;
              let mortF = 0;
              if (totalPop > 0 && mort > 0) {
                if (popM === 0) { mortF = mort; }
                else if (popF === 0) { mortM = mort; }
                else {
                  mortM = Math.round(mort * popM / totalPop);
                  mortF = mort - mortM;
                }
              }

              const presentPopM = Math.max(0, popM - mortM);
              const presentPopF = Math.max(0, popF - mortF);
              const presentPop = presentPopM + presentPopF;
              const biomassKg = avgWt > 0 ? (presentPop * avgWt / 1000).toFixed(3) : '0.000';

              currentBuildData = {
                ...currentBuildData,
                stockingId: entry.stockingId || currentBuildData.stockingId,
                moults: entry.moults,
                mortalityNo: entry.mortalityNo,
                mortalityM: mortM.toString(),
                mortalityF: mortF.toString(),
                avgBodyWt: entry.avgBodyWt,
                presentPopulationM: presentPopM.toString(),
                presentPopulationF: presentPopF.toString(),
                presentPopulation: presentPop.toString(),
                estimatedBiomass: biomassKg,
              };
            }
          }
          
          // CRITICAL: Ensure all MATURATION activities link to the active Broodstock Batch
          if (activeFarmCategory === 'MATURATION' && activeBroodstockBatchId && activeBroodstockBatchId !== 'new') {
            currentBuildData.stockingId = activeBroodstockBatchId;
          }
          
          // Apply per-tank allocation for Maturation Stocking
          if (activeFarmCategory === 'MATURATION' && activity === 'Stocking' && tId) {
            const alloc = stockingData.allocations?.[tId];
            if (!alloc || (Number(alloc.m || 0) === 0 && Number(alloc.f || 0) === 0)) {
               return null; // Skip tanks with no allocation
            }
            currentBuildData.tankStockingNumber = (Number(alloc.m || 0) + Number(alloc.f || 0)).toString();
            currentBuildData.totalMales = alloc.m || '0';
            currentBuildData.totalFemales = alloc.f || '0';
          }
          
          // Variance Tracking & Auto-matching
          // Find if this specific tank matches an instruction
          // 1. Prioritize explicitly selected instruction data
          // 2. Fall back to auto-matching against any active instruction for this tank/section
          const matchingInstruction = (selectedInstructionData && (selectedInstructionData.tank_id === tId || (!selectedInstructionData.tank_id && selectedInstructionData.section_id === sId))) 
            ? selectedInstructionData
            : activeInstructions.find(i => 
                (i.tank_id === tId || (!i.tank_id && i.section_id === sId))
              );

          if (matchingInstruction) {
            // If it's a different instruction than the selected one, mark it too
            if (!completedInstructionIds.has(matchingInstruction.id)) {
              try {
                const { data: updateData, error: updateError } = await supabase
                  .from('activity_charts')
                  .update({ is_completed: true, completed_at: new Date().toISOString(), completed_by: user?.id })
                  .eq('id', matchingInstruction.id)
                  .select();
                
                if (!updateError && updateData && updateData.length > 0) {
                  completedInstructionIds.add(matchingInstruction.id);
                }
              } catch (err) {
                console.error('Error updating matching instruction status:', err);
              }
            }
            
            // Link to the record & store variance
            currentBuildData.applied_instruction_id = matchingInstruction.id;
            currentBuildData.planned_data = matchingInstruction.planned_data;
          }

          // If Stocking, dynamically append Tank name/number to the generated stockingId
          // EXCEPT for Maturation, where we want ONE consolidated Batch ID
          if (activity === 'Stocking' && currentBuildData.stockingId) {
            if (activeFarmCategory !== 'MATURATION') {
              let baseId = currentBuildData.stockingId.replace(/_\[TANKS\]$/i, '');
              // Strip any existing tank suffix from the end if it's there
              if (tId && sId) {
                const sec = availableTanks.find(s => s.id === sId);
                const tnk = sec?.tanks.find((t: any) => t.id === tId);
                if (tnk) {
                  const cleanTank = tnk.name.replace(/[^a-zA-Z0-9]/g, '');
                  if (cleanTank) {
                    const regex = new RegExp(`_${cleanTank}$`);
                    baseId = baseId.replace(regex, '');
                  }
                }
              } else if (sId) {
                const sec = availableTanks.find(s => s.id === sId);
                if (sec) {
                  const cleanSec = sec.name.replace(/[^a-zA-Z0-9]/g, '');
                  if (cleanSec) {
                    const regex = new RegExp(`_${cleanSec}$`);
                    baseId = baseId.replace(regex, '');
                  }
                }
              }

              let suffix = '';
              if (tId && sId) {
                const sec = availableTanks.find(s => s.id === sId);
                const tnk = sec?.tanks.find((t: any) => t.id === tId);
                if (tnk) {
                  const cleanTank = tnk.name.replace(/[^a-zA-Z0-9]/g, '');
                  if (cleanTank) suffix = `_${cleanTank}`;
                }
              } else if (sId) {
                const sec = availableTanks.find(s => s.id === sId);
                if (sec) {
                  const cleanSec = sec.name.replace(/[^a-zA-Z0-9]/g, '');
                  if (cleanSec) suffix = `_${cleanSec}`;
                }
              }
              currentBuildData.stockingId = `${baseId}${suffix}`;
            }
          }
            
          // Also save a copy inside stockingData for consistency if needed by other logic
          if (currentBuildData.stockingData) {
             currentBuildData.stockingData.stockingId = currentBuildData.stockingId;
          }

          // Special bulk save for Artemia After Harvest multiple samples
          if (activity === 'Artemia' && currentBuildData.phase === 'post') {
            const sampleIds = currentBuildData.linkedSampleIds || [];
            if (sampleIds.length > 0) {
              const artemiaPromises = sampleIds.map(async (sid: string) => {
                 const logData = { ...currentBuildData, linkedSampleId: sid, linkedSampleIds: [sid] };
                 return addActivity({
                    tank_id: tId,
                    section_id: sId || null,
                    farm_id: fId || null,
                    activity_type: activity as any,
                    data: logData
                 });
              });
              const logIds = await Promise.all(artemiaPromises);
              return logIds[0]; // just return the first one for the flow
            }
          }

          // Special bulk save for Tank Shifting (record for destinations too)
          // Special bulk save for Sourcing & Mating (record for sources, spawners, and returns)
          if (activity === 'Sourcing & Mating') {
            const { sourceTanks, matedDestinations, returnDestinations, matingTanks, batchNumber } = currentBuildData;
            const totalSourced = (sourceTanks || []).reduce((sum: number, s: any) => sum + (parseFloat(s.femaleCount) || 0), 0);
            const totalMated = (matingTanks || []).reduce((sum: number, t: any) => sum + (parseFloat(t.femalesMated) || 0), 0);
            // Augment every log with the broodstock batch link and batch summary
            const batchMeta = {
              stockingId: activeBroodstockBatchId || null,
              naupliiBatchId: batchNumber || currentBuildData.batchNumber,
              totalSourced,
              totalMated,
              totalNonMated: Math.max(0, totalSourced - totalMated),
            };
            
            // 1. Record sourcing from each source tank (decrement)
            const sourcePromises = (sourceTanks || []).map(async (s: any) => {
              const qty = parseFloat(s.femaleCount) || 0;
              if (qty <= 0) return null;
              
              const currentPop = tankPopulations[s.tankId] || 0;
              const newPop = Math.max(0, currentPop - qty);
              
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === s.tankId));
              return addActivity({
                tank_id: s.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  ...batchMeta, 
                  movementType: 'sourcing', 
                  movementQty: -qty, 
                  role: 'source',
                  // Multiple fields to ensure RPC compatibility
                  presentPopulation: newPop.toString(),
                  presentPopulationF: newPop.toString(),
                  presentPopulationM: "0",
                  newPopulation: newPop.toString(),
                  previousPopulation: currentPop.toString()
                }
              });
            });

            // 2. Record shifting to each spawning tank (increment)
            const spawnerPromises = (matedDestinations || []).map(async (d: any) => {
              const qty = parseFloat(d.count) || 0;
              if (qty <= 0 || !d.tankId) return null;
              
              const currentPop = tankPopulations[d.tankId] || 0;
              const newPop = currentPop + qty;

              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === d.tankId));
              return addActivity({
                tank_id: d.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  ...batchMeta, 
                  movementType: 'spawning_shift', 
                  movementQty: qty, 
                  role: 'destination',
                  presentPopulation: newPop.toString(),
                  presentPopulationF: newPop.toString(),
                  presentPopulationM: "0",
                  newPopulation: newPop.toString(),
                  previousPopulation: currentPop.toString()
                }
              });
            });

            // 3. Record return to source tanks (increment)
            const returnPromises = (returnDestinations || []).map(async (r: any) => {
              const qty = parseFloat(r.count) || 0;
              if (qty <= 0 || !r.tankId) return null;
              
              const sourcedFromThisTank = (sourceTanks || []).find((s: any) => s.tankId === r.tankId);
              const sourcedQty = sourcedFromThisTank ? (parseFloat(sourcedFromThisTank.femaleCount) || 0) : 0;
              
              const currentPop = tankPopulations[r.tankId] || 0;
              const newPop = Math.max(0, currentPop - sourcedQty + qty);

              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === r.tankId));
              return addActivity({
                tank_id: r.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  ...batchMeta, 
                  movementType: 'return', 
                  movementQty: qty, 
                  role: 'return',
                  presentPopulation: newPop.toString(),
                  presentPopulationF: newPop.toString(),
                  presentPopulationM: "0",
                  newPopulation: newPop.toString(),
                  previousPopulation: currentPop.toString()
                }
              });
            });

            // 4. Record "Ghost" Observations to force population sync for all involved tanks
            const involvedTanks = new Map<string, number>();
            
            // Collect final states
            sourceTanks.forEach((s: any) => {
              const qty = parseFloat(s.femaleCount) || 0;
              const currentPop = tankPopulations[s.tankId] || 0;
              const returnQty = (returnDestinations || []).find((r: any) => r.tankId === s.tankId)?.count || 0;
              involvedTanks.set(s.tankId, Math.max(0, currentPop - qty + parseFloat(returnQty)));
            });
            
            (matedDestinations || []).forEach((d: any) => {
              if (d.tankId) {
                const currentPop = tankPopulations[d.tankId] || 0;
                involvedTanks.set(d.tankId, currentPop + (parseFloat(d.count) || 0));
              }
            });

            const syncPromises = Array.from(involvedTanks.entries()).map(([tId, finalPop]) => {
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === tId));
              return addActivity({
                tank_id: tId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: 'Observation',
                data: {
                  isSystemSync: true,
                  notes: "Maturation Sourcing movement population update",
                  presentPopulation: finalPop.toString(),
                  presentPopulationF: finalPop.toString(),
                  presentPopulationM: "0",
                  originalPop: tankPopulations[tId]?.toString(),
                  originalPopF: tankPopulations[tId]?.toString(),
                  originalPopM: "0"
                }
              });
            });

            await Promise.all([...sourcePromises, ...spawnerPromises, ...returnPromises, ...syncPromises]);
          }

          // Special bulk save for Spawning (record clearance of spawning tanks and return to source)
          if (activity === 'Spawning') {
            const { spawningTanks, returnDestinations } = currentBuildData;
            
            // 1. Clear population from spawning tanks (decrement)
            const clearPromises = (spawningTanks || []).map(async (t: any) => {
              const qty = parseFloat(t.shiftedCount) || 0;
              if (qty <= 0 || !t.tankId) return null;
              
              const currentPop = tankPopulations[t.tankId] || 0;
              const newPop = Math.max(0, currentPop - qty);

              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === t.tankId));
              return addActivity({
                tank_id: t.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  movementType: 'spawning_clearance', 
                  movementQty: -qty, 
                  role: 'source',
                  presentPopulation: newPop.toString(),
                  presentPopulationF: newPop.toString(),
                  presentPopulationM: "0",
                  newPopulation: newPop.toString(),
                  previousPopulation: currentPop.toString()
                }
              });
            });

            // 2. Return population to source tanks (increment)
            const returnPromises = (returnDestinations || []).map(async (r: any) => {
              const qty = parseFloat(r.count) || 0;
              if (qty <= 0 || !r.tankId) return null;
              
              const currentPop = tankPopulations[r.tankId] || 0;
              const newPop = currentPop + qty;

              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === r.tankId));
              return addActivity({
                tank_id: r.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  movementType: 'spawning_return', 
                  movementQty: qty, 
                  role: 'return',
                  presentPopulation: newPop.toString(),
                  presentPopulationF: newPop.toString(),
                  presentPopulationM: "0",
                  newPopulation: newPop.toString(),
                  previousPopulation: currentPop.toString()
                }
              });
            });

            // 3. Record "Ghost" Observations to force population sync
            const involvedTanks = new Map<string, number>();
            
            (spawningTanks || []).forEach((t: any) => {
              if (t.tankId) {
                const currentPop = tankPopulations[t.tankId] || 0;
                involvedTanks.set(t.tankId, Math.max(0, currentPop - (parseFloat(t.shiftedCount) || 0)));
              }
            });
            
            (returnDestinations || []).forEach((r: any) => {
              if (r.tankId) {
                const currentPop = tankPopulations[r.tankId] || 0;
                involvedTanks.set(r.tankId, currentPop + (parseFloat(r.count) || 0));
              }
            });

            const syncPromises = Array.from(involvedTanks.entries()).map(([tId, finalPop]) => {
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === tId));
              return addActivity({
                tank_id: tId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: 'Observation',
                data: {
                  isSystemSync: true,
                  notes: "Maturation Spawning movement population update",
                  presentPopulation: finalPop.toString(),
                  presentPopulationF: finalPop.toString(),
                  presentPopulationM: "0",
                  originalPop: tankPopulations[tId]?.toString(),
                  originalPopF: tankPopulations[tId]?.toString(),
                  originalPopM: "0"
                }
              });
            });

            await Promise.all([...clearPromises, ...returnPromises, ...syncPromises]);
          }

          // Special bulk save for Nauplii Harvest (record arrival in Nauplii tanks)
          if (activity === 'Nauplii Harvest') {
            const { naupliiDestinations } = currentBuildData;
            
            const destPromises = (naupliiDestinations || []).map(async (d: any) => {
              const qty = parseFloat(d.shiftedMil) || 0;
              if (qty <= 0 || !d.tankId) return null;
              
              const currentPop = tankPopulations[d.tankId] || 0;
              const newPop = currentPop + qty;

              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === d.tankId));
              return addActivity({
                tank_id: d.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  movementType: 'nauplii_arrival', 
                  movementQty: qty, 
                  role: 'destination',
                  presentPopulation: newPop.toFixed(3),
                  newPopulation: newPop.toFixed(3),
                  previousPopulation: currentPop.toFixed(3)
                }
              });
            });

            // 2. Record "Ghost" Observations for Nauplii tanks
            const syncPromises = (naupliiDestinations || []).map(async (d: any) => {
              if (!d.tankId) return null;
              const currentPop = tankPopulations[d.tankId] || 0;
              const finalPop = currentPop + (parseFloat(d.shiftedMil) || 0);
              
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === d.tankId));
              return addActivity({
                tank_id: d.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: 'Observation',
                data: {
                  isSystemSync: true,
                  notes: "Maturation Nauplii Harvest population update",
                  presentPopulation: finalPop.toFixed(3),
                  originalPop: currentPop.toFixed(3)
                }
              });
            });

            await Promise.all([...destPromises, ...syncPromises]);
          }

          // Special bulk save for Nauplii Sale (clear Nauplii tanks)
          if (activity === 'Nauplii Sale') {
            const { saleTanks, isBatchClosed } = currentBuildData;
            
            const salePromises = (saleTanks || []).map(async (t: any) => {
              const qty = (parseFloat(t.saleMil) || 0) + (parseFloat(t.discardMil) || 0);
              if (qty <= 0 || !t.tankId) return null;
              
              const currentPop = tankPopulations[t.tankId] || 0;
              const newPop = isBatchClosed ? 0 : Math.max(0, currentPop - qty);

              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === t.tankId));
              return addActivity({
                tank_id: t.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  movementType: 'nauplii_clearance', 
                  movementQty: -qty, 
                  role: 'source',
                  presentPopulation: newPop.toFixed(3),
                  newPopulation: newPop.toFixed(3),
                  previousPopulation: currentPop.toFixed(3)
                }
              });
            });

            // 2. Record "Ghost" Observations for Nauplii tank clearance
            const syncPromises = (saleTanks || []).map(async (t: any) => {
              if (!t.tankId) return null;
              const qty = (parseFloat(t.saleMil) || 0) + (parseFloat(t.discardMil) || 0);
              const currentPop = tankPopulations[t.tankId] || 0;
              const finalPop = isBatchClosed ? 0 : Math.max(0, currentPop - qty);
              
              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === t.tankId));
              return addActivity({
                tank_id: t.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: 'Observation',
                data: {
                  isSystemSync: true,
                  notes: "Maturation Nauplii Sale population update",
                  presentPopulation: finalPop.toFixed(3),
                  originalPop: currentPop.toFixed(3)
                }
              });
            });

            await Promise.all([...salePromises, ...syncPromises]);
          }

          if (activity === 'Broodstock Discard') {
            const { tankDiscards = {}, discardType } = currentBuildData;
            const isComplete = discardType === 'complete';
            
            // For complete discard, identify all tanks in the batch
            const tanksToProcess = isComplete ? batchRelatedTankIds : Object.keys(tankDiscards);
            
            const discardPromises = tanksToProcess.map(async (tId) => {
              const currentPop = tankPopulations[tId] || 0;
              const qty = isComplete ? currentPop : (parseFloat(tankDiscards[tId] as string) || 0);
              
              if (qty <= 0 && !isComplete) return null;
              
              const newPop = Math.max(0, currentPop - qty);
              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === tId));
              
              return addActivity({
                tank_id: tId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { 
                  ...currentBuildData, 
                  is_complete_discard: isComplete,
                  movementQty: -qty,
                  presentPopulation: newPop.toString(),
                  previousPopulation: currentPop.toString(),
                  stockingId: activeBroodstockBatchId
                }
              });
            });

            const syncPromises = tanksToProcess.map(async (tId) => {
              const currentPop = tankPopulations[tId] || 0;
              const qty = isComplete ? currentPop : (parseFloat(tankDiscards[tId] as string) || 0);
              
              if (qty <= 0 && !isComplete) return null;
              
              const finalPop = Math.max(0, currentPop - qty);
              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === tId));
              
              const isMaturation = activeFarmCategory === 'MATURATION';
              const tank = sec?.tanks.find((tk: any) => tk.id === tId);
              const gender = tank?.gender;
              
              const syncData: any = {
                  isSystemSync: true,
                  notes: isComplete ? "Complete Batch Discard Sync" : "Partial Broodstock Discard Sync",
                  presentPopulation: finalPop.toString(),
                  originalPop: currentPop.toString(),
                  stockingId: activeBroodstockBatchId
              };

              if (isMaturation) {
                  if (gender === 'Male' || gender === 'MALE') {
                      syncData.presentPopulationM = finalPop.toString();
                      syncData.presentPopulationF = "0";
                      syncData.originalPopM = currentPop.toString();
                      syncData.originalPopF = "0";
                  } else {
                      syncData.presentPopulationF = finalPop.toString();
                      syncData.presentPopulationM = "0";
                      syncData.originalPopF = currentPop.toString();
                      syncData.originalPopM = "0";
                  }
              }

              return addActivity({
                tank_id: tId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                stocking_id: activeBroodstockBatchId || null,
                activity_type: 'Observation',
                data: syncData
              });
            });

            await Promise.all([...discardPromises, ...syncPromises]);
          }

          if (activity === 'Tank Shifting') {
            const dests = currentBuildData.destinations || [];
            const destPromises = dests.map(async (dest: any) => {
              if (!dest.tankId) return null;
              
              // Find destination's farm/section if different
              const destSection = availableTanks.find(s => s.tanks.some((t: any) => t.id === dest.tankId));
              
              const destLogData = {
                ...currentBuildData,
                isDestination: true,
                isSource: false,
                sourceTankId: tId,
                previousPopulation: dest.currentPopulation,
                addedPopulation: dest.populationToShift,
                newPopulation: (parseFloat(dest.currentPopulation || '0') + parseFloat(dest.populationToShift || '0')).toString()
              };

              return addActivity({
                tank_id: dest.tankId,
                section_id: destSection?.id,
                farm_id: destSection?.farm_id || fId,
                activity_type: activity as any,
                data: destLogData
              });
            });
            await Promise.all(destPromises);

            // Add role to source log data
            currentBuildData.isSource = true;
            currentBuildData.isDestination = false;
            currentBuildData.sourceTankId = tId;
          }

          const logId = await addActivity({
            tank_id: tId,
            section_id: sId || null,
            farm_id: fId || null,
            stocking_id: (activity === 'Stocking' && currentBuildData?.stockingId) 
               ? currentBuildData.stockingId 
               : (activity === 'Animals Sampling & Observation' && animalSamplingData?.stockingId)
                 ? animalSamplingData.stockingId
                 : (activity === 'Observation' && observationData?.stockingId)
                   ? observationData.stockingId
                   : (activeBroodstockBatchId === 'new' ? null : activeBroodstockBatchId),
            activity_type: activity as any,
            data: currentBuildData
          });

          // If this is a Stocking activity, also save the detailed animal quality to its separate table
          if (activity === 'Stocking' && currentBuildData.animalRatings) {
            try {
              const { error: qualityError } = await supabase
                .from('stocking_animal_quality')
                .insert([{
                  activity_log_id: logId,
                  hatchery_id: user?.hatchery_id,
                  farm_id: fId,
                  section_id: sId,
                  tank_id: tId,
                  user_id: user?.id,
                  ratings: currentBuildData.animalRatings,
                  average_score: currentBuildData.animalConditionScore || currentBuildData.animalQualityScore
                }]);
              if (qualityError) {
                console.error('Error saving separate stocking quality record:', qualityError);
              }
            } catch (err) {
              console.error('Failed to save to stocking_animal_quality:', err);
            }
          }

          // Also save Stocking Water Quality to its separate table
          if (activity === 'Stocking' && currentBuildData.stockingWaterData) {
            try {
              const { error: waterQualityError } = await supabase
                .from('stocking_water_quality')
                .insert([{
                  activity_log_id: logId,
                  hatchery_id: user?.hatchery_id,
                  farm_id: fId,
                  section_id: sId,
                  tank_id: tId,
                  user_id: user?.id,
                  data: currentBuildData.stockingWaterData,
                  average_score: currentBuildData.waterQualityScore
                }]);
              if (waterQualityError) {
                console.error('Error saving separate stocking water quality record:', waterQualityError);
              }
            } catch (err) {
              console.error('Failed to save to stocking_water_quality:', err);
            }
          }

          // If this is an Observation activity, also save the detailed animal quality to its separate table
          if (activity === 'Observation' && currentBuildData.animalRatings) {
            try {
              const { error: qualityError } = await supabase
                .from('observation_animal_quality')
                .insert([{
                  activity_log_id: logId,
                  hatchery_id: user?.hatchery_id,
                  farm_id: fId,
                  section_id: sId,
                  tank_id: tId,
                  user_id: user?.id,
                  ratings: currentBuildData.animalRatings,
                  average_score: currentBuildData.animalQualityScore 
                }]);
              if (qualityError) {
                console.error('Error saving separate observation quality record:', qualityError);
              }
            } catch (err) {
              console.error('Failed to save to observation_animal_quality:', err);
            }
          }

          // Also save Observation Water Quality to its separate table
          if (activity === 'Observation' && currentBuildData.observationWaterData) {
            try {
              const { error: waterQualityError } = await supabase
                .from('observation_water_quality')
                .insert([{
                  activity_log_id: logId,
                  hatchery_id: user?.hatchery_id,
                  farm_id: fId,
                  section_id: sId,
                  tank_id: tId,
                  user_id: user?.id,
                  data: currentBuildData.observationWaterData,
                  average_score: currentBuildData.waterQualityScore
                }]);
              if (waterQualityError) {
                console.error('Error saving separate observation water quality record:', waterQualityError);
              }
            } catch (err) {
              console.error('Failed to save to observation_water_quality:', err);
            }
          }

          return logId;
        });

        const results = await Promise.all(promises);
        const savedCount = results.filter(Boolean).length;

        // Show a combined success message
        if (completedInstructionIds.size > 0) {
          toast.success(savedCount > 1
            ? `${savedCount} activities recorded & task marked done!`
            : 'Activity recorded & task marked done!');
        } else {
          toast.success(savedCount > 1 ? `${savedCount} activities recorded!` : 'Activity recorded!');
        }

        // AUTO-SELECT newly created batch for Maturation Stocking
        if (activeFarmCategory === 'MATURATION' && activity === 'Stocking' && stockingData?.stockingId) {
          setActiveBroodstockBatchId(stockingData.stockingId);
        }
      }

      if (activity === 'Stocking' && isRedirectedFromObservation) {
        setActivity('Animals Sampling & Observation');
        setPhotoUrl(''); // Clear stocking photo
        setComments(''); // Clear stocking comments
        setIsRedirectedFromObservation(false);
        setLoading(false);
        // fetchLatestStockingData(tankId) will be triggered by useEffect([activity, tankId])
        toast.success('Activity recorded! Returning to Animals Sampling & Observation...');
        return;
      }

      const target = editId 
        ? (user?.role === 'owner' ? '/owner/consolidated-reports' : '/user/daily-report')
        : (user?.role === 'owner' ? '/owner/dashboard' : '/user/dashboard');

      navigate(target);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save activity");
    } finally {
      setLoading(false);
    }
  };

  const activeFarmName = activeSection?.farm_name || '';
  
  const filteredActivities = useMemo(() => {
    if (activeFarmCategory === 'MATURATION') {
      return ACTIVITIES.filter(a => 
        a !== 'Artemia' && 
        a !== 'Algae' && 
        a !== 'Harvest' && 
        a !== 'Tank Shifting' && 
        a !== 'Order Booking'
      );
    } else if (activeFarmCategory === 'LRT' || activeFarmCategory === 'LRI') {
      return ACTIVITIES.filter(a => 
        a !== 'Sourcing & Mating' && 
        a !== 'Spawning' && 
        a !== 'Egg Count' && 
        a !== 'Nauplii Harvest' && 
        a !== 'Nauplii Sale' && 
        a !== 'Broodstock Discard' && 
        a !== 'Water Management'
      );
    } else { // FARMS
      return ACTIVITIES.filter(a => 
        a !== 'Sourcing & Mating' && 
        a !== 'Spawning' && 
        a !== 'Egg Count' && 
        a !== 'Nauplii Harvest' && 
        a !== 'Nauplii Sale' && 
        a !== 'Broodstock Discard' && 
        a !== 'Water Management' &&
        a !== 'Artemia' &&
        a !== 'Algae' &&
        a !== 'Order Booking'
      );
    }
  }, [activeFarmCategory]);

  return (
    <div className="min-h-screen bg-background pb-10">

      {/* Header */}
        <div className="ocean-gradient p-4 sm:p-6 pb-12 rounded-b-3xl shadow-lg relative overflow-hidden">
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-white/60 text-[9px] font-bold uppercase tracking-widest w-full">
              <span className="hover:text-white cursor-pointer transition-colors shrink-0" onClick={() => navigate('/user/dashboard')}>Dashboard</span>
              <ChevronDown className="w-2.5 h-2.5 -rotate-90 shrink-0" />
              <span className="hover:text-white cursor-pointer transition-colors shrink-0" onClick={() => navigate('/user/dashboard')}>{activeFarmName || 'Farm'}</span>
              <ChevronDown className="w-2.5 h-2.5 -rotate-90 shrink-0" />
              <span className="hover:text-white cursor-pointer transition-colors truncate max-w-[80px]" onClick={() => navigate('/user/dashboard')}>{activeSection?.name || (activeFarmCategory === 'MATURATION' ? (activity === 'Stocking' ? 'New Batch' : 'All Sections') : 'Section')}</span>
              <ChevronDown className="w-2.5 h-2.5 -rotate-90 shrink-0" />
              <span className={`shrink-0 ${activity ? 'text-white/80' : 'text-white'}`}>{isPlanningMode ? 'Plan' : (editId ? 'Edit' : 'Record')}</span>
              {activity && (
                <>
                  <ChevronDown className="w-2.5 h-2.5 -rotate-90 shrink-0" />
                  <span className="text-white truncate max-w-[80px]">{activity}</span>
                </>
              )}
            </div>
          </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const target = user?.role === 'owner' ? '/owner/dashboard' : '/user/dashboard';
                navigate(target);
              }}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-primary-foreground" data-testid="main-heading">
                  {editId ? 'Edit Activity' : isPlanningMode ? 'Plan Activity' : 'Record Activity'}
                </h1>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                  activeFarmCategory === 'MATURATION' 
                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/30' 
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
                }`}>
                  {activeFarmCategory}
                </span>
                <div className="text-xs text-white/70 font-medium flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-0.5">
                  <span>{activeFarmName} {activeSection?.name ? `• ${activeSection.name}` : ''}</span>
                  {activeFarmCategory === 'MATURATION' && (
                    (() => {
                      const displayId = (activeBroodstockBatchId === 'new' && activity === 'Stocking' && stockingData?.stockingId)
                        ? stockingData.stockingId
                        : (activeBroodstockBatchId === 'new' ? null : activeBroodstockBatchId);
                      
                      if (!displayId) return null;
  
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white font-bold max-w-[120px] shrink-0">
                          <Database className="w-3 h-3 shrink-0" />
                          <span className="truncate text-[10px]">BS ID: {displayId}</span>
                        </span>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
 
        {selectedInstructionId && (
          <div className="mx-12 mt-3 bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Instruction Linked & Pending Auto-Complete</span>
          </div>
        )}
      </div>

      <div className="w-full px-3 sm:px-4 pb-8 space-y-4 sm:max-w-lg mx-auto overflow-hidden" data-testid="main-content">
        {/* Supervisor Instruction Note - Read Only Display for Workers */}
        {selectedInstructionData?.planned_data?.instructions && !isPlanningMode && (
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-primary shadow-md animate-fade-in-up space-y-2 bg-primary/5">
            <div className="flex items-center gap-2 text-primary">
              <ClipboardList className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Supervisor's Note</span>
            </div>
            <p className="text-sm font-medium italic text-foreground">"{selectedInstructionData.planned_data.instructions}"</p>
          </div>
        )}

        {/* Supervisor: Assign To - First field during planning */}
        {isPlanningMode && (
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-primary shadow-md animate-fade-in-up">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
              <User className="lucide-icon w-3 h-3" />
              1. Assign To (Optional)
            </Label>
            <Select value={assignedTo || 'anyone'} onValueChange={(val) => setAssignedTo(val === 'anyone' ? null : val)}>
              <SelectTrigger className="h-11 bg-background border-muted-foreground/20 focus:border-primary/50">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone (Open Instruction)</SelectItem>
                {availableWorkers.length > 0 ? (
                  availableWorkers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="_no_workers" disabled>No workers on this farm</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground ml-1 mt-1.5 font-medium italic text-[9px]">Leave as "Anyone" if any worker can complete this task.</p>
          </div>
        )}

        {/* Date / Time */}
        <div className="glass-card rounded-2xl p-4 space-y-4 shadow-sm w-full overflow-hidden">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
            {isPlanningMode ? 'Schedule Time' : 'Date & Time'}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <Label className="text-xs">Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={date}
                  max={isPlanningMode ? undefined : getTodayStr()}
                  onChange={e => {
                    setDate(e.target.value);
                    setIsLiveTime(false);
                  }}
                  className="h-11 w-full border-muted-foreground/20 focus:border-primary/50 bg-background/50"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <Label className="text-xs">Time</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={time}
                  onChange={e => {
                    setTime(e.target.value);
                    setIsLiveTime(false);
                    const [h] = e.target.value.split(':').map(Number);
                    if (!isNaN(h)) {
                      setAmpm(h >= 12 ? 'PM' : 'AM');
                    }
                  }}
                  className="h-11 w-full border-muted-foreground/20 focus:border-primary/50 bg-background/50"
                />
              </div>
            </div>
          </div>
          {(activity === 'Feed' || activity === 'Treatment') && (
            <div className="space-y-1.5 pt-3 border-t border-dashed animate-in fade-in slide-in-from-top-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Time Slot <span className="text-destructive">*</span>
              </Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50 bg-background/50">
                  <SelectValue placeholder="Select 4hr window" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {(activity || !type) && !isSpecialActivity && activity !== 'Water Management' && !(activity === 'Stocking' && activeFarmCategory === 'MATURATION' && !editId) && (
          <div className="glass-card rounded-2xl p-4 space-y-4 overflow-hidden">
            {isBatchClosed && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-4 mb-2 animate-pulse">
                   <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                   <div>
                       <h3 className="text-sm font-black text-red-800 uppercase tracking-tight">Batch Permanently Closed</h3>
                       <p className="text-[11px] text-red-700 font-medium leading-tight mt-1">
                           This batch has been marked as fully discarded. No further activities can be recorded for this batch.
                       </p>
                   </div>
                </div>
            )}

            {true && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {type ? 'Location & Scope' : 'Location & Activity'}
                  </h2>
                  
                  {!editId && (
                    <Tabs value={selectionScope} onValueChange={(val: any) => setSelectionScope(val)} className="h-8">
                      <TabsList className="bg-muted/50 h-8 p-0.5">
                        <TabsTrigger value="single" className="text-[10px] px-2 h-7">Single</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] px-2 h-7 text-xs" data-testid="all-tanks-tab">All Tanks in Section</TabsTrigger>
                        <TabsTrigger value="custom" className="text-[10px] px-2 h-7">Custom</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </div>
                
                <div className={`grid grid-cols-1 ${activeSectionId || activity === 'Broodstock Discard' ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
                  {/* Normal Section Select (Visible if no active section in URL/context) */}
                  {!activeSectionId && activity !== 'Broodstock Discard' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Section {isSpecialActivity ? '(Optional)' : '*'}</Label>
                      <Select 
                        value={selectedSectionId} 
                        onValueChange={(val) => {
                          setSelectedSectionId(val);
                          setTankId(''); 
                          setSelectedTankIds([]);
                        }}
                      >
                        <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50" data-testid="section-select">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTanks
                            .filter(s => {
                              const currentFarmId = selectedFarmId || activeFarmId;
                              return currentFarmId ? s.farm_id === currentFarmId : true;
                            })
                            .map(section => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.farm_name} - {section.name}{section.section_type ? ` (${section.section_type})` : ''}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Batch Select (Maturation only, visible if no active batch) */}
                  {activeFarmCategory === 'MATURATION' && !activeBroodstockBatchId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Choose Batch (Stocking ID) *</Label>
                      <Select 
                        value={activeBroodstockBatchId || ''} 
                        onValueChange={(val) => {
                          setActiveBroodstockBatchId(val);
                          setTankId('');
                          setSelectedTankIds([]);
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/20 ring-offset-background focus:ring-2 focus:ring-primary/50 shadow-sm">
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBatches.length === 0 ? (
                             <div className="p-4 text-center text-xs text-muted-foreground">No active batches found for this farm.</div>
                          ) : availableBatches.map(batchId => (
                            <SelectItem key={batchId} value={batchId}>
                              <span className="font-bold">{batchId}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}


                  {(!isSpecialActivity || (activeFarmCategory === 'MATURATION' && (activity === 'Feed' || activity === 'Treatment' || activity === 'Water Quality' || activity === 'Animals Sampling & Observation'))) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {selectionScope === 'single' 
                          ? (isFarmModule ? 'Select Pond / Tank *' : 'Select Tank *') 
                          : (isFarmModule ? 'Selected Ponds / Tanks *' : 'Selected Tanks *')
                        }
                      </Label>

                      {selectionScope === 'single' ? (
                        <Select
                          value={tankId}
                          onValueChange={(val) => {
                            setTankId(val);
                            setSelectedTankIds([val]);
                          }}
                          disabled={!selectedSectionId && !activeSectionId && activeFarmCategory !== 'MATURATION'}
                        >
                          <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50" data-testid="tank-select">
                            <SelectValue placeholder={isFarmModule ? 'Select pond / tank' : 'Select tank'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const sectionId = selectedSectionId || activeSectionId;
                              const tanksToDisplay = sectionId 
                                ? (availableTanks.find(s => s.id === sectionId)?.tanks || [])
                                : (activeFarmCategory === 'MATURATION' 
                                    ? filteredSections.flatMap(s => s.tanks) 
                                    : []);
                                    
                              return tanksToDisplay
                                .filter((t: any) => {
                                  // 1. If Stocking and not editing, only show tanks NOT already stocked (across MATURATION, LRT, FARMS)
                                  if (activity === 'Stocking' && !editId) {
                                    return !stockedTankIds.includes(t.id);
                                  }
                                  
                                  // 2. If Maturation and a batch is selected, restrict to batch tanks
                                  if (activeFarmCategory === 'MATURATION' && activeBroodstockBatchId && activeBroodstockBatchId !== 'new') {
                                    // Lock to batch-related tanks
                                    return batchRelatedTankIds.includes(t.id);
                                  }

                                  // 3. Fallback for other activities
                                  return isFarmModule || activity === 'Sourcing & Mating' || editId || activeFarmCategory === 'MATURATION' || stockedTankIds.includes(t.id);
                                })
                                .map((t: any) => {
                                  const section = availableTanks.find(s => s.tanks.some((tk:any) => tk.id === t.id));
                                  const sectionType = section?.section_type?.toUpperCase();
                                  const sName = (section?.name || '').toUpperCase();
                                  const tName = (t.name || '').toUpperCase();

                                  let colorClass = '';
                                  if (activeFarmCategory === 'MATURATION') {
                                    if (tName.includes('_MT')) colorClass = 'text-blue-600 font-bold';
                                    else if (tName.includes('_FT')) colorClass = 'text-pink-600 font-bold';
                                    else if (sectionType === 'SPAWNING' || sName.includes('SPAWN') || tName.includes('_ST') || tName.includes('_SS')) colorClass = 'text-violet-600 font-bold';
                                    else if (sectionType === 'NAUPLII' || sName.includes('NAUPLII') || sName.includes('HARVEST') || tName.includes('_NH') || tName.includes('_NS')) colorClass = 'text-amber-600 font-bold';
                                  }

                                  return (
                                    <SelectItem key={t.id} value={t.id}>
                                      <div className="flex items-center justify-between w-full gap-4">
                                        <span className={`text-xs ${colorClass}`}>
                                          {activeFarmCategory === 'MATURATION' && !sectionId 
                                            ? `${section?.name} - ${t.name}`
                                            : t.name
                                          }
                                        </span>
                                        {tankWaterVolumes[t.id] !== undefined && (
                                          <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                                            {tankWaterVolumes[t.id].toLocaleString()} L
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                });
                            })()}
                          </SelectContent>
                        </Select>
                      ) : selectionScope === 'all' ? (
                        <div className="h-11 flex items-center px-4 bg-primary/5 text-primary rounded-lg border border-primary/20 text-sm font-bold gap-2">
                          <ListChecks className="w-4 h-4" />
                          Apply to all tanks in this section
                        </div>
                      ) : (
                        <div className="h-11 flex items-center px-4 bg-muted/50 rounded-lg border border-input text-sm font-medium cursor-default">
                          {selectedTankIds.length} tank(s) selected
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Selection List */}
                {selectionScope === 'custom' && (selectedSectionId || activeSectionId || activeFarmCategory === 'MATURATION') && (
                  <div className="pt-2 border-t border-dashed animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] uppercase text-muted-foreground mb-2 block">Select Tanks for this Activity</Label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                      {(() => {
                        const sectionId = selectedSectionId || activeSectionId;
                        const tanksToDisplay = sectionId 
                          ? (availableTanks.find(s => s.id === sectionId)?.tanks || [])
                          : (activeFarmCategory === 'MATURATION' ? filteredSections.flatMap(s => s.tanks) : []);
                        
                        return tanksToDisplay
                          .filter((t: any) => {
                            // 1. If Stocking and not editing, only show tanks NOT already stocked (across MATURATION, LRT, FARMS)
                            if (activity === 'Stocking' && !editId) {
                              return !stockedTankIds.includes(t.id);
                            }
                            
                            // 2. If Maturation and a batch is selected, restrict to batch tanks
                            if (activeFarmCategory === 'MATURATION' && activeBroodstockBatchId && activeBroodstockBatchId !== 'new') {
                              return batchRelatedTankIds.includes(t.id);
                            }

                            // 3. Fallback for other activities
                            return isFarmModule || activity === 'Sourcing & Mating' || editId || activeFarmCategory === 'MATURATION' || stockedTankIds.includes(t.id);
                          })
                          .map((t: any) => (
                        <div 
                          key={t.id}
                          onClick={() => {
                            setSelectedTankIds(prev => 
                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            );
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                            selectedTankIds.includes(t.id) 
                              ? 'bg-primary/10 border-primary text-primary font-bold' 
                              : 'bg-card border-border hover:border-primary/50'
                          }`}
                        >
                          <Checkbox checked={selectedTankIds.includes(t.id)} className="pointer-events-none" />
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs truncate ${(() => {
                              if (activeFarmCategory !== 'MATURATION') return '';
                              const tName = (t.name || '').toUpperCase();
                              const section = availableTanks.find(s => s.tanks.some((tk:any) => tk.id === t.id));
                              const sectionType = section?.section_type?.toUpperCase();
                              const sName = (section?.name || '').toUpperCase();

                              if (tName.includes('_MT')) return 'text-blue-600 font-bold';
                              if (tName.includes('_FT')) return 'text-pink-600 font-bold';
                              if (sectionType === 'SPAWNING' || sName.includes('SPAWN') || tName.includes('_ST') || tName.includes('_SS')) return 'text-violet-600 font-bold';
                              if (sectionType === 'NAUPLII' || sName.includes('NAUPLII') || sName.includes('HARVEST') || tName.includes('_NH') || tName.includes('_NS')) return 'text-amber-600 font-bold';
                              return '';
                            })()}`}>
                              {t.name}
                            </span>
                            {tankWaterVolumes[t.id] !== undefined && (
                              <span className="text-[8px] font-bold text-muted-foreground leading-tight shrink-0">
                                {tankWaterVolumes[t.id].toLocaleString()} L
                              </span>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                    </div>
                  </div>
                )}
              </>
            )}

            {!type && (
              <div className="space-y-1.5 pt-4 border-t border-dashed">
                <Label className="text-xs">Activity Type *</Label>
                <Select
                  value={activity}
                  onValueChange={v => setActivity(v as ActivityType)}
                >
                  <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50" data-testid="activity-select">
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredActivities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Supervisor Instruction Banners - Only visible during recording, not planning */}
        {activeInstructions.length > 0 && isPlanningMode === false && (
          <div className="space-y-3">
            {activeInstructions.map((instr) => (
              <div 
                key={instr.id} 
                className={`bg-primary/5 border rounded-2xl p-4 animate-fade-in-up space-y-3 transition-all ${selectedInstructionId === instr.id ? 'border-primary ring-1 ring-primary/20 bg-primary/10' : 'border-primary/20'}`}
              >
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <ClipboardList className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Instruction {instr.scheduled_time ? `@ ${instr.scheduled_time}` : ''}</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => applyInstruction(instr)} 
                      variant={selectedInstructionId === instr.id ? "default" : "outline"}
                      className="h-8 text-[10px] uppercase font-bold"
                    >
                        {selectedInstructionId === instr.id ? 'Applied' : 'Apply'}
                    </Button>
                 </div>
                 <div className="space-y-1">
                    <p className="font-bold text-sm">
                        {instr.planned_data.item === 'Instruction' 
                          ? instr.planned_data.instructions 
                          : `${instr.planned_data.amount} ${instr.planned_data.unit} ${instr.planned_data.item}`
                        }
                    </p>
                    {instr.planned_data.instructions && instr.planned_data.item !== 'Instruction' && (
                        <p className="text-xs text-muted-foreground italic">"{instr.planned_data.instructions}"</p>
                    )}
                     {instr.tank_id && (
                       <p className="text-xs font-semibold text-primary/80 flex items-center gap-1 mt-1">
                         <span>📍 {isFarmModule ? 'Pond: ' : 'Tank: '}</span>
                         <span className="underline decoration-dotted">
                           {(() => {
                             for (const section of availableTanks) {
                               const tank = section.tanks?.find((t: any) => t.id === instr.tank_id);
                               if (tank) return tank.name;
                             }
                             return 'Loading/Unknown...';
                           })()}
                         </span>
                       </p>
                     )}
                 </div>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Form */}
        {activity === 'Feed' && (
          <div className="glass-card rounded-2xl p-4 space-y-4 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Feed Details</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Feed Type *</Label>
              <Select value={feedType} onValueChange={setFeedType}>
                <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {dbFeedTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Feed Quantity *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={feedQty}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) >= 0) {
                      setFeedQty(val);
                    }
                  }}
                  placeholder="0"
                  className="h-11 flex-1 border-muted-foreground/20 focus:border-primary/50"
                />
                <Select value={feedUnit} onValueChange={setFeedUnit}>
                  <SelectTrigger className="w-24 h-11 border-muted-foreground/20 focus:border-primary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEED_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>) /* 25: FEED_UNITS */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Activity Photo (Optional)</Label>
                <ImageUpload value={photoUrl} onUpload={setPhotoUrl} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."} rows={3} />
            </div>
          </div>
        )}

        {activity === 'Treatment' && (
          <div className="glass-card rounded-2xl p-4 space-y-4 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Treatment Details</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Treatment Type *</Label>
              <Select value={treatmentType} onValueChange={setTreatmentType}>
                <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {dbTreatmentTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dosage *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={treatmentDosage}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) >= 0) {
                      setTreatmentDosage(val);
                    }
                  }}
                  placeholder="0"
                  className="h-11 flex-1 border-muted-foreground/20 focus:border-primary/50"
                />
                <Select value={treatmentUnit} onValueChange={setTreatmentUnit}>
                  <SelectTrigger className="w-24 h-11 border-muted-foreground/20 focus:border-primary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TREATMENT_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>) /* 27: TREATMENT_UNITS */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Activity Photo (Optional)</Label>
                <ImageUpload value={photoUrl} onUpload={setPhotoUrl} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."} rows={3} />
            </div>
          </div>
        )}

        {activity === 'Water Quality' && (
          <div className="glass-card rounded-2xl p-4 space-y-4 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Water Quality Parameters</h2>
            {!isPlanningMode ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {waterFields.map(field => {
                    const rangeLabel = WATER_QUALITY_RANGES[field];

                    return (
                      <div key={field} className="space-y-1">
                        <Label className="text-[10px] font-medium flex justify-between uppercase">
                          {field} *
                          {rangeLabel && <span className="text-[9px] text-muted-foreground">{rangeLabel}</span>}
                        </Label>
                        <Input
                          type={field === 'Other' ? 'text' : 'number'}
                          min="0"
                          step="any"
                          value={waterData[field] || ''}
                          onChange={e => setWaterData(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder=""
                          className="h-10 text-sm border-muted-foreground/20 focus:border-primary/50"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Overall Quality Score - always visible during recording */}
                {(() => {
                  const total = waterFields.length;
                  const values = waterFields.map(field => {
                    const valStr = String(waterData[field] || '').trim();
                    if (valStr === '') return null;
                    const val = parseFloat(valStr);
                    if (isNaN(val)) return 10; // Non-numeric or "Other" counts as 10 if filled

                    const range = WATER_QUALITY_RANGES[field] || '';
                    let isOk = true;
                    
                    // Specific parsing for hatchery ranges
                    if (field === 'Vibrio Count') {
                      isOk = val < 1000;
                    } else if (field === 'Yellow Green Bacteria') {
                      isOk = val < 100;
                    } else if (range === '[Nil]') {
                      isOk = val === 0;
                    } else if (range.includes(' - ')) {
                      const matches = range.match(/(d+.?d*)s*-s*(d+.?d*)/);
                      if (matches) {
                        isOk = val >= parseFloat(matches[1]) && val <= parseFloat(matches[2]);
                      }
                    } else if (range.includes('>')) {
                      const matches = range.match(/>s*(d+.?d*)/);
                      if (matches) isOk = val > parseFloat(matches[1]);
                    } else if (range.includes('<')) {
                      const matches = range.match(/<s*(d+.?d*)/);
                      if (matches) isOk = val < parseFloat(matches[1]);
                    }
                    return isOk ? 10 : 0;
                  });

                  const filled = values.filter(v => v !== null);
                  const score = filled.length > 0 ? filled.reduce((a, b) => (a || 0) + (b || 0), 0) / filled.length : 0;

                  return (
                    <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Score</span>
                        <span className="text-lg font-black text-foreground">{score.toFixed(1)} <span className="text-xs font-semibold text-muted-foreground">/ 10</span></span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{filled.length} of {total} parameters recorded</p>
                    </div>
                  );
                })()}
              </>
            ) : null}
            {!isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Activity Photo (Optional)</Label>
                <ImageUpload value={photoUrl} onUpload={setPhotoUrl} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."} rows={3} />
            </div>
          </div>
        )}


        {activity === 'Stocking' && (
          <StockingForm
            data={stockingData}
            onDataChange={setStockingData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            isPlanningMode={isPlanningMode}
            activeFarmCategory={activeFarmCategory}
            selectionScope={selectionScope}
            farmId={selectedFarmId || activeFarmId}
            currentDate={date}
            availableBatches={availableBatches}
            selectedTanks={(() => {
              // For Maturation Stocking, always show ALL tanks from ALL animal sections for THE SELECTED FARM
              if (activeFarmCategory === 'MATURATION' && activity === 'Stocking') {
                const currentFarmId = selectedFarmId || activeFarmId;
                const animalSections = availableTanks.filter(s => 
                  s.section_type === 'ANIMAL' && 
                  s.farm_id === currentFarmId
                );
                // Only return tanks NOT in stockedTankIds
                return animalSections.flatMap(s => s.tanks || [])
                  .filter(t => !stockedTankIds.includes(t.id));
              }
              if (selectionScope === 'all') {
                const activeSectionData = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
                return activeSectionData?.tanks.filter((t: any) => (activity === 'Stocking' && !editId) ? !stockedTankIds.includes(t.id) : (editId || stockedTankIds.includes(t.id))) || [];
              } else if (selectionScope === 'custom') {
                const activeSectionData = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
                return activeSectionData?.tanks.filter((t: any) => selectedTankIds.includes(t.id) && ((activity === 'Stocking' && !editId) ? !stockedTankIds.includes(t.id) : (editId || stockedTankIds.includes(t.id)))) || [];
              } else {
                const activeSectionData = availableTanks.find(s => s.tanks.some((t: any) => t.id === tankId));
                const t = activeSectionData?.tanks.find((t: any) => t.id === tankId);
                return t ? [t] : [];
              }
            })()}
          />
        )}

        {activity === 'Sourcing & Mating' && (
          <SourcingMatingForm
            data={sourcingMatingData}
            onDataChange={setSourcingMatingData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            availableTanks={(() => {
              const cFarmId = selectedFarmId || activeFarmId;
              // SPAWNING sections always needed for Field 3 destinations
              const spawningSections = availableTanks.filter(s =>
                s.farm_id === cFarmId &&
                (s.section_type === 'SPAWNING' || (s.name || '').toUpperCase().includes('SPAWN'))
              );
              // Start with ANIMAL sections for the current farm
              const animalSections = availableTanks.filter(s =>
                s.farm_id === cFarmId &&
                (s.section_type === 'ANIMAL' || (s.name || '').toUpperCase().includes('ANIMAL'))
              );
              // If we have batch-related tank IDs, further filter ANIMAL tanks to only those in the batch
              if (activeBroodstockBatchId && batchRelatedTankIds.length > 0) {
                const filtered = animalSections.map(s => ({
                  ...s,
                  tanks: s.tanks.filter((t: any) => batchRelatedTankIds.includes(t.id))
                })).filter(s => s.tanks.length > 0);
                // If filtering yielded results, use them; otherwise fall back to all ANIMAL sections
                if (filtered.length > 0) return [...filtered, ...spawningSections];
              }
              return [...animalSections, ...spawningSections];
            })()}
            activeSectionId={selectedSectionId || activeSectionId}
            activeTankId={tankId}
            tankPopulations={tankPopulations}
            isPlanningMode={isPlanningMode}
            farmId={selectedFarmId || activeFarmId}
            activeBroodstockBatchId={activeBroodstockBatchId}
          />
        )}

        {activity === 'Observation' && (
          <ObservationForm
            data={observationData}
            onDataChange={setObservationData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            isPlanningMode={isPlanningMode}
            activeFarmCategory={activeFarmCategory}
            onGoToStocking={() => {
              setActivity('Stocking');
              setIsRedirectedFromObservation(true);
            }}
            selectedTanks={currentSelectedTanks}
          />
        )}

        {activity === 'Animals Sampling & Observation' && (
          <AnimalSamplingForm
            data={animalSamplingData}
            onDataChange={setAnimalSamplingData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            isPlanningMode={isPlanningMode}
            activeFarmCategory={activeFarmCategory}
            onGoToStocking={() => {
              setActivity('Stocking');
              setIsRedirectedFromObservation(true);
            }}
          />
        )}

        {activity === 'Artemia' && (
          <ArtemiaForm
            data={artemiaData}
            onDataChange={setArtemiaData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            isPlanningMode={isPlanningMode}
            availablePreHarvestIds={availableArtemiaPreHarvestIds}
          />
        )}

        {activity === 'Algae' && (
          <AlgaeForm
            data={algaeData}
            onDataChange={setAlgaeData}
            comments={comments}
            onCommentsChange={setComments}
            isPlanningMode={isPlanningMode}
            availableSourceDetails={availableAlgaeSourceDetails}
          />
        )}

        {activity === 'Harvest' && (
          <HarvestForm
            data={harvestData}
            onDataChange={setHarvestData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            isPlanningMode={isPlanningMode}
          />
        )}

        {activity === 'Order Booking' && (
          <OrderBookingForm
            data={orderBookingData}
            onDataChange={setOrderBookingData}
            comments={comments}
            onCommentsChange={setComments}
            availableTanks={availableTanks.filter(s => 
              s.farm_category === activeFarmCategory || 
              ((s.farm_category === 'LRT' || s.farm_category === 'LRI') && (activeFarmCategory === 'LRT' || activeFarmCategory === 'LRI'))
            )}
            availableBatches={availableBatches}
            isPlanningMode={isPlanningMode}
          />
        )}

        {activity === 'Tank Shifting' && (
          <TankShiftingForm
            data={tankShiftingData}
            onDataChange={setTankShiftingData}
            availableTanks={availableTanks}
            comments={comments}
            onCommentsChange={setComments}
            isPlanningMode={isPlanningMode}
            stockedTankIds={stockedTankIds}
            fetchLatestPopulation={fetchLatestPopulation}
            farmId={selectedFarmId || activeFarmId || ''}
            activeBroodstockBatchId={activeBroodstockBatchId}
          />
        )}



        {activity === 'Spawning' && (
          <SpawningForm
            data={spawningData}
            onDataChange={setSpawningData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            availableTanks={availableTanks}
            activeSectionId={selectedSectionId || activeSectionId}
            tankPopulations={tankPopulations}
            isPlanningMode={isPlanningMode}
            farmId={selectedFarmId || activeFarmId}
            activeBroodstockBatchId={activeBroodstockBatchId}
          />
        )}

        {activity === 'Egg Count' && (
          <EggCountForm
            data={eggCountData}
            onDataChange={setEggCountData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            availableTanks={availableTanks}
            activeSectionId={selectedSectionId || activeSectionId}
            farmId={selectedFarmId || activeFarmId}
            hatcheryId={hatcheryId}
            activeBroodstockBatchId={activeBroodstockBatchId}
          />
        )}

        {activity === 'Nauplii Harvest' && (
          <NaupliiHarvestForm
            data={naupliiHarvestData}
            onDataChange={setNaupliiHarvestData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            availableTanks={availableTanks}
            farmId={selectedFarmId || activeFarmId || ''}
            activeBroodstockBatchId={activeBroodstockBatchId}
            tankPopulations={tankPopulations}
          />
        )}

        {activity === 'Nauplii Sale' && (
          <NaupliiSaleForm
            data={naupliiSaleData}
            onDataChange={setNaupliiSaleData}
            comments={comments}
            onCommentsChange={setComments}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
            availableTanks={availableTanks}
            isPlanningMode={isPlanningMode}
            farmId={selectedFarmId || activeFarmId || ''}
            activeBroodstockBatchId={activeBroodstockBatchId}
          />
        )}

        {activity === 'Broodstock Discard' && (
          <BroodstockDiscardForm
            data={broodstockDiscardData}
            onChange={setBroodstockDiscardData}
            activeBroodstockBatchId={activeBroodstockBatchId}
            farmId={selectedFarmId || activeFarmId || ''}
            selectedTanks={currentSelectedTanks}
          />
        )}

        {activity === 'Water Management' && (
          <div className="glass-card rounded-2xl p-4 space-y-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-500" />
              Water Management Details
            </h2>
            
            {/* Field 1: Water Flow Operation */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                1. Water Flow Operation <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={waterMgmtData.flowOperation} 
                onValueChange={(val) => setWaterMgmtData({ ...waterMgmtData, flowOperation: val })}
              >
                <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/20 focus:ring-2 focus:ring-primary/50 shadow-sm bg-background/50">
                  <SelectValue placeholder="Choose Operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Water Filling">1) Water Filling</SelectItem>
                  <SelectItem value="Water Exchange">2) Water Exchange</SelectItem>
                  <SelectItem value="Recirculation">3) Recirculation</SelectItem>
                  <SelectItem value="Drain / Clean">4) Drain / Clean</SelectItem>
                  <SelectItem value="Observations">5) Observations</SelectItem>
                  <SelectItem value="Treatment">6) Treatment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {waterMgmtData.flowOperation === 'Water Filling' && (
              <>
                {/* Field 2: Choose Source Tank */}
                <div className="glass-card rounded-2xl p-4 space-y-4 border border-muted-foreground/10 shadow-sm animate-fade-in-up mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      2. Choose Source Tank <span className="text-destructive">*</span>
                    </Label>
                    <Tabs 
                      value={waterMgmtData.sourceScope || 'single'} 
                      onValueChange={(val: any) => {
                        const allTanks = availableTanks
                          .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                          .flatMap(s => s.tanks || [])
                          .filter(t => (tankWaterVolumes[t.id] || 0) > 0) // Only tanks with water
                          .map(t => t.id);
                        
                        let sourceIds = waterMgmtData.sourceTankIds;
                        let sType = waterMgmtData.sourceType;

                        if (val === 'all') {
                          sourceIds = allTanks;
                          sType = 'tank';
                        } else if (val === 'single') {
                          sourceIds = [];
                        }

                        const totalAvailable = sType === 'tank' 
                          ? (sourceIds || []).reduce((sum, id) => sum + (tankWaterVolumes[id] || 0), 0)
                          : (sType === 'sea' || sType === 'fresh' ? 999999 : 0);

                        setWaterMgmtData({ 
                          ...waterMgmtData, 
                          sourceScope: val, 
                          sourceType: sType,
                          sourceTankIds: sourceIds,
                          sourceVolumeAvailable: totalAvailable,
                          sourceFinalVolume: Math.max(0, totalAvailable - (waterMgmtData.totalVolumeToFill || 0))
                        });
                      }} 
                      className="h-8"
                    >
                      <TabsList className="bg-muted/50 h-8 p-0.5">
                        <TabsTrigger value="single" className="text-[10px] px-2 h-7">Single</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] px-2 h-7 text-xs">All</TabsTrigger>
                        <TabsTrigger value="custom" className="text-[10px] px-2 h-7">Custom</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="space-y-1.5">
                    {waterMgmtData.sourceScope === 'single' ? (
                      <Select 
                        value={waterMgmtData.sourceType === 'tank' ? (waterMgmtData.sourceTankIds[0] || '') : waterMgmtData.sourceType} 
                        onValueChange={(val) => {
                          if (val === 'sea' || val === 'fresh') {
                            setWaterMgmtData({ 
                              ...waterMgmtData, 
                              sourceType: val, 
                              sourceTankIds: [], 
                              sourceVolumeAvailable: 999999,
                              sourceFinalVolume: 999999 - (waterMgmtData.totalVolumeToFill || 0)
                            });
                          } else {
                            const availableVol = tankWaterVolumes[val] || 0;
                            setWaterMgmtData({ 
                              ...waterMgmtData, 
                              sourceType: 'tank', 
                              sourceTankIds: [val], 
                              sourceVolumeAvailable: availableVol,
                              sourceFinalVolume: Math.max(0, availableVol - (waterMgmtData.totalVolumeToFill || 0))
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50">
                          <SelectValue placeholder="Select Source (External or Tank)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">External Sources</SelectLabel>
                            <SelectItem value="sea">Sea Water</SelectItem>
                            <SelectItem value="fresh">Fresh Water Source</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Internal Water Tanks</SelectLabel>
                            {availableTanks
                              .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                              .flatMap(s => s.tanks || [])
                              .filter(t => (tankWaterVolumes[t.id] || 0) > 0) // Only show tanks with water
                              .map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  <div className="flex items-center justify-between w-full gap-4">
                                    <span>{t.name}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                      {(tankWaterVolumes[t.id] || 0).toLocaleString()} L / {t.volume_litres?.toLocaleString() || 'N/A'} L
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : waterMgmtData.sourceScope === 'all' ? (
                      <div className="h-11 flex items-center px-4 bg-primary/5 text-primary rounded-lg border border-primary/20 text-sm font-bold gap-2">
                        <Check className="w-4 h-4" />
                        Apply to all tanks in Water Section
                      </div>
                    ) : (
                      <div className="h-11 flex items-center px-4 bg-muted/50 rounded-lg border border-input text-sm font-medium cursor-default">
                        {waterMgmtData.sourceType === 'tank' 
                          ? `${waterMgmtData.sourceTankIds.length} tank(s) selected`
                          : (waterMgmtData.sourceType === 'sea' ? 'Sea Water' : (waterMgmtData.sourceType === 'fresh' ? 'Fresh Water' : 'None selected'))
                        }
                      </div>
                    )}
                  </div>

                    {waterMgmtData.sourceScope === 'custom' && (
                      <div className="pt-2 border-t border-dashed">
                        <Label className="text-[10px] uppercase text-muted-foreground mb-2 block">Select Tanks for this Activity</Label>
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                          {/* Sea Water Source */}
                          <div 
                            onClick={() => {
                              setWaterMgmtData({ 
                                ...waterMgmtData, 
                                sourceType: 'sea', 
                                sourceTankIds: [], 
                                sourceVolumeAvailable: 999999,
                                sourceFinalVolume: Math.max(0, 999999 - (waterMgmtData.totalVolumeToFill || 0))
                              });
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                              waterMgmtData.sourceType === 'sea' 
                                ? 'bg-primary/10 border-primary text-primary font-bold' 
                                : 'bg-card border-border hover:border-primary/50'
                            }`}
                          >
                            <Checkbox checked={waterMgmtData.sourceType === 'sea'} className="pointer-events-none" />
                            <span className="text-xs break-all uppercase">Sea Water</span>
                          </div>

                          {/* Fresh Water Source */}
                          <div 
                            onClick={() => {
                              setWaterMgmtData({ 
                                ...waterMgmtData, 
                                sourceType: 'fresh', 
                                sourceTankIds: [], 
                                sourceVolumeAvailable: 999999,
                                sourceFinalVolume: Math.max(0, 999999 - (waterMgmtData.totalVolumeToFill || 0))
                              });
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                              waterMgmtData.sourceType === 'fresh' 
                                ? 'bg-primary/10 border-primary text-primary font-bold' 
                                : 'bg-card border-border hover:border-primary/50'
                            }`}
                          >
                            <Checkbox checked={waterMgmtData.sourceType === 'fresh'} className="pointer-events-none" />
                            <span className="text-xs break-all uppercase">Fresh Water</span>
                          </div>

                          {availableTanks
                            .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                            .flatMap(s => s.tanks || [])
                            .filter(t => (tankWaterVolumes[t.id] || 0) > 0) // Only show tanks with water
                            .map(t => {
                              const isSelected = waterMgmtData.sourceType === 'tank' && waterMgmtData.sourceTankIds.includes(t.id);
                              return (
                                <div 
                                  key={t.id}
                                  onClick={() => {
                                    const prevIds = waterMgmtData.sourceType === 'tank' ? waterMgmtData.sourceTankIds : [];
                                    const newIds = isSelected 
                                      ? prevIds.filter(id => id !== t.id)
                                      : [...prevIds, t.id];
                                    
                                    const totalAvailable = newIds.reduce((sum, id) => sum + (tankWaterVolumes[id] || 0), 0);
                                    
                                    setWaterMgmtData({ 
                                      ...waterMgmtData, 
                                      sourceType: 'tank', 
                                      sourceTankIds: newIds, 
                                      sourceVolumeAvailable: totalAvailable,
                                      sourceFinalVolume: Math.max(0, totalAvailable - (waterMgmtData.totalVolumeToFill || 0))
                                    });
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-primary/10 border-primary text-primary font-bold' 
                                      : 'bg-card border-border hover:border-primary/50'
                                  }`}
                                >
                                  <Checkbox checked={isSelected} className="pointer-events-none" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs break-all uppercase">
                                      {t.name}
                                    </span>
                                    <span className="text-[8px] font-bold text-muted-foreground leading-tight shrink-0">
                                      {(tankWaterVolumes[t.id] || 0).toLocaleString()} L / {t.volume_litres?.toLocaleString() || 'N/A'} L
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        {availableTanks.filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId)).flatMap(s => s.tanks || []).length === 0 && (
                          <p className="text-[10px] text-muted-foreground italic text-center py-2">No tanks found in Water Section for this module</p>
                        )}
                      </div>
                    )}
                  
                  {waterMgmtData.sourceType && (
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                      <span className="text-xs font-bold text-sky-700 uppercase tracking-tight">Total Volume Available</span>
                      <span className="text-sm font-black text-sky-900">
                        {waterMgmtData.sourceType === 'tank' ? `${waterMgmtData.sourceVolumeAvailable.toLocaleString()} L` : 'Unlimited'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Field 3: Choose Tank / Tanks to fill */}
                <div className="space-y-3 pt-4 border-t border-dashed">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    3. Choose Tank / Tanks to fill <span className="text-destructive">*</span>
                  </Label>
                  
                  {/* Section Filter */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase">Filter Section:</span>
                    <Select 
                      value={waterMgmtData.selectedSectionFilter} 
                      onValueChange={(val) => setWaterMgmtData({ ...waterMgmtData, selectedSectionFilter: val })}
                    >
                      <SelectTrigger className="h-8 text-[10px] rounded-lg border-muted-foreground/20 py-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {availableTanks
                          .filter(s => s.farm_id === (selectedFarmId || activeFarmId))
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {(() => {
                      const farmSections = availableTanks.filter(s => s.farm_id === (selectedFarmId || activeFarmId));
                      return (waterMgmtData.selectedSectionFilter === 'all' 
                        ? farmSections.flatMap(s => s.tanks || [])
                        : farmSections.find(s => s.id === waterMgmtData.selectedSectionFilter)?.tanks || []
                      ).map(tank => {
                      const isSelected = waterMgmtData.fillTargets.some((t: any) => t.tankId === tank.id);
                      return (
                        <button
                          key={tank.id}
                          onClick={() => {
                            const targets = [...waterMgmtData.fillTargets];
                            const idx = targets.findIndex((t: any) => t.tankId === tank.id);
                            if (idx >= 0) {
                              targets.splice(idx, 1);
                            } else {
                              targets.push({ tankId: tank.id, tankName: tank.name, volumeToFill: 0, finalVolume: 0 });
                            }
                            setWaterMgmtData({ ...waterMgmtData, fillTargets: targets });
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                            isSelected 
                              ? 'bg-primary/10 border-primary shadow-sm' 
                              : 'bg-background border-muted-foreground/10 hover:border-primary/30'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                              {tank.name}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-medium">
                              {(() => {
                                const capacity = tank.volume_litres || 0;
                                const current = tankWaterVolumes[tank.id] || 0;
                                const remaining = Math.max(0, capacity - current);
                                return capacity > 0 
                                  ? `Avail: ${remaining.toLocaleString()}L / Cap: ${capacity.toLocaleString()}L`
                                  : 'Cap: N/A';
                              })()}
                            </span>
                          </div>
                        </button>
                      );
                    });
                  })()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium italic mt-2">
                    {waterMgmtData.fillTargets.length} tank(s) selected
                  </div>
                </div>

                {/* Field 4: Volumes to be Filled */}
                {waterMgmtData.fillTargets.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      4. Volumes to be Filled
                    </Label>
                    <div className="space-y-3">
                      {waterMgmtData.fillTargets.map((target: any, idx: number) => (
                        <div key={target.tankId} className="p-3 rounded-2xl bg-muted/20 border space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-foreground uppercase">{target.tankName}</span>
                          </div>
                          <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <Label className="text-[9px] uppercase font-bold text-primary">Fill (L) *</Label>
                                {(() => {
                                  const tank = availableTanks.flatMap(s => s.tanks || []).find(t => t.id === target.tankId);
                                  const capacity = tank?.volume_litres || 0;
                                  const current = tankWaterVolumes[target.tankId] || 0;
                                  const remaining = Math.max(0, capacity - current);
                                  const isOver = (current + target.volumeToFill) > capacity;
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-bold text-muted-foreground uppercase">
                                        Current: {current.toLocaleString()}L | Avail: {remaining.toLocaleString()}L | Cap: {capacity.toLocaleString()}L
                                      </span>
                                      {isOver && capacity > 0 && (
                                        <span className="text-[8px] font-black text-destructive animate-pulse uppercase">
                                          Exceeds Capacity!
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              <Input 
                                type="number"
                                value={target.volumeToFill === 0 ? '' : target.volumeToFill}
                                placeholder="0"
                                onChange={(e) => {
                                  const targets = [...waterMgmtData.fillTargets];
                                  const val = parseFloat(e.target.value) || 0;
                                  targets[idx].volumeToFill = val;
                                  const currentVol = tankWaterVolumes[target.tankId] || 0;
                                  targets[idx].finalVolume = currentVol + val;
                                  
                                  const total = targets.reduce((sum: number, t: any) => sum + t.volumeToFill, 0);
                                  setWaterMgmtData({ 
                                    ...waterMgmtData, 
                                    fillTargets: targets, 
                                    totalVolumeToFill: total,
                                    sourceFinalVolume: waterMgmtData.sourceVolumeAvailable - total
                                  });
                                }}
                                className={`h-9 text-xs rounded-lg font-bold placeholder:text-muted-foreground/30 transition-all ${
                                  (() => {
                                    const tank = availableTanks.flatMap(s => s.tanks || []).find(t => t.id === target.tankId);
                                    const capacity = tank?.volume_litres || 0;
                                    const current = tankWaterVolumes[target.tankId] || 0;
                                    return (current + target.volumeToFill) > capacity && capacity > 0;
                                  })() || waterMgmtData.totalVolumeToFill > waterMgmtData.sourceVolumeAvailable 
                                    ? 'border-destructive focus:border-destructive ring-1 ring-destructive/20' 
                                    : 'border-primary/30 focus:border-primary'
                                }`}
                              />
                            </div>
                        </div>
                      ))}
                    </div>

                    {waterMgmtData.totalVolumeToFill > waterMgmtData.sourceVolumeAvailable && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        <span className="text-[10px] font-black text-destructive uppercase tracking-wide">
                          Total fill ({waterMgmtData.totalVolumeToFill.toLocaleString()} L) exceeds source volume ({waterMgmtData.sourceVolumeAvailable.toLocaleString()} L). Please reduce fill amounts.
                        </span>
                      </div>
                    )}



                    {/* Field 5: Final Volumes in Tanks */}
                    <div className="space-y-4 pt-4 border-t border-dashed animate-fade-in-up">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        5. Final Volumes in Tanks
                      </Label>
                      
                      {/* 1) Source Tank Final Volume */}
                      {waterMgmtData.sourceType === 'tank' && (
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">1) Source Tank (Final Volume)</Label>
                          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-sky-950 uppercase">
                                {availableTanks.flatMap(s => s.tanks || []).find(t => t.id === waterMgmtData.sourceTankIds[0])?.name || 'Source Tank'}
                              </span>
                              <span className="text-[9px] font-bold text-sky-600 italic">Auto-filled - Editable</span>
                            </div>
                            <Input 
                              type="number"
                              value={waterMgmtData.sourceFinalVolume === 0 ? '' : waterMgmtData.sourceFinalVolume}
                              onChange={(e) => setWaterMgmtData({ ...waterMgmtData, sourceFinalVolume: parseFloat(e.target.value) || 0 })}
                              className="h-9 text-xs rounded-lg border-sky-200 bg-white font-bold"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}

                      {/* 2) Filled Tanks Final Volumes */}
                      <div className="space-y-3">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">2) Filled tanks (Final Volumes)</Label>
                        {waterMgmtData.fillTargets.map((target: any, idx: number) => (
                          <div key={target.tankId} className="p-3 rounded-2xl bg-sky-50 border border-sky-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-sky-950 uppercase">{target.tankName}</span>
                              <span className="text-[9px] font-bold text-sky-600 italic">Auto-filled - Editable</span>
                            </div>
                            <Input 
                              type="number"
                              value={target.finalVolume === 0 ? '' : target.finalVolume}
                              onChange={(e) => {
                                const targets = [...waterMgmtData.fillTargets];
                                targets[idx].finalVolume = parseFloat(e.target.value) || 0;
                                setWaterMgmtData({ ...waterMgmtData, fillTargets: targets });
                              }}
                              className="h-9 text-xs rounded-lg border-sky-200 bg-white font-bold"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {waterMgmtData.flowOperation === 'Water Exchange' && (
              <>
                {/* Field 2: Choose Source Tank */}
                <div className="space-y-4 pt-4 border-t border-dashed">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    2. Choose Source Tank <span className="text-destructive">*</span>
                  </Label>
                  
                  <div className="glass-card rounded-2xl p-4 space-y-4 border border-muted-foreground/10 shadow-sm animate-fade-in-up">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select Source Tank (Water Section) *</Label>
                      <Select 
                        value={waterMgmtData.exchangeSourceTankId || ''} 
                        onValueChange={(val) => {
                          const availableVol = tankWaterVolumes[val] || 0;
                          setWaterMgmtData({ 
                            ...waterMgmtData, 
                            exchangeSourceTankId: val,
                            sourceVolumeAvailable: availableVol,
                            sourceFinalVolume: Math.max(0, availableVol - (waterMgmtData.totalVolumeToFill || 0))
                          });
                        }}
                      >
                        <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50">
                          <SelectValue placeholder="Select source tank" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTanks
                            .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                            .flatMap(s => s.tanks || [])
                            .filter(t => (tankWaterVolumes[t.id] || 0) > 0) // Only show tanks with water
                            .map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name} ({(tankWaterVolumes[t.id] || 0).toLocaleString()} L / {t.volume_litres?.toLocaleString() || 'N/A'} L)</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {waterMgmtData.exchangeSourceTankId && (
                      <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                        <span className="text-xs font-bold text-sky-700 uppercase tracking-tight">Water Volume Available</span>
                        <span className="text-sm font-black text-sky-900">
                          {waterMgmtData.sourceVolumeAvailable.toLocaleString()} L
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 3: Choose Tank / Tanks for Exchange */}
                <div className="space-y-3 pt-4 border-t border-dashed">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    3. Choose Tank / Tanks for Exchange <span className="text-destructive">*</span>
                  </Label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {(() => {
                      const farmSections = availableTanks.filter(s => s.farm_id === (selectedFarmId || activeFarmId));
                      // Only Animal Tanks (not in Water Section)
                      return farmSections
                        .filter(s => s.section_type !== 'WATER')
                        .flatMap(s => s.tanks || [])
                        .map(tank => {
                          const isSelected = waterMgmtData.exchangeTargets.some((t: any) => t.tankId === tank.id);
                          return (
                            <button
                              key={tank.id}
                              onClick={() => {
                                const targets = [...waterMgmtData.exchangeTargets];
                                const idx = targets.findIndex((t: any) => t.tankId === tank.id);
                                if (idx >= 0) {
                                  targets.splice(idx, 1);
                                } else {
                                  targets.push({ tankId: tank.id, tankName: tank.name, exchangeAmount: 0, finalVolume: 0 });
                                }
                                setWaterMgmtData({ ...waterMgmtData, exchangeTargets: targets });
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary shadow-sm' 
                                  : 'bg-background border-muted-foreground/10 hover:border-primary/30'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {tank.name}
                                </span>
                                <span className="text-[8px] text-muted-foreground font-medium">
                                  {(tankWaterVolumes[tank.id] || 0).toLocaleString()} L / {tank.volume_litres?.toLocaleString() || 'N/A'} L
                                </span>
                              </div>
                            </button>
                          );
                        });
                    })()}
                  </div>
                </div>

                    {/* Field 4: Volume to be Exchanged */}
                    {waterMgmtData.exchangeTargets.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-dashed">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            4. Volume to be Exchanged
                          </Label>
                          <Tabs 
                            value={waterMgmtData.exchangeUnit} 
                            onValueChange={(val: any) => {
                              let totalVol = 0;
                              const sourceVol = waterMgmtData.sourceVolumeAvailable || 0;
                              
                              const newTargets = waterMgmtData.exchangeTargets.map((t: any) => {
                                let newFinal = 0;
                                const currentVol = tankWaterVolumes[t.tankId] || 0;
                                if (val === 'percent') {
                                  newFinal = (t.exchangeAmount / 100) * currentVol;
                                } else {
                                  newFinal = t.exchangeAmount || 0;
                                }
                                totalVol += newFinal;
                                return { ...t, finalVolume: currentVol + newFinal };
                              });
                              
                              setWaterMgmtData({ 
                                ...waterMgmtData, 
                                exchangeUnit: val,
                                exchangeTargets: newTargets,
                                totalVolumeToFill: totalVol,
                                sourceFinalVolume: sourceVol - totalVol
                              });
                            }}
                            className="h-8"
                          >
                            <TabsList className="bg-muted/50 h-8 p-0.5">
                              <TabsTrigger value="volume" className="text-[10px] px-2 h-7">Tons/Ltrs</TabsTrigger>
                              <TabsTrigger value="percent" className="text-[10px] px-2 h-7 text-xs">% of Water</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>

                        <div className="space-y-3">
                          {waterMgmtData.exchangeTargets.map((target: any, idx: number) => (
                            <div key={target.tankId} className="p-3 rounded-2xl bg-muted/20 border space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-foreground uppercase">{target.tankName}</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                  Current: {(tankWaterVolumes[target.tankId] || 0).toLocaleString()} L
                                </span>
                              </div>
                              <div className="space-y-1">
                                  <Label className="text-[9px] uppercase font-bold text-primary">
                                    {waterMgmtData.exchangeUnit === 'volume' ? 'Exchange Volume (L) *' : 'Exchange % *'}
                                  </Label>
                                  <Input 
                                    type="number"
                                    value={target.exchangeAmount === 0 ? '' : target.exchangeAmount}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const sourceVol = waterMgmtData.sourceVolumeAvailable || 0;
                                      const destVol = tankWaterVolumes[target.tankId] || 0;
                                      let newFinal = 0;
                                      
                                      if (waterMgmtData.exchangeUnit === 'percent') {
                                        newFinal = (val / 100) * destVol;
                                      } else {
                                        newFinal = val;
                                      }

                                      const targets = [...waterMgmtData.exchangeTargets];
                                      targets[idx] = {
                                        ...targets[idx],
                                        exchangeAmount: val,
                                        finalVolume: (tankWaterVolumes[target.tankId] || 0) + newFinal
                                      };

                                      const totalVol = targets.reduce((sum: number, t: any) => sum + (t.finalVolume || 0), 0);
                                      
                                      setWaterMgmtData({ 
                                        ...waterMgmtData, 
                                        exchangeTargets: targets,
                                        totalVolumeToFill: totalVol,
                                        sourceFinalVolume: sourceVol - totalVol
                                      });
                                    }}
                                    className="h-9 text-xs rounded-lg font-bold border-primary/30 focus:border-primary"
                                  />
                                </div>
                            </div>
                          ))}
                        </div>

                    {waterMgmtData.totalVolumeToFill > waterMgmtData.sourceVolumeAvailable && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        <span className="text-[10px] font-black text-destructive uppercase tracking-wide">
                          Total exchange exceeds available source volume.
                        </span>
                      </div>
                    )}

                    {/* Field 5: Final Volumes in Tanks */}
                    <div className="space-y-4 pt-4 border-t border-dashed animate-fade-in-up">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        5. Final Volumes in Tanks
                      </Label>
                      
                      <div className="space-y-3">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">1) Source Tank (Final Volume)</Label>
                        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-sky-950 uppercase">
                              {availableTanks.flatMap(s => s.tanks || []).find(t => t.id === waterMgmtData.exchangeSourceTankId)?.name || 'Source Tank'}
                            </span>
                            <span className="text-[9px] font-bold text-sky-600 italic">Auto-filled - Editable</span>
                          </div>
                          <Input 
                            type="number"
                            value={waterMgmtData.sourceFinalVolume === 0 ? '' : waterMgmtData.sourceFinalVolume}
                            onChange={(e) => setWaterMgmtData({ ...waterMgmtData, sourceFinalVolume: parseFloat(e.target.value) || 0 })}
                            className="h-9 text-xs rounded-lg border-sky-200 bg-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">2) Filled tanks (Final Volumes)</Label>
                        {waterMgmtData.exchangeTargets.map((target: any, idx: number) => (
                          <div key={target.tankId} className="p-3 rounded-2xl bg-sky-50 border border-sky-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-sky-950 uppercase">{target.tankName}</span>
                              <span className="text-[9px] font-bold text-sky-600 italic">Auto-filled - Editable</span>
                            </div>
                            <Input 
                              type="number"
                              value={target.finalVolume === 0 ? '' : target.finalVolume}
                              onChange={(e) => {
                                const targets = [...waterMgmtData.exchangeTargets];
                                targets[idx].finalVolume = parseFloat(e.target.value) || 0;
                                setWaterMgmtData({ ...waterMgmtData, exchangeTargets: targets });
                              }}
                              className="h-9 text-xs rounded-lg border-sky-200 bg-white font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}



            {waterMgmtData.flowOperation === 'Recirculation' && (
              <>
                {/* Field 2: Choose Tank for Recirculation */}
                <div className="glass-card rounded-2xl p-4 space-y-4 border border-muted-foreground/10 shadow-sm animate-fade-in-up mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      2. Choose Tank for Recirculation <span className="text-destructive">*</span>
                    </Label>
                    <Tabs 
                      value={waterMgmtData.sourceScope || 'single'} 
                      onValueChange={(val: any) => {
                        const allFilledTanks = availableTanks
                          .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                          .flatMap(s => s.tanks || [])
                          .filter(t => (tankWaterVolumes[t.id] || 0) > 0)
                          .map(t => t.id);
                        
                        if (val === 'all') {
                          setWaterMgmtData({
                            ...waterMgmtData,
                            sourceScope: val,
                            recirculationTargets: allFilledTanks.map(id => {
                              const tank = availableTanks.flatMap(s => s.tanks || []).find(t => t.id === id);
                              return { 
                                tankId: id, 
                                tankName: tank?.name || 'Tank', 
                                recircHours: '', 
                                startTime: '', 
                                endTime: '', 
                                timeMode: 'duration',
                                finalVolume: tankWaterVolumes[id] || 0
                              };
                            })
                          });
                        } else {
                          setWaterMgmtData({ ...waterMgmtData, sourceScope: val, recirculationTargets: [] });
                        }
                      }} 
                      className="h-8"
                    >
                      <TabsList className="bg-muted/50 h-8 p-0.5">
                        <TabsTrigger value="single" className="text-[10px] px-2 h-7">Single</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] px-2 h-7 text-xs">All</TabsTrigger>
                        <TabsTrigger value="custom" className="text-[10px] px-2 h-7">Custom</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="space-y-1.5">
                    {waterMgmtData.sourceScope === 'single' ? (
                      <Select 
                        value={waterMgmtData.recirculationTargets[0]?.tankId || ''} 
                        onValueChange={(val) => {
                          const tank = availableTanks.flatMap(s => s.tanks || []).find(t => t.id === val);
                          setWaterMgmtData({ 
                            ...waterMgmtData, 
                            recirculationTargets: [{ 
                              tankId: val, 
                              tankName: tank?.name || 'Tank', 
                              recircHours: '', 
                              startTime: '', 
                              endTime: '', 
                              timeMode: 'duration',
                              finalVolume: tankWaterVolumes[val] || 0
                            }]
                          });
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/20 focus:ring-2 focus:ring-primary/50 shadow-sm bg-background/50">
                          <SelectValue placeholder="Select Tank (Water Section)" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTanks
                            .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                            .flatMap(s => s.tanks || [])
                            .filter(t => (tankWaterVolumes[t.id] || 0) > 0)
                            .map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span className="font-bold">{t.name}</span>
                                  <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                                    {(tankWaterVolumes[t.id] || 0).toLocaleString()} L / {t.volume_litres?.toLocaleString() || 'N/A'} L
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : waterMgmtData.sourceScope === 'all' ? (
                      <div className="h-12 flex items-center px-4 bg-sky-50 text-sky-700 rounded-2xl border border-sky-100 text-sm font-black gap-2 shadow-sm">
                        <Check className="w-4 h-4" />
                        RECIRCULATING ALL FILLED TANKS IN WATER SECTION
                      </div>
                    ) : (
                      <div className="h-12 flex items-center px-4 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20 text-sm font-bold text-muted-foreground shadow-inner">
                        {waterMgmtData.recirculationTargets.length} tank(s) selected for recirculation
                      </div>
                    )}
                  </div>

                  {waterMgmtData.sourceScope === 'custom' && (
                    <div className="pt-2 border-t border-dashed">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground/60 mb-3 block tracking-widest text-center">Select Tanks for this Activity</Label>
                      <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableTanks
                          .filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId))
                          .flatMap(s => s.tanks || [])
                          .filter(t => (tankWaterVolumes[t.id] || 0) > 0)
                          .map(t => {
                            const isSelected = waterMgmtData.recirculationTargets.some((target: any) => target.tankId === t.id);
                            return (
                              <div 
                                key={t.id}
                                onClick={() => {
                                  const targets = [...waterMgmtData.recirculationTargets];
                                  const idx = targets.findIndex((target: any) => target.tankId === t.id);
                                  if (idx >= 0) {
                                    targets.splice(idx, 1);
                                  } else {
                                    targets.push({ 
                                      tankId: t.id, 
                                      tankName: t.name, 
                                      recircHours: '', 
                                      startTime: '', 
                                      endTime: '', 
                                      timeMode: 'duration',
                                      finalVolume: tankWaterVolumes[t.id] || 0
                                    });
                                  }
                                  setWaterMgmtData({ ...waterMgmtData, recirculationTargets: targets });
                                }}
                                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                  isSelected 
                                    ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-md scale-[1.02]' 
                                    : 'bg-card border-border hover:border-sky-300 hover:bg-sky-50/30'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-muted-foreground/20'}`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs font-black break-all uppercase tracking-tighter ${isSelected ? 'text-sky-950' : 'text-foreground'}`}>{t.name}</span>
                                  <span className={`text-[8px] font-black leading-tight shrink-0 ${isSelected ? 'text-sky-600' : 'text-muted-foreground'}`}>
                                    {(tankWaterVolumes[t.id] || 0).toLocaleString()} L / {t.volume_litres?.toLocaleString() || 'N/A'} L
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {availableTanks.filter(s => s.section_type === 'WATER' && s.farm_id === (selectedFarmId || activeFarmId)).flatMap(s => s.tanks || []).filter(t => (tankWaterVolumes[t.id] || 0) > 0).length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/10 rounded-xl mt-2">No tanks with water found in Water Section</p>
                      )}
                    </div>
                  )}

                  {waterMgmtData.recirculationTargets.length > 0 && waterMgmtData.sourceScope === 'single' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                          <Droplets className="w-5 h-5 text-sky-500" />
                        </div>
                        <span className="text-xs font-black text-sky-900 uppercase tracking-tight">Water Volume Available</span>
                      </div>
                      <span className="text-lg font-black text-sky-950">
                        {(tankWaterVolumes[waterMgmtData.recirculationTargets[0].tankId] || 0).toLocaleString()} <span className="text-xs opacity-60">L</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Field 3: Time for Recirculation */}
                {waterMgmtData.recirculationTargets.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-dashed">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      3. Time for Recirculation <span className="text-destructive">*</span>
                    </Label>
                    
                    <div className="space-y-4">
                      {waterMgmtData.recirculationTargets.map((target: any, idx: number) => (
                        <div key={target.tankId} className="p-5 rounded-[2rem] bg-background border-2 border-muted-foreground/5 shadow-xl shadow-muted/20 space-y-5 animate-fade-in-up relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3">
                             <div className="bg-sky-500/10 text-sky-600 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Active Recirculation</div>
                          </div>
                          
                          <div className="flex justify-between items-center relative z-10">
                            <span className="text-sm font-black text-foreground uppercase tracking-tighter flex items-center gap-2">
                              <Database className="w-4 h-4 text-sky-400" />
                              {target.tankName}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-5 relative z-10">
                            <Tabs 
                              value={target.timeMode || 'duration'} 
                              onValueChange={(val) => {
                                const targets = [...waterMgmtData.recirculationTargets];
                                targets[idx].timeMode = val;
                                setWaterMgmtData({ ...waterMgmtData, recirculationTargets: targets });
                              }}
                              className="w-full"
                            >
                              <TabsList className="grid grid-cols-2 bg-sky-50/50 p-1 rounded-2xl h-11 border border-sky-100/50">
                                <TabsTrigger value="duration" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg">Duration</TabsTrigger>
                                <TabsTrigger value="slot" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg">Time Slot</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="duration" className="pt-4 space-y-4 animate-in fade-in slide-in-from-left-2">
                                <div className="space-y-2">
                                  <Label className="text-[9px] uppercase font-black text-sky-700/60 ml-1 tracking-widest">Select Duration (Hours)</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {[0.5, 1, 2, 3, 4, 6, 8, 12, 24].map(h => (
                                      <Button
                                        key={h}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const targets = [...waterMgmtData.recirculationTargets];
                                          targets[idx].recircHours = h.toString();
                                          setWaterMgmtData({ ...waterMgmtData, recirculationTargets: targets });
                                        }}
                                        className={`h-10 px-3 rounded-xl border-2 transition-all font-black text-xs ${
                                          target.recircHours === h.toString() 
                                            ? 'bg-sky-500 border-sky-500 text-white shadow-md scale-105' 
                                            : 'bg-white border-sky-100 text-sky-700 hover:border-sky-300'
                                        }`}
                                      >
                                        {h}h
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[9px] uppercase font-black text-sky-700/60 ml-1 tracking-widest">Or Manual Hours</Label>
                                  <div className="relative">
                                    <Input 
                                      type="number"
                                      placeholder="0.0"
                                      value={target.recircHours || ''}
                                      onChange={(e) => {
                                        const targets = [...waterMgmtData.recirculationTargets];
                                        targets[idx].recircHours = e.target.value;
                                        setWaterMgmtData({ ...waterMgmtData, recirculationTargets: targets });
                                      }}
                                      className="h-12 text-base rounded-2xl border-sky-100 bg-sky-50/30 font-black placeholder:text-sky-900/20 pr-12 focus:ring-sky-500"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-sky-400 uppercase">Hours</div>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="slot" className="pt-4 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-2">
                                <TimeInputGroup 
                                  label="Start Time"
                                  value={target.startTime}
                                  onChange={(val) => {
                                    const targets = [...waterMgmtData.recirculationTargets];
                                    targets[idx].startTime = val;
                                    setWaterMgmtData({ ...waterMgmtData, recirculationTargets: targets });
                                  }}
                                />
                                <TimeInputGroup 
                                  label="End Time"
                                  value={target.endTime}
                                  onChange={(val) => {
                                    const targets = [...waterMgmtData.recirculationTargets];
                                    targets[idx].endTime = val;
                                    setWaterMgmtData({ ...waterMgmtData, recirculationTargets: targets });
                                  }}
                                />
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {waterMgmtData.flowOperation === 'Drain / Clean' && (
              <>
                {/* Field 2: Choose Tank to Drain / Clean */}
                <div className="glass-card rounded-2xl p-4 space-y-4 border border-muted-foreground/10 shadow-sm animate-fade-in-up mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      2. Choose Tank to Drain / Clean <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={waterMgmtData.cleanSectionFilter} 
                      onValueChange={(val) => setWaterMgmtData({ ...waterMgmtData, cleanSectionFilter: val })}
                    >
                      <SelectTrigger className="h-8 w-40 text-[10px] rounded-lg border-muted-foreground/20 shadow-sm">
                        <SelectValue placeholder="Filter Section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {availableTanks
                          .filter(s => s.farm_id === (selectedFarmId || activeFarmId))
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 rounded-xl bg-muted/5 border border-dashed">
                    {(() => {
                      const farmSections = availableTanks.filter(s => s.farm_id === (selectedFarmId || activeFarmId));
                      const filteredTanks = waterMgmtData.cleanSectionFilter === 'all'
                        ? farmSections.flatMap(s => s.tanks || [])
                        : farmSections.find(s => s.id === waterMgmtData.cleanSectionFilter)?.tanks || [];
                      
                      return filteredTanks.map(tank => {
                        const isSelected = waterMgmtData.cleanTargets.some((t: any) => t.tankId === tank.id);
                        return (
                          <button
                            key={tank.id}
                            onClick={() => {
                              const targets = [...waterMgmtData.cleanTargets];
                              const idx = targets.findIndex((t: any) => t.tankId === tank.id);
                              if (idx >= 0) {
                                targets.splice(idx, 1);
                              } else {
                                targets.push({ tankId: tank.id, tankName: tank.name });
                              }
                              setWaterMgmtData({ ...waterMgmtData, cleanTargets: targets });
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center min-h-[70px] ${
                              isSelected 
                                ? 'bg-primary/10 border-primary shadow-sm scale-[1.02]' 
                                : 'bg-background border-muted-foreground/10 hover:border-primary/30'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-[10px] font-black leading-tight uppercase tracking-tighter break-all ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                              {tank.name}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-medium">
                              {(tankWaterVolumes[tank.id] || 0).toLocaleString()} L / {tank.volume_litres?.toLocaleString() || 'N/A'} L
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-black italic uppercase tracking-widest text-center py-1">
                    {waterMgmtData.cleanTargets.length} tank(s) selected
                  </div>
                </div>

                {/* Field 3: Tank Quality Score */}
                <div className="space-y-6 pt-6 border-t border-dashed animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-emerald-500" />
                      3. Tank Quality Score
                    </Label>
                    {cleanQualityAvg > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-200 animate-in zoom-in">
                        <span className="text-[10px] font-black uppercase tracking-widest">AVG SCORE: {cleanQualityAvg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-8 bg-background border-2 border-muted-foreground/5 rounded-[2.5rem] shadow-xl shadow-muted/20">
                    <div className="grid grid-cols-1 gap-8">
                      <RatingScale 
                        label="1) Tank Surface Quality"
                        value={waterMgmtData.cleanQuality?.surface || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          cleanQuality: { ...waterMgmtData.cleanQuality, surface: val }
                        })}
                      />
                      <RatingScale 
                        label="2) Tank Paint Quality"
                        value={waterMgmtData.cleanQuality?.paint || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          cleanQuality: { ...waterMgmtData.cleanQuality, paint: val }
                        })}
                      />
                      <RatingScale 
                        label="3) Tank Cleanliness Condition"
                        value={waterMgmtData.cleanQuality?.cleanliness || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          cleanQuality: { ...waterMgmtData.cleanQuality, cleanliness: val }
                        })}
                      />
                      <RatingScale 
                        label="4) Tank Dry Status"
                        value={waterMgmtData.cleanQuality?.dryStatus || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          cleanQuality: { ...waterMgmtData.cleanQuality, dryStatus: val }
                        })}
                      />
                    </div>

                    <div className="pt-6 border-t border-dashed">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 block">
                        5) Tank Last Clean/ Wash Date
                      </Label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                        <Input 
                          type="date"
                          value={waterMgmtData.cleanQuality?.lastWashDate || ''}
                          max={isPlanningMode ? undefined : getTodayStr()}
                          onChange={(e) => setWaterMgmtData({
                            ...waterMgmtData,
                            cleanQuality: { ...waterMgmtData.cleanQuality, lastWashDate: e.target.value }
                          })}
                          className="h-12 pl-12 rounded-2xl border-muted-foreground/20 bg-muted/5 font-black focus:ring-2 focus:ring-primary/50 text-sm shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {waterMgmtData.flowOperation === 'Observations' && (
              <>
                {/* Field 2: Choose Tank Observation */}
                <div className="glass-card rounded-2xl p-4 space-y-4 border border-muted-foreground/10 shadow-sm animate-fade-in-up mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      2. Choose Tank Observation <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={waterMgmtData.observationSectionFilter} 
                      onValueChange={(val) => setWaterMgmtData({ ...waterMgmtData, observationSectionFilter: val })}
                    >
                      <SelectTrigger className="h-8 w-40 text-[10px] rounded-lg border-muted-foreground/20 shadow-sm">
                        <SelectValue placeholder="Filter Section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {availableTanks
                          .filter(s => s.farm_id === (selectedFarmId || activeFarmId))
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 rounded-xl bg-muted/5 border border-dashed">
                    {(() => {
                      const farmSections = availableTanks.filter(s => s.farm_id === (selectedFarmId || activeFarmId));
                      const filteredTanks = waterMgmtData.observationSectionFilter === 'all'
                        ? farmSections.flatMap(s => s.tanks || [])
                        : farmSections.find(s => s.id === waterMgmtData.observationSectionFilter)?.tanks || [];
                      
                      return filteredTanks.map(tank => {
                        const isSelected = waterMgmtData.observationTargets.some((t: any) => t.tankId === tank.id);
                        return (
                          <button
                            key={tank.id}
                            onClick={() => {
                              const targets = [...waterMgmtData.observationTargets];
                              const idx = targets.findIndex((t: any) => t.tankId === tank.id);
                              if (idx >= 0) {
                                targets.splice(idx, 1);
                              } else {
                                targets.push({ tankId: tank.id, tankName: tank.name });
                              }
                              setWaterMgmtData({ ...waterMgmtData, observationTargets: targets });
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center min-h-[70px] ${
                              isSelected 
                                ? 'bg-primary/10 border-primary shadow-sm scale-[1.02]' 
                                : 'bg-background border-muted-foreground/10 hover:border-primary/30'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-[10px] font-black leading-tight uppercase tracking-tighter break-all ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                              {tank.name}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-medium">
                              {(tankWaterVolumes[tank.id] || 0).toLocaleString()} L / {tank.volume_litres?.toLocaleString() || 'N/A'} L
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-black italic uppercase tracking-widest text-center py-1">
                    {waterMgmtData.observationTargets.length} tank(s) selected
                  </div>
                </div>

                {/* Field 3: Tank Quality Score */}
                <div className="space-y-6 pt-6 border-t border-dashed animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-emerald-500" />
                      3. Tank Quality Score
                    </Label>
                    {observationQualityAvg > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-200 animate-in zoom-in">
                        <span className="text-[10px] font-black uppercase tracking-widest">AVG SCORE: {observationQualityAvg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-8 bg-background border-2 border-muted-foreground/5 rounded-[2.5rem] shadow-xl shadow-muted/20">
                    <div className="grid grid-cols-1 gap-8">
                      <RatingScale 
                        label="1) Tank Surface Quality"
                        value={waterMgmtData.observationQuality?.surface || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          observationQuality: { ...waterMgmtData.observationQuality, surface: val }
                        })}
                      />
                      <RatingScale 
                        label="2) Tank Paint Quality"
                        value={waterMgmtData.observationQuality?.paint || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          observationQuality: { ...waterMgmtData.observationQuality, paint: val }
                        })}
                      />
                      <RatingScale 
                        label="3) Tank Cleanliness Condition"
                        value={waterMgmtData.observationQuality?.cleanliness || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          observationQuality: { ...waterMgmtData.observationQuality, cleanliness: val }
                        })}
                      />
                      <RatingScale 
                        label="4) Tank Dry Status"
                        value={waterMgmtData.observationQuality?.dryStatus || 0}
                        onChange={(val) => setWaterMgmtData({
                          ...waterMgmtData,
                          observationQuality: { ...waterMgmtData.observationQuality, dryStatus: val }
                        })}
                      />
                    </div>

                    <div className="pt-6 border-t border-dashed">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 block">
                        5) Tank Last Clean/ Wash Date
                      </Label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                        <Input 
                          type="date"
                          value={waterMgmtData.observationQuality?.lastWashDate || ''}
                          max={isPlanningMode ? undefined : getTodayStr()}
                          onChange={(e) => setWaterMgmtData({
                            ...waterMgmtData,
                            observationQuality: { ...waterMgmtData.observationQuality, lastWashDate: e.target.value }
                          })}
                          className="h-12 pl-12 rounded-2xl border-muted-foreground/20 bg-muted/5 font-black focus:ring-2 focus:ring-primary/50 text-sm shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}


            {waterMgmtData.flowOperation === 'Treatment' && (
              <>
                {/* Field 2: Choose Tank for Treatment */}
                <div className="glass-card rounded-2xl p-4 space-y-4 border border-muted-foreground/10 shadow-sm animate-fade-in-up mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      2. Choose Tank for Treatment <span className="text-destructive">*</span>
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 rounded-xl bg-muted/5 border border-dashed">
                    {(() => {
                      const farmSections = availableTanks.filter(s => s.farm_id === (selectedFarmId || activeFarmId));
                      
                      return farmSections
                        .flatMap(s => s.tanks || [])
                        .filter(tank => {
                          const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tank.id));
                          return section?.section_type === 'WATER' && (tankWaterVolumes[tank.id] || 0) > 0;
                        })
                        .map(tank => {
                        const isSelected = waterMgmtData.treatmentTargets.some((t: any) => t.tankId === tank.id);
                        return (
                          <button
                            key={tank.id}
                            onClick={() => {
                              const targets = [...waterMgmtData.treatmentTargets];
                              const idx = targets.findIndex((t: any) => t.tankId === tank.id);
                              if (idx >= 0) {
                                targets.splice(idx, 1);
                              } else {
                                targets.push({ tankId: tank.id, tankName: tank.name });
                              }
                              setWaterMgmtData({ ...waterMgmtData, treatmentTargets: targets });
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center min-h-[70px] ${
                              isSelected 
                                ? 'bg-primary/10 border-primary shadow-sm scale-[1.02]' 
                                : 'bg-background border-muted-foreground/10 hover:border-primary/30'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-[10px] font-black leading-tight uppercase tracking-tighter break-all ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                              {tank.name}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-medium">
                              {(tankWaterVolumes[tank.id] || 0).toLocaleString()} L / {tank.volume_litres?.toLocaleString() || 'N/A'} L
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-black italic uppercase tracking-widest text-center py-1">
                    {waterMgmtData.treatmentTargets.length} tank(s) selected
                  </div>
                </div>

                {/* Field 3: Treatment Details */}
                <div className="space-y-4 pt-6 border-t border-dashed animate-fade-in-up">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    3. Treatment Details
                  </Label>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Treatment Type *</Label>
                    <Select value={waterMgmtData.treatmentType} onValueChange={(val) => setWaterMgmtData({...waterMgmtData, treatmentType: val})}>
                      <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {dbTreatmentTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dosage *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={waterMgmtData.treatmentDosage}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || parseFloat(val) >= 0) {
                            setWaterMgmtData({...waterMgmtData, treatmentDosage: val});
                          }
                        }}
                        placeholder="0"
                        className="h-11 flex-1 border-muted-foreground/20 focus:border-primary/50"
                      />
                      <Select value={waterMgmtData.treatmentUnit} onValueChange={(val) => setWaterMgmtData({...waterMgmtData, treatmentUnit: val})}>
                        <SelectTrigger className="w-24 h-11 border-muted-foreground/20 focus:border-primary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TREATMENT_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time Slot *</Label>
                    <Select value={timeSlot} onValueChange={setTimeSlot}>
                      <SelectTrigger className="h-11 border-muted-foreground/20 focus:border-primary/50 bg-background/50">
                        <SelectValue placeholder="Select 4hr window" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}


            {/* Common Fields for all Water Management operations */}
            {(['Water Filling', 'Water Exchange', 'Recirculation', 'Drain / Clean', 'Observations', 'Treatment'].includes(waterMgmtData.flowOperation)) && (
              <>
                {/* Field 6: Water Quality Score - Skip for Drain / Clean as it has its own quality score */}
                {waterMgmtData.flowOperation !== 'Drain / Clean' && (
                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                      {waterMgmtData.flowOperation === 'Recirculation' ? '4.' : waterMgmtData.flowOperation === 'Observations' ? '4.' : waterMgmtData.flowOperation === 'Treatment' ? '4.' : '6.'} Water Quality Score
                      {waterMgmtAvg > 0 && <span className="text-emerald-600 font-black">{waterMgmtAvg.toFixed(1)} / 10</span>}
                    </Label>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className={`w-full h-20 justify-between px-4 rounded-2xl border-2 border-dashed transition-all hover:bg-emerald-50/50 hover:border-emerald-500/50 group ${waterMgmtAvg > 0 ? 'bg-emerald-50/30 border-emerald-500/30' : 'border-muted-foreground/20'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${waterMgmtAvg > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-muted/30 text-muted-foreground opacity-40'}`}>
                              <Droplets className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                              <p className={`text-base font-black ${waterMgmtAvg > 0 ? 'text-emerald-950' : 'text-foreground'}`}>
                                {waterMgmtAvg > 0 ? 'Water Quality Recorded' : 'Record Water Quality'}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                                {waterMgmtFilledCount} of {waterFields.length} parameters entered
                              </p>
                            </div>
                          </div>
                          {waterMgmtAvg > 0 && (
                            <div className="text-right flex flex-col items-end">
                              <p className="text-2xl font-black text-emerald-600 leading-none">{waterMgmtAvg.toFixed(1)}</p>
                              <p className="text-[9px] text-emerald-600/60 uppercase font-black tracking-tighter">Compliance Score</p>
                            </div>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-[2rem] gap-0 border-none shadow-2xl">
                        <DialogHeader className="p-6 pb-4 bg-emerald-50/50 sticky top-0 z-10 backdrop-blur-md border-b border-emerald-100">
                          <DialogTitle className="text-xl font-black flex items-center gap-2 text-emerald-950">
                            <Droplets className="w-6 h-6 text-emerald-600" />
                            Water Quality Assessment
                          </DialogTitle>
                        </DialogHeader>
                        <div className="overflow-y-auto p-6 space-y-6 bg-background custom-scrollbar" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                          <div className="grid grid-cols-1 gap-5">
                            {waterFields.map(field => {
                              const rangeLabel = WATER_QUALITY_RANGES[field];
                              const isFilled = waterMgmtData.waterQualityData?.[field] !== undefined && waterMgmtData.waterQualityData?.[field] !== '';
                              return (
                                <div key={field} className="space-y-1.5 group">
                                  <Label className={`text-[10px] font-black flex justify-between uppercase tracking-wider transition-colors ${isFilled ? 'text-emerald-700' : 'text-muted-foreground group-focus-within:text-emerald-600'}`}>
                                    {field} *
                                    {rangeLabel && <span className="text-[9px] font-bold opacity-60 font-mono">{rangeLabel}</span>}
                                  </Label>
                                  <Input
                                    type={field === 'Other' ? 'text' : 'number'}
                                    min="0"
                                    step="any"
                                    value={waterMgmtData.waterQualityData?.[field] || ''}
                                    onChange={e => {
                                      setWaterMgmtData(prev => ({
                                        ...prev,
                                        waterQualityData: {
                                          ...prev.waterQualityData,
                                          [field]: e.target.value
                                        }
                                      }));
                                    }}
                                    placeholder="0.0"
                                    className={`h-11 font-bold text-sm rounded-xl transition-all ${isFilled ? 'border-emerald-200 bg-emerald-50/20 focus:border-emerald-500' : 'border-muted-foreground/10 focus:border-emerald-400'}`}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Summary Score Card inside Modal */}
                          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-100 p-5 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-900 uppercase tracking-widest">Compliance Score</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-emerald-600">{waterMgmtAvg.toFixed(1)}</span>
                                <span className="text-sm font-black text-emerald-600/40">/ 10</span>
                              </div>
                            </div>
                            <div className="w-full h-2.5 bg-emerald-200/50 rounded-full overflow-hidden border border-emerald-200">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${(waterMgmtAvg / 10) * 100}%` }} />
                            </div>
                            <p className="text-[10px] text-emerald-700/70 text-center font-bold italic tracking-wide">
                              Calculated compliance average of {waterMgmtFilledCount} parameters
                            </p>
                          </div>
                        </div>
                        <DialogFooter className="p-4 bg-emerald-50/50 border-t border-emerald-100 sticky bottom-0 z-10">
                          <DialogClose asChild>
                            <Button
                              className="w-full h-12 rounded-xl font-black text-base shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white border-none transition-all active:scale-[0.98]"
                              onClick={() => {
                                setWaterMgmtData(prev => ({
                                  ...prev,
                                  waterQualityScore: parseFloat(waterMgmtAvg.toFixed(1))
                                }));
                              }}
                            >
                              Save Water Quality Assessment
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {!isPlanningMode && (
                  <div className="space-y-1.5 pt-2 border-t border-dashed">
                    <Label className="text-xs">
                      {waterMgmtData.flowOperation === 'Recirculation' ? '5. Photos' : 
                       waterMgmtData.flowOperation === 'Drain / Clean' ? '4. Photos' : 
                       waterMgmtData.flowOperation === 'Observations' ? '5. Photos' : 
                       waterMgmtData.flowOperation === 'Treatment' ? '5. Photos' : 
                       'Activity Photo (Optional)'}
                    </Label>
                    <ImageUpload value={photoUrl} onUpload={setPhotoUrl} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {waterMgmtData.flowOperation === 'Recirculation' ? '6. Comments' : 
                     waterMgmtData.flowOperation === 'Drain / Clean' ? '5. Comments' : 
                     waterMgmtData.flowOperation === 'Observations' ? '6. Comments' : 
                     waterMgmtData.flowOperation === 'Treatment' ? '6. Comments' : 
                     (isPlanningMode ? 'Instructions' : 'Comments')}
                  </Label>
                  <Textarea 
                    value={comments} 
                    onChange={e => setComments(e.target.value)} 
                    placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."} 
                    rows={3} 
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Save */}
        {activity && (
          <Button 
            onClick={isPlanningMode ? handleSaveInstruction : handleSave} 
            className={`w-full h-14 text-base font-semibold rounded-2xl gap-2 animate-fade-in-up ${isBatchClosed ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : ''}`}
            disabled={loading || (isBatchClosed && !isPlanningMode && !editId)}
            data-testid="save-activity-button"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              isPlanningMode ? (
                <>
                  <ClipboardList className="w-5 h-5" />
                  Save Instruction
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {editId ? 'Update Activity' : 'Save Activity'}
                </>
              )
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RecordActivity;

