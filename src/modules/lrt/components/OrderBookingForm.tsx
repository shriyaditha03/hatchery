import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, Info, Users, IndianRupee, Activity, CheckCircle, ShoppingCart, LocateFixed, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPicker } from '@/modules/shared/components/MapPicker';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ImageUpload from '@/modules/shared/components/ImageUpload';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

const DatePicker = ({ value, onChange, className, placeholder = 'dd/mm/yyyy' }: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const dateVal = (() => {
    if (!value) return undefined;
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : undefined;
  })();
  
  const displayValue = dateVal && isValid(dateVal) ? format(dateVal, 'dd/MM/yyyy') : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 w-full justify-start text-left font-normal border-slate-200 rounded-xl px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4.5 w-4.5 text-slate-400 shrink-0" />
          <span className="truncate">{displayValue || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-xl" align="start">
        <Calendar
          mode="single"
          selected={dateVal}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, 'yyyy-MM-dd'));
            } else {
              onChange('');
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

interface OrderBookingFormProps {
  data: any;
  onDataChange: (val: any) => void;
  comments: string;
  onCommentsChange: (val: string) => void;
  availableTanks?: any[];
  availableBatches?: string[];
  isPlanningMode?: boolean;
  date?: string;
  isEditMode?: boolean;
}

const PACKING_TYPES = ['Tank Packing', 'Bubble packing'];
const TRANSPORTATION_OPTIONS = ['Owner', 'Hatchery'];
const STATUS_OPTIONS = ['Confirmed', 'Pending', 'Reschedule', 'Cancelled'];
const LARVAL_STAGES = ['Nauplii', 'Zoea', 'Mysis', 'PL', 'PL10', 'PL12', 'PL15', 'Others'];

const SPECIES_OPTIONS = ['Litopenaeus vannamei', 'Penaeus monodon', 'Others'];

const GENETIC_LINES_BY_SPECIES: Record<string, string[]> = {
  'Litopenaeus vannamei': ['SIS Hardy Line', 'SIS Growth Line', 'Syaqua', 'KonaBay', 'Others'],
  'Penaeus monodon': ['Moana', 'Unibio', 'Others'],
  'Others': ['Others'],
};

const getGeneticLines = (species: string): string[] =>
  GENETIC_LINES_BY_SPECIES[species] ?? ['SIS Hardy Line', 'SIS Growth Line', 'Syaqua', 'KonaBay', 'Others'];

const encodePlusCode = (latitude: number, longitude: number): string => {
  const ALPHABET = "23456789CFGHJMPQRVWX";
  let lat = latitude;
  let lng = longitude;
  if (lat > 90) lat = 90;
  if (lat < -90) lat = -90;
  while (lng < -180) lng += 360;
  while (lng >= 180) lng -= 360;
  
  let latVal = lat + 90;
  let lngVal = lng + 180;
  
  let code = "";
  
  let digitLat = Math.floor(latVal / 20);
  let digitLng = Math.floor(lngVal / 20);
  code += ALPHABET[digitLat] + ALPHABET[digitLng];
  latVal = (latVal % 20) * 20;
  lngVal = (lngVal % 20) * 20;
  
  digitLat = Math.floor(latVal / 20);
  digitLng = Math.floor(lngVal / 20);
  code += ALPHABET[digitLat] + ALPHABET[digitLng];
  latVal = (latVal % 20) * 20;
  lngVal = (lngVal % 20) * 20;
  
  digitLat = Math.floor(latVal / 20);
  digitLng = Math.floor(lngVal / 20);
  code += ALPHABET[digitLat] + ALPHABET[digitLng];
  latVal = (latVal % 20) * 20;
  lngVal = (lngVal % 20) * 20;
  
  digitLat = Math.floor(latVal / 20);
  digitLng = Math.floor(lngVal / 20);
  code += ALPHABET[digitLat] + ALPHABET[digitLng];
  latVal = (latVal % 20) * 20;
  lngVal = (lngVal % 20) * 20;
  
  code = code.slice(0, 8) + "+" + code.slice(8);
  
  digitLat = Math.floor(latVal / 20);
  digitLng = Math.floor(lngVal / 20);
  code += ALPHABET[digitLat] + ALPHABET[digitLng];
  
  return code;
};

export const OrderBookingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  availableTanks = [],
  availableBatches = [],
  isPlanningMode = false,
  date = '',
  isEditMode = false
}: OrderBookingFormProps) => {
  const [isUserEdited, setIsUserEdited] = useState(isEditMode || !!data.bookingId);
  const [mapOpen, setMapOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setIsUserEdited(true);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (data.bookingId && !isUserEdited) {
      setIsUserEdited(true);
    }
  }, [data.bookingId]);

  useEffect(() => {
    const fetchNextBookingId = async () => {
      if (isUserEdited) return;
      if (!date) return;
      
      try {
        const { data: bookings, error } = await supabase
          .from('activity_charts')
          .select('planned_data')
          .eq('activity_type', 'Order Booking')
          .eq('scheduled_date', date);
          
        if (error) {
          console.error('Error fetching bookings:', error);
          return;
        }

        const count = bookings ? bookings.length : 0;
        const serial = count + 1;
        const formattedSerial = String(serial).padStart(2, '0');
        
        const dateParts = date.split('-'); // [YYYY, MM, DD]
        if (dateParts.length === 3) {
          const yyyy = dateParts[0];
          const mm = dateParts[1];
          const dd = dateParts[2];
          const yy = yyyy.slice(-2);
          const generatedId = `BK_${dd}${mm}${yy}_${formattedSerial}`;
          
          if (data.bookingId !== generatedId) {
            onDataChange((prev: any) => ({
              ...prev,
              bookingId: generatedId
            }));
          }
        }
      } catch (err) {
        console.error('Error generating Booking ID:', err);
      }
    };

    fetchNextBookingId();
  }, [date, isUserEdited]);

  const handleLocationSelect = useCallback(async (lat: number, lng: number, providedAddress?: string) => {
    const plusCode = encodePlusCode(lat, lng);
    onDataChange((prev: any) => ({
      ...prev,
      plusCode: plusCode,
      latitude: lat,
      longitude: lng,
      farmLocation: providedAddress || prev.farmLocation || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
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
        const rawDisplayName = data.display_name || '';
        const newFullAddress = providedAddress || rawDisplayName;

        const isCoordsOnly = /^Lat:.*Lng:/.test(newFullAddress);
        let constructedAddress = newFullAddress;

        if (isCoordsOnly || (rawDisplayName.length < 20 && !rawDisplayName.includes(','))) {
          constructedAddress = [plotNo, street, areaName, addr.city || addr.town || addr.village, addr.state, addr.postcode]
            .filter(Boolean)
            .join(', ');
        }

        onDataChange((prev: any) => ({
          ...prev,
          farmLocation: constructedAddress || prev.farmLocation
        }));
      }
    } catch (error) {
      console.error("Failed to fetch address:", error);
    } finally {
      setAddressLoading(false);
    }
  }, [onDataChange]);

  const handlePlotAreaSelect = useCallback((area: number, length: number, width: number) => {
    onDataChange((prev: any) => ({
      ...prev,
      plotArea: Math.round(area * 100) / 100,
      plotLength: Math.round(length * 100) / 100,
      plotWidth: Math.round(width * 100) / 100
    }));
    toast.info(`Plot area detected: ${area.toFixed(2)} sqm`);
  }, [onDataChange]);

  // Pricing calculations and default lists initiation
  const netQtyVal = parseFloat(data.netQty || '0');
  const unitPriceVal = parseFloat(data.unitPriceAgreed || '0');
  const advanceVal = parseFloat(data.advanceReceived || '0');

  useEffect(() => {
    const totalAmount = netQtyVal * unitPriceVal;
    const balanceDue = totalAmount - advanceVal;

    const rawNumBatches = parseInt(data.numBatches);
    const isValidNum = !isNaN(rawNumBatches) && rawNumBatches >= 1;
    const numBatches = isValidNum ? rawNumBatches : (data.batches?.length || 1);
    const currentBatches = data.batches || [];

    let updatedBatches = [...currentBatches];
    if (updatedBatches.length < numBatches) {
      for (let i = updatedBatches.length; i < numBatches; i++) {
        updatedBatches.push({
          species: '',
          geneticLine: '',
          seedQuantityUnit: 'Million',
          seedQuantityGross: '',
          salinity: '',
          deliveryDate1: '',
          deliveryDate2: '',
          packingType: 'Tank Packing',
          transportationOrganiser: 'Owner'
        });
      }
    } else if (updatedBatches.length > numBatches) {
      updatedBatches = updatedBatches.slice(0, numBatches);
    }

    const needsUpdate =
      data.totalAmount !== parseFloat(totalAmount.toFixed(2)) ||
      data.balanceDue !== parseFloat(balanceDue.toFixed(2)) ||
      data.numBatches === undefined ||
      data.batches?.length !== numBatches;

    if (needsUpdate) {
      onDataChange({
        ...data,
        numBatches: data.numBatches === undefined ? '1' : data.numBatches,
        batches: updatedBatches,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        balanceDue: parseFloat(balanceDue.toFixed(2)),
        allocatedTanks: data.allocatedTanks || []
      });
    }
  }, [
    data.netQty,
    data.unitPriceAgreed,
    data.advanceReceived,
    data.numBatches,
    data.batches
  ]);

  const handleChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value });
  };

  const handleBatchChange = (index: number, field: string, value: any) => {
    const updated = (data.batches || []).map((b: any, idx: number) =>
      idx === index ? { ...b, [field]: value } : b
    );
    handleChange('batches', updated);
  };

  // Tank allocations list helpers
  const handleAddTank = () => {
    const current = data.allocatedTanks || [];
    handleChange('allocatedTanks', [
      ...current,
      { allocatedStockingId: '', tankId: '', presentLarvalStage: 'Nauplii', grossExpected: '', larvalStagePacking: 'PL' }
    ]);
  };

  const handleRemoveTank = (index: number) => {
    const current = data.allocatedTanks || [];
    handleChange('allocatedTanks', current.filter((_: any, idx: number) => idx !== index));
  };

  const handleTankChange = (index: number, field: string, value: any) => {
    const current = data.allocatedTanks || [];
    const updated = current.map((t: any, idx: number) =>
      idx === index ? { ...t, [field]: value } : t
    );
    handleChange('allocatedTanks', updated);
  };

  const flatTanks = availableTanks
    ? availableTanks.flatMap((sec: any) =>
        (sec.tanks || []).map((t: any) => ({
          id: t.id,
          name: `${sec.name} - ${t.name}`,
          rawName: t.name
        }))
      )
    : [];

  const batches = data.batches || [];
  const allocatedTanks = data.allocatedTanks || [];

  return (
    <div className="space-y-6">
      
      {/* 1. Customer & General details */}
      <div className="glass-card rounded-2xl p-5 border space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Customer details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Customer Name *</Label>
            <Input
              type="text"
              value={data.customerName || ''}
              onChange={e => handleChange('customerName', e.target.value)}
              placeholder="Enter customer name"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Booking ID *</Label>
            <Input
              type="text"
              value={data.bookingId || ''}
              onChange={e => {
                setIsUserEdited(true);
                handleChange('bookingId', e.target.value);
              }}
              placeholder="e.g. BK-1002"
              className="h-11 border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Phone Number *</Label>
            <Input
              type="text"
              value={data.phoneNumber || ''}
              onChange={e => {
                const numeric = e.target.value.replace(/\D/g, '');
                handleChange('phoneNumber', numeric.slice(0, 10));
              }}
              placeholder="Enter 10-digit phone number"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-700">WhatsApp Number *</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="same-as-phone"
                  checked={!!data.phoneNumber && data.whatsappNumber === data.phoneNumber}
                  onChange={e => {
                    if (e.target.checked) {
                      handleChange('whatsappNumber', data.phoneNumber || '');
                    } else {
                      handleChange('whatsappNumber', '');
                    }
                  }}
                  disabled={!data.phoneNumber}
                  className="w-3.5 h-3.5 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="same-as-phone" className="text-[10px] text-slate-500 font-bold cursor-pointer select-none">
                  Same as Phone
                </label>
              </div>
            </div>
            <Input
              type="text"
              value={data.whatsappNumber || ''}
              onChange={e => {
                const numeric = e.target.value.replace(/\D/g, '');
                handleChange('whatsappNumber', numeric.slice(0, 10));
              }}
              placeholder="Enter 10-digit WhatsApp number"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Alternate Contact <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input
              type="text"
              value={data.alternateContact || ''}
              onChange={e => handleChange('alternateContact', e.target.value)}
              placeholder="e.g. Raj (9876543210)"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-dashed">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">Farm Location / Address *</Label>
              <Dialog open={mapOpen} onOpenChange={setMapOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded-xl text-[10px] uppercase font-bold">
                    <LocateFixed className="w-3.5 h-3.5" /> Pick on Map
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-none shadow-2xl">
                  <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                      <LocateFixed className="w-6 h-6 text-primary" />
                      Select Farm Location
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 min-h-0 relative bg-slate-50 border-y border-slate-100">
                    <MapPicker
                      onLocationSelect={handleLocationSelect}
                      onPlotAreaSelect={handlePlotAreaSelect}
                    />
                  </div>
                  <div className="p-4 bg-card flex justify-end gap-3">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setMapOpen(false)}>Cancel</Button>
                    <Button type="button" className="px-8 shadow-lg shadow-primary/20 rounded-xl" onClick={() => setMapOpen(false)}>Confirm Location</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Textarea
              value={data.farmLocation || ''}
              onChange={e => handleChange('farmLocation', e.target.value)}
              placeholder={addressLoading ? "Fetching address..." : "Complete address with landmark, city, etc."}
              rows={2}
              className="rounded-xl border-slate-200 resize-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Plus Code (e.g. 8FVC9G8F+VX) <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input
              type="text"
              value={data.plusCode || ''}
              onChange={e => handleChange('plusCode', e.target.value)}
              placeholder="e.g. 8FVC9G8F+VX"
              className="h-11 border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/20 p-3 rounded-xl border border-dashed md:col-span-2 animate-in fade-in slide-in-from-top-1">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-700">Plot Area (m²)</Label>
              <Input
                type="number"
                value={data.plotArea || ''}
                onChange={e => handleChange('plotArea', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm bg-background border-slate-200 font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-700">Length (m)</Label>
              <Input
                type="number"
                value={data.plotLength || ''}
                onChange={e => handleChange('plotLength', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm bg-background border-slate-200 font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-700">Width (m)</Label>
              <Input
                type="number"
                value={data.plotWidth || ''}
                onChange={e => handleChange('plotWidth', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm bg-background border-slate-200 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Number of Batches Required *</Label>
            <Input
              type="number"
              min="1"
              value={data.numBatches === undefined ? '1' : data.numBatches}
              onChange={e => handleChange('numBatches', e.target.value)}
              className="h-11 border-slate-200 rounded-xl font-bold"
            />
          </div>
        </div>
      </div>

      {/* 2. Batch specifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Batch Specifications</h3>
        </div>

        {batches.map((batch: any, index: number) => (
          <div key={index} className="glass-card rounded-2xl p-5 border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
              <span className="text-xs font-black text-primary uppercase tracking-widest">
                Batch #{index + 1} Specifications
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Species *</Label>
                <Select
                  value={batch.species || ''}
                  onValueChange={val => {
                    // Reset genetic line when species changes
                    const updated = (data.batches || []).map((b: any, idx: number) =>
                      idx === index ? { ...b, species: val, geneticLine: '' } : b
                    );
                    handleChange('batches', updated);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {SPECIES_OPTIONS.map(sp => (
                      <SelectItem key={sp} value={sp} className="rounded-lg italic">{sp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Genetic Line Required *</Label>
                <Select
                  value={batch.geneticLine || ''}
                  onValueChange={val => handleBatchChange(index, 'geneticLine', val)}
                  disabled={!batch.species}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder={batch.species ? 'Select genetic line' : 'Select species first'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {getGeneticLines(batch.species || '').map(line => (
                      <SelectItem key={line} value={line} className="rounded-lg">{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Seed Quantity Required *</Label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={batch.seedQuantityGross || ''}
                    onChange={e => handleBatchChange(index, 'seedQuantityGross', e.target.value)}
                    placeholder="Quantity"
                    className="flex-grow flex-1 min-w-0 w-full h-11 border-none shadow-none focus-visible:ring-0 px-3"
                  />
                  <select
                    value={batch.seedQuantityUnit || 'Million'}
                    onChange={e => handleBatchChange(index, 'seedQuantityUnit', e.target.value)}
                    className="h-11 border-none bg-slate-100 text-xs font-bold px-3 cursor-pointer focus:outline-none w-24 shrink-0"
                  >
                    <option value="Lakhs">Lakhs</option>
                    <option value="Million">Million</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Salinity Required (ppt) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={batch.salinity || ''}
                  onChange={e => handleBatchChange(index, 'salinity', e.target.value)}
                  placeholder="e.g. 30"
                  className="h-11 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Type of Packing *</Label>
                <Select
                  value={batch.packingType || 'Tank Packing'}
                  onValueChange={val => handleBatchChange(index, 'packingType', val)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {PACKING_TYPES.map(opt => (
                      <SelectItem key={opt} value={opt} className="rounded-lg">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Delivery Between *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker
                    value={batch.deliveryDate1 || ''}
                    onChange={val => handleBatchChange(index, 'deliveryDate1', val)}
                  />
                  <DatePicker
                    value={batch.deliveryDate2 || ''}
                    onChange={val => handleBatchChange(index, 'deliveryDate2', val)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Transportation to be Organised by *</Label>
                <Select
                  value={batch.transportationOrganiser || 'Owner'}
                  onValueChange={val => handleBatchChange(index, 'transportationOrganiser', val)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {TRANSPORTATION_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt} className="rounded-lg">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Order Status & Allocation details */}
      <div className="glass-card rounded-2xl p-5 border space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Status & Allocations</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Status of Order *</Label>
            <Select
              value={data.orderStatus || 'Pending'}
              onValueChange={val => handleChange('orderStatus', val)}
            >
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt} className="rounded-lg">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Priority Number Allocation *</Label>
            <Input
              type="number"
              value={data.priorityNumber || ''}
              onChange={e => handleChange('priorityNumber', e.target.value)}
              placeholder="e.g. 1"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Seed Allocation - Always visible (On order confirmation) */}
        <div className="space-y-4 pt-4 border-t border-dashed">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Seed Allocation (On order confirmation)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Order ID *</Label>
              <Input
                type="text"
                value={data.orderId || ''}
                onChange={e => handleChange('orderId', e.target.value)}
                placeholder="Enter order identification code"
                className="h-11 border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Allocated Tanks List */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Tanks Allocated *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTank}
                className="h-8 rounded-lg border-dashed text-xs font-bold flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <Plus className="w-3.5 h-3.5" /> Allocate Tank
              </Button>
            </div>

            <div className="space-y-3">
              {allocatedTanks.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-muted-foreground bg-slate-50/50">
                  No tanks allocated yet. Click "Allocate Tank" to allocate rearing tanks.
                </div>
              ) : (
                allocatedTanks.map((item: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 relative group animate-fade-in-up">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                        Tank Allocation #{idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTank(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 block">Batch ID / Stocking ID Allocated *</Label>
                        <Select
                          value={item.allocatedStockingId || ''}
                          onValueChange={val => handleTankChange(idx, 'allocatedStockingId', val)}
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200 font-bold text-xs">
                            <SelectValue placeholder="Select Stocking ID" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            {availableBatches && availableBatches.length > 0 ? (
                              availableBatches.map(batchId => (
                                <SelectItem key={batchId} value={batchId} className="rounded-lg font-bold">
                                  {batchId}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled className="rounded-lg text-muted-foreground">
                                No stocking IDs found
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 block">Tank Num *</Label>
                        <Select
                          value={item.tankId || ''}
                          onValueChange={val => handleTankChange(idx, 'tankId', val)}
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200">
                            <SelectValue placeholder="Select tank" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            {flatTanks.map(t => (
                              <SelectItem key={t.id} value={t.id} className="rounded-lg">{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 block">Present Larval Stage *</Label>
                        <Select
                          value={item.presentLarvalStage || 'Nauplii'}
                          onValueChange={val => handleTankChange(idx, 'presentLarvalStage', val)}
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            {LARVAL_STAGES.map(stage => (
                              <SelectItem key={stage} value={stage} className="rounded-lg">{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 block">Gross Expected Approx. *</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.grossExpected || ''}
                          onChange={e => handleTankChange(idx, 'grossExpected', e.target.value)}
                          placeholder="Qty"
                          className="h-9 border-slate-200 bg-white rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 block">Larval Stage at Packing *</Label>
                        <Select
                          value={item.larvalStagePacking || 'PL'}
                          onValueChange={val => handleTankChange(idx, 'larvalStagePacking', val)}
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            {LARVAL_STAGES.map(stage => (
                              <SelectItem key={stage} value={stage} className="rounded-lg">{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 4. Payment & Financial details */}
      <div className="glass-card rounded-2xl p-5 border space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Payment details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Bonus Agreed *</Label>
            <Input
              type="number"
              min="0"
              value={data.bonusAgreed || ''}
              onChange={e => handleChange('bonusAgreed', e.target.value)}
              placeholder="e.g. 0"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Net Qty (in Million) *</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.netQty || ''}
              onChange={e => handleChange('netQty', e.target.value)}
              placeholder="e.g. 1.5"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Unit Price Agreed (₹) *</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.unitPriceAgreed || ''}
              onChange={e => handleChange('unitPriceAgreed', e.target.value)}
              placeholder="0.00"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Advance Received (₹) *</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={data.advanceReceived || ''}
              onChange={e => handleChange('advanceReceived', e.target.value)}
              placeholder="0.00"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Info note */}
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5">
          <Info className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-[11px] font-bold text-sky-800 leading-relaxed">
            Note: Share Hatchery Account details on order confirmation.
          </div>
        </div>

        {/* Pricing calculations card */}
        <div className="rounded-2xl border bg-emerald-500/5 border-emerald-500/10 p-5 space-y-3 animate-in zoom-in-95">
          <div className="flex items-center gap-1.5 pb-2 border-b border-emerald-500/10">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider">Financial Summary</h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Total Amount</span>
              <span className="text-lg font-black text-slate-800">₹{(data.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Advance Received</span>
              <span className="text-lg font-black text-emerald-600">₹{(advanceVal || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Balance Due</span>
              <span className={`text-lg font-black ${ (data.balanceDue || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{(data.balanceDue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Photos & Comments wrapper */}
      <div className="glass-card rounded-2xl p-5 border space-y-5">
        {!isPlanningMode && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Activity Photo (Optional)</Label>
            <ImageUpload value={data.photoUrl || ''} onUpload={url => handleChange('photoUrl', url)} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">{isPlanningMode ? 'Instructions' : 'Comments'}</Label>
          <Textarea
            value={comments}
            onChange={e => onCommentsChange(e.target.value)}
            placeholder={isPlanningMode ? "Add instructions for the worker..." : "Add notes..."}
            rows={3}
            className="rounded-xl resize-none border-slate-200"
          />
        </div>
      </div>

    </div>
  );
};

export default OrderBookingForm;
