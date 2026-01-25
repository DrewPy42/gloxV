<template>
  <Modal
    v-model="isOpen"
    :title="isEditing ? 'Edit Issue' : 'Add Issue'"
    :loading="loading"
    :confirm-disabled="!isValid"
    :confirm-text="isEditing ? 'Save' : 'Add'"
    size="lg"
    @confirm="handleSubmit"
    @close="handleClose"
  >
    <div class="issue-form">
      <div class="row">
        <div class="col-md-4">
          <FormField
            v-model="formData.issue_number"
            label="Issue Number"
            :required="true"
            :error-message="errors.issue_number"
            help-text="e.g., 1, 1A, 1/2, Annual 1"
          />
        </div>
        <div class="col-md-8">
          <FormField
            v-model="formData.issue_title"
            label="Issue Title"
            placeholder="Story title"
          />
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <FormField
            v-model="formData.title_variant"
            label="Title Variant"
            help-text="For newsstand, direct edition, etc."
          />
        </div>
        <div class="col-md-3">
          <FormField
            v-model="formData.cover_price"
            type="number"
            label="Cover Price"
            :min="0"
            :step="0.01"
            placeholder="0.00"
          />
        </div>
        <div class="col-md-3">
          <FormField
            v-model="formData.page_count"
            type="number"
            label="Page Count"
            :min="1"
          />
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <FormField
            v-model="formData.cover_date"
            type="date"
            label="Cover Date"
            help-text="Date shown on cover"
          />
        </div>
        <div class="col-md-6">
          <FormField
            v-model="formData.release_date"
            type="date"
            label="Release Date"
            help-text="Actual release date"
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
import { useIssueStore, type Issue } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  seriesId: number
  volumeId: number
  issue?: Issue | null
}

const props = withDefaults(defineProps<Props>(), {
  issue: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', issue: Issue): void
}>()

// ============================================================================
// Store
// ============================================================================

const issueStore = useIssueStore()

// ============================================================================
// State
// ============================================================================

const loading = ref(false)
const errors = ref<Record<string, string>>({})

const defaultFormData = (): Partial<Issue> => ({
  issue_number: '',
  issue_title: '',
  title_variant: '',
  cover_date: undefined,
  release_date: undefined,
  cover_price: undefined,
  page_count: undefined,
  notes: ''
})

const formData = ref<Partial<Issue>>(defaultFormData())

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.issue?.issue_id)

const isValid = computed(() => {
  return formData.value.issue_number && formData.value.issue_number.trim() !== ''
})

// ============================================================================
// Methods
// ============================================================================

const formatDateForInput = (dateValue: string | undefined): string | undefined => {
  if (!dateValue) return undefined
  // Handle both ISO strings and date objects
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return undefined
  return date.toISOString().split('T')[0]
}

const resetForm = () => {
  if (props.issue) {
    formData.value = {
      issue_number: props.issue.issue_number,
      issue_title: props.issue.issue_title || '',
      title_variant: props.issue.title_variant || '',
      cover_date: formatDateForInput(props.issue.cover_date),
      release_date: formatDateForInput(props.issue.release_date),
      cover_price: props.issue.cover_price,
      page_count: props.issue.page_count,
      notes: props.issue.notes || ''
    }
  } else {
    formData.value = defaultFormData()
  }
  errors.value = {}
}

const validate = (): boolean => {
  errors.value = {}

  if (!formData.value.issue_number || formData.value.issue_number.trim() === '') {
    errors.value.issue_number = 'Issue number is required'
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  loading.value = true

  try {
    const issueData: Partial<Issue> = {
      ...formData.value,
      series_id: props.seriesId,
      volume_id: props.volumeId
    }

    let result: Issue | null = null

    if (isEditing.value && props.issue?.issue_id) {
      const success = await issueStore.updateRecord(props.issue.issue_id, issueData)
      if (success) {
        result = { ...props.issue, ...issueData } as Issue
      }
    } else {
      result = await issueStore.createRecord(issueData)
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

watch(() => props.issue, () => {
  if (props.modelValue) {
    resetForm()
  }
})
</script>

<style scoped lang="scss">
.issue-form {
  .row {
    margin-bottom: 0;
  }
}
</style>
