<template>
  <Modal
    v-model="isOpen"
    title="Continuation Links"
    size="lg"
    :show-footer="false"
    @close="reset"
  >
    <p class="text-muted mb-3">
      Manage overflow/continuation links for <strong>{{ locationName }}</strong>.
    </p>

    <!-- Existing outgoing links -->
    <div v-if="continuesTo.length" class="mb-3">
      <h6 class="fw-semibold">Continues to</h6>
      <ul class="list-group list-group-flush mb-2">
        <li
          v-for="link in continuesTo"
          :key="link.location_link_id"
          class="list-group-item d-flex justify-content-between align-items-center px-0"
        >
          <span>
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="text-muted me-2" />
            {{ link.to_location_name || `Location #${link.to_location_id}` }}
            <span v-if="link.notes" class="text-muted ms-2 small">— {{ link.notes }}</span>
          </span>
          <button class="btn btn-sm btn-outline-danger" @click="removeLink(link.location_link_id)">
            <font-awesome-icon :icon="['fas', 'trash']" />
          </button>
        </li>
      </ul>
    </div>

    <!-- Existing incoming links -->
    <div v-if="overflowFrom.length" class="mb-3">
      <h6 class="fw-semibold">Overflow from</h6>
      <ul class="list-group list-group-flush mb-2">
        <li
          v-for="link in overflowFrom"
          :key="link.location_link_id"
          class="list-group-item d-flex justify-content-between align-items-center px-0"
        >
          <span>
            <font-awesome-icon :icon="['fas', 'arrow-left']" class="text-muted me-2" />
            {{ link.from_location_name || `Location #${link.from_location_id}` }}
            <span v-if="link.notes" class="text-muted ms-2 small">— {{ link.notes }}</span>
          </span>
          <button class="btn btn-sm btn-outline-danger" @click="removeLink(link.location_link_id)">
            <font-awesome-icon :icon="['fas', 'trash']" />
          </button>
        </li>
      </ul>
    </div>

    <div v-if="!continuesTo.length && !overflowFrom.length" class="text-muted mb-3">
      No continuation links yet.
    </div>

    <hr />

    <!-- Add new link -->
    <h6 class="fw-semibold">Add link</h6>
    <div class="row g-2 align-items-end">
      <div class="col-md-4">
        <label class="form-label small">Direction</label>
        <select v-model="newDirection" class="form-select form-select-sm">
          <option value="outgoing">Continues to →</option>
          <option value="incoming">Overflow from ←</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label small">Target Location</label>
        <select v-model="newTargetId" class="form-select form-select-sm">
          <option :value="null" disabled>Select…</option>
          <option v-for="loc in otherLocations" :key="loc.location_id" :value="loc.location_id">
            {{ loc._displayName }}
          </option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label small">Notes (optional)</label>
        <input v-model="newNotes" type="text" class="form-control form-control-sm" placeholder="e.g. Spider-Man titles" />
      </div>
      <div class="col-12 text-end">
        <button
          class="btn btn-primary btn-sm"
          :disabled="!newTargetId || addingLink"
          @click="addLink"
        >
          <span v-if="addingLink" class="spinner-border spinner-border-sm me-1"></span>
          Add Link
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Modal } from '@/components/common'
import type { LocationTreeNode, LocationLink } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  location?: LocationTreeNode | null
  allLinks?: LocationLink[]
  tree?: LocationTreeNode[]
}

const props = withDefaults(defineProps<Props>(), {
  location: null,
  allLinks: () => [],
  tree: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'add-link', fromId: number, toId: number, notes: string): void
  (e: 'remove-link', linkId: number): void
}>()

// ============================================================================
// State
// ============================================================================

const isOpen = ref(props.modelValue)
const newDirection = ref<'outgoing' | 'incoming'>('outgoing')
const newTargetId = ref<number | null>(null)
const newNotes = ref('')
const addingLink = ref(false)

// ============================================================================
// Sync
// ============================================================================

watch(() => props.modelValue, v => { isOpen.value = v })
watch(isOpen, v => emit('update:modelValue', v))

// ============================================================================
// Computed
// ============================================================================

const locationName = computed(() => props.location?.location_name ?? `Location #${props.location?.location_id}`)

const continuesTo = computed(() =>
  props.allLinks.filter(l => l.from_location_id === props.location?.location_id)
)

const overflowFrom = computed(() =>
  props.allLinks.filter(l => l.to_location_id === props.location?.location_id)
)

interface FlatOption { location_id: number; _displayName: string }

function flattenTree(nodes: LocationTreeNode[], depth = 0): FlatOption[] {
  const result: FlatOption[] = []
  for (const node of nodes) {
    const name = node.location_name
      || [
          node.cabinet_number && `Cabinet ${node.cabinet_number}`,
          node.drawer_number && `Drawer ${node.drawer_number}`,
          node.divider
        ].filter(Boolean).join(' / ')
      || `${node.storage_type} #${node.location_id}`
    result.push({ location_id: node.location_id, _displayName: '  '.repeat(depth) + name })
    result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}

const otherLocations = computed(() =>
  flattenTree(props.tree).filter(l => l.location_id !== props.location?.location_id)
)

// ============================================================================
// Methods
// ============================================================================

function reset() {
  newTargetId.value = null
  newNotes.value = ''
  newDirection.value = 'outgoing'
}

async function addLink() {
  if (!props.location || !newTargetId.value) return
  addingLink.value = true
  try {
    const fromId = newDirection.value === 'outgoing' ? props.location.location_id : newTargetId.value
    const toId   = newDirection.value === 'outgoing' ? newTargetId.value : props.location.location_id
    emit('add-link', fromId, toId, newNotes.value)
    newTargetId.value = null
    newNotes.value = ''
  } finally {
    addingLink.value = false
  }
}

function removeLink(linkId: number) {
  emit('remove-link', linkId)
}
</script>
