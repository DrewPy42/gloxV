<template>
  <Modal
    v-model="isOpen"
    title="Bulk Assign Copies to Location"
    size="xl"
    @close="handleClose"
  >
    <template #default>
      <div class="bulk-location-modal">

        <!-- Step indicator -->
        <div class="steps d-flex align-items-center gap-2 mb-4">
          <div class="step" :class="{ active: step === 1, done: step > 1 }">
            <span class="step-num">1</span>
            <span class="step-label">Choose Location</span>
          </div>
          <div class="step-line flex-grow-1" />
          <div class="step" :class="{ active: step === 2, done: step > 2 }">
            <span class="step-num">2</span>
            <span class="step-label">Select Copies</span>
          </div>
          <div class="step-line flex-grow-1" />
          <div class="step" :class="{ active: step === 3 }">
            <span class="step-num">3</span>
            <span class="step-label">Confirm</span>
          </div>
        </div>

        <!-- Step 1: Location -->
        <div v-if="step === 1">
          <p class="text-muted small mb-3">Choose the storage location you want to assign copies to.</p>
          <FormField
            v-model="selectedLocationId"
            type="select"
            label="Target Location"
            placeholder="Select a storage location…"
            :options="locationOptions"
            required
          />
        </div>

        <!-- Step 2: Copy selector -->
        <div v-else-if="step === 2">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span class="fw-semibold">{{ totalSelected }} cop{{ totalSelected === 1 ? 'y' : 'ies' }} selected</span>
              <span v-if="selectedLocation" class="text-muted ms-2 small">→ {{ locationLabel(selectedLocation) }}</span>
            </div>
            <div class="d-flex align-items-center gap-3">
              <div class="form-check form-switch mb-0">
                <input
                  id="showAssigned"
                  v-model="showAssigned"
                  type="checkbox"
                  class="form-check-input"
                  @change="loadTree"
                />
                <label for="showAssigned" class="form-check-label small">Show assigned</label>
              </div>
              <button class="btn btn-link btn-sm p-0" @click="selectAll">Select all</button>
              <button class="btn btn-link btn-sm p-0" @click="deselectAll">Deselect all</button>
            </div>
          </div>

          <div v-if="treeLoading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status" />
            <span class="ms-2 text-muted small">Loading copies…</span>
          </div>

          <div v-else-if="tree.length === 0" class="text-center py-4 text-muted small">
            No copies found.
            <span v-if="!showAssigned"> Try enabling "Show assigned".</span>
          </div>

          <div v-else class="tree-scroll">
            <!-- Series -->
            <div v-for="series in tree" :key="series.series_id" class="series-node">
              <div class="node-row series-row" @click="toggleSeriesExpand(series)">
                <font-awesome-icon
                  v-if="!series.loading"
                  :icon="['fas', expandedSeries.has(series.series_id) ? 'chevron-down' : 'chevron-right']"
                  class="toggle-icon"
                />
                <font-awesome-icon v-else :icon="['fas', 'spinner']" spin class="toggle-icon" />
                <input
                  type="checkbox"
                  class="form-check-input node-check"
                  :checked="isSeriesChecked(series)"
                  v-indeterminate="isSeriesIndeterminate(series)"
                  @change.stop="toggleSeries(series)"
                  @click.stop
                />
                <span class="node-title">{{ series.series_title }}</span>
                <span class="node-count">{{ series.copy_count }} cop{{ series.copy_count === 1 ? 'y' : 'ies' }}</span>
              </div>

              <!-- Volumes -->
              <div v-if="expandedSeries.has(series.series_id)" class="children">
                <div v-for="volume in series.volumes" :key="volumeKey(volume)" class="volume-node">
                  <div class="node-row volume-row" @click="toggleVolumeExpand(series.series_id, volumeKey(volume))">
                    <font-awesome-icon
                      :icon="['fas', expandedVolumes.has(volumeExpandKeyById(series.series_id, volumeKey(volume))) ? 'chevron-down' : 'chevron-right']"
                      class="toggle-icon"
                    />
                    <input
                      type="checkbox"
                      class="form-check-input node-check"
                      :checked="isVolumeChecked(volume)"
                      v-indeterminate="isVolumeIndeterminate(volume)"
                      @change.stop="toggleVolume(volume)"
                      @click.stop
                    />
                    <span class="node-title">
                      {{ volume.volume_number != null ? `Vol. ${volume.volume_number}` : 'No Volume' }}
                    </span>
                    <span class="node-count">{{ volume.copy_count }}</span>
                  </div>

                  <!-- Issues -->
                  <div v-if="expandedVolumes.has(volumeExpandKeyById(series.series_id, volumeKey(volume)))" class="children">
                    <div v-for="issue in volume.issues" :key="issue.issue_id" class="issue-node">
                      <div class="node-row issue-row" @click="toggleIssueExpand(issue.issue_id)">
                        <font-awesome-icon
                          :icon="['fas', issue.copies.length > 1 && expandedIssues.has(issue.issue_id) ? 'chevron-down' : issue.copies.length > 1 ? 'chevron-right' : 'minus']"
                          class="toggle-icon"
                          :class="{ invisible: issue.copies.length <= 1 }"
                        />
                        <input
                          type="checkbox"
                          class="form-check-input node-check"
                          :checked="isIssueChecked(issue)"
                          v-indeterminate="isIssueIndeterminate(issue)"
                          @change.stop="toggleIssue(issue)"
                          @click.stop
                        />
                        <span class="node-title">
                          #{{ issue.issue_number }}<span v-if="issue.issue_title" class="text-muted"> — {{ issue.issue_title }}</span>
                        </span>
                        <span class="node-count">{{ issue.copies.length }}</span>
                      </div>

                      <!-- Copies (only shown if multiple copies of same issue) -->
                      <div v-if="issue.copies.length > 1 && expandedIssues.has(issue.issue_id)" class="children">
                        <div v-for="copy in issue.copies" :key="copy.copy_id" class="copy-node">
                          <div class="node-row copy-row">
                            <span class="toggle-icon" />
                            <input
                              type="checkbox"
                              class="form-check-input node-check"
                              :checked="selectedCopyIds.has(copy.copy_id)"
                              @change.stop="toggleCopy(copy.copy_id)"
                              @click.stop
                            />
                            <span class="node-title">
                              {{ copy.format }}
                              <span v-if="copy.location_id" class="badge bg-secondary ms-1 small">
                                {{ copy.divider || copy.location_name || copy.storage_type }}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-else-if="step === 3">
          <div class="alert alert-info mb-3">
            <font-awesome-icon :icon="['fas', 'info-circle']" class="me-2" />
            <strong>{{ totalSelected }}</strong> cop{{ totalSelected === 1 ? 'y' : 'ies' }} will be assigned to
            <strong>{{ selectedLocation ? locationLabel(selectedLocation) : '' }}</strong>.
          </div>

          <div v-if="confirmSample.length > 0">
            <p class="text-muted small mb-2">Sample of selected copies:</p>
            <div class="sample-list">
              <div
                v-for="row in confirmSample"
                :key="row.copy_id"
                class="d-flex justify-content-between align-items-center py-1 border-bottom small"
              >
                <span>{{ row.series_title }} #{{ row.issue_number }} <span class="text-muted">({{ row.format }})</span></span>
                <span v-if="row.location_id" class="badge bg-secondary">currently: {{ row.divider || row.location_name }}</span>
              </div>
              <div v-if="totalSelected > confirmSample.length" class="text-center text-muted small py-1">
                … and {{ totalSelected - confirmSample.length }} more
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">Cancel</button>

      <button v-if="step > 1 && !(step === 2 && props.presetLocationId)" type="button" class="btn btn-outline-secondary" @click="step--">
        <font-awesome-icon :icon="['fas', 'arrow-left']" class="me-1" />
        Back
      </button>

      <!-- Step 1 → 2 -->
      <button
        v-if="step === 1"
        type="button"
        class="btn btn-primary"
        :disabled="!selectedLocationId"
        @click="goToStep2"
      >
        Next
        <font-awesome-icon :icon="['fas', 'arrow-right']" class="ms-1" />
      </button>

      <!-- Step 2 → 3 -->
      <button
        v-if="step === 2"
        type="button"
        class="btn btn-primary"
        :disabled="totalSelected === 0"
        @click="goToStep3"
      >
        Review ({{ totalSelected }})
        <font-awesome-icon :icon="['fas', 'arrow-right']" class="ms-1" />
      </button>

      <!-- Step 3: Assign -->
      <button
        v-if="step === 3"
        type="button"
        class="btn btn-primary"
        :disabled="assigning"
        @click="handleAssign"
      >
        <font-awesome-icon :icon="['fas', assigning ? 'spinner' : 'check']" :spin="assigning" class="me-1" />
        {{ assigning ? 'Assigning…' : `Assign ${totalSelected} Copies` }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal, FormField } from '@/components/common'
import { useLocationStore } from '@/core'
import { useToast } from '@/composables'
import type { Location } from '@/core'

// ============================================================================
// Types
// ============================================================================

interface CopyNode {
  copy_id: number
  format: string
  location_id: number | null
  location_name?: string
  storage_type?: string
  divider?: string
  cover_price?: number
  current_value?: number
  notes?: string
}

interface IssueNode {
  issue_id: number
  issue_number: string
  issue_title?: string
  sort_order: number
  copies: CopyNode[]
}

interface VolumeNode {
  volume_id: number | null
  volume_number: number | null
  issues: IssueNode[]
  copy_count: number
}

// Returned from /api/copy-tree (series list only)
interface SeriesSummary {
  series_id: number
  series_title: string
  series_sort_title?: string
  copy_count: number
}

// Full series node with loaded volumes (populated lazily)
interface SeriesNode extends SeriesSummary {
  volumes: VolumeNode[]
  loading: boolean
  loaded: boolean
}

// Custom directive: sets the indeterminate DOM property (not an HTML attribute)
const vIndeterminate = {
  mounted: (el: HTMLInputElement, binding: { value: boolean }) => { el.indeterminate = binding.value },
  updated: (el: HTMLInputElement, binding: { value: boolean }) => { el.indeterminate = binding.value },
}

// ============================================================================
// Props / Emits
// ============================================================================

interface Props {
  modelValue: boolean
  presetLocationId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  presetLocationId: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'assigned': [count: number]
}>()

// ============================================================================
// Stores / composables
// ============================================================================

const locationStore = useLocationStore()
const toast = useToast()

// ============================================================================
// State
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const step = ref(1)
const selectedLocationId = ref<number | null>(null)
const showAssigned = ref(false)
const assigning = ref(false)

const tree = ref<SeriesNode[]>([])
const treeLoading = ref(false)

const selectedCopyIds = ref(new Set<number>())
const expandedSeries = ref(new Set<number>())
const expandedVolumes = ref(new Set<string>())
const expandedIssues = ref(new Set<number>())

// Track copy_ids that were selected from a series before it was expanded
// (when checking a series before its children load, we use copy_count as a sentinel)
const seriesFullySelected = ref(new Set<number>())

// ============================================================================
// Computed
// ============================================================================

const selectedLocation = computed(() =>
  locationStore.records.find(l => l.location_id === selectedLocationId.value) ?? null
)

const locationOptions = computed(() =>
  locationStore.records
    .map(l => ({ value: l.location_id, label: locationLabel(l) }))
)

const totalSelected = computed(() => {
  let count = selectedCopyIds.value.size
  for (const s of tree.value) {
    if (seriesFullySelected.value.has(s.series_id) && !s.loaded) {
      count += s.copy_count
    }
  }
  return count
})

const confirmSample = computed(() => {
  const out: Array<CopyNode & { series_title: string; issue_number: string }> = []
  for (const series of tree.value) {
    if (!series.loaded) continue
    for (const vol of series.volumes) {
      for (const issue of vol.issues) {
        for (const copy of issue.copies) {
          if (selectedCopyIds.value.has(copy.copy_id)) {
            out.push({ ...copy, series_title: series.series_title, issue_number: issue.issue_number })
            if (out.length >= 10) return out
          }
        }
      }
    }
  }
  return out
})

// ============================================================================
// Helpers
// ============================================================================

function locationLabel(l: Location) {
  const leaf = l.divider || l.location_name || l.storage_type
  if (l.location_path) return `${l.location_path} / ${leaf}`
  const parts: string[] = []
  if (l.cabinet_number) parts.push(`Cabinet ${l.cabinet_number}`)
  if (l.drawer_number) parts.push(`Drawer ${l.drawer_number}`)
  parts.push(leaf)
  return parts.join(' / ')
}

function volumeKey(v: VolumeNode) {
  return v.volume_id ?? -1
}

function volumeExpandKeyById(seriesId: number, volKey: number) {
  return `${seriesId}-${volKey}`
}

function allCopyIdsIn(items: SeriesNode[] | VolumeNode[] | IssueNode[]): number[] {
  const ids: number[] = []
  for (const item of items as any[]) {
    if ('copies' in item) {
      ids.push(...(item as IssueNode).copies.map(c => c.copy_id))
    } else if ('issues' in item) {
      for (const issue of (item as VolumeNode).issues) {
        ids.push(...issue.copies.map(c => c.copy_id))
      }
    } else if ('volumes' in item) {
      for (const vol of (item as SeriesNode).volumes) {
        for (const issue of vol.issues) {
          ids.push(...issue.copies.map(c => c.copy_id))
        }
      }
    }
  }
  return ids
}

// ============================================================================
// Check state helpers
// ============================================================================

function isSeriesChecked(s: SeriesNode) {
  if (seriesFullySelected.value.has(s.series_id)) return true
  if (!s.loaded) return false
  const ids = allCopyIdsIn([s])
  return ids.length > 0 && ids.every(id => selectedCopyIds.value.has(id))
}
function isSeriesIndeterminate(s: SeriesNode) {
  if (seriesFullySelected.value.has(s.series_id)) return false
  if (!s.loaded) return false
  const ids = allCopyIdsIn([s])
  const sel = ids.filter(id => selectedCopyIds.value.has(id)).length
  return sel > 0 && sel < ids.length
}
function isVolumeChecked(v: VolumeNode) {
  const ids = allCopyIdsIn([v])
  return ids.length > 0 && ids.every(id => selectedCopyIds.value.has(id))
}
function isVolumeIndeterminate(v: VolumeNode) {
  const ids = allCopyIdsIn([v])
  const sel = ids.filter(id => selectedCopyIds.value.has(id)).length
  return sel > 0 && sel < ids.length
}
function isIssueChecked(i: IssueNode) {
  return i.copies.length > 0 && i.copies.every(c => selectedCopyIds.value.has(c.copy_id))
}
function isIssueIndeterminate(i: IssueNode) {
  const sel = i.copies.filter(c => selectedCopyIds.value.has(c.copy_id)).length
  return sel > 0 && sel < i.copies.length
}

// ============================================================================
// Toggle helpers
// ============================================================================

function toggleSeries(s: SeriesNode) {
  if (isSeriesChecked(s)) {
    seriesFullySelected.value.delete(s.series_id)
    if (s.loaded) {
      allCopyIdsIn([s]).forEach(id => selectedCopyIds.value.delete(id))
    }
  } else {
    if (s.loaded) {
      allCopyIdsIn([s]).forEach(id => selectedCopyIds.value.add(id))
    } else {
      // Mark entire series as selected; IDs will be added when loaded
      seriesFullySelected.value.add(s.series_id)
    }
  }
}
function toggleVolume(v: VolumeNode) {
  const ids = allCopyIdsIn([v])
  if (isVolumeChecked(v)) {
    ids.forEach(id => selectedCopyIds.value.delete(id))
  } else {
    ids.forEach(id => selectedCopyIds.value.add(id))
  }
}
function toggleIssue(i: IssueNode) {
  const ids = i.copies.map(c => c.copy_id)
  if (isIssueChecked(i)) {
    ids.forEach(id => selectedCopyIds.value.delete(id))
  } else {
    ids.forEach(id => selectedCopyIds.value.add(id))
  }
}
function toggleCopy(id: number) {
  if (selectedCopyIds.value.has(id)) {
    selectedCopyIds.value.delete(id)
  } else {
    selectedCopyIds.value.add(id)
  }
}

function selectAll() {
  for (const s of tree.value) {
    if (s.loaded) {
      allCopyIdsIn([s]).forEach(id => selectedCopyIds.value.add(id))
    } else {
      seriesFullySelected.value.add(s.series_id)
    }
  }
}
function deselectAll() {
  selectedCopyIds.value.clear()
  seriesFullySelected.value.clear()
}

// ============================================================================
// Expand toggles
// ============================================================================

async function toggleSeriesExpand(series: SeriesNode) {
  if (expandedSeries.value.has(series.series_id)) {
    expandedSeries.value.delete(series.series_id)
    return
  }
  expandedSeries.value.add(series.series_id)
  if (!series.loaded) {
    await loadSeriesDetail(series)
  }
}
function toggleVolumeExpand(seriesId: number, volKey: number) {
  const key = `${seriesId}-${volKey}`
  if (expandedVolumes.value.has(key)) {
    expandedVolumes.value.delete(key)
  } else {
    expandedVolumes.value.add(key)
  }
}
function toggleIssueExpand(issueId: number) {
  if (expandedIssues.value.has(issueId)) {
    expandedIssues.value.delete(issueId)
  } else {
    expandedIssues.value.add(issueId)
  }
}

// ============================================================================
// Data loading
// ============================================================================

async function loadTree() {
  treeLoading.value = true
  expandedSeries.value.clear()
  try {
    const res = await fetch(`/api/copy-tree?include_assigned=${showAssigned.value}`)
    if (!res.ok) {
      console.error(`copy-tree ${res.status}`)
      toast.error('Failed to load series list')
      return
    }
    const data = await res.json()
    tree.value = (data.series ?? []).map((s: SeriesSummary) => ({
      ...s,
      volumes: [],
      loading: false,
      loaded: false,
    }))
  } catch (err) {
    console.error(err)
    toast.error('Failed to load series list')
  } finally {
    treeLoading.value = false
  }
}

async function loadSeriesDetail(series: SeriesNode) {
  series.loading = true
  try {
    const res = await fetch(`/api/copy-tree/${series.series_id}?include_assigned=${showAssigned.value}`)
    if (!res.ok) {
      console.error(`copy-tree/${series.series_id} ${res.status}`)
      toast.error('Failed to load series detail')
      return
    }
    const data = await res.json()
    series.volumes = data.volumes ?? []
    series.loaded = true

    // If the series was pre-selected, now add all its copy IDs
    if (seriesFullySelected.value.has(series.series_id)) {
      allCopyIdsIn([series]).forEach(id => selectedCopyIds.value.add(id))
    }
  } catch (err) {
    console.error(err)
    toast.error('Failed to load series detail')
  } finally {
    series.loading = false
  }
}

// ============================================================================
// Navigation
// ============================================================================

async function goToStep2() {
  step.value = 2
  await loadTree()
}

function goToStep3() {
  step.value = 3
}

// ============================================================================
// Assign
// ============================================================================

async function handleAssign() {
  if (!selectedLocationId.value || totalSelected.value === 0) return
  assigning.value = true
  try {
    // Load any series that were fully-selected but never expanded
    const pending = tree.value.filter(s => seriesFullySelected.value.has(s.series_id) && !s.loaded)
    await Promise.all(pending.map(s => loadSeriesDetail(s)))

    const res = await fetch('/api/copies/bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        copy_ids: Array.from(selectedCopyIds.value),
        updates: { location_id: selectedLocationId.value },
      }),
    })
    if (!res.ok) {
      toast.error('Failed to assign copies')
      return
    }
    const result = await res.json()
    toast.success(`Assigned ${result.updated_count} copies`)
    emit('assigned', result.updated_count)
    handleClose()
  } catch (err) {
    console.error(err)
    toast.error('Failed to assign copies')
  } finally {
    assigning.value = false
  }
}

// ============================================================================
// Close / reset
// ============================================================================

function handleClose() {
  isOpen.value = false
  step.value = 1
  selectedLocationId.value = null
  showAssigned.value = false
  tree.value = []
  selectedCopyIds.value = new Set()
  seriesFullySelected.value = new Set()
  expandedSeries.value = new Set()
  expandedVolumes.value = new Set()
  expandedIssues.value = new Set()
}

// ============================================================================
// Init
// ============================================================================

watch(isOpen, async (open) => {
  if (open) {
    await locationStore.fetchRecords({ limit: 1000 })
    if (props.presetLocationId) {
      selectedLocationId.value = props.presetLocationId
      await goToStep2()
    }
  }
})
</script>

<style scoped lang="scss">
.bulk-location-modal {
  min-height: 300px;
}

// Steps
.steps {
  .step {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    opacity: 0.4;

    &.active, &.done {
      opacity: 1;
    }

    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 50%;
      background: var(--bs-secondary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
    }

    &.active .step-num {
      background: var(--bs-primary);
    }

    &.done .step-num {
      background: var(--bs-success);
    }

    .step-label {
      font-size: 0.85rem;
      white-space: nowrap;
    }
  }

  .step-line {
    height: 2px;
    background: var(--bs-border-color);
    min-width: 1rem;
  }
}

// Tree
.tree-scroll {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--bs-tertiary-bg);
  }

  .toggle-icon {
    width: 0.75rem;
    color: var(--bs-secondary);
    flex-shrink: 0;
  }

  .node-check {
    flex-shrink: 0;
  }

  .node-title {
    flex: 1;
    font-size: 0.875rem;
  }

  .node-count {
    font-size: 0.75rem;
    color: var(--bs-secondary);
    white-space: nowrap;
  }
}

.series-row {
  font-weight: 600;
  background: var(--bs-tertiary-bg);

  &:hover {
    background: var(--bs-secondary-bg);
  }
}

.children {
  border-left: 2px solid var(--bs-border-color);
  margin-left: 1.5rem;
}

.sample-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  padding: 0.5rem;
  background: var(--bs-tertiary-bg);
}
</style>
