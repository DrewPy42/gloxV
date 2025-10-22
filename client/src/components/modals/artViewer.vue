<template>
  <v-dialog v-model="isOpen" max-width="800">
    <v-card>
      <v-card-title>{{ title || 'Art Viewer' }}</v-card-title>
      <v-card-text class="text-center pa-4">
        <div class="image-container">
          <img
            v-if="currentImageUrl"
            :src="currentImageUrl"
            :alt="title || 'Comic Cover'"
            class="cover-image"
            @load="handleImageLoad"
            @error="handleImageError"
          />
          <div v-else class="no-image">
            <font-awesome-icon :icon="['fas', 'image']" size="3x" class="mb-2" />
            <div>No image available</div>
          </div>
          <!-- Debug info -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          <div v-if="showDebugInfo" class="debug-info">
            <div>Image URL: {{ currentImageUrl }}</div>
            <div>Loading: {{ isLoading ? 'Yes' : 'No' }}</div>
            <div>Error: {{ error || 'None' }}</div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn 
          v-if="showAction" 
          color="primary" 
          @click="handleAction"
          class="mr-2"
        >
          {{ actionText || 'Change Cover' }}
        </v-btn>
        <v-btn 
          v-if="showClose" 
          @click="close"
          variant="text"
        >
          {{ closeText || 'Close' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
:deep(.v-overlay__content) {
  z-index: 2500 !important;
}

:deep(.v-dialog) {
  z-index: 2501 !important;
  position: relative;
  margin: 24px;
  max-width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  max-height: calc(90vh - 120px);
  overflow: auto;
  margin: 0 auto;
  position: relative;
  width: 100%;
  padding: 20px;
  
  .no-image {
    text-align: center;
    color: #666;
    padding: 2rem;
    font-size: 1.1rem;
    
    svg {
      opacity: 0.5;
      margin-bottom: 1rem;
    }
  }
  
  .error-message {
    color: #ff4444;
    margin-top: 10px;
    font-weight: bold;
    text-align: center;
    padding: 10px;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
  }
  
  .debug-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px;
    font-size: 12px;
    text-align: left;
    z-index: 10;
    font-family: monospace;
    max-height: 200px;
    overflow: auto;
    word-break: break-all;
  }
}

.cover-image {
  max-width: 100%;
  max-height: calc(90vh - 160px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 1;
  transition: opacity 0.3s ease;
  background: #f5f5f5;
  
  &[loading] {
    opacity: 0;
  }
}

.v-card {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}

.v-card-text {
  flex: 1;
  overflow: auto;
  padding: 16px 24px;
}

.v-card-actions {
  padding: 12px 24px;
  background: #f8f9fa;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.v-btn {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
}
</style>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  imageUrl: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'Art Viewer'
  },
  maxHeight: {
    type: String,
    default: '70vh'
  },
  contain: {
    type: Boolean,
    default: true
  },
  showClose: {
    type: Boolean,
    default: true
  },
  showAction: {
    type: Boolean,
    default: false
  },
  closeText: String,
  actionText: String,
  imageClass: [String, Object, Array],
  imageStyle: [String, Object, Array]
});

const emit = defineEmits([
  'update:modelValue',
  'action',
  'close'
]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value) {
      emit('close');
    }
    emit('update:modelValue', value);
  }
});

const currentImageUrl = ref('');
const isLoading = ref(true);
const error = ref('');
const isDevelopment = import.meta.env.DEV;
const showDebugInfo = ref(isDevelopment);

// Function to load the image
const loadImage = (url) => {
  if (!url) {
    currentImageUrl.value = '';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = '';
  
  const img = new Image();
  
  img.onload = () => {
    currentImageUrl.value = url;
    isLoading.value = false;
    error.value = '';
  };
  
  img.onerror = (e) => {
    console.error('Failed to load image:', url, e);
    error.value = `Failed to load image: ${url}`;
    currentImageUrl.value = '';
    isLoading.value = false;
  };
  
  img.src = url;
};

// Watch for changes to the imageUrl prop
watch(() => props.imageUrl, (newUrl) => {
  loadImage(newUrl);
}, { immediate: true });

// Also watch for modal open/close to ensure image reloads
watch(() => isOpen.value, (isOpen) => {
  if (isOpen && props.imageUrl) {
    // Force reload the image when the modal opens
    loadImage(props.imageUrl);
  }
});

// Handle image load event
function handleImageLoad() {
  isLoading.value = false;
  error.value = '';
}

function close() {
  isOpen.value = false;
  emit('close');
}

function handleAction() {
  emit('action');
}

function handleImageError(e) {
  console.error('Failed to load image:', e);
  error.value = 'Failed to load image';
  currentImageUrl.value = '';
  isLoading.value = false;
  
  switch (props.title) {
    case 'Cover Art':
      currentImageUrl.value = 'covers/missing_cover.svg';
      break;
    case 'Character Art':
      currentImageUrl.value = 'characters/missing_character.svg';
      break;
    default:
      currentImageUrl.value = 'missing_image.svg';
      break;
  }
}
</script>