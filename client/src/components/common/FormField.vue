<template>
  <div class="form-field" :class="{ 'has-error': hasError, 'required': required }">
    <label v-if="label" :for="fieldId" class="form-label">
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>

    <!-- Text Input -->
    <input
      v-if="type === 'text' || type === 'email' || type === 'password' || type === 'number'"
      :id="fieldId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :min="min"
      :max="max"
      :step="step"
      class="form-control"
      :class="inputClass"
      @input="handleInput"
      @blur="$emit('blur', $event)"
    />

    <!-- Textarea -->
    <textarea
      v-else-if="type === 'textarea'"
      :id="fieldId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      class="form-control"
      :class="inputClass"
      @input="handleInput"
      @blur="$emit('blur', $event)"
    ></textarea>

    <!-- Select -->
    <select
      v-else-if="type === 'select'"
      :id="fieldId"
      :value="modelValue"
      :disabled="disabled"
      class="form-select"
      :class="inputClass"
      @change="handleChange"
      @blur="$emit('blur', $event)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option 
        v-for="option in options" 
        :key="getOptionValue(option)"
        :value="getOptionValue(option)"
      >
        {{ getOptionLabel(option) }}
      </option>
    </select>

    <!-- Checkbox -->
    <div v-else-if="type === 'checkbox'" class="form-check">
      <input
        :id="fieldId"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="form-check-input"
        @change="handleCheckboxChange"
      />
      <label v-if="checkboxLabel" :for="fieldId" class="form-check-label">
        {{ checkboxLabel }}
      </label>
    </div>

    <!-- Radio Group -->
    <div v-else-if="type === 'radio'" class="radio-group">
      <div 
        v-for="option in options" 
        :key="getOptionValue(option)"
        class="form-check"
        :class="{ 'form-check-inline': inline }"
      >
        <input
          :id="`${fieldId}-${getOptionValue(option)}`"
          type="radio"
          :name="fieldId"
          :value="getOptionValue(option)"
          :checked="modelValue === getOptionValue(option)"
          :disabled="disabled"
          class="form-check-input"
          @change="handleRadioChange(getOptionValue(option))"
        />
        <label :for="`${fieldId}-${getOptionValue(option)}`" class="form-check-label">
          {{ getOptionLabel(option) }}
        </label>
      </div>
    </div>

    <!-- Date -->
    <input
      v-else-if="type === 'date'"
      :id="fieldId"
      type="date"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :min="min"
      :max="max"
      class="form-control"
      :class="inputClass"
      @input="handleInput"
      @blur="$emit('blur', $event)"
    />

    <!-- Help text -->
    <div v-if="helpText && !hasError" class="form-text">
      {{ helpText }}
    </div>

    <!-- Error message -->
    <div v-if="hasError" class="invalid-feedback d-block">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// ============================================================================
// Types
// ============================================================================

type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date'

interface SelectOption {
  value: string | number
  label: string
  [key: string]: any
}

interface Props {
  modelValue: any
  type?: FieldType
  label?: string
  placeholder?: string
  helpText?: string
  errorMessage?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  // For number inputs
  min?: number | string
  max?: number | string
  step?: number | string
  // For textarea
  rows?: number
  // For select/radio
  options?: (SelectOption | string | number)[]
  optionValueKey?: string
  optionLabelKey?: string
  // For checkbox
  checkboxLabel?: string
  // For radio
  inline?: boolean
  // Styling
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  readonly: false,
  rows: 3,
  options: () => [],
  optionValueKey: 'value',
  optionLabelKey: 'label',
  inline: false,
  size: 'md'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'blur', event: Event): void
}>()

// ============================================================================
// Computed
// ============================================================================

const fieldId = computed(() => `field-${Math.random().toString(36).substr(2, 9)}`)

const hasError = computed(() => !!props.errorMessage)

const inputClass = computed(() => ({
  'is-invalid': hasError.value,
  'form-control-sm': props.size === 'sm',
  'form-control-lg': props.size === 'lg'
}))

// ============================================================================
// Methods
// ============================================================================

const getOptionValue = (option: SelectOption | string | number): string | number => {
  if (typeof option === 'object') {
    return option[props.optionValueKey]
  }
  return option
}

const getOptionLabel = (option: SelectOption | string | number): string => {
  if (typeof option === 'object') {
    return option[props.optionLabelKey]
  }
  return String(option)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: any = target.value

  if (props.type === 'number' && value !== '') {
    value = parseFloat(value)
    if (isNaN(value)) value = ''
  }

  emit('update:modelValue', value)
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

const handleCheckboxChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

const handleRadioChange = (value: string | number) => {
  emit('update:modelValue', value)
}
</script>

<style scoped lang="scss">
.form-field {
  margin-bottom: 1rem;

  &.required {
    .form-label {
      font-weight: 500;
    }
  }

  &.has-error {
    .form-control,
    .form-select {
      border-color: #dc3545;

      &:focus {
        box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25);
      }
    }
  }
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;

  .required-indicator {
    color: #dc3545;
    margin-left: 0.25rem;
  }
}

.form-text {
  font-size: 0.875rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.invalid-feedback {
  font-size: 0.875rem;
  color: #dc3545;
  margin-top: 0.25rem;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &:has(.form-check-inline) {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

.form-check-inline {
  margin-right: 1rem;
}
</style>
