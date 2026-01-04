<template>
  <div class="publisher-page">
    <h1>Publishers</h1>

    <DataTable
      :records="publisherStore.records"
      :columns="columns"
      :loading="publisherStore.loading"
      :total-records="publisherStore.totalRecords"
      :total-pages="publisherStore.totalPages"
      :current-page="publisherStore.currentPage"
      :per-page="publisherStore.perPage"
      id-field="publisher_id"
      entity-name="publishers"
      :show-add-button="true"
      :actions="['view', 'edit', 'delete']"
      @search="handleSearch"
      @page-changed="publisherStore.setPage"
      @per-page-changed="publisherStore.setPerPage"
      @view="openViewModal"
      @edit="openEditModal"
    >
      <template #cell-logo_path="{ record }">
        <img
          v-if="record.logo_path"
          :src="getLogoImageUrl(record.logo_path)"
          :alt="record.publisher_name"
          class="publisher-logo"
        />
        <font-awesome-icon
          v-else
          :icon="['fas', 'building']"
          class="text-muted"
        />
      </template>

      <template #cell-publisher_name="{ record }">
        <a href="#" @click.prevent="openViewModal(record)">
          {{ record.publisher_name }}
        </a>
      </template>
    </DataTable>

    <!-- View/Edit Modal -->
    <Modal
      :model-value="isModalOpen"
      @update:model-value="isModalOpen = $event"
      :title="modalTitle"
      size="xl"
      :show-confirm-button="isEditing"
      :confirm-text="isEditing ? 'Save Changes' : 'Close'"
      @confirm="handleSave"
      @close="closeModal"
    >
      <PublishersForm
        v-if="selectedPublisher"
        :publisher="selectedPublisher"
        :is-editing="isEditing"
        @update="handleFormUpdate"
        @view-series="handleViewSeries"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DataTable, Modal, type TableColumn } from '@/components/common'
import PublishersForm from '@/components/forms/PublishersForm.vue'
import { usePublisherStore, type Publisher, type Series } from '@/core'
import { useImage } from '@/composables'

// ============================================================================
// Stores & Composables
// ============================================================================

const publisherStore = usePublisherStore()
const { getLogoImageUrl } = useImage()

// ============================================================================
// State
// ============================================================================

const isModalOpen = ref(false)
const isEditing = ref(false)
const selectedPublisher = ref<Publisher | null>(null)
const formData = ref<Partial<Publisher>>({})

// ============================================================================
// Table Configuration
// ============================================================================

const columns: TableColumn[] = [
  { key: 'logo_path', label: '', width: '60px', align: 'center' },
  { key: 'publisher_name', label: 'Publisher', sortable: true, type: 'link' },
  { key: 'series_count', label: 'Series', align: 'center', sortable: true },
  { key: 'issue_count', label: 'Issues', align: 'center', sortable: true },
  { key: 'copy_count', label: 'Copies', align: 'center', sortable: true },
  { key: 'total_value', label: 'Total Value', align: 'center', type: 'currency', sortable: true }
]

// ============================================================================
// Computed
// ============================================================================

const modalTitle = computed(() => {
  if (!selectedPublisher.value) return 'Publisher Details'
  return isEditing.value
    ? `Edit: ${selectedPublisher.value.publisher_name}`
    : selectedPublisher.value.publisher_name
})

// ============================================================================
// Methods
// ============================================================================

const handleSearch = (query: string) => {
  publisherStore.setSearch(query)
}

const openViewModal = (record: Publisher) => {
  selectedPublisher.value = { ...record }
  isEditing.value = false
  isModalOpen.value = true
}

const openEditModal = (record: Publisher) => {
  selectedPublisher.value = { ...record }
  formData.value = { ...record }
  isEditing.value = true
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedPublisher.value = null
  formData.value = {}
  isEditing.value = false
}

const handleFormUpdate = (data: Partial<Publisher>) => {
  formData.value = { ...formData.value, ...data }
}

const handleSave = async () => {
  if (!selectedPublisher.value?.publisher_id) return

  await publisherStore.updateRecord(selectedPublisher.value.publisher_id, formData.value)
  closeModal()
}

const handleViewSeries = (series: Series) => {
  // TODO: Navigate to series detail or open series modal
  console.log('View series:', series)
  // You can implement navigation here, for example:
  // router.push({ name: 'series', params: { id: series.series_id } })
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  publisherStore.fetchRecords()
})
</script>

<style scoped lang="scss">
.publisher-page {
  padding: 1rem;
}

.publisher-logo {
  max-height: 30px;
  max-width: 50px;
  object-fit: contain;
}
</style>
