<template>
  <Modal
    v-model="isOpen"
    :title="modalTitle"
    size="xl"
    :show-footer="false"
    scrollable
    @close="reset"
  >
    <!-- Controls -->
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
      <div class="form-check form-switch mb-0">
        <input
          id="includeDescendants"
          v-model="includeDescendants"
          type="checkbox"
          class="form-check-input"
          @change="load(1)"
        />
        <label class="form-check-label" for="includeDescendants">Include sub-locations</label>
      </div>
      <span class="text-muted small ms-auto">
        {{ totalCount }} {{ totalCount === 1 ? 'copy' : 'copies' }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="!copies.length" class="text-center py-4 text-muted">
      No copies at this location.
    </div>

    <!-- Copies table -->
    <div v-else>
      <table class="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th style="width:50px"></th>
            <th>Series</th>
            <th>Issue</th>
            <th>Vol</th>
            <th>Format</th>
            <th>Cond.</th>
            <th v-if="includeDescendants">Location</th>
            <th class="text-end">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="copy in copies" :key="copy.copy_id">
            <td>
              <img
                v-if="copy.cover_image_path"
                :src="getCoverImageUrl(copy.cover_image_path)"
                :alt="copy.cover_description || 'Cover'"
                class="copy-thumb"
              />
              <div v-else class="copy-thumb-placeholder"></div>
            </td>
            <td>{{ copy.series_title }}</td>
            <td>
              <span class="fw-medium">#{{ copy.issue_number }}</span>
              <span v-if="copy.issue_title" class="text-muted ms-1 small">{{ copy.issue_title }}</span>
            </td>
            <td class="text-muted">{{ copy.volume_number ?? '—' }}</td>
            <td>
              <span class="badge" :class="formatBadgeClass(copy.format)">{{ copy.format }}</span>
            </td>
            <td class="text-muted">{{ copy.condition_code ?? '—' }}</td>
            <td v-if="includeDescendants" class="text-muted small">
              {{ copy.location_path ?? '—' }}
            </td>
            <td class="text-end">{{ formatCurrency(copy.current_value) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="copies.length">
          <tr class="table-light fw-semibold">
            <td :colspan="includeDescendants ? 7 : 6" class="text-end">Total</td>
            <td class="text-end">{{ formatCurrency(pageTotal) }}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">Page {{ currentPage }} of {{ totalPages }}</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" :disabled="currentPage <= 1" @click="load(currentPage - 1)">
            ‹
          </button>
          <button class="btn btn-outline-secondary" :disabled="currentPage >= totalPages" @click="load(currentPage + 1)">
            ›
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal } from '@/components/common'
import { useLocationStoreExtended, type Copy, type LocationTreeNode } from '@/core'
import { useFormatting, useImage } from '@/composables'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  location?: LocationTreeNode | null
}

const props = withDefaults(defineProps<Props>(), { location: null })

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// ============================================================================
// Store / composables
// ============================================================================

const store = useLocationStoreExtended()
const { formatCurrency } = useFormatting()
const { getCoverImageUrl } = useImage()

const PER_PAGE = 50

// ============================================================================
// State
// ============================================================================

const isOpen = ref(props.modelValue)
const copies = ref<Copy[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const loading = ref(false)
const includeDescendants = ref(false)

// ============================================================================
// Sync
// ============================================================================

watch(() => props.modelValue, v => { isOpen.value = v })
watch(isOpen, v => emit('update:modelValue', v))
watch(() => props.location, loc => { if (loc && isOpen.value) load(1) })
watch(isOpen, open => { if (open && props.location) load(1) })

// ============================================================================
// Computed
// ============================================================================

const modalTitle = computed(() => {
  const name = props.location?.location_name
    ?? (props.location ? `Location #${props.location.location_id}` : 'Location')
  return `Copies — ${name}`
})

const totalPages = computed(() => Math.ceil(totalCount.value / PER_PAGE))

const pageTotal = computed(() =>
  copies.value.reduce((sum, c) => sum + (Number(c.current_value) || 0), 0)
)

// ============================================================================
// Methods
// ============================================================================

async function load(page: number) {
  if (!props.location) return
  loading.value = true
  currentPage.value = page
  try {
    const data = await store.fetchCopiesAtLocation(
      props.location.location_id,
      includeDescendants.value,
      page,
      PER_PAGE
    )
    copies.value = data.results
    totalCount.value = data.count[0]?.total ?? 0
  } finally {
    loading.value = false
  }
}

function reset() {
  copies.value = []
  totalCount.value = 0
  currentPage.value = 1
  includeDescendants.value = false
}

function formatBadgeClass(format: string) {
  return {
    'bg-primary':   format === 'hardcover',
    'bg-secondary': format === 'paperback',
    'bg-info':      format === 'digital',
    'bg-warning text-dark': format === 'cgc_slab' || format === 'cbcs_slab',
    'bg-dark':      format === 'other',
  }
}
</script>

<style scoped lang="scss">
.copy-thumb {
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: 2px;
}
.copy-thumb-placeholder {
  width: 40px;
  height: 60px;
  background: #f0f0f0;
  border-radius: 2px;
}
</style>
