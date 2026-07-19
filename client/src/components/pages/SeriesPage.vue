<template>
  <div class="series-dashboard">
    <h1>Series</h1>

    <DataTable
      :records="seriesStore.records"
      :columns="columns"
      :loading="seriesStore.loading"
      :total-records="seriesStore.totalRecords"
      :total-pages="seriesStore.totalPages"
      :current-page="seriesStore.currentPage"
      :per-page="seriesStore.perPage"
      :search-query="searchQuery"
      id-field="series_id"
      entity-name="series"
      :show-add-button="true"
      :actions="['view', 'edit', 'delete']"
      @search="handleSearch"
      @page-changed="seriesStore.setPage"
      @per-page-changed="seriesStore.setPerPage"
      @row-click="handleRowClick"
      @add="openAddModal"
      @view="openViewModal"
      @edit="openEditModal"
      @delete="handleDelete"
    >
      <template #cell-title="{ record }">
        <a href="#" @click.prevent="openViewModal(record)">
          {{ record.title }}
        </a>
      </template>

      <template #cell-logo_path="{ record }">
        <img
          v-if="record.logo_path"
          :src="getLogoImageUrl(record.logo_path)"
          :alt="record.publisher_name"
          class="publisher-icon"
        />
        <font-awesome-icon
          v-else
          :icon="['fas', 'file-circle-question']"
          class="text-muted"
        />
      </template>

      <template #cell-is_limited_series="{ record }">
        <font-awesome-icon
          v-if="record.is_limited_series"
          :icon="['fas', 'circle-check']"
          class="text-primary"
        />
      </template>

      <template #cell-notes="{ record }">
        <span
          v-if="record.notes"
          class="notes-indicator"
          :title="record.notes"
        >
          <font-awesome-icon :icon="['fas', 'note-sticky']" />
        </span>
      </template>
    </DataTable>

    <SeriesModal
      v-model="isModalOpen"
      :series="selectedSeries"
      :view-only="viewOnly"
      @saved="seriesStore.fetchRecords()"
    />

    <!-- Delete Confirmation -->
    <Modal
      v-model="isDeleteModalOpen"
      title="Confirm Delete"
      size="sm"
      confirm-variant="danger"
      confirm-text="Delete"
      @confirm="confirmDelete"
    >
      <p>Are you sure you want to delete "{{ selectedSeries?.title }}"?</p>
      <p class="text-muted small">This action cannot be undone.</p>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DataTable, Modal, type TableColumn } from '@/components/common'
import { SeriesModal } from '@/components/modals'
import { useSeriesStore, type Series } from '@/core'
import { useImage, useFormatting } from '@/composables'

const seriesStore = useSeriesStore()
const { getLogoImageUrl } = useImage()
const { formatPercentage } = useFormatting()

const isModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const viewOnly = ref(true)
const selectedSeries = ref<Series | null>(null)
const searchQuery = ref('')

const columns: TableColumn[] = [
  { key: 'title', label: 'Title', sortable: true, type: 'link' },
  { key: 'is_limited_series', label: 'Limited', align: 'center', type: 'boolean' },
  { key: 'logo_path', label: 'Publisher', align: 'center' },
  { key: 'total_cost', label: 'Total Cost', align: 'center', type: 'currency' },
  { key: 'total_value', label: 'Total Value', align: 'center', type: 'currency' },
  {
    key: 'value_change',
    label: 'Gain',
    align: 'center',
    formatter: (_, record) => {
      if (!record.total_cost || record.total_cost === 0) return '—'
      const change = ((record.total_value - record.total_cost) / record.total_cost)
      return formatPercentage(change)
    }
  },
  { key: 'volume_count', label: 'Vols', align: 'center', sortable: true },
  { key: 'issue_count', label: 'Issues', align: 'center', sortable: true },
  { key: 'copy_count', label: 'Copies', align: 'center', sortable: true },
  { key: 'notes', label: 'Notes', align: 'center' }
]

const handleSearch = (query: string) => {
  searchQuery.value = query
  seriesStore.setSearch(query)
}

const handleRowClick = (record: Series) => {
  openViewModal(record)
}

const openAddModal = () => {
  selectedSeries.value = {} as Series
  viewOnly.value = false
  isModalOpen.value = true
}

const openViewModal = (record: Series) => {
  selectedSeries.value = { ...record }
  viewOnly.value = true
  isModalOpen.value = true
}

const openEditModal = (record: Series) => {
  selectedSeries.value = { ...record }
  viewOnly.value = false
  isModalOpen.value = true
}

const handleDelete = (record: Series) => {
  selectedSeries.value = record
  isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (selectedSeries.value?.series_id) {
    await seriesStore.deleteRecord(selectedSeries.value.series_id)
  }
  isDeleteModalOpen.value = false
  selectedSeries.value = null
}

onMounted(async () => {
  await seriesStore.fetchRecords()
})
</script>

<style scoped lang="scss">
.series-dashboard {
  padding: 1rem;

  h1 {
    margin-bottom: 1.5rem;
  }
}

.publisher-icon {
  max-height: 24px;
  max-width: 40px;
  object-fit: contain;
}

.notes-indicator {
  color: #6c757d;
  cursor: help;
}
</style>
