<template>
  <v-dialog v-model="isOpen" max-width="800" class="top-modal">
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
  imageStyle: [String, Object, Array],
  customClass: {
    type: [String, Array, Object],
    default: ''
  }
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
<style scoped lang="scss">
@use "@/styles/modals";
</style>