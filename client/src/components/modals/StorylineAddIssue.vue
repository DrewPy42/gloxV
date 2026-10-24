<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { SearchSelect, type SearchSelectOption } from '@/components/common'
import { API_BASE, fetchWrapper, type Series, type Volume, type Issue } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  existingIssueIds: number[]
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), { saving: false })

const emit = defineEmits<{
  (e: 'add', issueId: number): void
}>()

// ============================================================================
// State
// ============================================================================

const seriesOptions = ref<Series[]>([])
const volumes = ref<Volume[]>([])
const issues = ref<Issue[]>([])

const seriesId = ref<number | string | null>(null)
const volumeId = ref<number | string | null>(null)
const issueId = ref<number | string | null>(null)

const loadingSeries = ref(false)
const loadingVolumes = ref(false)
const loadingIssues = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | undefined

// ============================================================================
// Computed
// ============================================================================

const seriesSelectOptions = computed<SearchSelectOption[]>(() =>
  seriesOptions.value.map(s => ({ value: s.series_id, label: s.title }))
)

const volumeSelectOptions = computed<SearchSelectOption[]>(() =>
  volumes.value.map(v => ({ value: v.volume_id, label: `Volume ${v.volume_number}` }))
)

// Only issues in the collection that aren't already part of the storyline
const availableIssues = computed(() =>
  issues.value.filter(i => (i.copy_count ?? 0) > 0 && !props.existingIssueIds.includes(i.issue_id))
)

const issueSelectOptions = computed<SearchSelectOption[]>(() =>
  availableIssues.value.map(i => ({
    value: i.issue_id,
    label: `#${i.issue_number}`,
    sublabel: i.issue_title || undefined
  }))
)

// ============================================================================
// Methods
// ============================================================================

const searchSeries = (text = '') => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    loadingSeries.value = true
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (text) params.set('search', text)
      const data = await fetchWrapper.get<{ results: Series[] }>(`${API_BASE}/series?${params}`)
      seriesOptions.value = data.results
    } catch (err) {
      console.error('Error searching series:', err)
    } finally {
      loadingSeries.value = false
    }
  }, 250)
}

const loadIssues = async (query: string) => {
  loadingIssues.value = true
  try {
    const data = await fetchWrapper.get<{ results: Issue[] }>(`${API_BASE}/issues?${query}`)
    issues.value = data.results
  } catch (err) {
    console.error('Error fetching issues:', err)
  } finally {
    loadingIssues.value = false
  }
}

const handleAdd = () => {
  if (issueId.value === null) return
  emit('add', Number(issueId.value))
  issueId.value = null
}

// ============================================================================
// Watchers
// ============================================================================

watch(seriesId, async (id) => {
  volumeId.value = null
  issueId.value = null
  volumes.value = []
  issues.value = []
  if (id === null) return

  loadingVolumes.value = true
  try {
    const data = await fetchWrapper.get<{ results: Volume[] }>(`${API_BASE}/volumes?series_id=${id}`)
    volumes.value = data.results
  } catch (err) {
    console.error('Error fetching volumes:', err)
  } finally {
    loadingVolumes.value = false
  }

  // A series with no volumes still has issues to choose from
  if (volumes.value.length === 0) await loadIssues(`series_id=${id}`)
})

watch(volumeId, async (id) => {
  issueId.value = null
  issues.value = []
  if (id !== null) await loadIssues(`volume_id=${id}`)
})

searchSeries()
</script>

<template>
  <div class="add-issue-panel">
    <h5>Add an issue</h5>
    <div class="row g-2 align-items-end">
      <div class="col-md-4">
        <SearchSelect
          v-model="seriesId"
          label="Series"
          placeholder="Search series..."
          :options="seriesSelectOptions"
          :loading="loadingSeries"
          @search="searchSeries"
        />
      </div>
      <div class="col-md-3">
        <SearchSelect
          v-model="volumeId"
          label="Volume"
          placeholder="Select volume..."
          :options="volumeSelectOptions"
          :loading="loadingVolumes"
          :disabled="seriesId === null || (!loadingVolumes && volumes.length === 0)"
        />
      </div>
      <div class="col-md-3">
        <SearchSelect
          v-model="issueId"
          label="Issue"
          placeholder="Select issue..."
          :options="issueSelectOptions"
          :loading="loadingIssues"
          :disabled="seriesId === null || (volumes.length > 0 && volumeId === null)"
        />
      </div>
      <div class="col-md-2">
        <button
          type="button"
          class="btn btn-primary w-100"
          :disabled="issueId === null || saving"
          @click="handleAdd"
        >
          Add
        </button>
      </div>
    </div>
    <small class="text-muted">Only issues in your collection that aren't already in this storyline are listed.</small>
  </div>
</template>

<style scoped lang="scss">
.add-issue-panel {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}
</style>
