<template>
  <div class="card" :class="cardClass">
    <!-- Header -->
    <div v-if="$slots.header || title" class="card-header" :class="headerClass">
      <slot name="header">
        <h5 class="card-title mb-0">{{ title }}</h5>
        <p v-if="subtitle" class="card-subtitle text-muted mb-0">{{ subtitle }}</p>
      </slot>
      <div v-if="$slots['header-actions']" class="card-header-actions">
        <slot name="header-actions"></slot>
      </div>
    </div>

    <!-- Image -->
    <img 
      v-if="image" 
      :src="image" 
      :alt="imageAlt"
      class="card-img-top"
      :class="imageClass"
    />

    <!-- Body -->
    <div v-if="$slots.default" class="card-body" :class="bodyClass">
      <slot></slot>
    </div>

    <!-- List Group -->
    <ul v-if="$slots['list-group']" class="list-group list-group-flush">
      <slot name="list-group"></slot>
    </ul>

    <!-- Footer -->
    <div v-if="$slots.footer" class="card-footer" :class="footerClass">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  image?: string
  imageAlt?: string
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  bordered?: boolean
  shadow?: boolean | 'sm' | 'lg'
  hoverable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  imageAlt: '',
  variant: 'default',
  bordered: true,
  shadow: false,
  hoverable: false
})

const cardClass = computed(() => ({
  [`border-${props.variant}`]: props.variant !== 'default',
  'border-0': !props.bordered,
  'shadow-sm': props.shadow === 'sm' || props.shadow === true,
  'shadow-lg': props.shadow === 'lg',
  'card-hoverable': props.hoverable
}))

const headerClass = computed(() => ({
  [`bg-${props.variant}`]: props.variant !== 'default',
  [`text-white`]: ['primary', 'secondary', 'success', 'danger', 'info'].includes(props.variant)
}))

const bodyClass = computed(() => ({}))
const imageClass = computed(() => ({}))
const footerClass = computed(() => ({}))
</script>

<style scoped lang="scss">
.card {
  margin-bottom: 1rem;

  &.card-hoverable {
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    font-weight: 600;
  }

  .card-subtitle {
    font-size: 0.875rem;
  }

  .card-header-actions {
    display: flex;
    gap: 0.5rem;
  }
}
</style>
