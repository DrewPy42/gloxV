<template>
  <div class="data-table-container">
    <!-- Header with search and actions -->
    <div class="data-table-header" v-if="showHeader">
      <div class="header-left">
        <slot name="header-left">
          <h2 v-if="title">{{ title }}</h2>
        </slot>
      </div>
      
      <div class="header-center">
        <slot name="header-center">
          <div class="search-box" v-if="searchable">
            <input
              type="text"
              :placeholder="searchPlaceholder"
              :value="searchQuery"
              @input="handleSearch($event)"
              class="form-control search-input"
            />
            <font-awesome-icon 
              v-if="searchQuery" 
              :icon="['fas', 'times']" 
              class="search-clear"
              @click="clearSearch"
            />
          </div>
        </slot>
      </div>
      
      <div class="header-right">
        <slot name="header-right">
          <button 
            v-if="showAddButton" 
            class="btn btn-primary"
            @click="$emit('add')"
          >
            <font-awesome-icon :icon="['fas', 'plus']" />
            Add {{ entityName }}
          </button>
        </slot>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>{{ loadingMessage }}</span>
    </div>

    <!-- Table -->
    <div class="table-responsive" v-else>
      <table class="table table-striped table-hover">
        <thead>
          <tr class="table-header">
            <!-- Selection checkbox column -->
            <th v-if="selectable" class="checkbox-column">
              <input 
                type="checkbox" 
                :checked="allSelected"
                @change="toggleSelectAll"
              />
            </th>
            
            <!-- Dynamic columns -->
            <th 
              v-for="column in columns" 
              :key="column.key"
              :class="[
                column.align ? `text-${column.align}` : '',
                column.sortable ? 'sortable' : '',
                column.class || ''
              ]"
              :style="column.width ? { width: column.width } : {}"
              @click="column.sortable && handleSort(column.key)"
            >
              {{ column.label }}
              <font-awesome-icon 
                v-if="column.sortable"
                :icon="['fas', getSortIcon(column.key)]"
                class="sort-icon"
              />
            </th>
            
            <!-- Actions column -->
            <th v-if="showActions" class="actions-column text-center">
              Actions
            </th>
          </tr>
        </thead>
        
        <tbody>
          <!-- Empty state -->
          <tr v-if="!records || records.length === 0">
            <td :colspan="totalColumns" class="no-records">
              <slot name="empty">
                <font-awesome-icon :icon="['fas', 'inbox']" class="empty-icon" />
                <span>{{ emptyMessage }}</span>
              </slot>
            </td>
          </tr>
          
          <!-- Data rows -->
          <tr 
            v-for="record in records" 
            :key="getRecordId(record)"
            :class="{ 'selected': isSelected(record), 'clickable': rowClickable }"
            @click="handleRowClick(record)"
          >
            <!-- Selection checkbox -->
            <td v-if="selectable" class="checkbox-column" @click.stop>
              <input 
                type="checkbox" 
                :checked="isSelected(record)"
                @change="toggleSelection(record)"
              />
            </td>
            
            <!-- Dynamic cells -->
            <td 
              v-for="column in columns" 
              :key="column.key"
              :class="[column.align ? `text-${column.align}` : '', column.cellClass || '']"
            >
              <!-- Custom slot for column -->
              <slot :name="`cell-${column.key}`" :record="record" :value="getCellValue(record, column)">
                <!-- Default rendering based on column type -->
                <template v-if="column.type === 'currency'">
                  {{ formatCurrency(getCellValue(record, column)) }}
                </template>
                <template v-else-if="column.type === 'percentage'">
                  {{ formatPercentage(getCellValue(record, column)) }}
                </template>
                <template v-else-if="column.type === 'date'">
                  {{ formatDate(getCellValue(record, column)) }}
                </template>
                <template v-else-if="column.type === 'boolean'">
                  <font-awesome-icon 
                    v-if="getCellValue(record, column)"
                    :icon="['fas', 'circle-check']"
                    class="text-success"
                  />
                </template>
                <template v-else-if="column.type === 'image'">
                  <img 
                    v-if="getCellValue(record, column)"
                    :src="getCellValue(record, column)"
                    :alt="column.label"
                    class="cell-image"
                  />
                  <font-awesome-icon 
                    v-else
                    :icon="['fas', 'image']"
                    class="text-muted"
                  />
                </template>
                <template v-else-if="column.type === 'link'">
                  <a 
                    href="#" 
                    @click.prevent="$emit('cell-click', { record, column })"
                  >
                    {{ getCellValue(record, column) }}
                  </a>
                </template>
                <template v-else>
                  {{ getCellValue(record, column) }}
                </template>
              </slot>
            </td>
            
            <!-- Actions column -->
            <td v-if="showActions" class="actions-column text-center" @click.stop>
              <slot name="actions" :record="record">
                <div class="action-buttons">
                  <button 
                    v-if="actions.includes('view')"
                    class="btn btn-sm btn-outline-primary"
                    @click="$emit('view', record)"
                    title="View"
                  >
                    <font-awesome-icon :icon="['fas', 'eye']" />
                  </button>
                  <button 
                    v-if="actions.includes('edit')"
                    class="btn btn-sm btn-outline-secondary"
                    @click="$emit('edit', record)"
                    title="Edit"
                  >
                    <font-awesome-icon :icon="['fas', 'pen']" />
                  </button>
                  <button 
                    v-if="actions.includes('delete')"
                    class="btn btn-sm btn-outline-danger"
                    @click="$emit('delete', record)"
                    title="Delete"
                  >
                    <font-awesome-icon :icon="['fas', 'trash']" />
                  </button>
                </div>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer with pagination -->
    <div class="data-table-footer" v-if="showFooter">
      <div class="footer-left">
        <slot name="footer-left">
          <span class="record-count">
            Showing {{ startRecord }} - {{ endRecord }} of {{ totalRecords }} {{ entityName }}
          </span>
        </slot>
      </div>
      
      <div class="footer-center">
        <slot name="footer-center">
          <Pagination
            v-if="paginated"
            :total-pages="totalPages"
            :current-page="currentPage"
            @page-changed="handlePageChange"
          />
        </slot>
      </div>
      
      <div class="footer-right">
        <slot name="footer-right">
          <div class="per-page-selector" v-if="showPerPageSelector">
            <label>Per page:</label>
            <select 
              :value="perPage" 
              @change="handlePerPageChange($event)"
              class="form-select form-select-sm"
            >
              <option v-for="option in perPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Pagination from './Pagination.vue'
import { useFormatting, useSelection, useSort, useSearch } from '@/composables'

// ============================================================================
// Types
// ============================================================================

export interface TableColumn {
  key: string
  label: string
  type?: 'text' | 'currency' | 'percentage' | 'date' | 'boolean' | 'image' | 'link'
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  class?: string
  cellClass?: string
  formatter?: (value: any, record: any) => string
}

export interface DataTableProps {
  records: any[]
  columns: TableColumn[]
  idField?: string
  title?: string
  entityName?: string
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  // Features
  searchable?: boolean
  searchPlaceholder?: string
  searchQuery?: string
  paginated?: boolean
  currentPage?: number
  totalPages?: number
  totalRecords?: number
  perPage?: number
  perPageOptions?: number[]
  showPerPageSelector?: boolean
  selectable?: boolean
  rowClickable?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showAddButton?: boolean
  showActions?: boolean
  actions?: ('view' | 'edit' | 'delete')[]
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(defineProps<DataTableProps>(), {
  idField: 'id',
  entityName: 'records',
  loading: false,
  loadingMessage: 'Loading...',
  emptyMessage: 'No records found',
  searchable: true,
  searchPlaceholder: 'Search...',
  searchQuery: '',
  paginated: true,
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  perPage: 25,
  perPageOptions: () => [10, 25, 50, 100],
  showPerPageSelector: true,
  selectable: false,
  rowClickable: true,
  showHeader: true,
  showFooter: true,
  showAddButton: false,
  showActions: true,
  actions: () => ['view', 'edit', 'delete']
})

const emit = defineEmits<{
  (e: 'search', query: string): void
  (e: 'sort', field: string, direction: 'asc' | 'desc'): void
  (e: 'page-changed', page: number): void
  (e: 'per-page-changed', perPage: number): void
  (e: 'row-click', record: any): void
  (e: 'cell-click', data: { record: any; column: TableColumn }): void
  (e: 'selection-changed', selectedIds: Set<number | string>): void
  (e: 'add'): void
  (e: 'view', record: any): void
  (e: 'edit', record: any): void
  (e: 'delete', record: any): void
}>()

// ============================================================================
// Composables
// ============================================================================

const { formatCurrency, formatPercentage, formatDate } = useFormatting()
const { sortField, sortDirection, setSort, getSortIcon } = useSort()
const { 
  selectedIds, 
  allSelected, 
  isSelected, 
  toggleSelection: baseToggleSelection, 
  toggleSelectAll: baseToggleSelectAll 
} = useSelection(props.idField)
const { setSearch: baseSetSearch, clearSearch: baseClearSearch } = useSearch()

// ============================================================================
// Computed
// ============================================================================

const totalColumns = computed(() => {
  let count = props.columns.length
  if (props.selectable) count++
  if (props.showActions) count++
  return count
})

const startRecord = computed(() => {
  if (props.totalRecords === 0) return 0
  return (props.currentPage - 1) * props.perPage + 1
})

const endRecord = computed(() => {
  const end = props.currentPage * props.perPage
  return Math.min(end, props.totalRecords)
})

// ============================================================================
// Methods
// ============================================================================

const getRecordId = (record: any): number | string => {
  return record[props.idField]
}

const getCellValue = (record: any, column: TableColumn): any => {
  // Support nested keys like 'publisher.name'
  const keys = column.key.split('.')
  let value = record
  for (const key of keys) {
    value = value?.[key]
  }
  
  // Apply custom formatter if provided
  if (column.formatter) {
    return column.formatter(value, record)
  }
  
  return value
}

const handleSearch = (event: Event) => {
  const query = (event.target as HTMLInputElement).value
  emit('search', query)
}

const clearSearch = () => {
  emit('search', '')
}

const handleSort = (field: string) => {
  setSort(field)
  emit('sort', sortField.value, sortDirection.value)
}

const handlePageChange = (page: number) => {
  emit('page-changed', page)
}

const handlePerPageChange = (event: Event) => {
  const perPage = parseInt((event.target as HTMLSelectElement).value)
  emit('per-page-changed', perPage)
}

const handleRowClick = (record: any) => {
  if (props.rowClickable) {
    emit('row-click', record)
  }
}

const toggleSelection = (record: any) => {
  baseToggleSelection(record)
  emit('selection-changed', selectedIds.value)
}

const toggleSelectAll = () => {
  baseToggleSelectAll(props.records)
  emit('selection-changed', selectedIds.value)
}
</script>

<style scoped lang="scss">
.data-table-container {
  position: relative;
}

.data-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;

  .header-left,
  .header-center,
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
}

.search-box {
  position: relative;

  .search-input {
    padding-right: 2rem;
    min-width: 250px;
  }

  .search-clear {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #999;

    &:hover {
      color: #333;
    }
  }
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.table {
  margin-bottom: 0;

  th {
    white-space: nowrap;
    user-select: none;

    &.sortable {
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }

    .sort-icon {
      margin-left: 0.5rem;
      opacity: 0.5;
    }
  }

  tr.clickable {
    cursor: pointer;
  }

  tr.selected {
    background-color: rgba(13, 110, 253, 0.1) !important;
  }

  .checkbox-column {
    width: 40px;
    text-align: center;
  }

  .actions-column {
    width: 120px;
  }

  .no-records {
    text-align: center;
    padding: 3rem !important;
    color: #666;

    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      display: block;
    }
  }

  .cell-image {
    max-height: 40px;
    max-width: 60px;
    object-fit: contain;
  }
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: center;

  .btn {
    padding: 0.25rem 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    svg {
      margin: 0 auto;
    }
  }
}

.data-table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 1rem;

  .footer-left,
  .footer-center,
  .footer-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .record-count {
    color: #666;
    font-size: 0.9rem;
  }

  .per-page-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    label {
      margin: 0;
      font-size: 0.9rem;
      color: #666;
    }

    select {
      width: auto;
    }
  }
}
</style>
