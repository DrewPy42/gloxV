import { TableOptions } from "../models/table.options";

export const seriesDashboardOptions: TableOptions[] = [
  {
    fieldName: 'seriesId',
    fieldType: 'string',
    fieldLabel: '',
    fieldFormat: '',
    fieldWidth: 100,
    fieldAlign: 'left',
    fieldVisible: false,
    fieldSortable: true,
    fieldFilterable: true
  },
  {
    fieldName: 'seriesName',
    fieldType: 'string',
    fieldLabel: 'Name',
    fieldFormat: '',
    fieldWidth: 200,
    fieldAlign: 'left',
    fieldVisible: true,
    fieldSortable: true,
    fieldFilterable: true
  },
  {
    fieldName: 'seriesStatus',
    fieldType: 'string',
    fieldLabel: 'Status',
    fieldFormat: '',
    fieldWidth: 100,
    fieldAlign: 'left',
    fieldVisible: true,
    fieldSortable: true,
    fieldFilterable: true
  }
];