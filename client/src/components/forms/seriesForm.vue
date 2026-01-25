<template>
  <div class="series-form">
    <div class="row">
      <!-- Main Details Column -->
      <div class="col-md-8">
        <Card title="Series Details">
          <div class="row">
            <div class="col-md-8">
              <FormField
                v-model="formData.title"
                label="Title"
                :required="true"
                :disabled="!isEditing"
                :error-message="errors.title"
              />
            </div>
            <div class="col-md-4">
              <FormField
                v-model="formData.sort_title"
                label="Sort Title"
                :disabled="!isEditing"
                help-text="Leave blank to use main title"
              />
            </div>
          </div>

          <div class="row">
            <div class="col-md-6">
              <FormField
                v-model="formData.publisher_id"
                type="select"
                label="Publisher"
                :options="publisherOptions"
                :disabled="!isEditing"
                placeholder="Select Publisher"
              />
            </div>
            <div class="col-md-3">
              <FormField
                v-model="formData.is_limited_series"
                type="checkbox"
                label="Series Type"
                checkbox-label="Limited Series"
                :disabled="!isEditing"
              />
            </div>
            <div class="col-md-3">
              <FormField
                v-if="formData.is_limited_series"
                v-model="formData.limited_series_count"
                type="number"
                label="Issue Count"
                :min="1"
                :disabled="!isEditing"
              />
            </div>
          </div>

          <FormField
            v-model="formData.notes"
            type="textarea"
            label="Notes"
            :rows="3"
            :disabled="!isEditing"
          />
        </Card>

        <!-- Volumes Section -->
        <Card title="Volumes" v-if="series.series_id">
          <template #header-actions>
            <button 
              v-if="isEditing" 
              class="btn btn-sm btn-primary"
              @click="addVolume"
            >
              <font-awesome-icon :icon="['fas', 'plus']" /> Add Volume
            </button>
          </template>
          
          <div v-if="volumes.length === 0" class="text-muted text-center py-3">
            No volumes found
          </div>
          <div v-else class="volume-list">
            <div 
              v-for="volume in volumes" 
              :key="volume.volume_id"
              class="volume-item"
              :class="{ active: selectedVolumeId === volume.volume_id }"
              @click="selectVolume(volume)"
            >
              <span class="volume-number">Vol. {{ volume.volume_number }}</span>
              <span class="volume-issues">{{ volume.issue_count || 0 }} issues</span>
            </div>
          </div>
        </Card>

        <!-- Issues Section -->
        <Card title="Issues" v-if="selectedVolumeId">
          <template #header-actions>
            <button 
              v-if="isEditing" 
              class="btn btn-sm btn-primary"
              @click="addIssue"
            >
              <font-awesome-icon :icon="['fas', 'plus']" /> Add Issue
            </button>
          </template>
          
          <DataTable
            :records="issues"
            :columns="issueColumns"
            :loading="loadingIssues"
            :paginated="false"
            :show-header="false"
            :show-footer="false"
            :show-actions="isEditing"
            :actions="['edit', 'delete']"
            id-field="issue_id"
            entity-name="issues"
            @edit="editIssue"
            @delete="deleteIssue"
          >
            <template #cell-cover_images="{ record }">
              <div class="cover-stack">
                <template v-if="record.cover_images">
                  <img
                    v-for="(coverPath, index) in getCoverPaths(record.cover_images)"
                    :key="index"
                    :src="getCoverImageUrl(coverPath)"
                    :alt="`Cover ${index + 1}`"
                    class="issue-cover-thumb"
                    :style="{ zIndex: 10 - index }"
                  />
                  <span
                    v-if="record.cover_count > getCoverPaths(record.cover_images).length"
                    class="cover-more-badge"
                  >
                    +{{ record.cover_count - getCoverPaths(record.cover_images).length }}
                  </span>
                </template>
                <img
                  v-else
                  :src="getCoverImageUrl(null)"
                  alt="No cover"
                  class="issue-cover-thumb"
                />
              </div>
            </template>
          </DataTable>
        </Card>
      </div>

      <!-- Stats Column -->
      <div class="col-md-4">
        <Card title="Statistics" v-if="series.series_id">
          <div class="stats-grid">
            <StatCard
              :value="stats.volume_count || 0"
              label="Volumes"
              icon="layer-group"
              variant="info"
              type="number"
            />
            <StatCard
              :value="stats.issue_count || 0"
              label="Issues"
              icon="book"
              variant="info"
              type="number"
            />
            <StatCard
              :value="stats.copy_count || 0"
              label="Copies"
              icon="copy"
              variant="info"
              type="number"
            />
            <StatCard
              :value="stats.total_cost || 0"
              label="Total Cost"
              icon="receipt"
              variant="warning"
              type="currency"
            />
            <StatCard
              :value="stats.total_value || 0"
              label="Total Value"
              icon="dollar-sign"
              variant="success"
              type="currency"
            />
            <StatCard
              :value="valueChangePercent"
              label="Value Change"
              icon="chart-line"
              :variant="valueChangePercent >= 0 ? 'success' : 'danger'"
              type="percentage"
            />
          </div>

          <div class="text-center mt-3">
            <button 
              class="btn btn-outline-secondary btn-sm"
              @click="refreshStats"
              :disabled="loadingStats"
            >
              <font-awesome-icon :icon="['fas', 'arrows-rotate']" :spin="loadingStats" />
              Refresh Stats
            </button>
          </div>
        </Card>

        <Card title="Publisher" v-if="series.publisher_name">
          <div class="publisher-info text-center">
            <img
              v-if="series.logo_path"
              :src="getLogoImageUrl(series.logo_path)"
              :alt="series.publisher_name"
              class="publisher-logo mb-2"
            />
            <h6>{{ series.publisher_name }}</h6>
            <a 
              v-if="series.website" 
              :href="series.website" 
              target="_blank"
              class="small"
            >
              Visit Website
            </a>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Card, FormField, StatCard, DataTable, type TableColumn } from '@/components/common'
import { useVolumeStore, useIssueStore, useStatsStore, type Series, type Volume, type Issue } from '@/core'
import { useImage } from '@/composables'
import { format } from 'date-fns'


// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  series: Series
  isEditing?: boolean
  publishers?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  publishers: () => []
})

const emit = defineEmits<{
  (e: 'update', data: Partial<Series>): void
}>()

// ============================================================================
// Stores & Composables
// ============================================================================

const volumeStore = useVolumeStore()
const issueStore = useIssueStore()
const statsStore = useStatsStore()
const { getCoverImageUrl, getLogoImageUrl } = useImage()

// ============================================================================
// State
// ============================================================================

const formData = ref<Partial<Series>>({})
const errors = ref<Record<string, string>>({})
const volumes = ref<Volume[]>([])
const issues = ref<Issue[]>([])
const stats = ref<any>({})
const selectedVolumeId = ref<number | null>(null)
const loadingIssues = ref(false)
const loadingStats = ref(false)

// ============================================================================
// Computed
// ============================================================================

const publisherOptions = computed(() => 
  props.publishers.map(p => ({
    value: p.publisher_id,
    label: p.publisher_name
  }))
)

const valueChangePercent = computed(() => {
  if (!stats.value.total_cost || stats.value.total_cost === 0) return 0
  return (stats.value.total_value - stats.value.total_cost) / stats.value.total_cost
})

const issueColumns: TableColumn[] = [
  { key: 'cover_images', label: '', width: '80px' },
  { key: 'issue_number', label: '#', width: '60px' },
  { key: 'issue_title', label: 'Title' },
  { key: 'cover_date', label: 'Date', type: 'text', formatter: (value) => value ? format(new Date(value), 'MMM yyyy') : ''},
  { key: 'copy_count', label: 'Copies', align: 'center' },
]

// ============================================================================
// Methods
// ============================================================================

const loadVolumes = async () => {
  if (!props.series.series_id) return
  
  await volumeStore.fetchRecords({ 
    filters: { series_id: props.series.series_id },
    limit: 100
  })
  volumes.value = volumeStore.records
  
  // Auto-select first volume
  if (volumes.value.length > 0 && !selectedVolumeId.value) {
    selectVolume(volumes.value[0])
  }
}

const loadIssues = async (volumeId: number) => {
  loadingIssues.value = true
  await issueStore.fetchRecords({
    filters: { volume_id: volumeId },
    limit: 200
  })
  issues.value = issueStore.records
  loadingIssues.value = false
}

const loadStats = async () => {
  if (!props.series.series_id) return
  
  loadingStats.value = true
  const data = await statsStore.fetchSeriesStats(props.series.series_id)
  if (data) {
    stats.value = data
  }
  loadingStats.value = false
}

const refreshStats = () => {
  loadStats()
}

const selectVolume = (volume: Volume) => {
  selectedVolumeId.value = volume.volume_id
  loadIssues(volume.volume_id)
}

const addVolume = () => {
  // TODO: Open volume add modal
  console.log('Add volume')
}

const addIssue = () => {
  // TODO: Open issue add modal
  console.log('Add issue')
}

const editIssue = (issue: Issue) => {
  // TODO: Open issue edit modal
  console.log('Edit issue', issue)
}

const deleteIssue = (issue: Issue) => {
  // TODO: Confirm and delete issue
  console.log('Delete issue', issue)
}

const getCoverPaths = (coverImagesString: string): string[] => {
  if (!coverImagesString) return []
  // Split comma-separated string and limit to first 4
  return coverImagesString.split(',').slice(0, 4)
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.series, (newSeries) => {
  formData.value = { ...newSeries }
}, { immediate: true })

watch(formData, (newData) => {
  emit('update', newData)
}, { deep: true })

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  if (props.series.series_id) {
    loadVolumes()
    loadStats()
  }
})
</script>

<style scoped lang="scss">
.series-form {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .volume-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .volume-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 1rem;
    border: 1px solid #dee2e6;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #0d6efd;
      background-color: rgba(13, 110, 253, 0.05);
    }

    &.active {
      border-color: #0d6efd;
      background-color: rgba(13, 110, 253, 0.1);
    }

    .volume-number {
      font-weight: 600;
    }

    .volume-issues {
      font-size: 0.75rem;
      color: #6c757d;
    }
  }

  .cover-stack {
    display: flex;
    align-items: center;
    position: relative;
    height: 40px;
    min-width: 60px;
  }

  .issue-cover-thumb {
    height: 40px;
    width: auto;
    object-fit: contain;
    border: 1px solid #dee2e6;
    border-radius: 2px;
    background: white;
    position: relative;

    &:not(:first-child) {
      margin-left: -15px;
    }
  }

  .cover-more-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    margin-left: 4px;
    background-color: #6c757d;
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 12px;
    white-space: nowrap;
  }

  .publisher-logo {
    max-height: 60px;
    max-width: 120px;
    object-fit: contain;
  }

  .publisher-info {
    h6 {
      margin-bottom: 0.25rem;
    }
  }
}
</style>
