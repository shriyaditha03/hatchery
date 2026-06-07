import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, Info, Users, IndianRupee, Activity, CheckCircle, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
}

const PACKING_TYPES = ['Tank Packing', 'Bubble packing'];
const TRANSPORTATION_OPTIONS = ['Owner', 'Hatchery'];
const STATUS_OPTIONS = ['Confirmed', 'Pending', 'Reschedule', 'Cancelled'];
const LARVAL_STAGES = ['Nauplii', 'Zoea', 'Mysis', 'PL', 'PL10', 'PL12', 'PL15', 'Others'];

export const OrderBookingForm = ({
  data,
  onDataChange,
  comments,
  onCommentsChange,
  availableTanks = [],
  availableBatches = [],
  isPlanningMode = false
}: OrderBookingFormProps) => {
  const [geneticLines, setGeneticLines] = useState<string[]>([
    'SIS Hardy Line',
    'SIS Growth Line',
    'Syaqua',
    'Konabay',
    'Others'
  ]);

  // Load genetic lines from DB
  useEffect(() => {
    supabase
      .from('genetic_line_types')
      .select('name')
      .eq('is_active', true)
      .then(({ data: dbData, error }) => {
        if (!error && dbData && dbData.length > 0) {
          const names = Array.from(new Set(dbData.map((d: any) => d.name)));
          setGeneticLines(names);
        }
      });
  }, []);

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
      { tankId: '', presentLarvalStage: 'Nauplii', grossExpected: '', larvalStagePacking: 'PL' }
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
              onChange={e => handleChange('bookingId', e.target.value)}
              placeholder="e.g. BK-1002"
              className="h-11 border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Phone Number (10-Digit Mobile) *</Label>
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
            <Label className="text-xs font-bold text-slate-700">Whatsapp Number (10-Digit Mobile) *</Label>
            <Input
              type="text"
              value={data.whatsappNumber || ''}
              onChange={e => {
                const numeric = e.target.value.replace(/\D/g, '');
                handleChange('whatsappNumber', numeric.slice(0, 10));
              }}
              placeholder="Enter 10-digit Whatsapp number"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Alternate Contact (Name and Number) *</Label>
            <Input
              type="text"
              value={data.alternateContact || ''}
              onChange={e => handleChange('alternateContact', e.target.value)}
              placeholder="e.g. Raj (9876543210)"
              className="h-11 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Farm Location / Address *</Label>
            <Textarea
              value={data.farmLocation || ''}
              onChange={e => handleChange('farmLocation', e.target.value)}
              placeholder="Enter complete farm location or address details"
              rows={2}
              className="rounded-xl border-slate-200 resize-none"
            />
          </div>

          <div className="space-y-1.5">
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
                <Label className="text-xs font-bold text-slate-700">Genetic Line Required *</Label>
                <Select
                  value={batch.geneticLine || ''}
                  onValueChange={val => handleBatchChange(index, 'geneticLine', val)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select genetic line" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {geneticLines.map(line => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Batch ID / Stocking ID Allocated *</Label>
              <Select
                value={data.allocatedStockingId || ''}
                onValueChange={val => handleChange('allocatedStockingId', val)}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
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
