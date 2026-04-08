import { format, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';

export const formatDate = (date: any, formatStr: string = 'dd-MM-yyyy') => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr);
  } catch (err) {
    return '-';
  }
};

export const getTodayStr = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getNowLocal = () => {
  return new Date();
};

export const isTodayLocal = (dateStr: any) => {
  if (!dateStr) return false;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return isToday(d);
  } catch (err) {
    return false;
  }
};

export const getDateRangeUTC = (fromDate: string, toDate: string) => {
  const start = startOfDay(parseISO(fromDate));
  const end = endOfDay(parseISO(toDate));
  
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
};
