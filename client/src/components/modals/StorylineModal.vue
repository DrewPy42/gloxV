<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal, Card, FormField } from '@/components/common'
import { useImage, useConfirmation } from '@/composables'
import StorylineAddIssue from './StorylineAddIssue.vue'
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
const { getCoverImageUrl } = useImage()
const confirmation = useConfirmation()

// ============================================================================
// State
// ============================================================================

const loading = ref(false)
const isViewOnly = ref(props.viewOnly)
const formData = ref({ storyline_name: '', description: '' })
const saving = ref(false)

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

const modalTitle = computed(() =>
  storylineDetails.value?.storyline.storyline_name || props.storyline?.storyline_name || 'Storyline'
)

// ============================================================================
// Methods
// ============================================================================

const handleClose = () => {
  isViewOnly.value = props.viewOnly
  isOpen.value = false
}

const resetForm = () => {
  formData.value = {
    storyline_name: storylineDetails.value?.storyline.storyline_name ?? '',
    description: storylineDetails.value?.storyline.description ?? ''
  }
}

const handleEdit = () => {
  resetForm()
  isViewOnly.value = false
}

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const onDragStart = (index: number, event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
  // Defer state changes so re-rendering doesn't cancel the drag in the browser
  setTimeout(() => { dragIndex.value = index }, 0)
}

const onDrop = async (index: number) => {
  const from = dragIndex.value
  const details = storylineDetails.value
  const storylineId = props.storyline?.storyline_id
  onDragEnd()
  if (from === null || !details || !storylineId || from === index) return

  const previous = [...details.issues]
  const [moved] = details.issues.splice(from, 1)
  details.issues.splice(index, 0, moved)

  const ok = await storylineStore.reorderStorylineIssues(
    storylineId,
    details.issues.map(i => i.issue_id)
  )
  if (!ok) details.issues = previous
}

const onDragEnd = () => {
  dragIndex.value = null
  dragOverIndex.value = null
}

const handleAddIssue = async (issueId: number) => {
  const storylineId = props.storyline?.storyline_id
  if (!storylineId) return
  saving.value = true
  try {
    const ok = await storylineStore.addIssueToStoryline(storylineId, issueId, {})
    if (!ok) return
    storylineDetails.value = await storylineStore.fetchStorylineWithIssues(storylineId)
    emit('saved', storylineDetails.value!.storyline)
  } finally {
    saving.value = false
  }
}

const handleRemoveIssue = async (issue: StorylineIssue) => {
  const storylineId = props.storyline?.storyline_id
  const details = storylineDetails.value
  if (!storylineId || !details) return

  const confirmed = await confirmation.confirm(
    `Remove ${issue.series_title} #${issue.issue_number} from this storyline? The issue stays in your collection.`,
    'Remove Issue'
  )
  if (!confirmed) return

  saving.value = true
  try {
    if (!await storylineStore.removeIssueFromStoryline(storylineId, issue.issue_id)) return
    const remaining = details.issues.filter(i => i.issue_id !== issue.issue_id)
    // Close the gap in the reading order
    await storylineStore.reorderStorylineIssues(storylineId, remaining.map(i => i.issue_id))
    storylineDetails.value = await storylineStore.fetchStorylineWithIssues(storylineId)
    emit('saved', details.storyline)
  } finally {
    saving.value = false
  }
}

const handleSubmit = async () => {
  const details = storylineDetails.value
  const storylineId = props.storyline?.storyline_id
  if (!details || !storylineId) return

  const name = formData.value.storyline_name.trim()
  if (!name) return

  saving.value = true
  try {
    const ok = await storylineStore.updateRecord(storylineId, {
      storyline_name: name,
      description: formData.value.description.trim()
    })
    if (!ok) return
    details.storyline = {
      ...details.storyline,
      storyline_name: name,
      description: formData.value.description.trim()
    }
    emit('saved', details.storyline)
    isViewOnly.value = true
  } finally {
    saving.value = false
  }
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
        resetForm()
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
    :loading="loading || saving"
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

      <template v-if="isViewOnly">
        <p v-if="storylineDetails.storyline.description" class="description">
          {{ storylineDetails.storyline.description }}
        </p>
      </template>
      <template v-else>
        <FormField v-model="formData.storyline_name" label="Title" required />
        <FormField v-model="formData.description" type="textarea" label="Notes" :rows="4" />
      </template>

      <StorylineAddIssue
        v-if="!isViewOnly"
        :existing-issue-ids="storylineDetails.issues.map(i => i.issue_id)"
        :saving="saving"
        @add="handleAddIssue"
      />

      <h5>Reading Order ({{ storylineDetails.issues.length }} issues)</h5>
      <div class="reading-order-list">
        <div
          v-for="(issue, index) in storylineDetails.issues"
          :key="issue.storyline_issue_id"
          class="reading-order-item"
          :class="{
            owned: issue.owned,
            draggable: !isViewOnly,
            dragging: dragIndex === index,
            'drag-over': dragOverIndex === index && dragIndex !== index
          }"
          :draggable="!isViewOnly"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="dragOverIndex = index"
          @drop.prevent="onDrop(index)"
          @dragend="onDragEnd"
        >
          <span class="drag-handle" v-if="!isViewOnly">
            <font-awesome-icon :icon="['fas', 'grip-vertical']" />
          </span>
          <span class="order" v-if="!isViewOnly">{{ index + 1 }}</span>
          <img
            :src="getCoverImageUrl(issue.cover_image_path)"
            :alt="`${issue.series_title} #${issue.issue_number}`"
            class="cover-thumb"
            draggable="false"
          />
          <span class="part-label" v-if="issue.part_label">{{ issue.part_label }}</span>
          <span class="series">{{ issue.series_title }}</span>
          <span class="issue">#{{ issue.issue_number }}</span>
          <span class="owned-badge" v-if="issue.owned">
            <font-awesome-icon :icon="['fas', 'check']" />
          </span>
          <button
            v-if="!isViewOnly"
            type="button"
            class="btn btn-sm btn-outline-danger"
            title="Remove from storyline"
            :disabled="saving"
            @click="handleRemoveIssue(issue)"
          >
            <font-awesome-icon :icon="['fas', 'trash']" />
          </button>
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

  &.draggable {
    cursor: grab;
  }

  &.dragging {
    opacity: 0.4;
  }

  &.drag-over {
    box-shadow: 0 -3px 0 0 #0d6efd;
  }

  .drag-handle {
    color: #adb5bd;
  }

  .order {
    width: 30px;
    font-weight: 600;
    color: #6c757d;
  }

  .cover-thumb {
    height: 80px;
    width: 55px;
    object-fit: contain;
    border: 1px solid #dee2e6;
    border-radius: 2px;
    background: white;
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
