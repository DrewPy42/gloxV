<template>
  <div class="report-page">
    <div class="report-toolbar no-print">
      <router-link to="/reports">&larr; All reports</router-link>
      <button class="btn btn-primary btn-sm" :disabled="loading" @click="print">
        <font-awesome-icon :icon="['fas', 'print']" class="me-1" /> Print / Save as PDF
      </button>
    </div>

    <h1>Collection Inventory Report</h1>
    <p class="text-muted">
      Generated {{ generatedAt }}<span v-if="filterSummary"> &middot; {{ filterSummary }}</span>
    </p>

    <form class="row g-2 mb-3 no-print" @submit.prevent="run">
      <div class="col-md-3">
        <label class="form-label">Publisher</label>
        <select v-model="filters.publisher_id" class="form-select form-select-sm">
          <option value="">All publishers</option>
          <option v-for="p in options.publishers" :key="p.publisher_id" :value="p.publisher_id">
            {{ p.publisher_name }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Series</label>
        <select v-model="filters.series_id" class="form-select form-select-sm">
          <option value="">All series</option>
          <option v-for="s in seriesOptions" :key="s.series_id" :value="s.series_id">
            {{ s.title }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Location</label>
        <select v-model="filters.location_id" class="form-select form-select-sm">
          <option value="">All locations</option>
          <option v-for="l in options.locations" :key="l.location_id" :value="l.location_id">
            {{ l.label }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Format</label>
        <select v-model="filters.format" class="form-select form-select-sm">
          <option value="">Physical and digital</option>
          <option value="physical">Physical only</option>
          <option value="digital">Digital only</option>
        </select>
      </div>
      <div class="col-12 d-flex align-items-center gap-3">
        <button type="submit" class="btn btn-outline-primary btn-sm">Run report</button>
        <div class="btn-group btn-group-sm" role="group" aria-label="Detail level">
          <button
            type="button"
            class="btn"
            :class="detail === 'copy' ? 'btn-secondary' : 'btn-outline-secondary'"
            @click="detail = 'copy'"
          >
            Copy detail
          </button>
          <button
            type="button"
            class="btn"
            :class="detail === 'issue' ? 'btn-secondary' : 'btn-outline-secondary'"
            @click="detail = 'issue'"
          >
            Issue summary
          </button>
        </div>
      </div>
    </form>

    <p v-if="loading">Loading...</p>
    <p v-else-if="!seriesGroups.length">No records match these filters.</p>
    <template v-else>
      <section class="grand-total">
        <table class="report-table">
          <tbody>
            <tr><th>Series</th><td class="num">{{ formatNumber(seriesGroups.length) }}</td></tr>
            <tr><th>Issues</th><td class="num">{{ formatNumber(totals.issues) }}</td></tr>
            <tr><th>Copies</th><td class="num">{{ formatNumber(totals.copies) }}</td></tr>
            <tr><th>Issues with no copy recorded</th><td class="num">{{ formatNumber(totals.missing) }}</td></tr>
            <tr><th>Total cost</th><td class="num">{{ formatCurrency(totals.cost) }}</td></tr>
            <tr><th>Total current value</th><td class="num">{{ formatCurrency(totals.value) }}</td></tr>
          </tbody>
        </table>
      </section>

      <section v-for="s in seriesGroups" :key="s.series_id" class="series-block">
        <h3 class="h5 mt-4">
          {{ s.title }}
          <small class="text-muted">{{ s.publisher || 'No publisher' }}</small>
        </h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>Vol</th>
              <th>Issue</th>
              <template v-if="detail === 'copy'">
                <th>Format</th>
                <th>Grade</th>
                <th>Location</th>
              </template>
              <template v-else>
                <th class="num">Copies</th>
              </template>
              <th class="num">Cost</th>
              <th class="num">Value</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="detail === 'copy'">
              <tr
                v-for="r in s.rows"
                :key="`${r.issue_id}-${r.copy_id}`"
                :class="{ missing: r.copy_id === null }"
              >
                <td>{{ r.volume_number ?? '' }}</td>
                <td>
                  {{ issueLabel(r) }}
                  <template v-if="r.copy_id !== null">
                    <span v-if="r.copy_total && r.copy_total > 1" class="tag tag-copy">
                      Copy {{ r.copy_number }} of {{ r.copy_total }}
                    </span>
                    <span v-if="coverLabel(r)" class="tag tag-cover">{{ coverLabel(r) }}</span>
                  </template>
                </td>
                <template v-if="r.copy_id !== null">
                  <td>{{ r.format }}</td>
                  <td>{{ gradeLabel(r) }}</td>
                  <td>{{ r.location }}</td>
                  <td class="num">{{ formatCurrency(r.cost) }}</td>
                  <td class="num">{{ formatCurrency(r.current_value) }}</td>
                </template>
                <td v-else colspan="5">No copy recorded</td>
              </tr>
            </template>
            <template v-else>
              <tr
                v-for="i in s.issues"
                :key="i.issue_id"
                :class="{ missing: i.copies === 0 }"
              >
                <td>{{ i.volume_number ?? '' }}</td>
                <td>{{ issueLabel(i) }}</td>
                <td class="num">{{ i.copies }}</td>
                <td class="num">{{ formatCurrency(i.cost) }}</td>
                <td class="num">{{ formatCurrency(i.value) }}</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="subtotal">
              <td :colspan="detail === 'copy' ? 5 : 3">
                Subtotal: {{ s.issues.length }} issues, {{ s.copies }} copies
              </td>
              <td class="num">{{ formatCurrency(s.cost) }}</td>
              <td class="num">{{ formatCurrency(s.value) }}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <table class="report-table mt-4">
        <tfoot>
          <tr>
            <td>Grand total: {{ totals.issues }} issues, {{ totals.copies }} copies</td>
            <td class="num">Cost {{ formatCurrency(totals.cost) }}</td>
            <td class="num">Value {{ formatCurrency(totals.value) }}</td>
          </tr>
        </tfoot>
      </table>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useFormatting } from '@/composables'
import { fetchWrapper, API_BASE } from '@/core'

interface InventoryRow {
  publisher_name: string | null
  series_id: number
  series_title: string
  volume_number: number | null
  issue_id: number
  issue_number: string
  issue_title: string | null
  copy_id: number | null
  copy_number: number | null
  copy_total: number | null
  cover_type: string | null
  cover_description: string | null
  format: string | null
  grade: number | string | null
  condition_code: string | null
  certification_number: string | null
  cost: number | string | null
  current_value: number | string | null
  location: string | null
}

const { formatCurrency, formatNumber } = useFormatting()

const loading = ref(true)
const generatedAt = ref(new Date().toLocaleString())
const rows = ref<InventoryRow[]>([])
const detail = ref<'copy' | 'issue'>('copy')

const filters = reactive({ publisher_id: '', series_id: '', location_id: '', format: '' })
const options = reactive({
  publishers: [] as any[],
  series: [] as any[],
  locations: [] as any[]
})
// Label shown in the printed header, frozen at run time rather than tracking the form
const filterSummary = ref('')

const seriesOptions = computed(() =>
  filters.publisher_id
    ? options.series.filter((s) => s.publisher_id === Number(filters.publisher_id))
    : options.series
)

const num = (v: number | string | null) => (v === null ? 0 : Number(v) || 0)

const issueLabel = (r: { issue_number: string; issue_title: string | null }) =>
  `#${r.issue_number}${r.issue_title ? ` ${r.issue_title}` : ''}`

// Cover info only when it adds something beyond a standard cover
const coverLabel = (r: InventoryRow) =>
  [r.cover_type && r.cover_type !== 'standard' ? r.cover_type : null, r.cover_description]
    .filter(Boolean)
    .join(': ')

const gradeLabel = (r: InventoryRow) => {
  const parts = [r.condition_code, r.grade !== null ? `(${Number(r.grade)})` : null]
  if (r.certification_number) parts.push(`Cert ${r.certification_number}`)
  return parts.filter(Boolean).join(' ')
}

const seriesGroups = computed(() => {
  const groups = new Map<number, any>()
  const issueMap = new Map<number, any>()
  for (const r of rows.value) {
    let g = groups.get(r.series_id)
    if (!g) {
      g = {
        series_id: r.series_id,
        title: r.series_title,
        publisher: r.publisher_name,
        rows: [],
        issues: [],
        copies: 0,
        cost: 0,
        value: 0
      }
      groups.set(r.series_id, g)
    }
    g.rows.push(r)

    let issue = issueMap.get(r.issue_id)
    if (!issue) {
      issue = { ...r, copies: 0, cost: 0, value: 0 }
      issueMap.set(r.issue_id, issue)
      g.issues.push(issue)
    }
    if (r.copy_id !== null) {
      issue.copies++
      issue.cost += num(r.cost)
      issue.value += num(r.current_value)
      g.copies++
      g.cost += num(r.cost)
      g.value += num(r.current_value)
    }
  }
  return [...groups.values()]
})

const totals = computed(() =>
  seriesGroups.value.reduce(
    (t, s) => {
      t.issues += s.issues.length
      t.copies += s.copies
      t.cost += s.cost
      t.value += s.value
      t.missing += s.issues.filter((i: any) => i.copies === 0).length
      return t
    },
    { issues: 0, copies: 0, cost: 0, value: 0, missing: 0 }
  )
)

const describeFilters = () => {
  const parts: string[] = []
  const name = (list: any[], key: string, label: string, id: string) =>
    list.find((x) => String(x[key]) === id)?.[label]
  if (filters.publisher_id)
    parts.push(name(options.publishers, 'publisher_id', 'publisher_name', filters.publisher_id))
  if (filters.series_id) parts.push(name(options.series, 'series_id', 'title', filters.series_id))
  if (filters.location_id)
    parts.push(name(options.locations, 'location_id', 'label', filters.location_id))
  if (filters.format) parts.push(`${filters.format} only`)
  return parts.filter(Boolean).join(', ')
}

const run = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    const qs = params.toString()
    const data = await fetchWrapper.get<{ results: InventoryRow[]; generated_at: string }>(
      `${API_BASE}/reports/inventory${qs ? `?${qs}` : ''}`
    )
    rows.value = data.results
    generatedAt.value = new Date(data.generated_at).toLocaleString()
    filterSummary.value = describeFilters()
  } catch (e) {
    console.error('Error running inventory report:', e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

const print = () => window.print()

// @page is global, so landscape is added only while this report is on screen
let pageStyle: HTMLStyleElement | null = null

onUnmounted(() => pageStyle?.remove())

onMounted(async () => {
  pageStyle = document.createElement('style')
  pageStyle.textContent = '@page { size: landscape; }'
  document.head.appendChild(pageStyle)

  try {
    const f = await fetchWrapper.get<any>(`${API_BASE}/reports/filters`)
    options.publishers = f.publishers
    options.series = f.series
    options.locations = f.locations
  } catch (e) {
    console.error('Error loading report filters:', e)
  }
  await run()
})
</script>

<style lang="scss">
@use './reportPrint.scss';
</style>
