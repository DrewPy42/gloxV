<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal, Card } from '@/components/common'
import { useStorylineStoreExtended, type Storyline, type StorylineIssue } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  storyline?: Storyline | null
  viewOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  storyline: null,
  viewOnly: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', storyline: Storyline): void
}>()

// ============================================================================
// Store
// ============================================================================

const storylineStore = useStorylineStoreExtended()

// ============================================================================
// State
// ============================================================================

const loading = ref(false)
const isViewOnly = ref(props.viewOnly)

interface StorylineDetails {
  storyline: Storyline
  issues: StorylineIssue[]
}

const storylineDetails = ref<StorylineDetails | null>(null)

// ============================================================================
// Computed
// ============================================================================

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const modalTitle = computed(() => props.storyline?.storyline_name || 'Storyline')

// ============================================================================
// Methods
// ============================================================================

const handleClose = () => {
  isViewOnly.value = props.viewOnly
  isOpen.value = false
}

const handleEdit = () => {
  isViewOnly.value = false
}

const handleSubmit = async () => {
  // TODO: implement save
}

// ============================================================================
// Watchers
// ============================================================================

watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    isViewOnly.value = props.viewOnly
    storylineDetails.value = null
    if (props.storyline?.storyline_id) {
      loading.value = true
      try {
        storylineDetails.value = await storylineStore.fetchStorylineWithIssues(props.storyline.storyline_id)
      } finally {
        loading.value = false
      }
    }
  }
})
</script>

<template>
  <Modal
    v-model="isOpen"
    :title="modalTitle"
    :loading="loading"
    :show-confirm-button="!isViewOnly"
    confirm-text="Save"
    :cancel-text="isViewOnly ? 'Close' : 'Cancel'"
    size="xl"
    @confirm="handleSubmit"
    @close="handleClose"
  >
    <Card v-if="storylineDetails" title="Storyline Details">
      <template #header-actions>
        <button
          v-if="isViewOnly"
          class="btn btn-sm btn-primary"
          @click="handleEdit"
        >
          <font-awesome-icon :icon="['fas', 'pen']" /> Edit
        </button>
      </template>

      <p v-if="storylineDetails.storyline.description" class="description">
        {{ storylineDetails.storyline.description }}
      </p>

      <h5>Reading Order ({{ storylineDetails.issues.length }} issues)</h5>
      <div class="reading-order-list">
        <div
          v-for="issue in storylineDetails.issues"
          :key="issue.storyline_issue_id"
          class="reading-order-item"
          :class="{ owned: issue.owned }"
        >
          <span class="order">{{ issue.reading_order }}</span>
          <span class="part-label" v-if="issue.part_label">{{ issue.part_label }}</span>
          <span class="series">{{ issue.series_title }}</span>
          <span class="issue">#{{ issue.issue_number }}</span>
          <span class="owned-badge" v-if="issue.owned">
            <font-awesome-icon :icon="['fas', 'check']" />
          </span>
        </div>
      </div>
    </Card>

    <div v-else-if="!loading" class="text-muted text-center py-4">
      No details available.
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.reading-order-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.reading-order-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-radius: 0.25rem;
  border-left: 3px solid #dee2e6;

  &.owned {
    border-left-color: #198754;
    background: rgba(25, 135, 84, 0.05);
  }

  .order {
    width: 30px;
    font-weight: 600;
    color: #6c757d;
  }

  .part-label {
    font-size: 0.875rem;
    color: #6c757d;
  }

  .series {
    flex: 1;
    font-weight: 500;
  }

  .issue {
    font-weight: 600;
  }

  .owned-badge {
    color: #198754;
  }
}
</style>
