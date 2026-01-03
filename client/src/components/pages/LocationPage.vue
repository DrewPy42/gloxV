<template>
  <div class="location-page">
    <h1>Storage Locations</h1>
    
    <DataTable
      :records="locationStore.records"
      :columns="columns"
      :loading="locationStore.loading"
      :total-records="locationStore.totalRecords"
      :total-pages="locationStore.totalPages"
      :current-page="locationStore.currentPage"
      :per-page="locationStore.perPage"
      id-field="location_id"
      entity-name="locations"
      :show-add-button="true"
      :actions="['view', 'edit', 'delete']"
      @page-changed="locationStore.setPage"
      @per-page-changed="locationStore.setPerPage"
      @view="openViewModal"
    >
      <template #cell-storage_type="{ record }">
        <span class="badge" :class="getTypeBadgeClass(record.storage_type)">
          <font-awesome-icon :icon="['fas', getTypeIcon(record.storage_type)]" />
          {{ record.storage_type }}
        </span>
      </template>

      <template #cell-location_display="{ record }">
        {{ formatLocation(record) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DataTable, Modal, type TableColumn } from '@/components/common'
import { useLocationStore, type Location } from '@/core'
import { useFormatting } from '@/composables'

const locationStore = useLocationStore()
const { formatCurrency } = useFormatting()

const isModalOpen = ref(false)
const selectedLocation = ref<Location | null>(null)

const columns: TableColumn[] = [
  { key: 'storage_type', label: 'Type', align: 'center' },
  { key: 'location_display', label: 'Location' },
  { key: 'location_name', label: 'Name' },
  { key: 'series_count', label: 'Series', align: 'center' },
  { key: 'copy_count', label: 'Copies', align: 'center' },
  { key: 'total_value', label: 'Value', align: 'center', type: 'currency' }
]

const getTypeBadgeClass = (type: string) => ({
  'bg-primary': type === 'cabinet',
  'bg-success': type === 'display',
  'bg-info': type === 'bookshelf',
  'bg-secondary': type === 'digital'
})

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'cabinet': return 'box-archive'
    case 'display': return 'display'
    case 'bookshelf': return 'book'
    case 'digital': return 'cloud'
    default: return 'folder'
  }
}

const formatLocation = (record: Location) => {
  const parts = []
  if (record.cabinet_number) parts.push(`Cabinet ${record.cabinet_number}`)
  if (record.drawer_number) parts.push(`Drawer ${record.drawer_number}`)
  if (record.divider) parts.push(record.divider)
  return parts.join(' / ') || '—'
}

const openViewModal = (record: Location) => {
  selectedLocation.value = record
  isModalOpen.value = true
}

onMounted(() => {
  locationStore.fetchRecords()
})
</script>

<style scoped lang="scss">
.location-page {
  padding: 1rem;
}
</style>
