<template>
  <div class="stat-card" :class="[`stat-card-${variant}`, { 'clickable': clickable }]" @click="handleClick">
    <div class="stat-icon" v-if="icon">
      <font-awesome-icon :icon="['fas', icon]" />
    </div>
    <div class="stat-content">
      <div class="stat-value">
        <template v-if="type === 'currency'">{{ formatCurrency(value) }}</template>
        <template v-else-if="type === 'percentage'">{{ formatPercentage(value) }}</template>
        <template v-else-if="type === 'number'">{{ formatNumber(value) }}</template>
        <template v-else>{{ value }}</template>
      </div>
      <div class="stat-label">{{ label }}</div>
      <div v-if="subtext" class="stat-subtext">{{ subtext }}</div>
    </div>
    <div v-if="trend !== undefined" class="stat-trend" :class="trendClass">
      <font-awesome-icon :icon="['fas', trendIcon]" />
      <span>{{ formatPercentage(Math.abs(trend)) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useFormatting } from '@/composables'

interface Props {
  value: number | string
  label: string
  type?: 'text' | 'currency' | 'percentage' | 'number'
  icon?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  trend?: number
  subtext?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  variant: 'default',
  clickable: false
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const { formatCurrency, formatPercentage, formatNumber } = useFormatting()

const trendClass = computed(() => ({
  'trend-up': props.trend !== undefined && props.trend > 0,
  'trend-down': props.trend !== undefined && props.trend < 0,
  'trend-neutral': props.trend !== undefined && props.trend === 0
}))

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''
  if (props.trend > 0) return 'arrow-up'
  if (props.trend < 0) return 'arrow-down'
  return 'minus'
})

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped lang="scss">
.stat-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #dee2e6;
  gap: 1rem;

  &.clickable {
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
    }
  }

  &.stat-card-primary {
    border-left: 4px solid #0d6efd;
    .stat-icon { color: #0d6efd; }
  }

  &.stat-card-success {
    border-left: 4px solid #198754;
    .stat-icon { color: #198754; }
  }

  &.stat-card-warning {
    border-left: 4px solid #ffc107;
    .stat-icon { color: #ffc107; }
  }

  &.stat-card-danger {
    border-left: 4px solid #dc3545;
    .stat-icon { color: #dc3545; }
  }

  &.stat-card-info {
    border-left: 4px solid #0dcaf0;
    .stat-icon { color: #0dcaf0; }
  }
}

.stat-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: #212529;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-subtext {
  font-size: 0.75rem;
  color: #adb5bd;
  margin-top: 0.25rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;

  &.trend-up {
    color: #198754;
    background-color: rgba(25, 135, 84, 0.1);
  }

  &.trend-down {
    color: #dc3545;
    background-color: rgba(220, 53, 69, 0.1);
  }

  &.trend-neutral {
    color: #6c757d;
    background-color: rgba(108, 117, 125, 0.1);
  }
}
</style>
