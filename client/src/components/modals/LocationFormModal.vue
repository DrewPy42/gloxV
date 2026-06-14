<template>
  <Modal
    v-model="isOpen"
    :title="location ? 'Edit Location' : 'Add Location'"
    size="lg"
    confirm-text="Save"
    :loading="saving"
    @confirm="save"
    @close="reset"
  >
    <form @submit.prevent="save">
      <div class="row g-3">

        <!-- Storage Type -->
        <div class="col-md-6">
          <label class="form-label">Type <span class="text-danger">*</span></label>
          <select v-model="form.storage_type" class="form-select" required>
            <option v-for="t in storageTypes" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
        </div>

        <!-- Name -->
        <div class="col-md-6">
          <label class="form-label">Name</label>
          <input v-model="form.location_name" type="text" class="form-control" placeholder="e.g. Main Cabinet" />
        </div>

        <!-- Cabinet-specific fields -->
        <template v-if="form.storage_type === 'cabinet' || form.storage_type === 'drawer' || form.storage_type === 'divider'">
          <div class="col-md-4">
            <label class="form-label">Cabinet #</label>
            <input v-model.number="form.cabinet_number" type="number" class="form-control" min="1" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Drawer #</label>
            <input v-model.number="form.drawer_number" type="number" class="form-control" min="1" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Divider</label>
            <input v-model="form.divider" type="text" class="form-control" placeholder="e.g. A, B, C" />
          </div>
        </template>

        <!-- Shelf / bookshelf / display -->
        <template v-if="['bookshelf', 'shelf', 'display'].includes(form.storage_type)">
          <div class="col-md-6">
            <label class="form-label">Row</label>
            <input v-model.number="form.row_num" type="number" class="form-control" min="1" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Shelf Description</label>
            <input v-model="form.shelf_description" type="text" class="form-control" placeholder="e.g. Top shelf, left side" />
          </div>
        </template>

        <!-- Digital -->
        <template v-if="form.storage_type === 'digital' || form.storage_type === 'folder'">
          <div class="col-12">
            <label class="form-label">File Path</label>
            <input v-model="form.file_path" type="text" class="form-control" placeholder="/path/to/folder" />
          </div>
          <div class="col-12">
            <label class="form-label">Backup Path</label>
            <input v-model="form.backup_path" type="text" class="form-control" placeholder="/backup/path" />
          </div>
        </template>

        <!-- Notes -->
        <div class="col-12">
          <label class="form-label">Notes</label>
          <textarea v-model="form.notes" class="form-control" rows="2" />
        </div>

        <!-- Insured separately -->
        <div class="col-12">
          <div class="form-check">
            <input
              id="insuredCheck"
              v-model="form.is_insured_separately"
              type="checkbox"
              class="form-check-input"
            />
            <label class="form-check-label" for="insuredCheck">Insured separately</label>
          </div>
        </div>

      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Modal } from '@/components/common'
import type { Location, StorageType } from '@/core'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  location?: Location | null
  parentLocationId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  location: null,
  parentLocationId: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', location: Partial<Location>): void
}>()

// ============================================================================
// State
// ============================================================================

const isOpen = ref(props.modelValue)
const saving = ref(false)

interface LocationForm {
  storage_type: StorageType
  location_name: string
  cabinet_number: number | null
  drawer_number: number | null
  divider: string
  row_num: number | null
  shelf_description: string
  file_path: string
  backup_path: string
  notes: string
  is_insured_separately: boolean
}

const defaultForm = (): LocationForm => ({
  storage_type: 'cabinet',
  location_name: '',
  cabinet_number: null,
  drawer_number: null,
  divider: '',
  row_num: null,
  shelf_description: '',
  file_path: '',
  backup_path: '',
  notes: '',
  is_insured_separately: false
})

const form = ref<LocationForm>(defaultForm())

const storageTypes: { value: StorageType; label: string }[] = [
  { value: 'cabinet',   label: 'Cabinet' },
  { value: 'drawer',    label: 'Drawer' },
  { value: 'divider',   label: 'Divider' },
  { value: 'bookshelf', label: 'Bookshelf' },
  { value: 'shelf',     label: 'Shelf' },
  { value: 'display',   label: 'Display Case' },
  { value: 'box',       label: 'Box' },
  { value: 'folder',    label: 'Folder' },
  { value: 'digital',   label: 'Digital' }
]

// ============================================================================
// Sync
// ============================================================================

watch(() => props.modelValue, v => { isOpen.value = v })
watch(isOpen, v => emit('update:modelValue', v))

watch(() => props.location, loc => {
  if (loc) {
    form.value = {
      storage_type: loc.storage_type,
      location_name: loc.location_name ?? '',
      cabinet_number: loc.cabinet_number ?? null,
      drawer_number: loc.drawer_number ?? null,
      divider: loc.divider ?? '',
      row_num: loc.row_num ?? null,
      shelf_description: loc.shelf_description ?? '',
      file_path: loc.file_path ?? '',
      backup_path: loc.backup_path ?? '',
      notes: loc.notes ?? '',
      is_insured_separately: loc.is_insured_separately ?? false
    }
  } else {
    form.value = defaultForm()
  }
}, { immediate: true })

// ============================================================================
// Methods
// ============================================================================

function reset() {
  form.value = defaultForm()
}

async function save() {
  saving.value = true
  try {
    const payload: Partial<Location> = {
      storage_type:        form.value.storage_type,
      location_name:       form.value.location_name     || undefined,
      cabinet_number:      form.value.cabinet_number    ?? undefined,
      drawer_number:       form.value.drawer_number     ?? undefined,
      divider:             form.value.divider           || undefined,
      row_num:             form.value.row_num           ?? undefined,
      shelf_description:   form.value.shelf_description || undefined,
      file_path:           form.value.file_path         || undefined,
      backup_path:         form.value.backup_path       || undefined,
      notes:               form.value.notes             || undefined,
      is_insured_separately: form.value.is_insured_separately,
    }
    if (props.parentLocationId != null && !props.location) {
      payload.parent_location_id = props.parentLocationId
    }
    emit('saved', payload)
    isOpen.value = false
  } finally {
    saving.value = false
  }
}
</script>
