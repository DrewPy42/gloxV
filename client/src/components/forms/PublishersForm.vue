<template>
  <div class="publisher-form">
    <!-- Publisher Details Card -->
    <Card title="Publisher Details">
      <div class="row">
        <!-- Logo Display -->
        <div class="col-md-2 text-center">
          <img
            v-if="formData.logo_path"
            :src="getLogoImageUrl(formData.logo_path)"
            :alt="formData.publisher_name"
            class="publisher-logo-large"
          />
          <font-awesome-icon
            v-else
            :icon="['fas', 'building']"
            class="text-muted publisher-icon-large"
          />
        </div>

        <!-- Publisher Info -->
        <div class="col-md-10">
          <div class="row">
            <div class="col-md-8">
              <FormField
                v-model="formData.publisher_name"
                label="Name"
                :required="true"
                :disabled="!props.isEditing"
                :error-message="errors.name || ''"
              />
            </div>
          </div>

          <div class="row mt-3">
            <div class="col-md-12">
              <FormField
                v-if="props.isEditing"
                v-model="formData.website"
                label="Website"
                type="text"
                :disabled="false"
              />
              <div v-else class="form-field-readonly">
                <label class="form-label">Website</label>
                <div>
                  <a
                    v-if="formData.website"
                    :href="formData.website"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="website-link"
                  >
                    {{ formData.website }}
                    <font-awesome-icon :icon="['fas', 'external-link-alt']" class="ms-1" size="xs" />
                  </a>
                  <span v-else class="text-muted">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Statistics Cards -->
    <div class="row mt-4">
      <div class="col-md-3">
        <StatCard
          label="Series"
          :value="formData.series_count || 0"
          icon="book"
        />
      </div>
      <div class="col-md-3">
        <StatCard
          label="Issues"
          :value="formData.issue_count || 0"
          icon="file"
        />
      </div>
      <div class="col-md-3">
        <StatCard
          label="Copies"
          :value="formData.copy_count || 0"
          icon="copy"
        />
      </div>
      <div class="col-md-3">
        <StatCard
          label="Total Value"
          :value="formatCurrency(formData.total_value || 0)"
          icon="dollar-sign"
        />
      </div>
    </div>

    <!-- Series DataTable -->
    <Card title="Series" class="mt-4">
      <DataTable
        :records="seriesRecords"
        :columns="seriesColumns"
        :loading="loadingSeries"
        :total-records="totalSeries"
        :total-pages="seriesPages"
        :current-page="seriesPage"
        :per-page="seriesPerPage"
        id-field="series_id"
        entity-name="series"
        :show-add-button="false"
        :actions="['view']"
        @page-changed="handleSeriesPageChange"
        @per-page-changed="handleSeriesPerPageChange"
        @view="handleViewSeries"
      >
        <template #cell-title="{ record }">
          <a href="#" @click.prevent="handleViewSeries(record)">
            {{ record.title }}
          </a>
        </template>
      </DataTable>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Card, FormField, StatCard, DataTable, type TableColumn } from '@/components/common'
import { useSeriesStore, type Publisher, type Series } from '@/core'
import { useImage, useFormatting } from '@/composables'

interface Props {
  publisher: Publisher
  isEditing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false
})

const emit = defineEmits<{
  (e: 'update', data: Partial<Publisher>): void
  (e: 'view-series', series: Series): void
}>()

// ============================================================================
// Stores & Composables
// ============================================================================
const seriesStore = useSeriesStore()
const { getLogoImageUrl } = useImage()
const { formatCurrency } = useFormatting()

// ============================================================================
// State
// ============================================================================
const formData = ref<Partial<Publisher>>({})
const errors = ref<Record<string, string>>({})

// Series DataTable state
const seriesRecords = ref<Series[]>([])
const loadingSeries = ref(false)
const totalSeries = ref(0)
const seriesPages = ref(0)
const seriesPage = ref(1)
const seriesPerPage = ref(25)

// ============================================================================
// Computed
// ============================================================================
const seriesColumns: TableColumn[] = [
  { key: 'title', label: 'Title', sortable: true, type: 'link' },
  { key: 'volume_count', label: 'Volumes', align: 'center', sortable: true },
  { key: 'issue_count', label: 'Issues', align: 'center', sortable: true },
  { key: 'copy_count', label: 'Copies', align: 'center', sortable: true },
  { key: 'total_value', label: 'Total Value', align: 'center', type: 'currency', sortable: true }
]

// ============================================================================
// Methods
// ============================================================================
const fetchSeriesForPublisher = async (page: number = 1, limit: number = 25) => {
  if (!props.publisher.publisher_id) return

  loadingSeries.value = true
  try {
    // Store the current filters so we can restore them
    const previousFilters = { ...seriesStore.filters }

    // Use the series store with a filter for this publisher
    await seriesStore.fetchRecords({
      page,
      limit,
      filters: { publisher_id: props.publisher.publisher_id }
    })

    // Copy the data from the store to local state
    seriesRecords.value = [...seriesStore.records]
    totalSeries.value = seriesStore.totalRecords
    seriesPages.value = seriesStore.totalPages
    seriesPage.value = seriesStore.currentPage

    // Restore the previous filters to avoid polluting the global store state
    seriesStore.filters = previousFilters
  } catch (err) {
    console.error('Error fetching series for publisher:', err)
  } finally {
    loadingSeries.value = false
  }
}

const handleSeriesPageChange = (page: number) => {
  seriesPage.value = page
  fetchSeriesForPublisher(page, seriesPerPage.value)
}

const handleSeriesPerPageChange = (perPage: number) => {
  seriesPerPage.value = perPage
  fetchSeriesForPublisher(1, perPage)
}

const handleViewSeries = (series: Series) => {
  emit('view-series', series)
}

// ============================================================================
// Watchers
// ============================================================================
watch(() => props.publisher, (newPublisher) => {
  formData.value = { ...newPublisher }
  fetchSeriesForPublisher()
}, { immediate: true })

watch(formData, (newData) => {
  if (props.isEditing) {
    emit('update', newData)
  }
}, { deep: true })

// ============================================================================
// Lifecycle
// ============================================================================
onMounted(() => {
  // Initialize form data when component mounts
  formData.value = { ...props.publisher }
  fetchSeriesForPublisher()
})

</script>

<style scoped lang="scss">
.publisher-form {
  padding: 20px;
}

.publisher-logo-large {
  max-height: 120px;
  max-width: 150px;
  object-fit: contain;
  margin-bottom: 10px;
}

.publisher-icon-large {
  font-size: 80px;
  margin-bottom: 10px;
}

.form-field-readonly {
  margin-bottom: 1rem;

  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #555;
    font-size: 0.875rem;
  }

  div {
    padding: 0.375rem 0;
  }
}

.website-link {
  color: #0d6efd;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.ms-1 {
  margin-left: 0.25rem;
}

.row {
  margin-bottom: 1rem;
}

.mt-3 {
  margin-top: 1rem;
}

.mt-4 {
  margin-top: 1.5rem;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #6c757d;
}
</style>