import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, ClipboardList, Check, ListChecks, Database, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RatingScale from '@/components/RatingScale';
import StockingForm from '@/components/StockingForm';
import ObservationForm from '@/components/ObservationForm';
import ArtemiaForm from '@/components/ArtemiaForm';
import AlgaeForm from '@/components/AlgaeForm';
import HarvestForm from '@/components/HarvestForm';
import TankShiftingForm from '@/components/TankShiftingForm';
import ImageUpload from '@/components/ImageUpload';
import Breadcrumbs from '@/components/Breadcrumbs';
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
const ACTIVITIES = ['Feed', 'Treatment', 'Water Quality', 'Animal Quality', 'Stocking', 'Observation', 'Artemia', 'Algae', 'Harvest', 'Tank Shifting'] as const;
type ActivityType = typeof ACTIVITIES[number];

const FEED_TYPES = ['Starter Feed', 'Grower Feed', 'Finisher Feed', 'Supplement'];
const FEED_UNITS = ['kg', 'gms', 'L', 'ml'];
const TREATMENT_TYPES = ['Probiotics', 'Antibiotics', 'Mineral Supplement', 'Disinfectant', 'Vitamin'];
const TREATMENT_UNITS = ['ml', 'L', 'gms', 'kg', 'ppm'];

export const ANIMAL_RATING_FIELDS = [
  { key: 'swimmingActivity', label: 'Swimming Activity', required: true },
  { key: 'homogenousStage', label: 'Homogenous Stage', required: true },
  { key: 'hepatopancreas', label: 'Hepatopancreas', required: true },
  { key: 'intestinalContent', label: 'Intestinal Content', required: true },
  { key: 'fecalStrings', label: 'Fecal Strings', required: true },
  { key: 'necrosis', label: 'Necrosis', required: true },
  { key: 'deformities', label: 'Deformities', required: true },
  { key: 'fouling', label: 'Fouling', required: true },
  { key: 'epibionts', label: 'Epibionts', required: true },
  { key: 'muscleGutRatio', label: 'Muscle Gut Ratio', required: true },
  { key: 'size', label: 'Size', required: true },
  { key: 'nextStageConversion', label: 'Time taken for Next Stage Conversion', required: true },
];

export const waterFields = [
  'Salinity', 'pH', 'Dissolved Oxygen', 'Alkalinity', 'Chlorine Content',
  'Iron Content', 'Turbidity', 'Temperature', 'Hardness', 'Ammonia',
  'Nitrate [NO3]', 'Nitrite [NO2]', 'Vibrio Count', 'Yellow Green Bacteria',
  'Luminescence',
];

export const WATER_QUALITY_RANGES: Record<string, string> = {
  'Salinity': '[10 - 35 ppt]',
  'pH': '[7.5 - 8.5]',
  'Dissolved Oxygen': '[> 4.0 ppm]',
  'Alkalinity': '[80 - 200 ppm]',
  'Chlorine Content': '[< 0.1 ppm]',
  'Iron Content': '[< 0.5 ppm]',
  'Turbidity': '[30 - 45 cm]',
  'Temperature': '[26 - 32 degC]',
  'Hardness': '[> 1000 ppm]',
  'Ammonia': '[< 0.1 ppm]',
  'Nitrate [NO3]': '[< 20 ppm]',
  'Nitrite [NO2]': '[< 0.25 ppm]',
  'Vibrio Count': '[< 1x10^3 CFU/mL]',
  'Yellow Green Bacteria': '[< 1x10^2 CFU/mL]',
  'Luminescence': '[Nil]',
};

const RecordActivity = () => {
  const navigate = useNavigate();
  const { user, activeFarmId, activeSectionId, setActiveFarmId, setActiveSectionId } = useAuth();
  const [searchParams] = useSearchParams();
  const { type } = useParams();
  const editId = searchParams.get('edit');
  const instructionIdParam = searchParams.get('instruction');
  const editInstructionId = searchParams.get('editInstruction');
  const modeParam = searchParams.get('mode');
  const { addActivity, updateActivity } = useActivities();

  const [loading, setLoading] = useState(false);
  const [availableTanks, setAvailableTanks] = useState<any[]>([]);
  const [stockedTankIds, setStockedTankIds] = useState<string[]>([]);
  const [dbFeedTypes, setDbFeedTypes] = useState<string[]>(FEED_TYPES);
  const [dbTreatmentTypes, setDbTreatmentTypes] = useState<string[]>(TREATMENT_TYPES);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  const [date, setDate] = useState(getTodayStr());
  const [time, setTime] = useState(formatDate(getNowLocal(), 'HH:mm'));
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(formatDate(getNowLocal(), 'a') as 'AM' | 'PM');
  const [isLiveTime, setIsLiveTime] = useState(!editId); // Auto-update time if not editing
  const [tankId, setTankId] = useState('');
  const [activity, setActivity] = useState<ActivityType | ''>('');
  const [activeInstructions, setActiveInstructions] = useState<any[]>([]);
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);
  const [selectedInstructionData, setSelectedInstructionData] = useState<any | null>(null);
  const [isPlanningMode, setIsPlanningMode] = useState(() => {
    if (editInstructionId) return true;
    if (instructionIdParam) return false;
    if (modeParam === 'instruction') return true;
    if (modeParam === 'activity') return false;
    return false; // Default to false, sync in useEffect
  });

  // Sync isPlanningMode when user/params change
  useEffect(() => {
    if (editInstructionId) {
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

  // Set initial activity from URL parameter
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
        'tank-shifting': 'Tank Shifting'
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

  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<{id: string, name: string}[]>([]);
  const isSpecialActivity = activity === 'Algae' || activity === 'Artemia';

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
    if (!user) return;
    setLoading(true);
    try {
      // Fetch tanks from farms the user has access to
      const { data: accessData, error: accessError } = await supabase
        .from('farm_access')
        .select(`
          farm_id,
          section_id,
          tank_id,
          farms (
            name,
            sections (
              id,
              name,
              tanks (id, name)
            )
          )
        `)
        .eq('user_id', user.id);

      if (accessError) throw accessError;

      // Group tanks by section to avoid flat list & duplicates
      const sectionsMap = new Map<string, any>();

      accessData?.forEach((access: any) => {
        if (!access.farms) return;

        const farm = access.farms;
        const allSections = farm.sections || [];

        allSections.forEach((section: any) => {
          // Rule 1: User has access to the whole Farm
          const hasFarmAccess = !access.section_id && !access.tank_id;
          
          // Rule 2: User has access to this specific Section
          const hasSectionAccess = access.section_id === section.id;
          
          // Rule 3: User has access to specific Tanks in this section
          const accessedTanks = section.tanks?.filter((tank: any) => 
            hasFarmAccess || hasSectionAccess || access.tank_id === tank.id
          );

          if (accessedTanks && accessedTanks.length > 0) {
            const existing = sectionsMap.get(section.id);
            if (existing) {
              // Merge tanks if multiple access records apply (e.g. Tank A and Tank B from same section)
              const tankIds = new Set(existing.tanks.map((t: any) => t.id));
              accessedTanks.forEach((t: any) => {
                if (!tankIds.has(t.id)) {
                  existing.tanks.push(t);
                }
              });
            } else {
              sectionsMap.set(section.id, {
                id: section.id,
                name: section.name,
                farm_name: farm.name,
                farm_id: access.farm_id,
                tanks: accessedTanks
              });
            }
          }
        });
      });

      const finalTanks = Array.from(sectionsMap.values());
      setAvailableTanks(finalTanks);

      // Fetch which of these tanks have an active population
      const allTankIds = finalTanks.flatMap((s: any) => s.tanks.map((t: any) => t.id));
      if (allTankIds.length > 0) {
        const { data: popData, error: popError } = await supabase.rpc('get_active_tank_populations', { p_tank_ids: allTankIds });
        if (!popError && popData) {
           const stockedIds = popData.filter((d: any) => parseFloat(d.current_population) > 0).map((d: any) => d.tank_id);
           setStockedTankIds(stockedIds);
        }
      }
    } catch (err) {
      console.error('Error fetching tanks:', err);
      toast.error('Failed to load tanks');
    } finally {
      setLoading(false);
    }
  };

  // Load Feed and Treatment Types from DB
  useEffect(() => {
    if (user?.hatchery_id) {
      supabase.from('feed_types').select('name').eq('hatchery_id', user.hatchery_id).eq('is_active', true)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setDbFeedTypes(data.map(d => d.name));
          } else {
            setDbFeedTypes(FEED_TYPES);
          }
        });

      supabase.from('treatment_types').select('name').eq('hatchery_id', user.hatchery_id).eq('is_active', true)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setDbTreatmentTypes(data.map(d => d.name));
          } else {
            setDbTreatmentTypes(TREATMENT_TYPES);
          }
        });
    }
  }, [user]);

  // Load available workers for assignment (only in planning mode, scoped to selected farm)
  useEffect(() => {
    const currentFarmId = selectedFarmId || activeFarmId;
    if (isPlanningMode && user?.hatchery_id && currentFarmId) {
      // Query workers who have access to this specific farm via farm_access
      supabase.from('farm_access')
        .select('user_id, profiles!inner(id, full_name, username, role)')
        .eq('farm_id', currentFarmId)
        .then(({ data, error }) => {
          console.log('DEBUG farm_access query:', { currentFarmId, data, error, currentUserId: user?.id });
          if (!error && data) {
            // Deduplicate by user_id, include workers & supervisors, exclude current user
            const seen = new Set<string>();
            const workers: {id: string, name: string}[] = [];
            data.forEach((row: any) => {
              const p = row.profiles;
              console.log('DEBUG row:', { user_id: row.user_id, profile: p, excluded: p?.id === user?.id, roleMatch: p?.role === 'worker' || p?.role === 'supervisor' });
              if (p && !seen.has(p.id) && p.id !== user?.id && (p.role === 'worker' || p.role === 'supervisor')) {
                seen.add(p.id);
                workers.push({ id: p.id, name: p.full_name || p.username });
              }
            });
            console.log('DEBUG filtered workers:', workers);
            setAvailableWorkers(workers);
          } else {
            console.error('DEBUG worker fetch error:', error);
            setAvailableWorkers([]);
          }
        });
    } else if (isPlanningMode && user?.hatchery_id && !currentFarmId) {
      // Fallback: no farm selected yet — show all workers in the hatchery
      supabase.from('profiles')
        .select('id, full_name, username, role')
        .eq('hatchery_id', user.hatchery_id)
        .in('role', ['worker', 'supervisor'])
        .neq('id', user.id)
        .then(({ data, error }) => {
          console.log('DEBUG fallback profiles query:', { data, error });
          if (!error && data) {
            setAvailableWorkers(data.map(p => ({ id: p.id, name: p.full_name || p.username })));
          } else {
            setAvailableWorkers([]);
          }
        });
    } else {
      setAvailableWorkers([]);
    }
  }, [isPlanningMode, user, selectedFarmId, activeFarmId]);

  // Handle instruction link from dashboard
  useEffect(() => {
    if (instructionIdParam && availableTanks.length > 0) {
      handleInitialInstruction(instructionIdParam);
    }
  }, [instructionIdParam, availableTanks]);

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

  // Auto-fetch Stocking data for Observation
  useEffect(() => {
    if (activity === 'Observation' && tankId && !editId) {
      fetchLatestStockingData(tankId);
    }
  }, [activity, tankId]);

  const fetchLatestStockingData = async (tid: string) => {
    try {
      // Clear previous stocking data before fetching new
      setObservationData(prev => ({
        ...prev,
        tankStockingNumber: undefined,
        naupliiStockedMillion: undefined
      }));

      const { data, error } = await supabase
        .from('activity_logs')
        .select('data')
        .eq('tank_id', tid)
        .eq('activity_type', 'Stocking')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.data) {
        setObservationData(prev => ({
          ...prev,
          stockingId: data.data.stockingId,
          broodstockSource: data.data.broodstockSource,
          hatcheryName: data.data.hatcheryName,
          tankStockingNumber: data.data.tankStockingNumber,
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
          population = parseFloat(data.data.tankStockingNumber || '0');
        } else if (data.activity_type === 'Observation') {
          population = parseFloat(data.data.presentPopulation || '0');
        } else if (data.activity_type === 'Harvest') {
          population = parseFloat(data.data.populationAfterHarvest || '0');
        } else if (data.activity_type === 'Tank Shifting') {
           // For tank shifting, we need to know if the current tank was source or destination
           // But since activity_logs is per tank, it's easier: 
           // If it's a 'Tank Shifting' record for THIS tank, it MUST have the final population for this tank.
           if (data.data.sourceTankId === tid) {
               population = parseFloat(data.data.remainingInSource || '0');
           } else {
               // If it's a destination, we need to find the population for this specific tank
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

  // Auto-select activity from URL (if not editing)
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
      };
      if (map[type.toLowerCase()]) {
        setActivity(map[type.toLowerCase()]);
      }
    }
  }, [type, editId]);

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

        const record = {
          hatchery_id: user?.hatchery_id || null,
          farm_id: farmId,
          section_id: sectionId,
          tank_id: tId || null,
          activity_type: activity.trim(), // Sanitize
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
            tankShiftingData: activity === 'Tank Shifting' ? tankShiftingData : undefined
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
          algaeData: activity === 'Algae' ? algaeData : undefined
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

    // Basic validation
    if (selectionScope === 'single' && !tankId) {
      if (isSpecialActivity && !selectedSectionId && !activeSectionId) {
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
      const missing = required.filter(f => {
        const val = stockingData[f];
        return val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '');
      });
      if (missing.length > 0) {
        toast.error('Please fill in all stocking details (including Animal and Water Quality assessments)');
        return;
      }
    }

    if (activity === 'Observation') {
      const required = ['animalQualityScore', 'waterQualityScore', 'presentPopulation'];
      const missing = required.filter(f => !observationData[f] || (typeof observationData[f] === 'string' && !observationData[f].trim()));
      if (missing.length > 0) {
        toast.error('Please fill in all observation details');
        return;
      }
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

    let targets = [];
    if (selectionScope === 'all') {
      const section = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
      if (section) {
        targets = section.tanks
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
            const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tId));
            sId = section?.id || sId;
            fId = section?.farm_id || fId;
          } else if (sId) {
            const section = availableTanks.find(s => s.id === sId);
            fId = section?.farm_id || fId;
          }

          const currentBuildData = buildData();
          
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
          if (activity === 'Stocking' && currentBuildData.stockingId) {
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

        await Promise.all(promises);
        // Show a combined success message
        if (completedInstructionIds.size > 0) {
          toast.success(targets.length > 1
            ? `${targets.length} activities recorded & task marked done!`
            : 'Activity recorded & task marked done!');
        } else {
          toast.success(targets.length > 1 ? `${targets.length} activities recorded!` : 'Activity recorded!');
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

      setTimeout(() => navigate(target), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="ocean-gradient p-4 pb-6 rounded-b-2xl shadow-sm mb-6">
        <Breadcrumbs lightTheme className="mb-2" />
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
          <h1 className="text-lg font-bold text-primary-foreground">
            {editId ? 'Edit Activity' : isPlanningMode ? 'Plan Activity' : 'Record Activity'}
          </h1>
        </div>
 
        {selectedInstructionId && (
          <div className="mx-12 mt-3 bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Instruction Linked & Pending Auto-Complete</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 pb-8 space-y-4 max-w-lg mx-auto">
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
              <Label className="text-xs text-muted-foreground">Date</Label>
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
              <Label className="text-xs text-muted-foreground">Time</Label>
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

        {(activity || !type) && !isSpecialActivity && (


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
                  {!activeSectionId && (
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
                          {availableTanks
                            .filter(s => activeFarmId ? s.farm_id === activeFarmId : true)
                            .map(section => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.farm_name} - {section.name}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!isSpecialActivity && (
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
                          disabled={!selectedSectionId && !activeSectionId}
                        >
                          <SelectTrigger className="h-11" data-testid="tank-select">
                            <SelectValue placeholder="Select tank" />
                          </SelectTrigger>
                          <SelectContent>
                            {(availableTanks.find(s => s.id === (selectedSectionId || activeSectionId))?.tanks || [])
                              .filter((t: any) => activity === 'Stocking' || editId || stockedTankIds.includes(t.id))
                              .map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
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
                {selectionScope === 'custom' && (selectedSectionId || activeSectionId) && (
                  <div className="pt-2 border-t border-dashed animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] uppercase text-muted-foreground mb-2 block">Select Tanks for this Activity</Label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                      {(availableTanks.find(s => s.id === (selectedSectionId || activeSectionId))?.tanks || [])
                        .filter((t: any) => activity === 'Stocking' || editId || stockedTankIds.includes(t.id))
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
                          <span className="text-xs truncate">{t.name}</span>
                        </div>
                      ))}
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
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
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
            {isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Instructions</Label>
                <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Add instructions for the worker..." rows={3} />
              </div>
            )}
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
            sourceTankId={tankId}
            stockedTankIds={stockedTankIds}
            fetchLatestPopulation={fetchLatestPopulation}
          />
        )}

        {/* Save */}
        {activity && (
          <Button 
            onClick={isPlanningMode ? handleSaveInstruction : handleSave} 
            className="w-full h-14 text-base font-semibold rounded-2xl gap-2 animate-fade-in-up" 
            disabled={loading}
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

