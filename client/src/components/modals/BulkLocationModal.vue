<template>
  <Modal
    v-model="isOpen"
    :title="title"
    size="lg"
    @close="handleClose"
  >
    <template #body>
      <div class="bulk-location-modal">
        <!-- Assignment Type Selection -->
        <div class="assignment-type mb-4">
          <h6>Assignment Type</h6>
          <div class="form-check">
            <input
              id="assignUnassigned"
              v-model="assignmentType"
              type="radio"
              value="unassigned"
              class="form-check-input"
            />
            <label for="assignUnassigned" class="form-check-label">
              Assign all unassigned copies ({{ unassignedCount }})
            </label>
          </div>
          <div class="form-check">
            <input
              id="assignSelected"
              v-model="assignmentType"
              type="radio"
              value="selected"
              class="form-check-input"
              :disabled="selectedCopyIds.length === 0"
            />
            <label for="assignSelected" class="form-check-label">
              Assign selected copies ({{ selectedCopyIds.length }} selected)
              <small v-if="selectedCopyIds.length === 0" class="text-muted">
                (No copies selected)
              </small>
            </label>
          </div>
        </div>

        <!-- Location Selection -->
        <div class="location-selection mb-4">
          <FormField
            v-model="selectedLocationId"
            type="select"
            label="Target Location"
            placeholder="Select a storage location"
            :options="locationOptions"
            required
          />
        </div>

        <!-- Preview Section -->
        <div v-if="selectedLocationId" class="preview-section">
          <h6>Preview</h6>
          <div class="alert alert-info">
            <font-awesome-icon :icon="['fas', 'info-circle']" />
            <span v-if="assignmentType === 'unassigned'">
              All {{ unassignedCount }} unassigned copies will be moved to:
              <strong>{{ selectedLocation?.location_name || selectedLocation?.divider }}</strong>
            </span>
            <span v-else>
              {{ selectedCopyIds.length }} selected copies will be moved to:
              <strong>{{ selectedLocation?.location_name || selectedLocation?.divider }}</strong>
            </span>
          </div>

          <!-- Sample of affected copies -->
          <div v-if="sampleCopies.length > 0" class="sample-copies">
            <small class="text-muted">Sample of copies to be moved:</small>
            <div class="mt-2">
              <div
                v-for="copy in sampleCopies.slice(0, 5)"
                :key="copy.copy_id"
                class="d-flex justify-content-between align-items-center py-1 border-bottom"
              >
                <span>
                  {{ copy.series_title }} #{{ copy.issue_number }}
                  <small class="text-muted">({{ copy.format }})</small>
                </span>
                <small class="text-muted">{{ formatCurrency(copy.current_value) }}</small>
              </div>
              <div v-if="totalCount > 5" class="text-center mt-2">
                <small class="text-muted">... and {{ totalCount - 5 }} more</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        @click="handleClose"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!canAssign || assigning"
        @click="handleAssign"
      >
        <font-awesome-icon
          :icon="['fas', assigning ? 'spinner' : 'check']"
          :spin="assigning"
        />
        {{ assigning ? 'Assigning...' : `Assign ${totalCount} Copies` }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal, FormField } from '@/components/common'
import { useLocationStore, useCopyStore, type Location, type Copy } from '@/core'
import { useFormatting, useToast } from '@/composables'

// Props
interface Props {
  modelValue: boolean
  selectedCopyIds?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  selectedCopyIds: () => []
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'assigned': [count: number]
}>()

// Stores
const locationStore = useLocationStore()
const copyStore = useCopyStore()
const { formatCurrency } = useFormatting()
const toast = useToast()

// State
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const assignmentType = ref<'unassigned' | 'selected'>('unassigned')
const selectedLocationId = ref<number | null>(null)
const assigning = ref(false)
const sampleCopies = ref<Copy[]>([])

// Computed
const title = computed(() => 
  assignmentType.value === 'unassigned' 
    ? 'Bulk Assign Unassigned Copies' 
    : 'Bulk Assign Selected Copies'
)

const selectedLocation = computed(() => 
  locationStore.records.find(l => l.location_id === selectedLocationId.value)
)

const locationOptions = computed(() => 
  locationStore.records.map(location => ({
    value: location.location_id,
    label: formatLocationLabel(location)
  }))
)

const unassignedCount = computed(() => copyStore.totalRecords || 0)

const totalCount = computed(() => 
  assignmentType.value === 'unassigned' ? unassignedCount.value : props.selectedCopyIds.length
)

const canAssign = computed(() => 
  selectedLocationId.value && 
  totalCount.value > 0 && 
  !assigning.value
)

// Methods
const formatLocationLabel = (location: Location) => {
  const parts = []
  if (location.cabinet_number) parts.push(`Cabinet ${location.cabinet_number}`)
  if (location.drawer_number) parts.push(`Drawer ${location.drawer_number}`)
  if (location.divider) parts.push(location.divider)
  if (location.location_name) parts.push(`(${location.location_name})`)
  return parts.join(' / ') || location.storage_type
}

const loadSampleCopies = async () => {
  if (!selectedLocationId.value) return

  try {
    if (assignmentType.value === 'unassigned') {
      // Load sample unassigned copies
      await copyStore.fetchRecords({ 
        limit: 5,
        filters: { location_id: 'null' }
      })
      sampleCopies.value = copyStore.records
    } else {
      // Load sample selected copies
      if (props.selectedCopyIds.length > 0) {
        const sampleIds = props.selectedCopyIds.slice(0, 5)
        // We'd need to add a method to fetch copies by IDs
        // For now, we'll load unassigned as a fallback
        await copyStore.fetchRecords({ limit: 5 })
        sampleCopies.value = copyStore.records.filter(c => sampleIds.includes(c.copy_id))
      }
    }
  } catch (error) {
    console.error('Error loading sample copies:', error)
  }
}

const handleAssign = async () => {
  if (!canAssign.value || !selectedLocationId.value) return

  assigning.value = true

  try {
    const copyIds = assignmentType.value === 'unassigned' 
      ? 'all' // We'll handle this case specially
      : props.selectedCopyIds

    const response = await fetch('/api/copies/bulk', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        copy_ids: copyIds === 'all' ? [] : copyIds,
        updates: { location_id: selectedLocationId.value },
        assign_all_unassigned: copyIds === 'all'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to assign copies')
    }

    const result = await response.json()
    
    toast.success(`Successfully assigned ${result.updated_count} copies to location`)
    emit('assigned', result.updated_count)
    handleClose()
    
    // Refresh stores
    await Promise.all([
      locationStore.fetchRecords(),
      copyStore.fetchRecords()
    ])
  } catch (error) {
    console.error('Error assigning copies:', error)
    toast.error('Failed to assign copies to location')
  } finally {
    assigning.value = false
  }
}

const handleClose = () => {
  isOpen.value = false
  // Reset form
  assignmentType.value = 'unassigned'
  selectedLocationId.value = null
  sampleCopies.value = []
}

// Watchers
watch(selectedLocationId, () => {
  if (selectedLocationId.value) {
    loadSampleCopies()
  }
})

watch(assignmentType, () => {
  loadSampleCopies()
})

// Initialize
watch(isOpen, async (open) => {
  if (open) {
    await locationStore.fetchRecords()
    
    // Load unassigned count
    if (assignmentType.value === 'unassigned') {
      await copyStore.fetchRecords({ 
        filters: { location_id: 'null' }
      })
    }
  }
})
</script>

<style scoped lang="scss">
.bulk-location-modal {
  .assignment-type {
    .form-check {
      margin-bottom: 0.5rem;
    }
  }

  .preview-section {
    .sample-copies {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      padding: 0.5rem;
      background-color: #f8f9fa;
    }
  }
}
</style>
