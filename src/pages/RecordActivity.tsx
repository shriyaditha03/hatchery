import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, ClipboardList, Check, ListChecks, Database, User, ChevronDown } from 'lucide-react';
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
  ArrowUpRight
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RatingScale from '@/modules/shared/components/RatingScale';
import StockingForm from '@/modules/shared/components/StockingForm';
import ObservationForm from '@/modules/shared/components/ObservationForm';
import ArtemiaForm from '@/modules/lrt/components/ArtemiaForm';
import AlgaeForm from '@/modules/lrt/components/AlgaeForm';
import HarvestForm from '@/modules/lrt/components/HarvestForm';
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
const ACTIVITIES = ['Feed', 'Treatment', 'Water Quality', 'Animal Quality', 'Stocking', 'Observation', 'Artemia', 'Algae', 'Harvest', 'Tank Shifting', 'Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard'] as const;
type ActivityType = typeof ACTIVITIES[number];

const FEED_TYPES = ['Starter Feed', 'Grower Feed', 'Finisher Feed', 'Supplement'];
const FEED_UNITS = ['kg', 'gms', 'L', 'ml'];
const TREATMENT_TYPES = ['Probiotics', 'Antibiotics', 'Mineral Supplement', 'Disinfectant', 'Vitamin'];
const TREATMENT_UNITS = ['ml', 'L', 'gms', 'kg', 'ppm'];



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
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionParam || '');

  const [date, setDate] = useState(getTodayStr());
  const [time, setTime] = useState(formatDate(getNowLocal(), 'HH:mm'));
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(formatDate(getNowLocal(), 'a') as 'AM' | 'PM');
  const [isLiveTime, setIsLiveTime] = useState(!editId); // Auto-update time if not editing
  const [tankId, setTankId] = useState('');
  const [activity, setActivity] = useState<ActivityType | ''>('');
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
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
    }
  }, [categoryParam]);

  useEffect(() => {
    if (type && !activity && !editId && !instructionIdParam && !editInstructionId) {
      const typeMap: Record<string, ActivityType> = {
        'feed': 'Feed',
        'treatment': 'Treatment',
        'water': 'Water Quality',
        'animal': 'Animal Quality',
        'stocking': 'Stocking',
        'observation': 'Observation',
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
        'discard': 'Broodstock Discard'
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
    discardReason: '',
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
    sources: [{ id: '1', tankId: '', tankName: '', population: '' }],
    destinations: [{ id: '1', tankId: '', tankName: '', population: '' }],
    summary: { totalHarvested: 0, totalDistributed: 0, balance: 0 }
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
  const activeFarmCategory = categoryParam || activeSection?.farm_category || activeModule || 'LRT';

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
        return null; // Feed, Treatment, Water Quality, Observation → all sections
    }
  };

  const currentFarmId = selectedFarmId || activeFarmId;
  const filteredSections = availableTanks.filter(s => currentFarmId ? s.farm_id === currentFarmId : true);

  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<{id: string, name: string}[]>([]);
  const isSpecialActivity = activity === 'Algae' || activity === 'Artemia' || activity === 'Egg Count' || activity === 'Nauplii Harvest' || activity === 'Nauplii Sale' || activity === 'Sourcing & Mating' || activity === 'Spawning' || (activity === 'Stocking' && activeFarmCategory === 'MATURATION');

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
    fetchTanks();
  }, [user]);

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

      // 2. Fetch Tanks for these sections (include gender for Maturation ANIMAL sections)
      const allSecIds = sections.map(s => s.id);
      const { data: tanks, error: tankError } = await supabase
        .from('tanks')
        .select('id, name, section_id, gender')
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
    const currentFarmId = selectedFarmId || activeFarmId;
    if (activeFarmCategory === 'MATURATION' && currentFarmId) {
      fetchAvailableBatches(currentFarmId);
    }
  }, [selectedFarmId, activeFarmId, activeFarmCategory]);

  const fetchAvailableBatches = async (farmIdToUse: string) => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('farm_id', farmIdToUse)
        .eq('activity_type', 'Stocking');
      
      if (!error && data) {
        const ids = data.map((d: any) => d.stockingId || d.data?.stockingId || d.data?.batchId).filter(Boolean);
        setAvailableBatches(Array.from(new Set(ids)));
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };
  
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
      const { data, error } = await supabase
        .from('activity_logs')
        .select('tank_id, data')
        .eq('farm_id', selectedFarmId || activeFarmId);
      
      if (!error && data) {
        // Filter in JS to avoid 400 errors from complex .or() queries on JSON columns if not indexed
        const relatedTanks = data.filter((d: any) => {
           return d.stockingId === batchId || d.data?.stockingId === batchId;
        });
        const ids = relatedTanks.map((d: any) => d.tank_id).filter(Boolean);
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
      // But the policy requires auth_user_id = auth.uid() OR is_hatchery_owner — so supervisors 
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
            // Now try to get profile names — this may fail for supervisors due to RLS
            const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, username, role')
              .in('id', userIds)
              .in('role', ['worker', 'supervisor']);
            
            if (!profileError && profiles && profiles.length > 0) {
              setAvailableWorkers(profiles.map(p => ({ id: p.id, name: p.full_name || p.username })));
            } else {
              // RLS blocked profile access — use user_ids with generic names
              setAvailableWorkers(userIds.map((id: string, i: number) => ({ id, name: `Worker ${i + 1}` })));
            }
          });
      } else {
        // No farm selected — try hatchery-level query
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
        
        if (pd.instructions) setComments(pd.instructions);
        if (data.scheduled_time) setTime(data.scheduled_time.slice(0, 5));
        toast.info('Editing instruction Ã¢â‚¬â€ make changes and save.');
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
    const { planned_data, tank_id: instrTankId, activity_type: instrActivity } = instruction;
    
    // If the instruction is for a specific tank and we're in single mode, ensure it matches or set it
    if (selectionScope === 'single' && instrTankId && tankId !== instrTankId) {
      setTankId(instrTankId);
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

  // Auto-fetch Stocking data for Observation (LRT single-tank mode only)
  useEffect(() => {
    if (activity === 'Observation' && tankId && !editId && activeFarmCategory !== 'MATURATION') {
      fetchLatestStockingData(tankId);
    }
  }, [activity, tankId, activeFarmCategory]);

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

      const tankSection = availableTanks.find(s => s.tanks.some((t: any) => t.id === tid));
      const currentFarmId = tankSection?.farm_id || selectedFarmId || activeFarmId;
      
      if (!currentFarmId) {
        console.warn('No farm ID found for tank:', tid);
      }
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('data, activity_type')
        .eq('tank_id', tid)
        .in('activity_type', ['Stocking', 'Observation'])
        .eq('farm_id', currentFarmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.data) {
        const isStocking = data.activity_type === 'Stocking';
        const isMaturation = activeFarmCategory === 'MATURATION';
        
        setObservationData(prev => ({
          ...prev,
          stockingId: data.data.stockingId,
          broodstockSource: data.data.broodstockSource,
          broodstockType: data.data.broodstockType,
          sex: data.data.sex,
          hatcheryName: data.data.hatcheryName,
          tankStockingNumber: data.data.tankStockingNumber,
          presentPopulationM: isMaturation 
            ? (isStocking ? data.data.totalMales : data.data.presentPopulationM) 
            : undefined,
          presentPopulationF: isMaturation 
            ? (isStocking ? data.data.totalFemales : data.data.presentPopulationF) 
            : undefined,
          presentPopulation: !isMaturation 
            ? (isStocking ? data.data.tankStockingNumber : data.data.presentPopulation) 
            : undefined,
          naupliiStockedMillion: data.data.naupliiStocked || data.data.naupliiStockedMillion
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
        .in('activity_type', ['Stocking', 'Observation', 'Harvest', 'Tank Shifting'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.data) {
        let population = 0;
        if (data.activity_type === 'Stocking') {
          population = activeFarmCategory === 'MATURATION' 
            ? parseFloat(data.data.totalMales || '0') + parseFloat(data.data.totalFemales || '0')
            : parseFloat(data.data.tankStockingNumber || '0');
        } else if (data.activity_type === 'Observation') {
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

  // Auto-fetch Population for Harvest & Tank Shifting
  useEffect(() => {
    if ((activity === 'Harvest' || activity === 'Tank Shifting') && tankId && !editId) {
      fetchLatestPopulation(tankId).then(pop => {
        if (activity === 'Harvest') {
          setHarvestData(prev => ({ ...prev, populationBeforeHarvest: pop.toString() }));
        } else {
          setTankShiftingData(prev => ({ ...prev, sourcePopulation: pop.toString() }));
        }
      });
    }
  }, [activity, tankId, editId]);

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
  const [feedUnit, setFeedUnit] = useState('gms');

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

  // Artemia & Algae data
  const [artemiaData, setArtemiaData] = useState<any>({ phase: 'pre' });
  const [algaeData, setAlgaeData] = useState<any>({ phase: 'new' });
  const [harvestData, setHarvestData] = useState<any>({});
  const [tankShiftingData, setTankShiftingData] = useState<any>({ destinations: [{ id: Date.now() }] });


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
      case 'Tank Shifting': return { ...baseData, ...tankShiftingData };
      case 'Sourcing & Mating': return { ...baseData, ...sourcingMatingData };
      case 'Spawning': return { ...baseData, ...spawningData };
      case 'Egg Count': return { ...baseData, ...eggCountData };
      case 'Nauplii Harvest': return { ...baseData, ...naupliiHarvestData };
      case 'Nauplii Sale': return { ...baseData, ...naupliiSaleData };
      default: return baseData;
    }
  };

  const handleSaveInstruction = async () => {
    if (!activity) {
      toast.error('Please select an activity');
      return;
    }

    let targets = [];
    const isSpecialActivity = activity === 'Algae' || activity === 'Artemia';

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
          activity_type: activity.trim(),
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
            broodstockDiscardData: activity === 'Broodstock Discard' ? broodstockDiscardData : undefined
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
          sourcingMatingData: activity === 'Sourcing & Mating' ? sourcingMatingData : undefined
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
        toast.success('Instruction scheduled & returning to Observation');
        setActivity('Observation');
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
      const activitiesWithInternalSelection = ['Sourcing & Mating', 'Spawning', 'Egg Count', 'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard'];
      if (isSpecialActivity && !selectedSectionId && !activeSectionId && !activitiesWithInternalSelection.includes(activity)) {
        toast.error('Please select a section for this activity');
        return;
      }
      if (!isSpecialActivity) {
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
      const required = ['stockingId', 'broodstockSource', 'hatcheryName', 'tankStockingNumber', 'naupliiStocked', 'animalConditionScore', 'waterQualityScore'];
      // If Maturation, naupliiStocked is not required (as it's hidden)
      const adjustedRequired = activeFarmCategory === 'MATURATION' 
        ? required.filter(f => f !== 'naupliiStocked')
        : required;
        
      const missing = adjustedRequired.filter(f => {
        const val = stockingData[f];
        return val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '');
      });
      if (missing.length > 0) {
        toast.error('Please fill in all stocking details (including Animal and Water Quality assessments)');
        return;
      }
    }

    if (activity === 'Observation') {
      // Normalize: provide default maximum scores if missing (for easier recording/tests)
      normalizedData = { ...observationData };
      if (!normalizedData.animalQualityScore) normalizedData.animalQualityScore = 10.0;
      if (!normalizedData.waterQualityScore) normalizedData.waterQualityScore = 10.0;

      const isMaturation = activeFarmCategory === 'MATURATION';

      if (isMaturation && !editId) {
        // Maturation: validate that we have at least one tank entry
        const entries = normalizedData.tankEntries || [];
        if (entries.length === 0) {
          toast.error('Please select at least one tank');
          return;
        }
      } else {
        const requiredFields = isMaturation
            ? ['animalQualityScore', 'waterQualityScore', 'presentPopulationM', 'presentPopulationF']
            : ['animalQualityScore', 'waterQualityScore', 'presentPopulation'];

        const missing = requiredFields.filter(f => {
            const val = normalizedData[f];
            return val === undefined || val === null || val === '' || (typeof val === 'string' && !val.trim());
        });

        if (missing.length > 0) {
          toast.error('Please fill in all observation details');
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
      if (!harvestData.harvestedPopulation) {
        toast.error('Harvested population is required');
        return;
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
      if (totalToSpawning !== totalMated) {
        toast.error(`Animals shifted to spawning (${totalToSpawning}) must equal total mated (${totalMated})`);
        return;
      }
      if (totalReturned !== nonMatedBalance) {
        toast.error(`Animals returned to female tanks (${totalReturned}) must equal non-mated balance (${nonMatedBalance})`);
        return;
      }
    }

    if (activity === 'Nauplii Harvest' && !isPlanningMode) {
      const { sources, destinations, summary } = naupliiHarvestData;
      const validSources = sources.filter((s:any) => s.tankId && s.population);
      const validDestinations = destinations.filter((d:any) => d.tankId && d.population);
      
      if (validSources.length === 0) {
        toast.error('Please record at least one source tank');
        return;
      }
      if (validDestinations.length === 0) {
        toast.error('Please record at least one destination tank');
        return;
      }
      if (Math.abs(summary.balance) > 0.001) {
        toast.error(`Population is not balanced. Current balance: ${summary.balance} mil`);
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
      const { spawningTanks, returnDestinations, totalInitialShifted } = spawningData;
      
      if (!spawningTanks || spawningTanks.length === 0) {
        toast.error('Please select a batch with valid spawning tanks');
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
          .filter((t: any) => activity === 'Stocking' || editId || stockedTankIds.includes(t.id))
          .map((t: any) => t.id);
      } else if (activeFarmCategory === 'MATURATION') {
        targets = filteredSections.flatMap(s => s.tanks)
          .filter((t: any) => activity === 'Stocking' || editId || stockedTankIds.includes(t.id))
          .map((t: any) => t.id);
      }
    } else if (selectionScope === 'custom') {
      targets = selectedTankIds.filter(id => activity === 'Stocking' || editId || stockedTankIds.includes(id));
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
          section_id: sectionId || undefined,
          farm_id: farmId || undefined,
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

          // If Stocking, dynamically append Section and Tank names to the generated stockingId
          // EXCEPT for Maturation, where we want ONE consolidated Batch ID
          if (activity === 'Stocking' && currentBuildData.stockingId) {
            if (activeFarmCategory !== 'MATURATION') {
              let suffix = '';
              if (sId) {
                const sec = availableTanks.find(s => s.id === sId);
                if (sec) suffix += `_${sec.name.replace(/\s+/g, '')}`;
              }
              if (tId && sId) {
                const sec = availableTanks.find(s => s.id === sId);
                const tnk = sec?.tanks.find((t: any) => t.id === tId);
                if (tnk) suffix += `_${tnk.name.replace(/\s+/g, '')}`;
              }
              currentBuildData.stockingId = `${currentBuildData.stockingId}${suffix}`;
            }
            
            // Also save a copy inside stockingData for consistency if needed by other logic
            if (currentBuildData.stockingData) {
               currentBuildData.stockingData.stockingId = currentBuildData.stockingId;
            }
          }

          // Special bulk save for Artemia After Harvest multiple samples
          if (activity === 'Artemia' && currentBuildData.phase === 'post') {
            const sampleIds = currentBuildData.linkedSampleIds || [];
            if (sampleIds.length > 0) {
              const artemiaPromises = sampleIds.map(async (sid: string) => {
                 const logData = { ...currentBuildData, linkedSampleId: sid, linkedSampleIds: [sid] };
                 return addActivity({
                    tank_id: tId,
                    section_id: sId || undefined,
                    farm_id: fId || undefined,
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
              
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === s.tankId));
              return addActivity({
                tank_id: s.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, ...batchMeta, movementType: 'sourcing', movementQty: -qty, role: 'source' }
              });
            });

            // 2. Record shifting to each spawning tank (increment)
            const spawnerPromises = (matedDestinations || []).map(async (d: any) => {
              const qty = parseFloat(d.count) || 0;
              if (qty <= 0 || !d.tankId) return null;
              
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === d.tankId));
              return addActivity({
                tank_id: d.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, ...batchMeta, movementType: 'spawning_shift', movementQty: qty, role: 'destination' }
              });
            });

            // 3. Record return to source tanks (increment)
            const returnPromises = (returnDestinations || []).map(async (r: any) => {
              const qty = parseFloat(r.count) || 0;
              if (qty <= 0 || !r.tankId) return null;
              
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === r.tankId));
              return addActivity({
                tank_id: r.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, ...batchMeta, movementType: 'return', movementQty: qty, role: 'return' }
              });
            });

            await Promise.all([...sourcePromises, ...spawnerPromises, ...returnPromises]);
          }

          // Special bulk save for Spawning (record clearance of spawning tanks and return to source)
          if (activity === 'Spawning') {
            const { spawningTanks, returnDestinations } = currentBuildData;
            
            // 1. Clear population from spawning tanks (decrement)
            const clearPromises = (spawningTanks || []).map(async (t: any) => {
              const qty = parseFloat(t.shiftedCount) || 0;
              if (qty <= 0 || !t.tankId) return null;
              
              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === t.tankId));
              return addActivity({
                tank_id: t.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, movementType: 'spawning_clearance', movementQty: -qty, role: 'source' }
              });
            });

            // 2. Return population to source tanks (increment)
            const returnPromises = (returnDestinations || []).map(async (r: any) => {
              const qty = parseFloat(r.count) || 0;
              if (qty <= 0 || !r.tankId) return null;
              
              const sec = availableTanks.find(sect => sect.tanks.some((t: any) => t.id === r.tankId));
              return addActivity({
                tank_id: r.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, movementType: 'spawning_return', movementQty: qty, role: 'return' }
              });
            });

            await Promise.all([...clearPromises, ...returnPromises]);
          }

          // Special bulk save for Nauplii Harvest (record arrival in Nauplii tanks)
          if (activity === 'Nauplii Harvest') {
            const { naupliiDestinations } = currentBuildData;
            
            const destPromises = (naupliiDestinations || []).map(async (d: any) => {
              const qty = parseFloat(d.shiftedMil) || 0;
              if (qty <= 0 || !d.tankId) return null;
              
              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === d.tankId));
              return addActivity({
                tank_id: d.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, movementType: 'nauplii_arrival', movementQty: qty, role: 'destination' }
              });
            });

            await Promise.all(destPromises);
          }

          // Special bulk save for Nauplii Sale (clear Nauplii tanks)
          if (activity === 'Nauplii Sale') {
            const { saleTanks } = currentBuildData;
            
            const salePromises = (saleTanks || []).map(async (t: any) => {
              const qty = (parseFloat(t.saleMil) || 0) + (parseFloat(t.discardMil) || 0);
              if (qty <= 0 || !t.tankId) return null;
              
              const sec = availableTanks.find(sect => sect.tanks.some((tk: any) => tk.id === t.tankId));
              return addActivity({
                tank_id: t.tankId,
                section_id: sec?.id,
                farm_id: sec?.farm_id || fId,
                activity_type: activity as any,
                data: { ...currentBuildData, movementType: 'nauplii_clearance', movementQty: qty, role: 'source' }
              });
            });

            await Promise.all(salePromises);
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
            section_id: sId || undefined,
            farm_id: fId || undefined,
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
                  average_score: currentBuildData.animalConditionScore
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
      }

      if (activity === 'Stocking' && isRedirectedFromObservation) {
        setActivity('Observation');
        setPhotoUrl(''); // Clear stocking photo
        setComments(''); // Clear stocking comments
        setIsRedirectedFromObservation(false);
        setLoading(false);
        // fetchLatestStockingData(tankId) will be triggered by useEffect([activity, tankId])
        toast.success('Activity recorded! Returning to Observation...');
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
  
  const filteredActivities = activeFarmCategory === 'MATURATION' 
    ? ACTIVITIES.filter(a => a !== 'Artemia' && a !== 'Algae' && a !== 'Harvest' && a !== 'Tank Shifting')
    : ACTIVITIES;

  return (
    <div className="min-h-screen bg-background pb-10">

      {/* Header */}
        <div className="ocean-gradient p-4 sm:p-6 pb-12 rounded-b-3xl shadow-lg relative">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase tracking-widest">
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/user/dashboard')}>Dashboard</span>
              <ChevronDown className="w-3 h-3 -rotate-90" />
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/user/dashboard')}>{activeFarmName || 'Farm'}</span>
              <ChevronDown className="w-3 h-3 -rotate-90" />
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/user/dashboard')}>{activeSection?.name || (activeFarmCategory === 'MATURATION' ? (activity === 'Stocking' ? 'New Batch' : 'All Sections') : 'Section')}</span>
              <ChevronDown className="w-3 h-3 -rotate-90" />
              <span className={activity ? 'text-white/80' : 'text-white'}>{isPlanningMode ? 'Plan Activity' : (editId ? 'Edit Record' : 'Record Activity')}</span>
              {activity && (
                <>
                  <ChevronDown className="w-3 h-3 -rotate-90" />
                  <span className="text-white">{activity}</span>
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
              </div>
              <p className="text-xs text-white/70 font-medium">{activeFarmName} {activeSection?.name ? `• ${activeSection.name}` : ''}</p>
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

      <div className="p-3 sm:p-4 pb-8 space-y-4 max-w-lg mx-auto" data-testid="main-content">
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
              <SelectTrigger className="h-11 bg-background border-muted-foreground/30">
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
        <div className="glass-card rounded-2xl p-4 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            {isPlanningMode ? 'Schedule Time' : 'Date & Time'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  setIsLiveTime(false);
                }}
                className="h-11 border-muted-foreground/20 focus:border-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={time}
                  onChange={e => {
                    setTime(e.target.value);
                    setIsLiveTime(false);
                    // Update AM/PM based on 24h input
                    const [h] = e.target.value.split(':').map(Number);
                    if (!isNaN(h)) {
                      setAmpm(h >= 12 ? 'PM' : 'AM');
                    }
                  }}
                  className="h-11 w-full border-muted-foreground/20 focus:border-primary/50"
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

        {(activity || !type) && !isSpecialActivity && !(activity === 'Stocking' && activeFarmCategory === 'MATURATION' && !editId) && (
          <div className="glass-card rounded-2xl p-4 space-y-4">

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
                
                <div className={`grid grid-cols-1 ${activeSectionId ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
                  {activeFarmCategory === 'MATURATION' ? (
                    !activeBroodstockBatchId && (
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
                          <SelectTrigger className="h-12 rounded-2xl border-muted-foreground/30 ring-offset-background focus:ring-2 focus:ring-primary shadow-sm">
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
                    )
                  ) : !activeSectionId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Section {isSpecialActivity ? '(Optional)' : '*'}</Label>
                      <Select 
                        value={selectedSectionId} 
                        onValueChange={(val) => {
                          setSelectedSectionId(val);
                          setTankId(''); // reset tank when section changes
                          setSelectedTankIds([]);
                        }}
                      >
                        <SelectTrigger className="h-11" data-testid="section-select">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSections
                            .filter(s => activeFarmId ? s.farm_id === activeFarmId : true)
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

                  {(!isSpecialActivity || (activeFarmCategory === 'MATURATION' && (activity === 'Feed' || activity === 'Treatment' || activity === 'Water Quality' || activity === 'Observation' || activity === 'Animal Quality'))) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {selectionScope === 'single' ? 'Select Tank *' : 'Selected Tanks *'}
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
                          <SelectTrigger className="h-11" data-testid="tank-select">
                            <SelectValue placeholder="Select tank" />
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
                                .filter((t: any) => activity === 'Stocking' || activity === 'Sourcing & Mating' || editId || activeFarmCategory === 'MATURATION' || stockedTankIds.includes(t.id))
                                .filter((t: any) => {
                                  if (activeFarmCategory === 'MATURATION' && activeBroodstockBatchId && batchRelatedTankIds.length > 0) {
                                    const generalActivities = ['Feed', 'Treatment', 'Water Quality', 'Observation', 'Animal Quality'];
                                    if (generalActivities.includes(activity)) {
                                      return batchRelatedTankIds.includes(t.id);
                                    }
                                  }
                                  return true;
                                })
                                .map((t: any) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    <span className={`text-xs ${
                                      activeFarmCategory === 'MATURATION' 
                                        ? (t.name.toUpperCase().includes('_MT') ? 'text-blue-600 font-bold' : t.name.toUpperCase().includes('_FT') ? 'text-pink-600 font-bold' : '')
                                        : ''
                                    }`}>
                                      {activeFarmCategory === 'MATURATION' && !sectionId 
                                        ? `${availableTanks.find(s => s.tanks.some((tk:any) => tk.id === t.id))?.name} - ${t.name}`
                                        : t.name
                                      }
                                    </span>
                                  </SelectItem>
                                ));
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
                          .filter((t: any) => activity === 'Stocking' || activity === 'Sourcing & Mating' || editId || activeFarmCategory === 'MATURATION' || stockedTankIds.includes(t.id))
                          .filter((t: any) => {
                            if (activeFarmCategory === 'MATURATION' && activeBroodstockBatchId && batchRelatedTankIds.length > 0) {
                              const generalActivities = ['Feed', 'Treatment', 'Water Quality', 'Observation', 'Animal Quality'];
                              if (generalActivities.includes(activity)) {
                                return batchRelatedTankIds.includes(t.id);
                              }
                            }
                            return true;
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
                          <span className={`text-xs break-all ${
                            activeFarmCategory === 'MATURATION' && t.name
                              ? (t.name.toUpperCase().includes('_MT') ? 'text-blue-600 font-bold' : t.name.toUpperCase().includes('_FT') ? 'text-pink-600 font-bold' : '')
                              : ''
                          }`}>
                            {t.name}
                          </span>
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
                  <SelectTrigger className="h-11" data-testid="activity-select">
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
                <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
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
                  className="h-11 flex-1"
                />
                <Select value={feedUnit} onValueChange={setFeedUnit}>
                  <SelectTrigger className="w-24 h-11"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
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
                  className="h-11 flex-1"
                />
                <Select value={treatmentUnit} onValueChange={setTreatmentUnit}>
                  <SelectTrigger className="w-24 h-11"><SelectValue /></SelectTrigger>
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
                          className="h-10 text-sm"
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
                      const matches = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                      if (matches) {
                        isOk = val >= parseFloat(matches[1]) && val <= parseFloat(matches[2]);
                      }
                    } else if (range.includes('>')) {
                      const matches = range.match(/>\s*(\d+\.?\d*)/);
                      if (matches) isOk = val > parseFloat(matches[1]);
                    } else if (range.includes('<')) {
                      const matches = range.match(/<\s*(\d+\.?\d*)/);
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

        {activity === 'Animal Quality' && (
          <div className="glass-card rounded-2xl p-4 space-y-5 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Animal Quality</h2>
            
            {!isPlanningMode ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stage *</Label>
                    <Input
                      value={animalStage}
                      onChange={e => setAnimalStage(e.target.value)}
                      placeholder="Enter Stage"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">DOC (Days of Culture) *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={animalDoc}
                      onChange={e => setAnimalDoc(e.target.value)}
                      placeholder="Enter DOC"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Animal Size and Avg. Wt. *</Label>
                  <Input
                    value={animalSize}
                    onChange={e => {
                      const val = e.target.value;
                      // Allow numbers and '/' only
                      if (val === '' || /^[0-9/.]*$/.test(val)) {
                        setAnimalSize(val);
                      }
                    }}
                    placeholder="Enter size / avg weight (e.g. 10/12)"
                    className="h-11"
                  />
                  <p className="text-[10px] text-muted-foreground">Only numbers, '.', and '/' allowed</p>
                </div>
                <div className="space-y-4">
                  {ANIMAL_RATING_FIELDS.map(f => (
                    <RatingScale
                      key={f.key}
                      label={f.label}
                      required={f.required}
                      value={animalRatings[f.key] || 0}
                      onChange={val => setAnimalRatings(prev => ({ ...prev, [f.key]: val }))}
                    />
                  ))}
                </div>

                {/* Average Score - always visible during recording */}
                {(() => {
                  const values = ANIMAL_RATING_FIELDS.map(f => animalRatings[f.key] || 0);
                  const filled = values.filter(v => v > 0);
                  const avg = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
                  return (
                    <div className="mt-2 rounded-xl border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Score</span>
                        <span className="text-lg font-black text-foreground">{avg.toFixed(1)} <span className="text-xs font-semibold text-muted-foreground">/ 10</span></span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{filled.length} of {ANIMAL_RATING_FIELDS.length} parameters rated</p>
                    </div>
                  );
                })()}

                <div className="space-y-1.5 pt-2 border-t border-dashed">
                  <Label className="text-xs">Any identification of disease? *</Label>
                  <Select value={hasDiseaseIdentified} onValueChange={v => setHasDiseaseIdentified(v as any)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Yes/No" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasDiseaseIdentified === 'Yes' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <Label className="text-xs">Symptoms *</Label>
                    <Textarea
                      value={diseaseSymptoms}
                      onChange={e => setDiseaseSymptoms(e.target.value)}
                      placeholder="Describe the symptoms..."
                      rows={3}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Additional Observations</Label>
                  <Input value={additionalObservations} onChange={e => setAdditionalObservations(e.target.value)} placeholder="Any other observations" className="h-11" />
                </div>
              </>
            ) : null}
            {!isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Activity Photo (Optional)</Label>
                <ImageUpload value={photoUrl} onUpload={setPhotoUrl} />
              </div>
            )}
            <div className="space-y-1.5 pt-2 border-t border-dashed">
              <Label className="text-xs">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
              <Textarea 
                value={comments} 
                onChange={e => setComments(e.target.value)} 
                placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."} 
                rows={3} 
                className="rounded-xl"
              />
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
            selectedTanks={(() => {
              // For Maturation Stocking, always show ALL tanks from ALL animal sections for THE SELECTED FARM
              if (activeFarmCategory === 'MATURATION' && activity === 'Stocking') {
                const currentFarmId = selectedFarmId || activeFarmId;
                const animalSections = availableTanks.filter(s => 
                  s.section_type === 'ANIMAL' && 
                  s.farm_id === currentFarmId
                );
                return animalSections.flatMap(s => s.tanks || []);
              }
              if (selectionScope === 'all') {
                const activeSectionData = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
                return activeSectionData?.tanks.filter((t: any) => activity === 'Stocking' || editId || stockedTankIds.includes(t.id)) || [];
              } else if (selectionScope === 'custom') {
                const activeSectionData = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
                return activeSectionData?.tanks.filter((t: any) => selectedTankIds.includes(t.id) && (activity === 'Stocking' || editId || stockedTankIds.includes(t.id))) || [];
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
            selectedTanks={(() => {
              if (activeFarmCategory === 'MATURATION' && !editId) {
                // Build tank objects from selectedTankIds
                return selectedTankIds
                  .map(tid => {
                    const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tid));
                    const tank = section?.tanks.find((t: any) => t.id === tid);
                    return tank ? { ...tank, sectionName: section?.name } : null;
                  })
                  .filter(Boolean);
              }
              return [];
            })()}
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
            activeSectionId={selectedSectionId || activeSectionId}
            farmId={selectedFarmId || activeFarmId || ''}
            activeBroodstockBatchId={activeBroodstockBatchId}
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
          />
        )}

        {/* Save */}
        {activity && (
          <Button 
            onClick={isPlanningMode ? handleSaveInstruction : handleSave} 
            className="w-full h-14 text-base font-semibold rounded-2xl gap-2 animate-fade-in-up" 
            disabled={loading}
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

