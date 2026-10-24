<template>
  <Modal
    v-model="isOpen"
    :title="isEditing ? 'Edit Copy' : 'Add Copy'"
    size="lg"
    :loading="loading"
    :confirm-text="isEditing ? 'Save' : 'Add'"
    @confirm="handleSubmit"
    @close="handleClose"
  >
    <div class="copy-form">
      <div class="row">
        <div class="col-md-4">
          <FormField
            v-model="formData.format"
            type="select"
            label="Format"
            :required="true"
            :options="formatOptions"
          />
        </div>
        <div class="col-md-4">
          <FormField
            v-model="formData.condition_id"
            type="select"
            label="Condition"
            :options="conditionOptions"
          />
        </div>
        <div class="col-md-4">
          <FormField
            v-model="formData.location_id"
            type="select"
            label="Location"
            :options="locationOptions"
          />
        </div>
      </div>

      <div class="row">
        <div class="col-md-4">
          <FormField v-model="formData.cover_price" type="number" label="Cost" :min="0" step="0.01" />
        </div>
        <div class="col-md-4">
          <FormField v-model="formData.current_value" type="number" label="Value" :min="0" step="0.01" />
        </div>
        <div class="col-md-4">
          <FormField v-model="formData.value_date" type="date" label="Value Date" />
        </div>
      </div>

      <div class="row">
        <div class="col-md-4">
          <FormField v-model="formData.purchase_date" type="date" label="Purchase Date" />
        </div>
        <div class="col-md-8">
          <FormField v-model="formData.purchase_source" label="Purchase Source" />
        </div>
      </div>

      <div v-if="isSlab" class="row">
        <div class="col-md-4">
          <FormField v-model="formData.grade" type="number" label="Grade" :min="0" :max="10" step="0.1" />
        </div>
        <div class="col-md-8">
          <FormField v-model="formData.certification_number" label="Certification Number" />
        </div>
      </div>

      <FormField
        v-if="formData.format === 'digital'"
        v-model="formData.file_path"
        label="File Path"
      />

      <FormField v-model="formData.notes" type="textarea" label="Notes" :rows="3" />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal, FormField } from '@/components/common'
import {
  useCopyStore,
  useLocationStoreExtended,
  fetchWrapper,
  API_BASE,
  type Copy,
  type CopyFormat,
  type ConditionCode,
  type Location
} from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  issueId: number
  copy?: Copy | null
}

const props = withDefaults(defineProps<Props>(), {
  copy: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

// ============================================================================
// Store & State
// ============================================================================

const copyStore = useCopyStore()
const locationStore = useLocationStoreExtended()

const loading = ref(false)
const conditions = ref<ConditionCode[]>([])
const locations = ref<Location[]>([])

const formatOptions: { value: CopyFormat; label: string }[] = [
  { value: 'paperback', label: 'Paperback' },
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'digital', label: 'Digital' },
  { value: 'cgc_slab', label: 'CGC' },
  { value: 'cbcs_slab', label: 'CBCS' },
  { value: 'other', label: 'Other' }
]

const defaultFormData = (): Partial<Copy> => ({
  format: 'paperback',
  condition_id: undefined,
  location_id: undefined,
  cover_price: undefined,
  current_value: undefined,
  value_date: undefined,
  purchase_date: undefined,
  purchase_source: '',
  grade: undefined,
  certification_number: '',
  file_path: '',
  notes: ''
})

const formData = ref<Partial<Copy>>(defaultFormData())

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.copy?.copy_id)

const isSlab = computed(() => formData.value.format === 'cgc_slab' || formData.value.format === 'cbcs_slab')

const conditionOptions = computed(() => [
  { value: '', label: '—' },
  ...conditions.value.map(c => ({
    value: c.condition_id,
    label: `${c.condition_code} - ${c.condition_text}`
  }))
])

const locationOptions = computed(() => [
  { value: '', label: '—' },
  ...locations.value.map(l => {
    const name = l.divider || l.location_name || l.storage_type
    return {
      value: l.location_id,
      label: l.location_path ? `${l.location_path} / ${name}` : name
    }
  })
])

// ============================================================================
// Methods
// ============================================================================

const toDateInput = (value?: string) => (value ? value.split('T')[0] : undefined)

const resetForm = () => {
  if (props.copy) {
    const c = props.copy
    formData.value = {
      format: c.format,
      condition_id: c.condition_id ?? undefined,
      location_id: c.location_id ?? undefined,
      cover_price: c.cover_price,
      current_value: c.current_value,
      value_date: toDateInput(c.value_date),
      purchase_date: toDateInput(c.purchase_date),
      purchase_source: c.purchase_source || '',
      grade: c.grade,
      certification_number: c.certification_number || '',
      file_path: c.file_path || '',
      notes: c.notes || ''
    }
  } else {
    formData.value = defaultFormData()
  }
}

const loadLookups = async () => {
  if (conditions.value.length === 0) {
    try {
      const data = await fetchWrapper.get<{ results: ConditionCode[] }>(`${API_BASE}/conditions`)
      conditions.value = data.results
    } catch (err) {
      console.error('Error fetching conditions:', err)
    }
  }
  if (locations.value.length === 0) {
    locations.value = await locationStore.fetchFlat()
  }
}

// Empty selects/inputs come through as '' — the API expects null
const blankToNull = (value: unknown) => (value === '' || value === undefined ? null : value)

const handleSubmit = async () => {
  loading.value = true
  try {
    const f = formData.value
    const payload: Record<string, unknown> = {
      issue_id: props.issueId,
      cover_id: props.copy?.cover_id ?? null,
      format: f.format,
      condition_id: blankToNull(f.condition_id),
      location_id: blankToNull(f.location_id),
      cover_price: blankToNull(f.cover_price),
      current_value: blankToNull(f.current_value),
      value_date: blankToNull(f.value_date),
      purchase_date: blankToNull(f.purchase_date),
      purchase_source: blankToNull(f.purchase_source),
      grade: isSlab.value ? blankToNull(f.grade) : null,
      certification_number: isSlab.value ? blankToNull(f.certification_number) : null,
      file_path: f.format === 'digital' ? blankToNull(f.file_path) : null,
      notes: blankToNull(f.notes),
      track_value_change: true
    }

    const ok = isEditing.value && props.copy?.copy_id
      ? await copyStore.updateRecord(props.copy.copy_id, payload as Partial<Copy>)
      : await copyStore.createRecord(payload as Partial<Copy>)

    if (ok) {
      emit('saved')
      isOpen.value = false
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  isOpen.value = false
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, (open) => {
  if (open) {
    resetForm()
    loadLookups()
  }
})
</script>

<style scoped lang="scss">
.copy-form {
  .row {
    margin-bottom: 0;
  }
}
</style>
