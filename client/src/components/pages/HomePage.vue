<template>
  <div class="home-page">
    <div class="page-header">
      <h1>Collection Dashboard</h1>
      <p class="lead text-muted">Overview of your comic book collection</p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-overview" v-if="stats">
      <div class="row">
        <div class="col-md-3 col-sm-6">
          <StatCard
            :value="stats.series_count"
            label="Series"
            icon="book-open"
            variant="primary"
            type="number"
            :clickable="true"
            @click="navigateTo('/series')"
          />
        </div>
        <div class="col-md-3 col-sm-6">
          <StatCard
            :value="stats.issue_count"
            label="Issues"
            icon="file-lines"
            variant="info"
            type="number"
          />
        </div>
        <div class="col-md-3 col-sm-6">
          <StatCard
            :value="stats.copy_count"
            label="Copies"
            icon="copy"
            variant="success"
            type="number"
          />
        </div>
        <div class="col-md-3 col-sm-6">
          <StatCard
            :value="stats.collected_edition_count"
            label="Collected Editions"
            icon="books"
            variant="warning"
            type="number"
          />
        </div>
      </div>

      <div class="row mt-3">
        <div class="col-md-4">
          <StatCard
            :value="stats.total_cost"
            label="Total Invested"
            icon="receipt"
            variant="warning"
            type="currency"
          />
        </div>
        <div class="col-md-4">
          <StatCard
            :value="stats.total_value"
            label="Current Value"
            icon="dollar-sign"
            variant="success"
            type="currency"
          />
        </div>
        <div class="col-md-4">
          <StatCard
            :value="stats.value_change_percent"
            label="Overall Gain"
            icon="chart-line"
            :variant="stats.value_change_percent >= 0 ? 'success' : 'danger'"
            type="percentage"
            :trend="stats.value_change_percent"
          />
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <!-- Top Publishers -->
      <div class="col-md-6">
        <Card title="Top Publishers by Value">
          <template #header-actions>
            <router-link to="/publishers" class="btn btn-sm btn-outline-primary">
              View All
            </router-link>
          </template>
          
          <div v-if="loadingPublishers" class="text-center py-3">
            <div class="spinner-border spinner-border-sm" role="status"></div>
          </div>
          <div v-else-if="topPublishers.length === 0" class="text-muted text-center py-3">
            No data available
          </div>
          <div v-else class="publisher-list">
            <div 
              v-for="(publisher, index) in topPublishers" 
              :key="publisher.publisher_id"
              class="publisher-item"
            >
              <span class="rank">{{ index + 1 }}</span>
              <span class="name">{{ publisher.publisher_name }}</span>
              <span class="stats">
                {{ publisher.series_count }} series / {{ publisher.copy_count }} copies
              </span>
              <span class="value">{{ formatCurrency(publisher.total_value) }}</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- High Value Items -->
      <div class="col-md-6">
        <Card title="Most Valuable Comics">
          <template #header-actions>
            <router-link to="/copies?sort=value&dir=desc" class="btn btn-sm btn-outline-primary">
              View All
            </router-link>
          </template>

          <div v-if="loadingHighValue" class="text-center py-3">
            <div class="spinner-border spinner-border-sm" role="status"></div>
          </div>
          <div v-else-if="highValueItems.length === 0" class="text-muted text-center py-3">
            No data available
          </div>
          <div v-else class="high-value-list">
            <div 
              v-for="(item, index) in highValueItems" 
              :key="item.copy_id"
              class="high-value-item"
            >
              <span class="rank">{{ index + 1 }}</span>
              <div class="details">
                <span class="title">{{ item.series_title }} #{{ item.issue_number }}</span>
                <span class="condition">{{ item.condition_code || 'Ungraded' }}</span>
              </div>
              <span class="value">{{ formatCurrency(item.current_value) }}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="row mt-4">
      <div class="col-12">
        <Card title="Quick Actions">
          <div class="quick-actions">
            <router-link to="/series" class="quick-action">
              <font-awesome-icon :icon="['fas', 'book-open']" />
              <span>Browse Series</span>
            </router-link>
            <router-link to="/storylines" class="quick-action">
              <font-awesome-icon :icon="['fas', 'timeline']" />
              <span>Storylines</span>
            </router-link>
            <router-link to="/locations" class="quick-action">
              <font-awesome-icon :icon="['fas', 'box-archive']" />
              <span>Storage</span>
            </router-link>
            <router-link to="/stats" class="quick-action">
              <font-awesome-icon :icon="['fas', 'chart-pie']" />
              <span>Statistics</span>
            </router-link>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Card, StatCard } from '@/components/common'
import { useStatsStore, type CollectionStats, type PublisherStats, type HighValueCopy } from '@/core'
import { useFormatting } from '@/composables'

// ============================================================================
// Composables
// ============================================================================

const router = useRouter()
const statsStore = useStatsStore()
const { formatCurrency } = useFormatting()

// ============================================================================
// State
// ============================================================================

const stats = ref<CollectionStats | null>(null)
const topPublishers = ref<PublisherStats[]>([])
const highValueItems = ref<HighValueCopy[]>([])
const loadingStats = ref(true)
const loadingPublishers = ref(true)
const loadingHighValue = ref(true)

// ============================================================================
// Methods
// ============================================================================

const navigateTo = (path: string) => {
  router.push(path)
}

const loadData = async () => {
  // Load collection stats
  loadingStats.value = true
  stats.value = await statsStore.fetchCollectionStats()
  loadingStats.value = false

  // Load top publishers
  loadingPublishers.value = true
  const publisherData = await statsStore.fetchPublisherStats()
  topPublishers.value = publisherData.slice(0, 5)
  loadingPublishers.value = false

  // Load high value items
  loadingHighValue.value = true
  const highValueData = await statsStore.fetchHighValueItems(5)
  if (highValueData) {
    highValueItems.value = highValueData.copies
  }
  loadingHighValue.value = false
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.home-page {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;

  h1 {
    margin-bottom: 0.25rem;
  }
}

.stats-overview {
  margin-bottom: 1.5rem;
}

.publisher-list,
.high-value-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.publisher-item,
.high-value-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.25rem;
  gap: 1rem;

  .rank {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e9ecef;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6c757d;
  }

  .name,
  .details {
    flex: 1;
  }

  .details {
    display: flex;
    flex-direction: column;

    .title {
      font-weight: 500;
    }

    .condition {
      font-size: 0.75rem;
      color: #6c757d;
    }
  }

  .stats {
    font-size: 0.875rem;
    color: #6c757d;
  }

  .value {
    font-weight: 600;
    color: #198754;
  }
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 2rem;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #212529;
  transition: all 0.2s ease;

  &:hover {
    border-color: #0d6efd;
    background-color: rgba(13, 110, 253, 0.05);
    transform: translateY(-2px);
  }

  svg {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #0d6efd;
  }

  span {
    font-weight: 500;
  }
}
</style>
