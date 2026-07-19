<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Modal } from '@/components/common'
import SeriesForm from '@/components/forms/SeriesForm.vue'
import { useSeriesStore, usePublisherStoreExtended, type Series } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  series?: Series | null
  viewOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  series: null,
  viewOnly: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', series: Series): void
}>()

// ============================================================================
// Stores
// ============================================================================

const seriesStore = useSeriesStore()
const publisherStore = usePublisherStoreExtended()

// ============================================================================
// State
// ============================================================================

const isViewOnly = ref(props.viewOnly)
const formData = ref<Partial<Series>>({})
const publishers = ref<any[]>([])

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !isViewOnly.value)

const modalTitle = computed(() => {
  if (!props.series?.series_id) return 'Add Series'
  return isEditing.value
    ? `Edit: ${props.series.title}`
    : props.series.title
})

// ============================================================================
// Methods
// ============================================================================

const handleFormUpdate = (data: Partial<Series>) => {
  formData.value = { ...formData.value, ...data }
}

const handleSave = async () => {
  if (!props.series) return

  let saved: Series | null = null

  if (props.series.series_id) {
    const success = await seriesStore.updateRecord(props.series.series_id, formData.value)
    if (success) {
      saved = { ...props.series, ...formData.value } as Series
    }
  } else {
    saved = await seriesStore.createRecord(formData.value)
  }

  if (saved) {
    emit('saved', saved)
    handleClose()
  }
}

const handleClose = () => {
  isViewOnly.value = props.viewOnly
  formData.value = {}
  isOpen.value = false
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    isViewOnly.value = props.viewOnly
    formData.value = props.series ? { ...props.series } : {}
  }
})

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  publishers.value = await publisherStore.fetchAllPublishers()
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
    <SeriesForm
      v-if="series"
      :series="series"
      :is-editing="isEditing"
      :publishers="publishers"
      @update="handleFormUpdate"
      @edit="isViewOnly = false"
    />
  </Modal>
</template>
