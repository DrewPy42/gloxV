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
      <!-- Custom cell for title with link -->
      <template #cell-title="{ record }">
        <a href="#" @click.prevent="openViewModal(record)">
          {{ record.title }}
        </a>
      </template>

      <!-- Custom cell for publisher logo -->
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

      <!-- Custom cell for limited series -->
      <template #cell-is_limited_series="{ record }">
        <font-awesome-icon
          v-if="record.is_limited_series"
          :icon="['fas', 'circle-check']"
          class="text-primary"
        />
      </template>

      <!-- Custom cell for notes -->
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

    <!-- View/Edit Modal -->
    <Modal
      v-model="isModalOpen"
      :title="modalTitle"
      size="xl"
      :show-confirm-button="isEditing"
      :confirm-text="isEditing ? 'Save Changes' : 'Close'"
      @confirm="handleSave"
      @close="closeModal"
    >
      <SeriesForm
        v-if="selectedSeries"
        :series="selectedSeries"
        :is-editing="isEditing"
        :publishers="publishers"
        @update="handleFormUpdate"
      />
    </Modal>

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
import { ref, computed, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DataTable, Modal, type TableColumn } from '@/components/common'
import SeriesForm from '@/components/forms/SeriesForm.vue'
import { useSeriesStore, usePublisherStoreExtended, type Series } from '@/core'
import { useImage, useFormatting } from '@/composables'

// ============================================================================
// Stores & Composables
// ============================================================================

const seriesStore = useSeriesStore()
const publisherStore = usePublisherStoreExtended()
const { getLogoImageUrl } = useImage()
const { formatCurrency, formatPercentage } = useFormatting()

// ============================================================================
// State
// ============================================================================

const isModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isEditing = ref(false)
const selectedSeries = ref<Series | null>(null)
const formData = ref<Partial<Series>>({})
const publishers = ref<any[]>([])

// ============================================================================
// Table Configuration
// ============================================================================

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

// ============================================================================
// Computed
// ============================================================================

const modalTitle = computed(() => {
  if (!selectedSeries.value) return 'Add Series'
  return isEditing.value ? `Edit: ${selectedSeries.value.title}` : selectedSeries.value.title
})

// ============================================================================
// Methods
// ============================================================================

const handleSearch = (query: string) => {
  seriesStore.setSearch(query)
}

const handleRowClick = (record: Series) => {
  openViewModal(record)
}

const openAddModal = () => {
  selectedSeries.value = {} as Series
  isEditing.value = true
  isModalOpen.value = true
}

const openViewModal = (record: Series) => {
  selectedSeries.value = { ...record }
  isEditing.value = false
  isModalOpen.value = true
}

const openEditModal = (record: Series) => {
  selectedSeries.value = { ...record }
  formData.value = { ...record }
  isEditing.value = true
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedSeries.value = null
  formData.value = {}
}

const handleFormUpdate = (data: Partial<Series>) => {
  formData.value = { ...formData.value, ...data }
}

const handleSave = async () => {
  if (!selectedSeries.value) return

  if (selectedSeries.value.series_id) {
    // Update existing
    await seriesStore.updateRecord(selectedSeries.value.series_id, formData.value)
  } else {
    // Create new
    await seriesStore.createRecord(formData.value)
  }
  
  closeModal()
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

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await seriesStore.fetchRecords()
  publishers.value = await publisherStore.fetchAllPublishers()
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
