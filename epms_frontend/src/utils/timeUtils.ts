import { format, isThisYear, differenceInSeconds, differenceInMinutes, differenceInHours, parseISO, isValid } from 'date-fns';

const parseDateInput = (dateInput: Date | string | number | undefined | null): Date | null => {
  if (dateInput === undefined || dateInput === null || dateInput === '') return null;

  if (typeof dateInput === 'string') {
    const isoDate = parseISO(dateInput);
    if (isValid(isoDate)) return isoDate;
    const fallbackDate = new Date(dateInput);
    return isValid(fallbackDate) ? fallbackDate : null;
  }

  const date = new Date(dateInput);
  return isValid(date) ? date : null;
};

/**
 * Formats a date relative to now following the Telegram/Professional messaging style:
 * - < 1 min: "Just now"
 * - < 60 min: "Xm ago"
 * - < 24 hours: "Xh ago"
 * - Within this year: "MMM dd" (e.g., "Apr 07")
 * - Previous years: "MMM dd, yyyy" (e.g., "May 06, 2019")
 */
export const formatRelativeTime = (dateInput: Date | string | number | undefined | null): string => {
  const date = parseDateInput(dateInput);
  if (!date) return '';

  const now = new Date();
  
  const diffInSeconds = differenceInSeconds(now, date);
  if (diffInSeconds < 0) return format(date, 'dd/MM/yyyy'); // Future date fallback
  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = differenceInMinutes(now, date);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;

  const diffInHours = differenceInHours(now, date);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;

  if (isThisYear(date)) {
    return format(date, 'dd/MM');
  }
  
  return format(date, 'dd/MM/yyyy');
};

export const formatAuditDateTime = (dateInput: Date | string | number | undefined | null): string => {
  const date = parseDateInput(dateInput);
  if (!date) return "-";
  return format(date, 'dd MMM yyyy, HH:mm');
};

export const formatAuditDateValue = (value?: string | null): string => {
  if (value === undefined || value === null || value === '') return "-";
  if (typeof value !== 'string') return String(value);

  const date = parseDateInput(value);
  if (!date) return value;

  const hasTime = /\d{2}:\d{2}/.test(value);
  return hasTime ? format(date, 'dd MMM yyyy, HH:mm') : format(date, 'dd MMM yyyy');
};
