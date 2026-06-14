<template>
  <div class="location-page">

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="mb-0">Storage Locations</h1>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="expandAll">Expand all</button>
        <button class="btn btn-outline-secondary btn-sm" @click="collapseAll">Collapse all</button>
        <button class="btn btn-primary" @click="openAddRoot">
          <font-awesome-icon :icon="['fas', 'plus']" class="me-1" />
          Add Location
        </button>
        <button class="btn btn-secondary" @click="openBulkModal">
          <font-awesome-icon :icon="['fas', 'users']" />
          Bulk Assign
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!tree.length" class="text-center py-5 text-muted">
      <font-awesome-icon :icon="['fas', 'box-archive']" size="3x" class="mb-3 opacity-25" />
      <p>No locations yet. Add one to get started.</p>
    </div>

    <!-- Tree -->
    <div v-else class="tree-container card">
      <div class="card-body p-2">
        <LocationTreeNode
          v-for="root in tree"
          :key="root.location_id"
          :node="root"
          :depth="0"
          :all-links="allLinks"
          :selected-id="selectedId"
          @add-child="openAddChild"
          @view-copies="openViewCopies"
          @move="openMove"
          @set-link="openLink"
          @edit="openEdit"
          @delete="confirmDelete"
          @select="onSelect"
        />
      </div>
    </div>

    <!-- Warning: non-leaf assignment -->
    <div v-if="selectedHasChildren" class="alert alert-warning mt-3 py-2 small">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="me-1" />
      The selected location has child locations. Copies assigned here won't appear under those children.
    </div>

    <!-- Modals -->
    <LocationFormModal
      v-model="showFormModal"
      :location="editingLocation"
      :parent-location-id="addingChildParentId"
      @saved="onFormSaved"
    />

    <LocationMoveModal
      v-model="showMoveModal"
      :location="movingLocation"
      :tree="tree"
      @moved="onMoved"
    />

    <LocationLinkModal
      v-model="showLinkModal"
      :location="linkingLocation"
      :all-links="allLinks"
      :tree="tree"
      @add-link="onAddLink"
      @remove-link="onRemoveLink"
    />

    <BulkLocationModal
      v-model="showBulkModal"
      :selected-copy-ids="[]"
      @assigned="handleBulkAssigned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { LocationTreeNode } from '@/components/common'
import { LocationFormModal, LocationMoveModal, LocationLinkModal, BulkLocationModal } from '@/components/modals'
import { useLocationStoreExtended } from '@/core'
import { useToast } from '@/composables'
import type { LocationTreeNode as TreeNode, LocationLink, Location } from '@/core'

const store = useLocationStoreExtended()
const toast = useToast()

// ============================================================================
// State
// ============================================================================

const loading = ref(false)
const tree = ref<TreeNode[]>([])
const allLinks = ref<LocationLink[]>([])
const selectedId = ref<number | null>(null)

const showFormModal = ref(false)
const showMoveModal = ref(false)
const showLinkModal = ref(false)
const showBulkModal = ref(false)

const editingLocation = ref<Location | null>(null)
const addingChildParentId = ref<number | null>(null)
const movingLocation = ref<TreeNode | null>(null)
const linkingLocation = ref<TreeNode | null>(null)

// ============================================================================
// Computed
// ============================================================================

const selectedHasChildren = computed(() => {
  if (!selectedId.value) return false
  const node = findNode(tree.value, selectedId.value)
  return (node?.children.length ?? 0) > 0
})

// ============================================================================
// Data loading
// ============================================================================

async function loadAll() {
  loading.value = true
  try {
    const [treeData, links] = await Promise.all([
      store.fetchTree(),
      store.fetchAllLinks()
    ])
    tree.value = treeData
    allLinks.value = links
  } finally {
    loading.value = false
  }
}

// ============================================================================
// Tree helpers
// ============================================================================

function findNode(nodes: TreeNode[], id: number): TreeNode | null {
  for (const n of nodes) {
    if (n.location_id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}

// Expand/collapse all — we use a key trick: re-render with a flag stored in a
// Set so each LocationTreeNode can check it. Simpler: emit an event via provide/inject.
// For now: toggle a global ref that child nodes watch via provide.
const treeKey = ref(0) // bump to force re-render at default state
const expandAllFlag = ref<boolean | null>(null)

function expandAll() {
  expandAllFlag.value = true
  treeKey.value++
}

function collapseAll() {
  expandAllFlag.value = false
  treeKey.value++
}

// ============================================================================
// Action handlers
// ============================================================================

function onSelect(node: TreeNode) {
  selectedId.value = node.location_id
}

function openAddRoot() {
  editingLocation.value = null
  addingChildParentId.value = null
  showFormModal.value = true
}

function openAddChild(node: TreeNode) {
  editingLocation.value = null
  addingChildParentId.value = node.location_id
  showFormModal.value = true
}

function openEdit(node: TreeNode) {
  editingLocation.value = node as unknown as Location
  addingChildParentId.value = null
  showFormModal.value = true
}

function openMove(node: TreeNode) {
  movingLocation.value = node
  showMoveModal.value = true
}

function openLink(node: TreeNode) {
  linkingLocation.value = node
  showLinkModal.value = true
}

function openViewCopies(node: TreeNode) {
  toast.info(`Viewing copies for "${node.location_name || node.location_id}" — coming in Phase 4`)
}

function openBulkModal() {
  showBulkModal.value = true
}

async function onFormSaved(data: Partial<Location>) {
  try {
    if (editingLocation.value) {
      await store.updateRecord(editingLocation.value.location_id, data)
      toast.success('Location updated')
    } else {
      await store.createRecord(data)
      toast.success('Location created')
    }
    await loadAll()
  } catch {
    toast.error('Failed to save location')
  }
}

async function onMoved(newParentId: number | null) {
  if (!movingLocation.value) return
  const ok = await store.moveLocation(movingLocation.value.location_id, newParentId)
  if (ok) {
    toast.success('Location moved')
    await loadAll()
  } else {
    toast.error('Failed to move location')
  }
}

async function onAddLink(fromId: number, toId: number, notes: string) {
  const ok = await store.createLink(fromId, toId, notes || undefined)
  if (ok) {
    toast.success('Continuation link added')
    allLinks.value = await store.fetchAllLinks()
  } else {
    toast.error('Failed to add link')
  }
}

async function onRemoveLink(linkId: number) {
  const ok = await store.deleteLink(linkId)
  if (ok) {
    toast.success('Link removed')
    allLinks.value = await store.fetchAllLinks()
  } else {
    toast.error('Failed to remove link')
  }
}

async function confirmDelete(node: TreeNode) {
  if (!confirm(`Delete "${node.location_name || node.storage_type}"? This cannot be undone.`)) return
  const ok = await store.deleteRecord(node.location_id)
  if (ok) {
    toast.success('Location deleted')
    await loadAll()
  } else {
    toast.error('Failed to delete location — it may have child locations or assigned copies')
  }
}

function handleBulkAssigned(count: number) {
  toast.success(`Successfully assigned ${count} copies`)
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(loadAll)
</script>

<style scoped lang="scss">
.location-page {
  padding: 1rem;
}

.tree-container {
  min-height: 200px;
}
</style>
