<template>
  <div class="report-page">
    <div class="report-toolbar no-print">
      <router-link to="/reports">&larr; All reports</router-link>
      <button class="btn btn-primary btn-sm" @click="print">
        <font-awesome-icon :icon="['fas', 'print']" class="me-1" /> Print / Save as PDF
      </button>
    </div>

    <h1>Collection Summary Report</h1>
    <p class="text-muted">Generated {{ generatedAt }}</p>

    <p v-if="loading">Loading...</p>
    <template v-else>
      <section v-if="stats">
        <h2>Overview</h2>
        <table class="report-table">
          <tbody>
            <tr><th>Series</th><td>{{ formatNumber(stats.series_count) }}</td></tr>
            <tr><th>Volumes</th><td>{{ formatNumber(stats.volume_count) }}</td></tr>
            <tr><th>Issues</th><td>{{ formatNumber(stats.issue_count) }}</td></tr>
            <tr><th>Copies</th><td>{{ formatNumber(stats.copy_count) }}</td></tr>
            <tr><th>Total cost</th><td>{{ formatCurrency(stats.total_cost) }}</td></tr>
            <tr><th>Total current value</th><td>{{ formatCurrency(stats.total_value) }}</td></tr>
            <tr><th>Value change</th><td>{{ formatPercentage(stats.value_change_percent) }}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>By Publisher</h2>
        <table class="report-table">
          <thead>
            <tr><th>Publisher</th><th class="num">Series</th><th class="num">Issues</th><th class="num">Copies</th><th class="num">Value</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in publishers" :key="p.publisher_id">
              <td>{{ p.publisher_name }}</td>
              <td class="num">{{ p.series_count }}</td>
              <td class="num">{{ p.issue_count }}</td>
              <td class="num">{{ p.copy_count }}</td>
              <td class="num">{{ formatCurrency(p.total_value) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>By Comic Age</h2>
        <table class="report-table">
          <thead>
            <tr><th>Age</th><th class="num">Series</th><th class="num">Issues</th><th class="num">Copies</th><th class="num">Value</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in ages" :key="a.comic_age_id">
              <td>{{ a.comic_age }}</td>
              <td class="num">{{ a.series_count }}</td>
              <td class="num">{{ a.issue_count }}</td>
              <td class="num">{{ a.copy_count }}</td>
              <td class="num">{{ formatCurrency(a.total_value) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>By Condition</h2>
        <table class="report-table">
          <thead>
            <tr><th>Grade</th><th>Condition</th><th class="num">Copies</th><th class="num">Value</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in conditions" :key="c.condition_id">
              <td>{{ c.condition_code }}</td>
              <td>{{ c.condition_text }}</td>
              <td class="num">{{ c.copy_count }}</td>
              <td class="num">{{ formatCurrency(c.total_value) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Top 10 Most Valuable Comics</h2>
        <table class="report-table">
          <thead>
            <tr><th>Comic</th><th>Grade</th><th class="num">Value</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in highValue" :key="c.copy_id">
              <td>{{ c.series_title }} #{{ c.issue_number }}</td>
              <td>{{ c.condition_code }}</td>
              <td class="num">{{ formatCurrency(c.current_value) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFormatting } from '@/composables'
import {
  useStatsStore,
  fetchWrapper,
  API_BASE,
  type CollectionStats,
  type PublisherStats,
  type HighValueCopy
} from '@/core'

const { formatCurrency, formatPercentage, formatNumber } = useFormatting()
const statsStore = useStatsStore()

const loading = ref(true)
const generatedAt = new Date().toLocaleString()
const stats = ref<CollectionStats | null>(null)
const publishers = ref<PublisherStats[]>([])
const ages = ref<any[]>([])
const conditions = ref<any[]>([])
const highValue = ref<HighValueCopy[]>([])

const print = () => window.print()

onMounted(async () => {
  try {
    stats.value = await statsStore.fetchCollectionStats()
    publishers.value = (await statsStore.fetchPublisherStats()).filter(
      (p: any) => p.series_count > 0
    )
    ages.value = (await fetchWrapper.get<{ results: any[] }>(`${API_BASE}/stats/by-age`)).results
    conditions.value = (
      await fetchWrapper.get<{ results: any[] }>(`${API_BASE}/stats/by-condition`)
    ).results
    const hv = await statsStore.fetchHighValueItems(10)
    highValue.value = hv ? hv.copies : []
  } catch (e) {
    console.error('Error loading summary report:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss">
@use './reportPrint.scss';
</style>
