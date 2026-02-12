<template>
  <Modal
    v-model="isOpen"
    :title="title"
    size="lg"
    :show-footer="false"
    :show-cancel-button="false"
    :show-confirm-button="false"
    @close="handleClose"
  >
    <div class="cover-viewer">
      <div class="cover-image-container">
        <div v-if="imageLoading" class="image-loading">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <img
          v-show="!imageLoading && !imageError"
          :src="imageUrl"
          :alt="imageAlt"
          class="cover-image"
          @load="onImageLoad"
          @error="onImageError"
        />

        <div v-if="imageError && !imageLoading" class="image-error">
          <font-awesome-icon :icon="['fas', 'image']" class="error-icon" />
          <p>Unable to load cover image</p>
        </div>
      </div>

      <div v-if="description" class="cover-description">
        {{ description }}
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal } from '@/components/common'
import { useImage } from '@/composables'
import type { Copy } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  copy?: Copy | null
}

const props = withDefaults(defineProps<Props>(), {
  copy: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// ============================================================================
// Composables
// ============================================================================

const { getCoverImageUrl } = useImage()

// ============================================================================
// State
// ============================================================================

const imageLoading = ref(true)
const imageError = ref(false)

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const imageUrl = computed(() => {
  if (!props.copy?.cover_image_path) {
    return getCoverImageUrl(null)
  }
  return getCoverImageUrl(props.copy.cover_image_path)
})

const imageAlt = computed(() => {
  return props.copy?.cover_description || 'Cover Image'
})

const title = computed(() => {
  if (props.copy?.cover_description) {
    return props.copy.cover_description
  }
  if (props.copy?.cover_type) {
    const typeLabels: Record<string, string> = {
      standard: 'Standard Cover',
      variant: 'Variant Cover',
      incentive: 'Incentive Cover',
      sketch: 'Sketch Cover',
      virgin: 'Virgin Cover',
      foil: 'Foil Cover',
      other: 'Cover'
    }
    return typeLabels[props.copy.cover_type] || 'Cover'
  }
  return 'Cover Image'
})

const description = computed(() => {
  return props.copy?.cover_description || ''
})

// ============================================================================
// Methods
// ============================================================================

const onImageLoad = () => {
  imageLoading.value = false
  imageError.value = false
}

const onImageError = () => {
  imageLoading.value = false
  imageError.value = true
}

const handleClose = () => {
  imageLoading.value = true
  imageError.value = false
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    imageLoading.value = true
    imageError.value = false
  }
})

watch(() => props.copy, () => {
  if (props.modelValue) {
    imageLoading.value = true
    imageError.value = false
  }
})
</script>

<style scoped lang="scss">
.cover-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.cover-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  width: 100%;
  background-color: #f8f9fa;
  border-radius: 4px;
  position: relative;
}

.cover-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6c757d;

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.cover-description {
  text-align: center;
  color: #495057;
  font-size: 0.9rem;
  padding: 0 1rem;
}
</style>
