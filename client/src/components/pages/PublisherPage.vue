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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DataTable, type TableColumn } from '@/components/common'
import { usePublisherStore, type Publisher } from '@/core'
import { useImage, useFormatting } from '@/composables'

const publisherStore = usePublisherStore()
const { getLogoImageUrl } = useImage()
const { formatCurrency } = useFormatting()

const isModalOpen = ref(false)
const selectedPublisher = ref<Publisher | null>(null)

const columns: TableColumn[] = [
  { key: 'logo_path', label: '', width: '60px', align: 'center' },
  { key: 'publisher_name', label: 'Publisher', sortable: true, type: 'link' },
  { key: 'series_count', label: 'Series', align: 'center', sortable: true },
  { key: 'issue_count', label: 'Issues', align: 'center', sortable: true },
  { key: 'copy_count', label: 'Copies', align: 'center', sortable: true },
  { key: 'total_value', label: 'Total Value', align: 'center', type: 'currency', sortable: true }
]

const handleSearch = (query: string) => {
  publisherStore.setSearch(query)
}

const openViewModal = (record: Publisher) => {
  selectedPublisher.value = record
  isModalOpen.value = true
}

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
