<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-backdrop" @click.self="handleBackdropClick">
        <div 
          class="modal-container" 
          :class="[sizeClass, { 'modal-fullscreen': fullscreen }]"
          role="dialog"
          :aria-labelledby="titleId"
          aria-modal="true"
        >
          <!-- Header -->
          <div class="modal-header" v-if="showHeader">
            <slot name="header">
              <h5 :id="titleId" class="modal-title">{{ title }}</h5>
            </slot>
            <button 
              v-if="showCloseButton"
              type="button" 
              class="btn-close" 
              @click="close"
              aria-label="Close"
            >
              <font-awesome-icon :icon="['fas', 'xmark']" />
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body" :class="{ 'modal-body-scrollable': scrollable }">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div class="modal-footer" v-if="showFooter">
            <slot name="footer">
              <button 
                v-if="showCancelButton"
                type="button" 
                class="btn btn-secondary"
                @click="close"
              >
                {{ cancelText }}
              </button>
              <button 
                v-if="showConfirmButton"
                type="button" 
                class="btn"
                :class="confirmButtonClass"
                :disabled="confirmDisabled || loading"
                @click="confirm"
              >
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                {{ confirmText }}
              </button>
            </slot>
          </div>

          <!-- Loading overlay -->
          <div v-if="loading" class="modal-loading-overlay">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullscreen?: boolean
  scrollable?: boolean
  centered?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showCloseButton?: boolean
  showCancelButton?: boolean
  showConfirmButton?: boolean
  cancelText?: string
  confirmText?: string
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  confirmDisabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  fullscreen: false,
  scrollable: false,
  centered: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  showHeader: true,
  showFooter: true,
  showCloseButton: true,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: 'Cancel',
  confirmText: 'Confirm',
  confirmVariant: 'primary',
  confirmDisabled: false,
  loading: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

// ============================================================================
// Computed
// ============================================================================

const titleId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'modal-sm'
    case 'lg': return 'modal-lg'
    case 'xl': return 'modal-xl'
    default: return ''
  }
})

const confirmButtonClass = computed(() => `btn-${props.confirmVariant}`)

// ============================================================================
// Methods
// ============================================================================

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const confirm = () => {
  emit('confirm')
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
    emit('cancel')
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    close()
    emit('cancel')
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.modal-container {
  position: relative;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
  width: 100%;
  max-width: 500px;

  &.modal-sm {
    max-width: 300px;
  }

  &.modal-lg {
    max-width: 800px;
  }

  &.modal-xl {
    max-width: 1140px;
  }

  &.modal-fullscreen {
    max-width: 100%;
    max-height: 100%;
    height: 100%;
    border-radius: 0;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #dee2e6;

  .modal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    color: #666;
    line-height: 1;

    &:hover {
      color: #333;
    }
  }
}

.modal-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;

  &.modal-body-scrollable {
    max-height: 60vh;
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #dee2e6;
}

.modal-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
}

// Transitions
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;

  .modal-container {
    transition: transform 0.2s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-container {
    transform: scale(0.95);
  }
}
</style>
