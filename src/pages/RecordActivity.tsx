import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, ClipboardList, Check, ListChecks, Database } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RatingScale from '@/components/RatingScale';
import StockingForm from '@/components/StockingForm';
import ObservationForm from '@/components/ObservationForm';
import ArtemiaForm from '@/components/ArtemiaForm';
import AlgaeForm from '@/components/AlgaeForm';
import ImageUpload from '@/components/ImageUpload';
import Breadcrumbs from '@/components/Breadcrumbs';
import { toast } from 'sonner';
import { formatDate, getNowLocal, getTodayStr } from '@/lib/date-utils';
import { useActivities } from '@/hooks/useActivities';

const TANKS = ['T1', 'T2', 'T3', 'T4'];
const ACTIVITIES = ['Feed', 'Treatment', 'Water Quality', 'Animal Quality', 'Stocking', 'Observation', 'Artemia', 'Algae'] as const;
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
  const { user, activeFarmId, activeSectionId } = useAuth();
  const [searchParams] = useSearchParams();
  const { type } = useParams();
  const editId = searchParams.get('edit');
  const instructionIdParam = searchParams.get('instruction');
  const editInstructionId = searchParams.get('editInstruction');
  const { addActivity, updateActivity } = useActivities();

  const [loading, setLoading] = useState(false);
  const [availableTanks, setAvailableTanks] = useState<any[]>([]);
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
  const [isPlanningMode, setIsPlanningMode] = useState(user?.role === 'supervisor');
  const [selectionScope, setSelectionScope] = useState<'single' | 'all' | 'custom'>('single');
  const [selectedTankIds, setSelectedTankIds] = useState<string[]>([]);

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

      setAvailableTanks(Array.from(sectionsMap.values()));
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
        if (data.farm_id) setSelectedFarmId(data.farm_id);
        if (data.section_id) setSelectedSectionId(data.section_id);
        if (data.tank_id) {
          setSelectionScope('single');
          setTankId(data.tank_id);
        } else if (data.section_id) {
          setSelectionScope('all');
        }

        setSelectedInstructionId(data.id);
        setSelectedInstructionData(data); // Store the data directly
        applyInstruction(data);
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
        if (data.farm_id) setSelectedFarmId(data.farm_id);
        if (data.section_id) setSelectedSectionId(data.section_id);
        if (data.tank_id) { setSelectionScope('single'); setTankId(data.tank_id); }
        else if (data.section_id) { setSelectionScope('all'); }
        const pd = data.planned_data || {};
        const actType = data.activity_type as ActivityType;
        setActivity(actType);
        if (actType === 'Feed') { setFeedType(pd.item || ''); setFeedQty(pd.amount || ''); setFeedUnit(pd.unit || 'gms'); }
        if (actType === 'Treatment') { setTreatmentType(pd.item || ''); setTreatmentDosage(pd.amount || ''); setTreatmentUnit(pd.unit || 'ml'); }
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
    if (sectionId && activity && date && !editId) {
      checkForInstructions();
    } else {
      setActiveInstructions([]);
    }
  }, [tankId, selectedSectionId, activeSectionId, activity, date]);

  const checkForInstructions = async () => {
    try {
      const sectionId = selectedSectionId || activeSectionId;
      if (!sectionId) return;

      const currentSection = availableTanks.find(s => s.id === sectionId);
      if (!currentSection) return;

      // Fetch all instructions for this section or the whole farm
      const { data, error } = await supabase
        .from('activity_charts')
        .select('*')
        .or(`section_id.eq.${sectionId},and(farm_id.eq.${currentSection.farm_id},section_id.is.null,tank_id.is.null),tank_id.in.(${currentSection.tanks.map((t: any) => `"${t.id}"`).join(',')})`)
        .eq('activity_type', activity)
        .eq('scheduled_date', date)
        .eq('is_completed', false)
        .order('scheduled_time', { ascending: true });

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
    const { planned_data, tank_id: instrTankId } = instruction;
    
    // If the instruction is for a specific tank and we're in single mode, ensure it matches or set it
    if (selectionScope === 'single' && instrTankId && tankId !== instrTankId) {
      setTankId(instrTankId);
    }

    if (activity === 'Feed') {
      setFeedType(planned_data.item);
      setFeedQty(planned_data.amount);
      setFeedUnit(planned_data.unit);
    } else if (activity === 'Treatment') {
      setTreatmentType(planned_data.item);
      setTreatmentDosage(planned_data.amount);
      setTreatmentUnit(planned_data.unit);
    }
    
    if (planned_data.instructions) {
      setComments(prev => prev ? `${prev}\nNote: ${planned_data.instructions}` : `Note: ${planned_data.instructions}`);
    }
    
    setSelectedInstructionId(instruction.id);
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
          setAnimalRatings(data.data.animalRatings || {});
          setDiseaseSymptoms(data.data.diseaseSymptoms || '');
          setAdditionalObservations(data.data.additionalObservations || data.data.otherAnimal || '');
        } else if (actType === 'Stocking') {
          setStockingData(data.data);
        } else if (actType === 'Observation') {
          setObservationData(data.data);
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
          tankStockingNumber: data.data.tankStockingNumber,
          naupliiStockedMillion: data.data.naupliiStocked || data.data.naupliiStockedMillion
        }));
      }
    } catch (err) {
      console.error('Error fetching stocking data:', err);
    }
  };

  // Auto-select activity from URL (if not editing)
  useEffect(() => {
    if (type && !editId) {
      const map: Record<string, ActivityType> = {
        'feed': 'Feed',
        'treatment': 'Treatment',
        'water': 'Water Quality',
        'animal': 'Animal Quality',
        'stocking': 'Stocking',
        'observation': 'Observation',
        'artemia': 'Artemia',
        'algae': 'Algae',
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
  const [algaeData, setAlgaeData] = useState<any>({});

  const [comments, setComments] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isRedirectedFromObservation, setIsRedirectedFromObservation] = useState(false);

  const buildData = (): Record<string, any> => {
    const baseData = { date, time, ampm, comments, photo_url: photoUrl };
    switch (activity) {
      case 'Feed': return { ...baseData, feedType, feedQty, feedUnit };
      case 'Treatment': return { ...baseData, treatmentType, treatmentDosage, treatmentUnit };
      case 'Water Quality': return { ...baseData, waterData };
      case 'Animal Quality': return { ...baseData, animalSize, animalRatings, hasDiseaseIdentified, diseaseSymptoms, additionalObservations };
      case 'Stocking': return { ...baseData, ...stockingData, photo_url: photoUrl };
      case 'Observation': return { ...baseData, ...observationData, photo_url: photoUrl };
      case 'Artemia': return { ...baseData, ...artemiaData, photo_url: photoUrl };
      case 'Algae': return { ...baseData, ...algaeData };
      default: return baseData;
    }
  };

  const handleSaveInstruction = async () => {
    if (!activity) {
      toast.error('Please select an activity');
      return;
    }

    let targets = [];
    if (selectionScope === 'all') {
      const section = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
      if (section) targets = section.tanks.map((t: any) => t.id);
    } else if (selectionScope === 'custom') {
      targets = selectedTankIds;
    } else {
      targets = [tankId];
    }

    if (targets.length === 0) {
      toast.error('Please select at least one tank');
      return;
    }

    try {
      setLoading(true);
      const records = targets.map(tId => {
        let farmId = '';
        let sectionId = '';
        const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tId));
        if (section) {
          sectionId = section.id;
          farmId = section.farm_id;
        }

        return {
          hatchery_id: user?.hatchery_id,
          farm_id: farmId,
          section_id: sectionId,
          tank_id: tId,
          activity_type: activity,
          scheduled_date: date,
          scheduled_time: time,
          planned_data: {
            item: activity === 'Feed' ? feedType : (activity === 'Treatment' ? treatmentType : 'Instruction'),
            amount: activity === 'Feed' ? feedQty : (activity === 'Treatment' ? treatmentDosage : ''),
            unit: activity === 'Feed' ? feedUnit : (activity === 'Treatment' ? treatmentUnit : ''),
            instructions: comments
          },
          created_by: user?.id,
          is_completed: false
        };
      });

      if (editInstructionId) {
        // UPDATE existing instruction
        const plannedData = {
          item: activity === 'Feed' ? feedType : (activity === 'Treatment' ? treatmentType : 'Instruction'),
          amount: activity === 'Feed' ? feedQty : (activity === 'Treatment' ? treatmentDosage : ''),
          unit: activity === 'Feed' ? feedUnit : (activity === 'Treatment' ? treatmentUnit : ''),
          instructions: comments
        };
        const { error } = await supabase
          .from('activity_charts')
          .update({ planned_data: plannedData, scheduled_time: time, scheduled_date: date })
          .eq('id', editInstructionId);
        if (error) throw error;
        toast.success('Instruction updated!');
      } else {
        // INSERT new instructions
        const { error } = await supabase.from('activity_charts').insert(records);
        if (error) throw error;
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
      toast.error('Please select a tank');
      return;
    }
    if (!activity) {
      toast.error('Please select an activity');
      return;
    }

    if (!photoUrl && !isPlanningMode) {
      toast.error('Activity photo is required');
      return;
    }

    if (activity === 'Feed' && (!feedQty.trim() || !feedType.trim())) {
      toast.error('Feed Type and Quantity are required');
      return;
    }

    if (activity === 'Treatment' && (!treatmentType.trim() || !treatmentDosage.trim())) {
      toast.error('Treatment Type and Dosage are required');
      return;
    }

    if (activity === 'Stocking') {
      const required = ['broodstockSource', 'hatcheryName', 'tankStockingNumber', 'naupliiStocked', 'animalConditionScore', 'waterQualityScore'];
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

    let targets = [];
    if (selectionScope === 'all') {
      const section = availableTanks.find(s => s.id === (selectedSectionId || activeSectionId));
      if (section) targets = section.tanks.map((t: any) => t.id);
    } else if (selectionScope === 'custom') {
      targets = selectedTankIds;
    } else {
      targets = [tankId];
    }

    if (targets.length === 0) {
      toast.error('Please select at least one tank');
      return;
    }

    try {
      setLoading(true);
      
      if (editId) {
        let farmId = selectedFarmId;
        let sectionId = selectedSectionId;
        const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tankId));
        if (section) {
          sectionId = section.id;
          farmId = section.farm_id;
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
          const section = availableTanks.find(s => s.tanks.some((t: any) => t.id === tId));
          const sectionId = section?.id;
          const farmId = section?.farm_id;

          const currentBuildData = buildData();
          
          // Variance Tracking & Auto-matching
          // Find if this specific tank matches an instruction
          // 1. Prioritize explicitly selected instruction data
          // 2. Fall back to auto-matching against any active instruction for this tank/section
          const matchingInstruction = (selectedInstructionData && (selectedInstructionData.tank_id === tId || (!selectedInstructionData.tank_id && selectedInstructionData.section_id === sectionId))) 
            ? selectedInstructionData
            : activeInstructions.find(i => 
                (i.tank_id === tId || (!i.tank_id && i.section_id === sectionId))
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

          const logId = await addActivity({
            tank_id: tId,
            section_id: sectionId || undefined,
            farm_id: farmId || undefined,
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
                  farm_id: farmId,
                  section_id: sectionId,
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
                  farm_id: farmId,
                  section_id: sectionId,
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
                  farm_id: farmId,
                  section_id: sectionId,
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
                  farm_id: farmId,
                  section_id: sectionId,
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

        {user?.role === 'supervisor' && !editId && (
          <div className="flex bg-white/10 p-1 rounded-xl mt-4 max-w-[280px]">
            <button
              onClick={() => setIsPlanningMode(true)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${isPlanningMode ? 'bg-white text-primary shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              Setup Instruction
            </button>
            <button
              onClick={() => setIsPlanningMode(false)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!isPlanningMode ? 'bg-white text-primary shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              Record Activity
            </button>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 pb-8 space-y-4 max-w-lg mx-auto">
        {/* Date / Time */}
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
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
                className="h-11"
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
                  className="h-11 w-full"
                />
              </div>
            </div>
          </div>
        </div>        {/* Tank & Activity */}
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {type ? 'Location & Scope' : 'Location & Activity'}
            </h2>
            
            {!editId && (
              <Tabs value={selectionScope} onValueChange={(val: any) => setSelectionScope(val)} className="h-8">
                <TabsList className="bg-muted/50 h-8 p-0.5">
                  <TabsTrigger value="single" className="text-[10px] px-2 h-7">Single</TabsTrigger>
                  <TabsTrigger value="all" className="text-[10px] px-2 h-7 text-xs">All Tanks</TabsTrigger>
                  <TabsTrigger value="custom" className="text-[10px] px-2 h-7">Custom</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Section *</Label>
              {activeSectionId ? (
                <div className="h-11 flex items-center px-4 bg-muted/50 rounded-lg border border-input text-sm font-medium">
                  {availableTanks.find(s => s.id === activeSectionId)?.name || 'Loading...'}
                </div>
              ) : (
                <Select 
                  value={selectedSectionId} 
                  onValueChange={(val) => {
                    setSelectedSectionId(val);
                    setTankId(''); // reset tank when section changes
                    setSelectedTankIds([]);
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTanks
                      .filter(s => activeFarmId ? s.farm_id === activeFarmId : true)
                      .map(section => (
                        <SelectItem key={section.id} value={section.id}>
                          {user?.role === 'owner' && !activeFarmId ? `${section.farm_name} - ${section.name}` : section.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              )}
            </div>

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
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose tank" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableTanks.find(s => s.id === (selectedSectionId || activeSectionId))?.tanks || []).map((t: any) => (
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
          </div>

          {/* Custom Selection List */}
          {selectionScope === 'custom' && (selectedSectionId || activeSectionId) && (
            <div className="pt-2 border-t border-dashed animate-in fade-in slide-in-from-top-2">
              <Label className="text-[10px] uppercase text-muted-foreground mb-2 block">Select Tanks for this Activity</Label>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                {(availableTanks.find(s => s.id === (selectedSectionId || activeSectionId))?.tanks || []).map((t: any) => (
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

          {!type && (
            <div className="space-y-1.5">
              <Label className="text-xs">Activity Type *</Label>
              <Select
                value={activity}
                onValueChange={v => setActivity(v as ActivityType)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose activity" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Supervisor Instruction Banners */}
        {activeInstructions.length > 0 && (
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
                <Label className="text-xs">Activity Photo *</Label>
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
                <Label className="text-xs">Activity Photo *</Label>
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

            {/* Overall Quality Score - always visible */}
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
            {!isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Activity Photo *</Label>
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

            {/* Average Score - always visible */}
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
            {!isPlanningMode && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs">Activity Photo *</Label>
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
          />
        )}

        {activity === 'Algae' && (
          <AlgaeForm
            data={algaeData}
            onDataChange={setAlgaeData}
            comments={comments}
            onCommentsChange={setComments}
            isPlanningMode={isPlanningMode}
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

