import DOMPurify from 'dompurify';

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
export const formatPercentage = (value) => {
  return `${(value * 100).toFixed(2)}%`;
}

export const perPageOptions = [
  {records: 25, text: '25 / pg'},
  {records: 50, text: '50 / pg'},
  {records: 150, text: '150 / pg'},
  {records: 200, text: '200 / pg'},
  {records: 250, text: '250 / pg'},
  {records: 500, text: '500 / pg'},
];

export const makeViewLink = (recordType, id, text) => {
  const cleanText = DOMPurify.sanitize(text);
  return `<a href=${"/" + recordType + "/" + id + "/view"}>${cleanText}</a>`;
}
