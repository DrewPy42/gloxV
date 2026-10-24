<template>
  <div class="search-select" ref="root">
    <label v-if="label" class="form-label">{{ label }}</label>
    <input
      v-model="text"
      type="text"
      class="form-control"
      :placeholder="placeholder"
      :disabled="disabled"
      @focus="open = true"
      @input="onInput"
      @keydown.esc="open = false"
    />
    <ul v-if="open && !disabled" class="search-select-menu list-group">
      <li v-if="loading" class="list-group-item text-muted">Loading...</li>
      <li v-else-if="!options.length" class="list-group-item text-muted">No matches</li>
      <li
        v-for="option in options"
        :key="option.value"
        class="list-group-item list-group-item-action"
        :class="{ active: option.value === modelValue }"
        @mousedown.prevent="select(option)"
      >
        {{ option.label }}
        <small v-if="option.sublabel" class="text-muted ms-1">{{ option.sublabel }}</small>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export interface SearchSelectOption {
  value: number | string
  label: string
  sublabel?: string
}

interface Props {
  modelValue: number | string | null
  options: SearchSelectOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string | null): void
  (e: 'search', query: string): void
}>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const text = ref('')

const onInput = () => {
  open.value = true
  if (props.modelValue !== null) emit('update:modelValue', null)
  emit('search', text.value)
}

const select = (option: SearchSelectOption) => {
  text.value = option.label
  open.value = false
  emit('update:modelValue', option.value)
}

// Clear the text when the parent resets the selection
watch(() => props.modelValue, (value) => {
  if (value === null && !open.value) text.value = ''
})

const onDocumentClick = (event: MouseEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
    if (props.modelValue === null) text.value = ''
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped lang="scss">
.search-select {
  position: relative;
}

.search-select-menu {
  position: absolute;
  z-index: 1060;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.list-group-item-action {
  cursor: pointer;
}
</style>
