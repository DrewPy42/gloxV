<template>
  <Modal
    v-model="isOpen"
    :title="isEditing ? 'Edit Volume' : 'Add Volume'"
    :loading="loading"
    :confirm-disabled="!isValid"
    :confirm-text="isEditing ? 'Save' : 'Add'"
    :show-confirm-button="!isViewOnly"
    :show-cancel-button="!isViewOnly"
    @confirm="handleSubmit"
    @close="handleClose"
  >
    <template v-if="isViewOnly" #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">Close</button>
      <button type="button" class="btn btn-primary" @click="isViewOnly = false">
        <font-awesome-icon :icon="['fas', 'pen']" /> Edit
      </button>
    </template>
    <div class="volume-form">
      <div class="row">
        <div class="col-md-6">
          <FormField
            v-model="formData.volume_number"
            type="number"
            label="Volume Number"
            :required="true"
            :min="1"
            :error-message="errors.volume_number"
            :disabled="isViewOnly"
          />
        </div>
        <div class="col-md-6">
          <FormField
            v-model="formData.issue_range"
            label="Issue Range"
            :error-message="errors.issue_range"
            help-text="e.g., 1-416, 500+ or 1-13"
            placeholder="1-100"
            :disabled="isViewOnly"
          />
        </div>
      </div>

      <div v-if="issueRangeBounds.start !== null" class="row">
        <div class="col-12">
          <div class="issue-range-preview">
            <small class="text-muted">
              Computed range:
              <strong>{{ issueRangeBounds.start }}</strong>
              <template v-if="issueRangeBounds.end !== null">
                to <strong>{{ issueRangeBounds.end }}</strong>
              </template>
              <template v-else>
                <span class="text-info">(ongoing)</span>
              </template>
            </small>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <FormField
            v-model="formData.start_date"
            type="date"
            label="Start Date"
            help-text="Publication start date"
            :disabled="isViewOnly"
          />
        </div>
        <div class="col-md-6">
          <FormField
            v-model="formData.end_date"
            type="date"
            label="End Date"
            help-text="Publication end date"
            :disabled="isViewOnly"
          />
        </div>
      </div>

      <FormField
        v-model="formData.notes"
        type="textarea"
        label="Notes"
        :rows="3"
        :disabled="isViewOnly"
      />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal, FormField } from '@/components/common'
import { useVolumeStore, type Volume } from '@/core'
import { getIssueRangeBounds } from '@/core/functions/coreFunctions'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  seriesId: number
  volume?: Volume | null
  viewOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  volume: null,
  viewOnly: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', volume: Volume): void
}>()

// ============================================================================
// Store
// ============================================================================

const volumeStore = useVolumeStore()

// ============================================================================
// State
// ============================================================================

const loading = ref(false)
const errors = ref<Record<string, string>>({})
const isViewOnly = ref(props.viewOnly)

const defaultFormData = (): Partial<Volume> => ({
  volume_number: 1,
  issue_range: '',
  start_date: undefined,
  end_date: undefined,
  notes: ''
})

const formData = ref<Partial<Volume>>(defaultFormData())

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.volume?.volume_id)

const isValid = computed(() => {
  return formData.value.volume_number && formData.value.volume_number > 0
})

const issueRangeBounds = computed(() => {
  return getIssueRangeBounds(formData.value.issue_range)
})

// ============================================================================
// Methods
// ============================================================================

const resetForm = () => {
  if (props.volume) {
    formData.value = {
      volume_number: props.volume.volume_number,
      issue_range: props.volume.issue_range || '',
      start_date: props.volume.start_date ? props.volume.start_date.split('T')[0] : undefined,
      end_date: props.volume.end_date ? props.volume.end_date.split('T')[0] : undefined,
      notes: props.volume.notes || ''
    }
  } else {
    formData.value = defaultFormData()
  }
  errors.value = {}
}

const validate = (): boolean => {
  errors.value = {}

  if (!formData.value.volume_number || formData.value.volume_number < 1) {
    errors.value.volume_number = 'Volume number is required and must be at least 1'
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  loading.value = true

  try {
    const volumeData: Partial<Volume> = {
      ...formData.value,
      series_id: props.seriesId
    }

    let result: Volume | null = null

    if (isEditing.value && props.volume?.volume_id) {
      const success = await volumeStore.updateRecord(props.volume.volume_id, volumeData)
      if (success) {
        result = { ...props.volume, ...volumeData } as Volume
      }
    } else {
      result = await volumeStore.createRecord(volumeData)
    }

    if (result) {
      emit('saved', result)
      isOpen.value = false
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  resetForm()
  isViewOnly.value = props.viewOnly
  isOpen.value = false
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
    isViewOnly.value = props.viewOnly
  }
})

watch(() => props.volume, () => {
  if (props.modelValue) {
    resetForm()
  }
})
</script>

<style scoped lang="scss">
.volume-form {
  .row {
    margin-bottom: 0;
  }

  .issue-range-preview {
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }
}
</style>
