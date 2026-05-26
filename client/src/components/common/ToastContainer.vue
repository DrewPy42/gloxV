<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast show"
      :class="`bg-${toast.type}`"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body text-white">
          {{ toast.message }}
        </div>
        <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          aria-label="Close"
          @click="removeToast(toast.id)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
.toast-container {
  pointer-events: auto;
}

.toast {
  min-width: 250px;
  margin-bottom: 0.5rem;
}

.bg-success {
  background-color: #198754 !important;
}

.bg-error {
  background-color: #dc3545 !important;
}

.bg-warning {
  background-color: #ffc107 !important;
  color: #000 !important;
}

.bg-info {
  background-color: #0dcaf0 !important;
  color: #000 !important;
}

.bg-error .toast-body,
.bg-success .toast-body {
  color: white !important;
}
</style>
