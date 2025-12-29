<template>
  <div class="storyline-page">
    <h1>Storylines</h1>
    
    <DataTable
      :records="storylineStore.records"
      :columns="columns"
      :loading="storylineStore.loading"
      :total-records="storylineStore.totalRecords"
      :total-pages="storylineStore.totalPages"
      :current-page="storylineStore.currentPage"
      :per-page="storylineStore.perPage"
      id-field="storyline_id"
      entity-name="storylines"
      :show-add-button="true"
      :actions="['view', 'edit', 'delete']"
      @search="handleSearch"
      @page-changed="storylineStore.setPage"
      @per-page-changed="storylineStore.setPerPage"
      @row-click="handleRowClick"
      @view="openViewModal"
    >
      <template #cell-name="{ record }">
        <a href="#" @click.prevent="openViewModal(record)">
          {{ record.name }}
        </a>
      </template>

      <template #cell-storyline_type="{ record }">
        <span class="badge" :class="getTypeBadgeClass(record.storyline_type)">
          {{ record.storyline_type }}
        </span>
      </template>
    </DataTable>

    <!-- View Modal -->
    <Modal
      v-model="isModalOpen"
      :title="selectedStoryline?.name || 'Storyline'"
      size="xl"
      :show-confirm-button="false"
    >
      <div v-if="storylineDetails" class="storyline-details">
        <p v-if="storylineDetails.storyline.description">
          {{ storylineDetails.storyline.description }}
        </p>
        
        <h5>Reading Order ({{ storylineDetails.issues.length }} issues)</h5>
        <div class="reading-order-list">
          <div 
            v-for="issue in storylineDetails.issues" 
            :key="issue.storyline_issue_id"
            class="reading-order-item"
            :class="{ owned: issue.owned }"
          >
            <span class="order">{{ issue.reading_order }}</span>
            <span class="part-label" v-if="issue.part_label">{{ issue.part_label }}</span>
            <span class="series">{{ issue.series_title }}</span>
            <span class="issue">#{{ issue.issue_number }}</span>
            <span class="owned-badge" v-if="issue.owned">
              <font-awesome-icon :icon="['fas', 'check']" />
            </span>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DataTable, Modal, type TableColumn } from '@/components/common'
import { useStorylineStoreExtended, type Storyline } from '@/core'
import { useFormatting } from '@/composables'

const storylineStore = useStorylineStoreExtended()
const { formatDate } = useFormatting()

const isModalOpen = ref(false)
const selectedStoryline = ref<Storyline | null>(null)
const storylineDetails = ref<any>(null)

const columns: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, type: 'link' },
  { key: 'storyline_type', label: 'Type', align: 'center' },
  { key: 'start_date', label: 'Start', align: 'center', type: 'date' },
  { key: 'end_date', label: 'End', align: 'center', type: 'date' },
  { key: 'issue_count', label: 'Issues', align: 'center' }
]

const getTypeBadgeClass = (type: string) => ({
  'bg-primary': type === 'crossover',
  'bg-success': type === 'event',
  'bg-info': type === 'arc',
  'bg-secondary': type === 'other'
})

const handleSearch = (query: string) => {
  storylineStore.setSearch(query)
}

const handleRowClick = (record: Storyline) => {
  openViewModal(record)
}

const openViewModal = async (record: Storyline) => {
  selectedStoryline.value = record
  isModalOpen.value = true
  storylineDetails.value = await storylineStore.fetchStorylineWithIssues(record.storyline_id)
}

onMounted(() => {
  storylineStore.fetchRecords()
})
</script>

<style scoped lang="scss">
.storyline-page {
  padding: 1rem;
}

.reading-order-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.reading-order-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-radius: 0.25rem;
  border-left: 3px solid #dee2e6;

  &.owned {
    border-left-color: #198754;
    background: rgba(25, 135, 84, 0.05);
  }

  .order {
    width: 30px;
    font-weight: 600;
    color: #6c757d;
  }

  .part-label {
    font-size: 0.875rem;
    color: #6c757d;
  }

  .series {
    flex: 1;
    font-weight: 500;
  }

  .issue {
    font-weight: 600;
  }

  .owned-badge {
    color: #198754;
  }
}
</style>
