import DOMPurify from 'dompurify';

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) value = 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) value = 0;
  return `${(value * 100).toFixed(2)}%`;
};

export type PerPageOption = {
  records: number;
  text: string;
};

export const perPageOptions: PerPageOption[] = [
  { records: 25, text: '25 / pg' },
  { records: 50, text: '50 / pg' },
  { records: 150, text: '150 / pg' },
  { records: 200, text: '200 / pg' },
  { records: 250, text: '250 / pg' },
  { records: 500, text: '500 / pg' },
];

export const makeViewLink = (recordType: string, id: string | number, text: string): string => {
  const cleanText = DOMPurify.sanitize(text);
  return `<a href=${"/" + recordType + "/" + id + "/view"}>${cleanText}</a>`;
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(new Date(date));
};

export async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Represents a parsed segment of an issue range
 */
export interface IssueRangeSegment {
  type: 'range' | 'single' | 'open';
  start: number;
  end?: number; // undefined for open-ended ranges
}

/**
 * Parse an issue_range string into structured segments
 * Examples:
 *   "1-416" -> [{ type: 'range', start: 1, end: 416 }]
 *   "500+" -> [{ type: 'open', start: 500 }]
 *   "1-416, 500+" -> [{ type: 'range', start: 1, end: 416 }, { type: 'open', start: 500 }]
 *   "1-5, 7, 10-15" -> [{ type: 'range', start: 1, end: 5 }, { type: 'single', start: 7 }, { type: 'range', start: 10, end: 15 }]
 */
export function parseIssueRange(issueRange: string | null | undefined): IssueRangeSegment[] {
  if (!issueRange) return [];

  const segments: IssueRangeSegment[] = [];
  const parts = issueRange.split(',').map(s => s.trim()).filter(s => s.length > 0);

  for (const part of parts) {
    if (part.endsWith('+')) {
      // Open-ended range like "500+"
      const num = parseInt(part.slice(0, -1), 10);
      if (!isNaN(num)) {
        segments.push({ type: 'open', start: num });
      }
    } else if (part.includes('-')) {
      // Range like "1-416"
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        segments.push({ type: 'range', start, end });
      }
    } else {
      // Single issue like "7"
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        segments.push({ type: 'single', start: num, end: num });
      }
    }
  }

  return segments;
}

/**
 * Expand an issue_range into a set of all issue numbers it contains
 * For open-ended ranges, you must provide a maxIssue to limit expansion
 * Returns a Set of issue numbers
 */
export function expandIssueRange(
  issueRange: string | null | undefined,
  maxIssue?: number
): Set<number> {
  const segments = parseIssueRange(issueRange);
  const issues = new Set<number>();

  for (const segment of segments) {
    if (segment.type === 'single') {
      issues.add(segment.start);
    } else if (segment.type === 'range' && segment.end !== undefined) {
      for (let i = segment.start; i <= segment.end; i++) {
        issues.add(i);
      }
    } else if (segment.type === 'open' && maxIssue !== undefined) {
      // For open-ended, expand from start to maxIssue
      for (let i = segment.start; i <= maxIssue; i++) {
        issues.add(i);
      }
    }
  }

  return issues;
}

/**
 * Compute missing issues by comparing expected range against owned issues
 * @param issueRange - The issue_range string (e.g., "1-416, 500+")
 * @param ownedIssues - Array of owned issue numbers (numeric)
 * @param maxIssue - For open-ended ranges, the highest issue number to consider
 * @returns Array of missing issue numbers, sorted
 */
export function computeMissingIssues(
  issueRange: string | null | undefined,
  ownedIssues: number[],
  maxIssue?: number
): number[] {
  const expectedIssues = expandIssueRange(issueRange, maxIssue);
  const ownedSet = new Set(ownedIssues);

  const missing: number[] = [];
  for (const issue of expectedIssues) {
    if (!ownedSet.has(issue)) {
      missing.push(issue);
    }
  }

  return missing.sort((a, b) => a - b);
}

/**
 * Format missing issues into a human-readable string
 * Collapses consecutive numbers into ranges
 * Example: [1, 2, 3, 5, 7, 8, 9] -> "1-3, 5, 7-9"
 */
export function formatMissingIssues(missing: number[]): string {
  if (missing.length === 0) return '';

  const sorted = [...missing].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(String(rangeStart));
      } else if (rangeEnd === rangeStart + 1) {
        ranges.push(String(rangeStart), String(rangeEnd));
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      if (i < sorted.length) {
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
  }

  return ranges.join(', ');
}

/**
 * Check if an issue number falls within an issue_range
 */
export function isIssueInRange(
  issueNumber: number,
  issueRange: string | null | undefined
): boolean {
  const segments = parseIssueRange(issueRange);

  for (const segment of segments) {
    if (segment.type === 'single' && segment.start === issueNumber) {
      return true;
    } else if (segment.type === 'range' && segment.end !== undefined) {
      if (issueNumber >= segment.start && issueNumber <= segment.end) {
        return true;
      }
    } else if (segment.type === 'open') {
      if (issueNumber >= segment.start) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get computed start and end issue from an issue_range
 * Useful for quick lookups and autofill suggestions
 */
export function getIssueRangeBounds(
  issueRange: string | null | undefined
): { start: number | null; end: number | null; isOpenEnded: boolean } {
  const segments = parseIssueRange(issueRange);

  if (segments.length === 0) {
    return { start: null, end: null, isOpenEnded: false };
  }

  let minStart: number | null = null;
  let maxEnd: number | null = null;
  let isOpenEnded = false;

  for (const segment of segments) {
    if (minStart === null || segment.start < minStart) {
      minStart = segment.start;
    }

    if (segment.type === 'open') {
      isOpenEnded = true;
    } else if (segment.end !== undefined) {
      if (maxEnd === null || segment.end > maxEnd) {
        maxEnd = segment.end;
      }
    }
  }

  return {
    start: minStart,
    end: isOpenEnded ? null : maxEnd,
    isOpenEnded
  };
}