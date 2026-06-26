<template>
  <div class="tree-node">
    <div
      class="tree-node-row"
      :class="{ 'tree-node-row--selected': isSelected }"
      :style="{ paddingLeft: `${depth * 1.5 + 0.5}rem` }"
      @click="toggleExpand"
    >
      <!-- Expand toggle -->
      <button
        class="tree-expand-btn"
        :class="{ invisible: !node.children.length }"
        @click.stop="toggleExpand"
        :aria-label="expanded ? 'Collapse' : 'Expand'"
      >
        <font-awesome-icon :icon="['fas', expanded ? 'chevron-down' : 'chevron-right']" />
      </button>

      <!-- Type badge -->
      <span class="badge me-2" :class="typeBadgeClass">
        <font-awesome-icon :icon="['fas', typeIcon]" />
      </span>

      <!-- Name -->
      <span class="tree-node-name flex-grow-1">
        {{ displayName }}
      </span>

      <!-- Continuation indicators -->
      <span v-if="continuesTo.length" class="tree-link-indicator text-muted me-2" :title="continuesTo.map(l => l.to_location_name).join(', ')">
        <font-awesome-icon :icon="['fas', 'arrow-right']" />
        <span class="ms-1 small">continues</span>
      </span>
      <span v-if="overflowFrom.length" class="tree-link-indicator text-muted me-2" :title="overflowFrom.map(l => l.from_location_name).join(', ')">
        <font-awesome-icon :icon="['fas', 'arrow-left']" />
        <span class="ms-1 small">overflow</span>
      </span>

      <!-- Counts -->
      <span class="tree-counts text-muted me-3">
        <span class="me-2" :title="`${rollupCopyCount} copies total (${node.copy_count ?? 0} direct)`">
          <font-awesome-icon :icon="['fas', 'book']" class="me-1" />
          {{ rollupCopyCount }}
        </span>
        <span :title="`${formatCurrency(rollupValue)} total`">
          {{ formatCurrency(rollupValue) }}
        </span>
      </span>

      <!-- Actions -->
      <div class="tree-actions" @click.stop>
        <button class="btn btn-xs btn-outline-secondary me-1" title="Add child location" @click="$emit('add-child', node)">
          <font-awesome-icon :icon="['fas', 'plus']" />
        </button>
        <button class="btn btn-xs btn-outline-secondary me-1" title="View copies" @click="$emit('view-copies', node)">
          <font-awesome-icon :icon="['fas', 'eye']" />
        </button>
        <button class="btn btn-xs btn-outline-secondary me-1" title="Bulk assign copies here" @click="$emit('bulk-assign', node)">
          <font-awesome-icon :icon="['fas', 'layer-group']" />
        </button>
        <button class="btn btn-xs btn-outline-secondary me-1" title="Move location" @click="$emit('move', node)">
          <font-awesome-icon :icon="['fas', 'arrows-up-down-left-right']" />
        </button>
        <button class="btn btn-xs btn-outline-secondary me-1" title="Set continuation link" @click="$emit('set-link', node)">
          <font-awesome-icon :icon="['fas', 'link']" />
        </button>
        <button class="btn btn-xs btn-outline-secondary me-1" title="Edit" @click="$emit('edit', node)">
          <font-awesome-icon :icon="['fas', 'pen']" />
        </button>
        <button class="btn btn-xs btn-outline-danger" title="Delete" @click="$emit('delete', node)">
          <font-awesome-icon :icon="['fas', 'trash']" />
        </button>
      </div>
    </div>

    <!-- Children (recursive) -->
    <Transition name="tree-expand">
      <div v-if="expanded && node.children.length" class="tree-children">
        <LocationTreeNode
          v-for="child in node.children"
          :key="child.location_id"
          :node="child"
          :depth="depth + 1"
          :all-links="allLinks"
          :selected-id="selectedId"
          @add-child="$emit('add-child', $event)"
          @view-copies="$emit('view-copies', $event)"
          @bulk-assign="$emit('bulk-assign', $event)"
          @move="$emit('move', $event)"
          @set-link="$emit('set-link', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @select="$emit('select', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import type { Ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useFormatting } from '@/composables'
import type { LocationTreeNode as TreeNode, LocationLink } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  node: TreeNode
  depth?: number
  allLinks?: LocationLink[]
  selectedId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  allLinks: () => [],
  selectedId: null
})

const emit = defineEmits<{
  (e: 'add-child', node: TreeNode): void
  (e: 'view-copies', node: TreeNode): void
  (e: 'bulk-assign', node: TreeNode): void
  (e: 'move', node: TreeNode): void
  (e: 'set-link', node: TreeNode): void
  (e: 'edit', node: TreeNode): void
  (e: 'delete', node: TreeNode): void
  (e: 'select', node: TreeNode): void
}>()

// ============================================================================
// State
// ============================================================================

const expanded = ref(props.depth < 1)
const { formatCurrency } = useFormatting()

const expandAllFlag = inject<Ref<boolean | null>>('expandAllFlag', ref(null))
watch(expandAllFlag, (flag) => {
  if (flag === true) expanded.value = true
  else if (flag === false) expanded.value = false
})

// ============================================================================
// Computed
// ============================================================================

const isSelected = computed(() => props.selectedId === props.node.location_id)

const continuesTo = computed(() =>
  props.allLinks.filter(l => l.from_location_id === props.node.location_id)
)

const overflowFrom = computed(() =>
  props.allLinks.filter(l => l.to_location_id === props.node.location_id)
)

const rollupCopyCount = computed((): number => {
  const childSum = props.node.children.reduce((acc, child) => acc + computeRollup(child).copies, 0)
  return (props.node.copy_count ?? 0) + childSum
})

const rollupValue = computed((): number => {
  const childSum = props.node.children.reduce((acc, child) => acc + computeRollup(child).value, 0)
  return (Number(props.node.total_value) || 0) + childSum
})

function computeRollup(node: TreeNode): { copies: number; value: number } {
  const childTotals = node.children.reduce(
    (acc, child) => {
      const c = computeRollup(child)
      return { copies: acc.copies + c.copies, value: acc.value + c.value }
    },
    { copies: 0, value: 0 }
  )
  return {
    copies: (node.copy_count ?? 0) + childTotals.copies,
    value: (Number(node.total_value) || 0) + childTotals.value
  }
}

const displayName = computed(() => {
  const n = props.node
  if (n.location_name) return n.location_name
  const parts: string[] = []
  if (n.cabinet_number) parts.push(`Cabinet ${n.cabinet_number}`)
  if (n.drawer_number) parts.push(`Drawer ${n.drawer_number}`)
  if (n.divider) parts.push(n.divider)
  return parts.join(' / ') || `${n.storage_type} #${n.location_id}`
})

const typeBadgeClass = computed(() => ({
  'bg-primary':   props.node.storage_type === 'cabinet',
  'bg-primary bg-opacity-75': props.node.storage_type === 'drawer',
  'bg-warning':   props.node.storage_type === 'divider',
  'bg-success':   props.node.storage_type === 'display',
  'bg-success bg-opacity-75': props.node.storage_type === 'shelf',
  'bg-info':      props.node.storage_type === 'bookshelf',
  'bg-secondary': props.node.storage_type === 'digital',
  'bg-dark':      props.node.storage_type === 'box',
  'bg-light text-dark': props.node.storage_type === 'folder',
}))

const typeIcon = computed(() => {
  switch (props.node.storage_type) {
    case 'cabinet':   return 'box-archive'
    case 'drawer':    return 'layer-group'
    case 'divider':   return 'folder'
    case 'bookshelf': return 'book'
    case 'shelf':     return 'bookmark'
    case 'display':   return 'display'
    case 'box':       return 'box'
    case 'folder':    return 'folder-open'
    case 'digital':   return 'cloud'
    default:          return 'folder'
  }
})

// ============================================================================
// Methods
// ============================================================================

function toggleExpand() {
  if (props.node.children.length) {
    expanded.value = !expanded.value
  }
  emit('select', props.node)
}
</script>

<style scoped lang="scss">
.tree-node {
  user-select: none;
}

.tree-node-row {
  display: flex;
  align-items: center;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  padding-right: 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.1s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);

    .tree-actions {
      opacity: 1;
    }
  }

  &--selected {
    background-color: rgba(13, 110, 253, 0.08);
  }
}

.tree-expand-btn {
  background: none;
  border: none;
  padding: 0;
  width: 1.25rem;
  color: #6c757d;
  flex-shrink: 0;
  font-size: 0.75rem;
  cursor: pointer;

  &.invisible {
    visibility: hidden;
  }
}

.tree-node-name {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-link-indicator {
  font-size: 0.75rem;
  white-space: nowrap;
}

.tree-counts {
  font-size: 0.8rem;
  white-space: nowrap;
}

.tree-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.1s;
  flex-shrink: 0;
}

.btn-xs {
  padding: 0.1rem 0.35rem;
  font-size: 0.7rem;
  line-height: 1.2;
}

.tree-expand-enter-active,
.tree-expand-leave-active {
  transition: opacity 0.15s, transform 0.15s;
  transform-origin: top;
}

.tree-expand-enter-from,
.tree-expand-leave-to {
  opacity: 0;
  transform: scaleY(0.95);
}
</style>
