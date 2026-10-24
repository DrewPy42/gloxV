<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal } from '@/components/common'
import PublishersForm from '@/components/forms/PublishersForm.vue'
import { usePublisherStore, fetchWrapper, API_BASE, type Publisher, type Series } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  publisher?: Publisher | null
  viewOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  publisher: null,
  viewOnly: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', publisher: Publisher): void
  (e: 'view-series', series: Series): void
}>()

// ============================================================================
// Store
// ============================================================================

const publisherStore = usePublisherStore()

// ============================================================================
// State
// ============================================================================

const isViewOnly = ref(props.viewOnly)
const formData = ref<Partial<Publisher>>({})
const pendingLogo = ref<File | null>(null)

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !isViewOnly.value)

const modalTitle = computed(() => {
  if (!props.publisher) return 'Publisher Details'
  return isEditing.value
    ? `Edit: ${props.publisher.publisher_name}`
    : props.publisher.publisher_name
})

// ============================================================================
// Methods
// ============================================================================

const handleFormUpdate = (data: Partial<Publisher>) => {
  formData.value = { ...formData.value, ...data }
}

const handleSave = async () => {
  if (!props.publisher?.publisher_id) return
  const id = props.publisher.publisher_id
  await publisherStore.updateRecord(id, formData.value)
  const saved = { ...props.publisher, ...formData.value } as Publisher
  if (pendingLogo.value) {
    const result = await fetchWrapper.upload<{ logo_path: string }>(
      `${API_BASE}/publishers/${id}/logo`,
      pendingLogo.value,
      'logo'
    )
    saved.logo_path = result.logo_path
  }
  emit('saved', saved)
  handleClose()
}

const handleClose = () => {
  isViewOnly.value = props.viewOnly
  formData.value = {}
  pendingLogo.value = null
  isOpen.value = false
}

const handleViewSeries = (series: Series) => {
  emit('view-series', series)
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    isViewOnly.value = props.viewOnly
    formData.value = props.publisher ? { ...props.publisher } : {}
  }
})
</script>

<template>
  <Modal
    v-model="isOpen"
    :title="modalTitle"
    size="xl"
    :show-confirm-button="isEditing"
    confirm-text="Save Changes"
    :cancel-text="isViewOnly ? 'Close' : 'Cancel'"
    @confirm="handleSave"
    @close="handleClose"
  >
    <PublishersForm
      v-if="publisher"
      :publisher="publisher"
      :is-editing="isEditing"
      @update="handleFormUpdate"
      @logo-selected="pendingLogo = $event"
      @view-series="handleViewSeries"
      @edit="isViewOnly = false"
    />
  </Modal>
</template>
