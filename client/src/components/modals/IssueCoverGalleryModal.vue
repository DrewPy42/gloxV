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
    <div class="cover-gallery">
      <div class="cover-image-container">
        <div v-if="imageLoading" class="image-loading">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <img
          v-show="!imageLoading && !imageError"
          :src="currentImageUrl"
          :alt="`Cover ${currentIndex + 1}`"
          class="cover-image"
          @load="onImageLoad"
          @error="onImageError"
        />

        <div v-if="imageError && !imageLoading" class="image-error">
          <font-awesome-icon :icon="['fas', 'image']" class="error-icon" />
          <p>Unable to load cover image</p>
        </div>
      </div>

      <div v-if="covers.length > 1" class="cover-nav">
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="currentIndex === 0"
          @click="prev"
        >
          <font-awesome-icon :icon="['fas', 'chevron-left']" />
        </button>
        <span class="cover-counter">{{ currentIndex + 1 }} / {{ covers.length }}</span>
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="currentIndex === covers.length - 1"
          @click="next"
        >
          <font-awesome-icon :icon="['fas', 'chevron-right']" />
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal } from '@/components/common'
import { useImage } from '@/composables'

interface Props {
  modelValue: boolean
  covers: string[]
  issueTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  covers: () => [],
  issueTitle: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { getCoverImageUrl } = useImage()

const currentIndex = ref(0)
const imageLoading = ref(true)
const imageError = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const currentImageUrl = computed(() => getCoverImageUrl(props.covers[currentIndex.value] ?? null))

const title = computed(() => {
  const base = props.issueTitle || 'Covers'
  return props.covers.length > 1 ? `${base} — Cover ${currentIndex.value + 1} of ${props.covers.length}` : base
})

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    resetImage()
  }
}

const next = () => {
  if (currentIndex.value < props.covers.length - 1) {
    currentIndex.value++
    resetImage()
  }
}

const resetImage = () => {
  imageLoading.value = true
  imageError.value = false
}

const onImageLoad = () => {
  imageLoading.value = false
  imageError.value = false
}

const onImageError = () => {
  imageLoading.value = false
  imageError.value = true
}

const handleClose = () => {
  currentIndex.value = 0
  resetImage()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      currentIndex.value = 0
      resetImage()
    }
  }
)
</script>

<style scoped lang="scss">
.cover-gallery {
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

.cover-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.cover-counter {
  font-size: 0.9rem;
  color: #6c757d;
  min-width: 60px;
  text-align: center;
}
</style>
