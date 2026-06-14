<template>
  <Modal
    v-model="isOpen"
    title="Move Location"
    confirm-text="Move"
    :loading="saving"
    :confirm-disabled="!changed"
    @confirm="save"
    @close="reset"
  >
    <p class="text-muted mb-3">
      Moving <strong>{{ locationName }}</strong> to a new parent.
      Choose a parent below, or make it a root location.
    </p>

    <div class="mb-3">
      <label class="form-label">New Parent</label>
      <select v-model="selectedParentId" class="form-select">
        <option :value="null">— Root (no parent) —</option>
        <option
          v-for="loc in eligibleLocations"
          :key="loc.location_id"
          :value="loc.location_id"
        >
          {{ loc._indent }}{{ loc._displayName }}
        </option>
      </select>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal } from '@/components/common'
import type { LocationTreeNode } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  location?: LocationTreeNode | null
  tree?: LocationTreeNode[]
}

const props = withDefaults(defineProps<Props>(), {
  location: null,
  tree: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'moved', newParentId: number | null): void
}>()

// ============================================================================
// State
// ============================================================================

const isOpen = ref(props.modelValue)
const saving = ref(false)
const selectedParentId = ref<number | null>(null)

// ============================================================================
// Sync
// ============================================================================

watch(() => props.modelValue, v => { isOpen.value = v })
watch(isOpen, v => emit('update:modelValue', v))
watch(() => props.location, loc => {
  selectedParentId.value = loc?.parent_location_id ?? null
})

// ============================================================================
// Computed
// ============================================================================

const locationName = computed(() => props.location?.location_name ?? `Location #${props.location?.location_id}`)

const changed = computed(() => selectedParentId.value !== (props.location?.parent_location_id ?? null))

// Collect descendant IDs of the location being moved (can't become its own parent)
function collectDescendantIds(node: LocationTreeNode): Set<number> {
  const ids = new Set<number>([node.location_id])
  for (const child of node.children) {
    for (const id of collectDescendantIds(child)) ids.add(id)
  }
  return ids
}

interface FlatOption {
  location_id: number
  parent_location_id?: number | null
  _displayName: string
  _indent: string
}

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
    result.push({
      location_id: node.location_id,
      parent_location_id: node.parent_location_id,
      _displayName: name,
      _indent: '  '.repeat(depth)
    })
    result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}

const eligibleLocations = computed(() => {
  if (!props.location) return []
  const excluded = collectDescendantIds(props.location)
  return flattenTree(props.tree).filter(l => !excluded.has(l.location_id))
})

// ============================================================================
// Methods
// ============================================================================

function reset() {
  selectedParentId.value = props.location?.parent_location_id ?? null
}

async function save() {
  saving.value = true
  try {
    emit('moved', selectedParentId.value)
    isOpen.value = false
  } finally {
    saving.value = false
  }
}
</script>
