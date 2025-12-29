<template>
  <div class="stats-page">
    <h1>Collection Statistics</h1>

    <!-- Overview Stats -->
    <section class="stats-section">
      <h2>Overview</h2>
      <div class="row" v-if="collectionStats">
        <div class="col-md-2 col-sm-4 col-6">
          <StatCard :value="collectionStats.series_count" label="Series" icon="book-open" variant="primary" type="number" />
        </div>
        <div class="col-md-2 col-sm-4 col-6">
          <StatCard :value="collectionStats.volume_count" label="Volumes" icon="layer-group" variant="info" type="number" />
        </div>
        <div class="col-md-2 col-sm-4 col-6">
          <StatCard :value="collectionStats.issue_count" label="Issues" icon="file-lines" variant="info" type="number" />
        </div>
        <div class="col-md-2 col-sm-4 col-6">
          <StatCard :value="collectionStats.copy_count" label="Copies" icon="copy" variant="success" type="number" />
        </div>
        <div class="col-md-2 col-sm-4 col-6">
          <StatCard :value="collectionStats.total_cost" label="Invested" icon="receipt" variant="warning" type="currency" />
        </div>
        <div class="col-md-2 col-sm-4 col-6">
          <StatCard :value="collectionStats.total_value" label="Value" icon="dollar-sign" variant="success" type="currency" />
        </div>
      </div>
    </section>

    <div class="row">
      <!-- By Publisher -->
      <div class="col-md-6">
        <section class="stats-section">
          <h2>By Publisher</h2>
          <DataTable
            :records="publisherStats"
            :columns="publisherColumns"
            :loading="loadingPublisher"
            :paginated="false"
            :show-header="false"
            :show-actions="false"
            id-field="publisher_id"
            entity-name="publishers"
          />
        </section>
      </div>

      <!-- By Age -->
      <div class="col-md-6">
        <section class="stats-section">
          <h2>By Comic Age</h2>
          <DataTable
            :records="ageStats"
            :columns="ageColumns"
            :loading="loadingAge"
            :paginated="false"
            :show-header="false"
            :show-actions="false"
            id-field="comic_age_id"
            entity-name="ages"
          />
        </section>
      </div>
    </div>

    <div class="row">
      <!-- By Condition -->
      <div class="col-md-6">
        <section class="stats-section">
          <h2>By Condition</h2>
          <DataTable
            :records="conditionStats"
            :columns="conditionColumns"
            :loading="loadingCondition"
            :paginated="false"
            :show-header="false"
            :show-actions="false"
            id-field="condition_id"
            entity-name="conditions"
          />
        </section>
      </div>

      <!-- High Value -->
      <div class="col-md-6">
        <section class="stats-section">
          <h2>Most Valuable Comics</h2>
          <DataTable
            :records="highValueCopies"
            :columns="highValueColumns"
            :loading="loadingHighValue"
            :paginated="false"
            :show-header="false"
            :show-actions="false"
            id-field="copy_id"
            entity-name="copies"
          >
            <template #cell-title="{ record }">
              {{ record.series_title }} #{{ record.issue_number }}
            </template>
          </DataTable>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { StatCard, DataTable, type TableColumn } from '@/components/common'
import { useStatsStore, type CollectionStats, type PublisherStats, type HighValueCopy } from '@/core'
import { fetchWrapper } from '@/core'

const statsStore = useStatsStore()

const collectionStats = ref<CollectionStats | null>(null)
const publisherStats = ref<PublisherStats[]>([])
const ageStats = ref<any[]>([])
const conditionStats = ref<any[]>([])
const highValueCopies = ref<HighValueCopy[]>([])

const loadingPublisher = ref(true)
const loadingAge = ref(true)
const loadingCondition = ref(true)
const loadingHighValue = ref(true)

const publisherColumns: TableColumn[] = [
  { key: 'publisher_name', label: 'Publisher' },
  { key: 'series_count', label: 'Series', align: 'center' },
  { key: 'copy_count', label: 'Copies', align: 'center' },
  { key: 'total_value', label: 'Value', align: 'right', type: 'currency' }
]

const ageColumns: TableColumn[] = [
  { key: 'comic_age', label: 'Age' },
  { key: 'series_count', label: 'Series', align: 'center' },
  { key: 'copy_count', label: 'Copies', align: 'center' },
  { key: 'total_value', label: 'Value', align: 'right', type: 'currency' }
]

const conditionColumns: TableColumn[] = [
  { key: 'condition_code', label: 'Grade' },
  { key: 'condition_text', label: 'Condition' },
  { key: 'copy_count', label: 'Copies', align: 'center' },
  { key: 'total_value', label: 'Value', align: 'right', type: 'currency' }
]

const highValueColumns: TableColumn[] = [
  { key: 'title', label: 'Comic' },
  { key: 'condition_code', label: 'Grade', align: 'center' },
  { key: 'current_value', label: 'Value', align: 'right', type: 'currency' }
]

const loadStats = async () => {
  // Collection overview
  collectionStats.value = await statsStore.fetchCollectionStats()

  // By Publisher
  loadingPublisher.value = true
  publisherStats.value = await statsStore.fetchPublisherStats()
  loadingPublisher.value = false

  // By Age
  loadingAge.value = true
  try {
    const data = await fetchWrapper.get<{ results: any[] }>('http://localhost:3000/api/stats/by-age')
    ageStats.value = data.results
  } catch (e) { console.error(e) }
  loadingAge.value = false

  // By Condition
  loadingCondition.value = true
  try {
    const data = await fetchWrapper.get<{ results: any[] }>('http://localhost:3000/api/stats/by-condition')
    conditionStats.value = data.results
  } catch (e) { console.error(e) }
  loadingCondition.value = false

  // High Value
  loadingHighValue.value = true
  const highValueData = await statsStore.fetchHighValueItems(10)
  if (highValueData) {
    highValueCopies.value = highValueData.copies
  }
  loadingHighValue.value = false
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped lang="scss">
.stats-page {
  padding: 1.5rem;

  h1 {
    margin-bottom: 1.5rem;
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: #495057;
  }
}

.stats-section {
  margin-bottom: 2rem;
}
</style>
