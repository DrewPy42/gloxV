<template>
  <Modal
    v-model="isOpen"
    :title="isEditing ? 'Edit Volume' : 'Add Volume'"
    :loading="loading"
    :confirm-disabled="!isValid"
    :confirm-text="isEditing ? 'Save' : 'Add'"
    @confirm="handleSubmit"
    @close="handleClose"
  >
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
          />
        </div>
        <div class="col-md-6">
          <FormField
            v-model="formData.issue_range"
            label="Issue Range"
            :error-message="errors.issue_range"
            help-text="e.g., 1-416, 500+ or 1-13"
            placeholder="1-100"
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
          />
        </div>
        <div class="col-md-6">
          <FormField
            v-model="formData.end_date"
            type="date"
            label="End Date"
            help-text="Publication end date"
          />
        </div>
      </div>

      <FormField
        v-model="formData.notes"
        type="textarea"
        label="Notes"
        :rows="3"
      />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  volume: null
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
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
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
