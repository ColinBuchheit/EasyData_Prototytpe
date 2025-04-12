// src/utils/date.utils.ts
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Format date string to local date format
 */
export const formatDate = (dateString: string, format: string = 'MMM DD, YYYY'): string => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

/**
 * Format date string to local time format
 */
export const formatTime = (dateString: string, format: string = 'HH:mm:ss'): string => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

/**
 * Format date string to local date and time format
 */
export const formatDateTime = (dateString: string, format: string = 'MMM DD, YYYY HH:mm:ss'): string => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

/**
 * Get relative time from now (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  return dayjs(dateString).fromNow();
};

/**
 * Convert date to specific timezone
 */
export const convertToTimezone = (dateString: string, tz: string = 'UTC'): string => {
  if (!dateString) return '';
  return dayjs(dateString).tz(tz).format();
};

/**
 * Check if a date is today
 */
export const isToday = (dateString: string): boolean => {
  if (!dateString) return false;
  const today = dayjs().startOf('day');
  const date = dayjs(dateString).startOf('day');
  return date.isSame(today);
};

/**
 * Get start and end of date range for queries
 */
export const getDateRange = (range: 'today' | 'week' | 'month' | 'year'): { start: string; end: string } => {
  const end = dayjs().endOf('day');
  let start;

  switch (range) {
    case 'today':
      start = dayjs().startOf('day');
      break;
    case 'week':
      start = dayjs().subtract(7, 'day').startOf('day');
      break;
    case 'month':
      start = dayjs().subtract(30, 'day').startOf('day');
      break;
    case 'year':
      start = dayjs().subtract(365, 'day').startOf('day');
      break;
    default:
      start = dayjs().startOf('day');
  }

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};

/**
 * Parse ISO string to Date object
 */
export const parseISOString = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing date string:', error);
    return null;
  }
};