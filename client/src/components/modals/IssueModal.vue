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
      <Card title="Copies" v-if="isExistingIssue">
        <template #header-actions>
          <button
            class="btn btn-sm btn-primary"
          >
            <font-awesome-icon :icon="['fas', 'plus']" /> Add Copy
          </button>
        </template>

        <div v-if="copies.length === 0 && !loadingCopies" class="text-muted text-center py-3">
          No copies found
        </div>
        <DataTable
          v-else
          :records="copies"
          :columns="copyColumns"
          :loading="loadingCopies"
          :paginated="false"
          :show-header="true"
          :show-footer="false"
          :show-actions="true"
          :actions="['edit', 'delete']"
          id-field="copy_id"
          entity-name="copies"
        >
          <template #cell-cover_image_path="{ record }">
            <img
              :src="getCoverImageUrl(record.cover_image_path)"
              :alt="record.cover_description || 'Cover'"
              class="copy-cover-thumb"
            />
          </template>
          <template #cell-format="{ record }">
            <span class="badge" :class="formatBadgeClass(record.format)">
              {{ formatLabel(record.format) }}
            </span>
          </template>
        </DataTable>
      </Card>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Card, Modal, FormField, DataTable, type TableColumn } from '@/components/common'
import { useIssueStore, useCopyStore, type Issue, type Copy } from '@/core'
import { useImage } from '@/composables'

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
const copyStore = useCopyStore()
const { getCoverImageUrl } = useImage()

// ============================================================================
// State
// ============================================================================

const loading = ref(false)
const errors = ref<Record<string, string>>({})
const copies = ref<Copy[]>([])
const loadingCopies = ref(false)

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

// True when viewing/editing an existing issue (has an issue_id)
const isExistingIssue = computed(() => !!props.issue?.issue_id)

// For the modal title and button text
const isEditing = computed(() => isExistingIssue.value)

const isValid = computed(() => {
  return formData.value.issue_number && formData.value.issue_number.trim() !== ''
})

const copyColumns: TableColumn[] = [
  { key: 'cover_image_path', label: '', width: '60px' },
  { key: 'format', label: 'Format', width: '100px' },
  { key: 'condition_code', label: 'Cond.', width: '70px' },
  { key: 'purchase_price', label: 'Cost', type: 'currency', width: '80px' },
  { key: 'current_value', label: 'Value', type: 'currency', width: '80px' },
]

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

const loadCopies = async (issueId: number) => {
  if (!issueId) return
  loadingCopies.value = true
  try {
    await copyStore.fetchRecords({
      filters: { issue_id: issueId },
      limit: 100
    })
    // Spread to create a new array (copyStore.records is reactive)
    copies.value = [...copyStore.records]
  } catch (err) {
    console.error('Error loading copies:', err)
    copies.value = []
  } finally {
    loadingCopies.value = false
  }
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
  copies.value = []
}

const formatLabel = (format: string): string => {
  const labels: Record<string, string> = {
    floppy: 'Floppy',
    digital: 'Digital',
    cgc_slab: 'CGC',
    cbcs_slab: 'CBCS',
    other: 'Other'
  }
  return labels[format] || format
}

const formatBadgeClass = (format: string): string => {
  const classes: Record<string, string> = {
    floppy: 'bg-primary',
    digital: 'bg-info',
    cgc_slab: 'bg-warning text-dark',
    cbcs_slab: 'bg-warning text-dark',
    other: 'bg-secondary'
  }
  return classes[format] || 'bg-secondary'
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    resetForm()
    // Load copies when modal opens with an existing issue
    if (props.issue?.issue_id) {
      await loadCopies(props.issue.issue_id)
    } else {
      copies.value = []
    }
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

  .copy-cover-thumb {
    height: 40px;
    width: auto;
    max-width: 50px;
    object-fit: contain;
    border: 1px solid #dee2e6;
    border-radius: 2px;
    background: white;
  }

  .badge {
    font-size: 0.75rem;
  }
}
</style>
