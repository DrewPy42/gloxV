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