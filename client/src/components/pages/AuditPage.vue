<template>
  <div class="audit-page">
    <h1 class="h3 mb-3">Inventory Audit</h1>

    <ul class="nav nav-tabs mb-3">
      <li v-for="t in tabs" :key="t.key" class="nav-item">
        <button class="nav-link" :class="{ active: tab === t.key }" @click="switchTab(t.key)">
          {{ t.label }}
        </button>
      </li>
    </ul>

    <div v-if="message" class="alert py-2" :class="message.error ? 'alert-danger' : 'alert-success'">
      {{ message.text }}
    </div>

    <!-- ===================== AUDIT ===================== -->
    <template v-if="tab === 'audit'">
      <div class="row g-2 align-items-end mb-3">
        <div class="col-md-5">
          <label class="form-label mb-1">Location</label>
          <select v-model="locationId" class="form-select form-select-sm" @change="loadCopies">
            <option value="">Choose a location…</option>
            <option value="unassigned">No location</option>
            <option v-for="l in locationOptions" :key="l.location_id" :value="String(l.location_id)">
              {{ '  '.repeat(l.depth) }}{{ l.label }} ({{ l.verified_count }}/{{ l.copy_count }} verified)
            </option>
          </select>
        </div>
        <div class="col-auto form-check ms-2">
          <input id="desc" v-model="includeDescendants" type="checkbox" class="form-check-input" @change="loadCopies" />
          <label for="desc" class="form-check-label">Include sub-locations</label>
        </div>
        <div class="col-auto form-check">
          <input id="unv" v-model="unverifiedOnly" type="checkbox" class="form-check-input" @change="loadCopies" />
          <label for="unv" class="form-check-label">Unverified only</label>
        </div>
        <div class="col-md-3">
          <input v-model="filterText" class="form-control form-control-sm" placeholder="Filter by series…" />
        </div>
        <div class="col-auto ms-auto">
          <button class="btn btn-primary btn-sm" @click="openAdd">
            <font-awesome-icon :icon="['fas', 'plus']" class="me-1" /> Add comics…
          </button>
        </div>
      </div>

      <p v-if="loading">Loading…</p>
      <p v-else-if="!locationId" class="text-muted">Pick a location to start auditing.</p>
      <p v-else-if="!copies.length" class="text-muted">No copies to show here.</p>
      <template v-else>
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2 small">
          <span>
            {{ formatNumber(visibleCopies.length) }} copies shown,
            {{ formatNumber(visibleCopies.filter((c) => c.verified_at).length) }} verified
          </span>
          <span v-if="truncated" class="text-danger">Only the first 3000 copies are loaded. Narrow the location.</span>
          <button class="btn btn-outline-success btn-sm" @click="setVerified(visibleCopies, true)">
            Mark all shown verified
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="setVerified(visibleCopies, false)">
            Clear verified on shown
          </button>
        </div>

        <div v-for="g in groups" :key="g.series_id" class="series-group mb-3">
          <div class="series-head d-flex align-items-center gap-2">
            <input
              type="checkbox"
              class="form-check-input"
              :checked="g.copies.every((c) => staged.copies.has(c.copy_id))"
              title="Stage all shown copies in this series"
              @change="toggleCopies(g.copies, ($event.target as HTMLInputElement).checked)"
            />
            <strong>{{ g.title }}</strong>
            <span class="text-muted small">{{ g.copies.length }} copies</span>
            <button
              class="btn btn-link btn-sm text-danger ms-auto p-0"
              :class="{ 'fw-bold': staged.series.has(g.series_id) }"
              @click="toggleEntity('series', g.series_id, g.title)"
            >
              {{ staged.series.has(g.series_id) ? 'Series staged ✓' : 'Remove entire series' }}
            </button>
          </div>
          <table class="table table-sm table-hover mb-0 audit-table">
            <tbody>
              <tr
                v-for="c in g.copies"
                :key="c.copy_id"
                :class="{
                  staged: isStaged(c),
                  verified: c.verified_at && !isStaged(c)
                }"
              >
                <td style="width: 2rem">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="staged.copies.has(c.copy_id)"
                    @change="toggleCopies([c], ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td style="width: 5rem">
                  <button
                    v-if="c.volume_id"
                    class="btn btn-link btn-sm p-0 text-decoration-none"
                    :class="{ 'text-danger fw-bold': staged.volumes.has(c.volume_id) }"
                    title="Stage this volume for removal"
                    @click="toggleEntity('volume', c.volume_id, `${c.series_title} Vol. ${c.volume_number}`)"
                  >
                    Vol {{ c.volume_number }}
                  </button>
                </td>
                <td>
                  <button
                    class="btn btn-link btn-sm p-0 text-decoration-none"
                    :class="{ 'text-danger fw-bold': staged.issues.has(c.issue_id) }"
                    title="Stage this issue (all its copies) for removal"
                    @click="toggleEntity('issue', c.issue_id, `${c.series_title} #${c.issue_number}`)"
                  >
                    #{{ c.issue_number }}
                  </button>
                  {{ c.issue_title }}
                  <span v-if="c.issue_copy_count > 1" class="badge bg-secondary">{{ c.issue_copy_count }} copies</span>
                  <span v-if="c.cover_type && c.cover_type !== 'standard'" class="badge bg-info text-dark">
                    {{ c.cover_type }}
                  </span>
                </td>
                <td>{{ c.format }}</td>
                <td>{{ c.condition_code }}</td>
                <td class="text-end">{{ formatCurrency(c.current_value) }}</td>
                <td class="text-end" style="width: 7rem">
                  <button
                    class="btn btn-sm py-0"
                    :class="c.verified_at ? 'btn-success' : 'btn-outline-success'"
                    @click="setVerified([c], !c.verified_at)"
                  >
                    {{ c.verified_at ? 'Verified' : 'Verify' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- ===================== EMPTY ISSUES ===================== -->
    <template v-else-if="tab === 'empty'">
      <p class="text-muted small">
        Issues with no copies on record. Stage the ones you no longer want in the database.
      </p>
      <p v-if="loading">Loading…</p>
      <p v-else-if="!emptyIssues.length" class="text-muted">No issues without copies.</p>
      <template v-else>
        <p v-if="emptyTruncated" class="text-danger small">Only the first 3000 are shown.</p>
        <input v-model="filterText" class="form-control form-control-sm mb-2 w-25" placeholder="Filter by series…" />
        <div v-for="g in emptyGroups" :key="g.series_id" class="series-group mb-3">
          <div class="series-head d-flex align-items-center gap-2">
            <input
              type="checkbox"
              class="form-check-input"
              :checked="g.issues.every((i) => staged.issues.has(i.issue_id))"
              @change="toggleIssues(g.issues, ($event.target as HTMLInputElement).checked)"
            />
            <strong>{{ g.title }}</strong>
            <span class="text-muted small">{{ g.issues.length }} empty issues</span>
          </div>
          <table class="table table-sm table-hover mb-0 audit-table">
            <tbody>
              <tr v-for="i in g.issues" :key="i.issue_id" :class="{ staged: staged.issues.has(i.issue_id) }">
                <td style="width: 2rem">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="staged.issues.has(i.issue_id)"
                    @change="toggleIssues([i], ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td style="width: 5rem">{{ i.volume_number ? `Vol ${i.volume_number}` : '' }}</td>
                <td>#{{ i.issue_number }} {{ i.issue_title }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- ===================== NEEDS DETAILS ===================== -->
    <template v-else-if="tab === 'stubs'">
      <p class="text-muted small">
        Stub records added through quick-add. Fill in the details from the Series page, then mark them complete.
      </p>
      <p v-if="!stubs.length" class="text-muted">Nothing needs details.</p>
      <template v-else>
        <button class="btn btn-outline-success btn-sm mb-2" @click="completeStubs(stubs)">
          Mark all {{ stubs.length }} complete
        </button>
        <table class="table table-sm">
          <thead><tr><th>Type</th><th>Record</th><th>Added</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in stubs" :key="`${r.type}-${r.id}`">
              <td><span class="badge bg-light text-dark border">{{ r.type }}</span></td>
              <td>{{ r.label }}</td>
              <td>{{ new Date(r.created_at).toLocaleString() }}</td>
              <td class="text-end">
                <button class="btn btn-outline-success btn-sm py-0" @click="completeStubs([r])">Mark complete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <!-- ===================== TRASH ===================== -->
    <template v-else-if="tab === 'trash'">
      <div class="btn-group btn-group-sm mb-3">
        <button
          v-for="t in trashTypes"
          :key="t"
          class="btn"
          :class="trashType === t ? 'btn-secondary' : 'btn-outline-secondary'"
          @click="loadTrash(t)"
        >
          {{ t }}
        </button>
      </div>
      <p v-if="!trash.length" class="text-muted">Nothing deleted at this level.</p>
      <table v-else class="table table-sm">
        <thead><tr><th>Name</th><th>Deleted</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in trash" :key="r.id">
            <td>{{ r.label }}</td>
            <td>{{ new Date(r.deleted_at).toLocaleString() }}</td>
            <td class="text-end">
              <span v-if="r.parent_deleted" class="text-muted small me-2">parent deleted</span>
              <button class="btn btn-outline-primary btn-sm py-0" :disabled="!!r.parent_deleted" @click="restoreOne(r.id)">
                Restore
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="text-muted small">
        Restoring a series, volume or issue also restores the children removed with it in the same audit.
      </p>
    </template>

    <!-- ===================== HISTORY ===================== -->
    <template v-else>
      <p v-if="!sessions.length" class="text-muted">No audits applied yet.</p>
      <table v-else class="table table-sm">
        <thead>
          <tr><th>When</th><th>Note</th><th>Removed</th><th class="text-end">Cost</th><th class="text-end">Value</th><th></th></tr>
        </thead>
        <tbody>
          <template v-for="s in sessions" :key="s.audit_session_id">
            <tr>
              <td>{{ new Date(s.created_at).toLocaleString() }}</td>
              <td>{{ s.note }}</td>
              <td>
                {{ s.series_count }} series, {{ s.volume_count }} vol, {{ s.issue_count }} issues,
                {{ s.copy_count }} copies
              </td>
              <td class="text-end">{{ formatCurrency(s.cost) }}</td>
              <td class="text-end">{{ formatCurrency(s.value) }}</td>
              <td class="text-end">
                <button class="btn btn-link btn-sm py-0" @click="toggleSession(s.audit_session_id)">
                  {{ openSession === s.audit_session_id ? 'Hide' : 'Details' }}
                </button>
                <span v-if="s.restored_at" class="badge bg-secondary">restored</span>
                <button v-else class="btn btn-outline-primary btn-sm py-0" @click="restoreSession(s.audit_session_id)">
                  Undo
                </button>
              </td>
            </tr>
            <tr v-if="openSession === s.audit_session_id">
              <td colspan="6" class="session-items">
                <div v-for="(it, idx) in sessionItems" :key="idx">
                  <span class="badge bg-light text-dark border me-1">{{ it.entity_type }}</span>{{ it.label }}
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </template>

    <!-- Staging bar (all tabs that stage removals) -->

    <div v-if="stagedCount" class="staging-bar">
      <span>
        Staged: {{ staged.series.size }} series, {{ staged.volumes.size }} volumes,
        {{ staged.issues.size }} issues, {{ staged.copies.size }} copies
      </span>
      <button class="btn btn-outline-secondary btn-sm" @click="clearStaged">Clear</button>
      <button class="btn btn-danger btn-sm" @click="openReview">Review &amp; remove…</button>
    </div>

    <!-- ===================== ADD ===================== -->
    <Modal
      v-model="addOpen"
      title="Add comics (stub records)"
      confirm-text="Add"
      :confirm-disabled="!canAdd || adding"
      :loading="adding"
      @confirm="submitAdd"
    >
      <div class="mb-2">
        <label class="form-label mb-1">Series</label>
        <input v-model="add.seriesText" list="add-series" class="form-control" placeholder="Type to find, or enter a new title" />
        <datalist id="add-series">
          <option v-for="o in seriesLabels" :key="o.id" :value="o.label" />
        </datalist>
        <div v-if="addSeries" class="form-text">Existing series.</div>
        <div v-else-if="add.seriesText.trim()" class="form-text text-warning">
          No match. A new series "{{ add.seriesText.trim() }}" will be created.
        </div>
      </div>
      <div v-if="!addSeries && add.seriesText.trim()" class="mb-2">
        <label class="form-label mb-1">Publisher</label>
        <select v-model="add.publisherId" class="form-select">
          <option value="">(none yet)</option>
          <option v-for="p in addOptions.publishers" :key="p.publisher_id" :value="p.publisher_id">{{ p.publisher_name }}</option>
        </select>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-4">
          <label class="form-label mb-1">Volume</label>
          <input v-model="add.volume" list="add-volumes" class="form-control" inputmode="numeric" placeholder="none" />
          <datalist id="add-volumes">
            <option v-for="v in addVolumes" :key="v.volume_id" :value="v.volume_number" />
          </datalist>
        </div>
        <div class="col-8">
          <label class="form-label mb-1">Issue numbers</label>
          <input v-model="add.issues" class="form-control" placeholder="e.g. 1 or 1-5, 7, 10A" />
        </div>
      </div>
      <p v-if="add.volume !== '' && addSeries && !addVolumeExists" class="form-text text-warning mt-0">
        Volume {{ add.volume }} doesn't exist for this series. It will be created.
      </p>
      <div class="row g-2 mb-2">
        <div class="col-6">
          <label class="form-label mb-1">Format</label>
          <select v-model="add.format" class="form-select">
            <option v-for="f in formats" :key="f" :value="f">{{ f }}</option>
          </select>
        </div>
        <div class="col-6">
          <label class="form-label mb-1">Location</label>
          <select v-model="add.locationId" class="form-select">
            <option value="">(none)</option>
            <option v-for="l in locationOptions" :key="l.location_id" :value="String(l.location_id)">
              {{ '\u00A0\u00A0'.repeat(l.depth) }}{{ l.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-check">
        <input id="extra" v-model="add.allowExtra" type="checkbox" class="form-check-input" />
        <label for="extra" class="form-check-label">Add a copy even if the issue already has one</label>
      </div>
      <p v-if="addError" class="text-danger mt-2 mb-0">{{ addError }}</p>
      <p class="text-muted small mt-2 mb-0">
        Missing series, volumes and issues are created as stubs, one copy per issue, marked verified.
        Fill in details later from the Needs details tab.
      </p>
    </Modal>

    <!-- ===================== REVIEW ===================== -->
    <Modal
      v-model="reviewOpen"
      title="Review removal"
      size="lg"
      scrollable
      confirm-text="Remove (soft delete)"
      confirm-variant="danger"
      :confirm-disabled="!preview || applying"
      :loading="applying"
      @confirm="apply"
    >
      <p v-if="!preview">Calculating…</p>
      <template v-else>
        <p>
          This will soft delete <strong>{{ preview.summary.series }}</strong> series,
          <strong>{{ preview.summary.volumes }}</strong> volumes,
          <strong>{{ preview.summary.issues }}</strong> issues and
          <strong>{{ preview.summary.copies }}</strong> copies
          (cost {{ formatCurrency(preview.summary.cost) }}, value {{ formatCurrency(preview.summary.value) }}).
          Deleting a series or volume takes everything under it, including copies in other locations.
        </p>

        <div v-if="preview.suggestions.length" class="mb-3">
          <h6>These would be left with no copies. Remove them too?</h6>
          <div v-for="s in preview.suggestions" :key="`${s.type}-${s.id}`" class="form-check">
            <input :id="`sg-${s.type}-${s.id}`" v-model="accepted" :value="`${s.type}:${s.id}`" type="checkbox" class="form-check-input" />
            <label :for="`sg-${s.type}-${s.id}`" class="form-check-label">
              <span class="badge bg-light text-dark border">{{ s.type }}</span> {{ s.label }}
              <span v-if="s.volumes || s.empty_issues" class="text-muted small">
                (also {{ s.volumes }} volumes, {{ s.empty_issues }} issues with no copies)
              </span>
            </label>
          </div>
        </div>

        <label class="form-label">Note (optional)</label>
        <input v-model="note" class="form-control" maxlength="255" placeholder="e.g. Cabinet 2 shelf check" />
        <p class="text-muted small mt-2 mb-0">Nothing is permanently deleted. You can undo from History or Trash.</p>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Modal } from '@/components/common'
import { useFormatting } from '@/composables'
import { fetchWrapper, API_BASE } from '@/core'

interface AuditCopy {
  copy_id: number
  issue_id: number
  volume_id: number | null
  volume_number: number | null
  series_id: number
  series_title: string
  issue_number: string
  issue_title: string | null
  issue_copy_count: number
  format: string
  condition_code: string | null
  cover_type: string | null
  current_value: number | string | null
  verified_at: string | null
}
interface Suggestion { type: string; id: number; label: string; empty_issues: number; volumes: number }
interface Preview {
  summary: { series: number; volumes: number; issues: number; copies: number; cost: number; value: number }
  suggestions: Suggestion[]
}

const { formatCurrency, formatNumber } = useFormatting()

const tabs = [
  { key: 'audit', label: 'Audit' },
  { key: 'empty', label: 'Empty issues' },
  { key: 'stubs', label: 'Needs details' },
  { key: 'trash', label: 'Trash' },
  { key: 'history', label: 'History' }
]
const tab = ref('audit')
const message = ref<{ text: string; error?: boolean } | null>(null)
const flash = (text: string, error = false) => {
  message.value = { text, error }
  if (!error) setTimeout(() => (message.value = null), 5000)
}
const errText = (e: any) => {
  const m = String(e?.message || e)
  try { return JSON.parse(m.replace(/^HTTP \d+: /, '')).error || m } catch { return m }
}

// ---- Audit tab ----
const locations = ref<any[]>([])
const locationId = ref('')
const includeDescendants = ref(true)
const unverifiedOnly = ref(false)
const filterText = ref('')
const copies = ref<AuditCopy[]>([])
const truncated = ref(false)
const loading = ref(false)

const locationOptions = computed(() => {
  const byParent = new Map<number | null, any[]>()
  locations.value.forEach((l) => {
    const k = l.parent_location_id ?? null
    byParent.set(k, [...(byParent.get(k) || []), l])
  })
  const known = new Set(locations.value.map((l) => l.location_id))
  const out: any[] = []
  const walk = (parent: number | null, depth: number) => {
    for (const l of byParent.get(parent) || []) {
      out.push({ ...l, depth })
      walk(l.location_id, depth + 1)
    }
  }
  walk(null, 0)
  // Locations whose parent is missing or deleted still need to be reachable
  locations.value.filter((l) => l.parent_location_id && !known.has(l.parent_location_id))
    .forEach((l) => { out.push({ ...l, depth: 0 }); walk(l.location_id, 1) })
  return out
})

const loadLocations = async () => {
  const r = await fetchWrapper.get<any>(`${API_BASE}/audit/locations`)
  locations.value = r.results
}

const loadCopies = async () => {
  if (!locationId.value) { copies.value = []; return }
  loading.value = true
  try {
    const p = new URLSearchParams({ location_id: locationId.value })
    if (includeDescendants.value) p.set('include_descendants', 'true')
    if (unverifiedOnly.value) p.set('unverified_only', 'true')
    const r = await fetchWrapper.get<any>(`${API_BASE}/audit/copies?${p}`)
    copies.value = r.results
    truncated.value = r.truncated
  } catch (e) {
    flash(errText(e), true)
  } finally {
    loading.value = false
  }
}

const visibleCopies = computed(() => {
  const t = filterText.value.trim().toLowerCase()
  return t ? copies.value.filter((c) => c.series_title.toLowerCase().includes(t)) : copies.value
})

const groups = computed(() => {
  const m = new Map<number, { series_id: number; title: string; copies: AuditCopy[] }>()
  for (const c of visibleCopies.value) {
    if (!m.has(c.series_id)) m.set(c.series_id, { series_id: c.series_id, title: c.series_title, copies: [] })
    m.get(c.series_id)!.copies.push(c)
  }
  return [...m.values()]
})

const setVerified = async (list: AuditCopy[], verified: boolean) => {
  if (!list.length) return
  try {
    await fetchWrapper.post(`${API_BASE}/audit/verify`, { copy_ids: list.map((c) => c.copy_id), verified })
    const stamp = verified ? new Date().toISOString() : null
    list.forEach((c) => (c.verified_at = stamp))
    loadLocations()
  } catch (e) {
    flash(errText(e), true)
  }
}

// ---- Empty issues ----
interface EmptyIssue {
  issue_id: number; issue_number: string; issue_title: string | null
  volume_number: number | null; series_id: number; series_title: string
}
const emptyIssues = ref<EmptyIssue[]>([])
const emptyTruncated = ref(false)
const loadEmpty = async () => {
  loading.value = true
  try {
    const r = await fetchWrapper.get<any>(`${API_BASE}/audit/empty-issues`)
    emptyIssues.value = r.results
    emptyTruncated.value = r.truncated
  } finally {
    loading.value = false
  }
}
const emptyGroups = computed(() => {
  const t = filterText.value.trim().toLowerCase()
  const m = new Map<number, { series_id: number; title: string; issues: EmptyIssue[] }>()
  for (const i of emptyIssues.value) {
    if (t && !i.series_title.toLowerCase().includes(t)) continue
    if (!m.has(i.series_id)) m.set(i.series_id, { series_id: i.series_id, title: i.series_title, issues: [] })
    m.get(i.series_id)!.issues.push(i)
  }
  return [...m.values()]
})

// ---- Staging ----
const staged = reactive({
  series: new Set<number>(),
  volumes: new Set<number>(),
  issues: new Set<number>(),
  copies: new Set<number>()
})
const stagedCount = computed(
  () => staged.series.size + staged.volumes.size + staged.issues.size + staged.copies.size
)
const isStaged = (c: AuditCopy) =>
  staged.copies.has(c.copy_id) || staged.issues.has(c.issue_id) ||
  staged.series.has(c.series_id) || (c.volume_id !== null && staged.volumes.has(c.volume_id))

const toggleCopies = (list: AuditCopy[], on: boolean) =>
  list.forEach((c) => (on ? staged.copies.add(c.copy_id) : staged.copies.delete(c.copy_id)))

const toggleIssues = (list: { issue_id: number }[], on: boolean) =>
  list.forEach((i) => (on ? staged.issues.add(i.issue_id) : staged.issues.delete(i.issue_id)))

const toggleEntity = (type: 'series' | 'volume' | 'issue', id: number, _label: string) => {
  const set = type === 'series' ? staged.series : type === 'volume' ? staged.volumes : staged.issues
  set.has(id) ? set.delete(id) : set.add(id)
}
const clearStaged = () => {
  staged.series.clear(); staged.volumes.clear(); staged.issues.clear(); staged.copies.clear()
}

const selectionBody = (extra: Suggestion[] = []) => {
  const pick = (type: string, base: Set<number>) => [
    ...base,
    ...extra.filter((s) => s.type === type).map((s) => s.id)
  ]
  return {
    series_ids: pick('series', staged.series),
    volume_ids: pick('volume', staged.volumes),
    issue_ids: pick('issue', staged.issues),
    copy_ids: [...staged.copies]
  }
}

// ---- Review modal ----
const reviewOpen = ref(false)
const preview = ref<Preview | null>(null)
const accepted = ref<string[]>([])
const note = ref('')
const applying = ref(false)

const openReview = async () => {
  preview.value = null
  accepted.value = []
  note.value = ''
  reviewOpen.value = true
  try {
    preview.value = await fetchWrapper.post<Preview>(`${API_BASE}/audit/preview`, selectionBody())
    accepted.value = preview.value.suggestions.map((s) => `${s.type}:${s.id}`)
  } catch (e) {
    reviewOpen.value = false
    flash(errText(e), true)
  }
}

// Re-run the summary when suggestions are toggled so the totals stay honest
watch(accepted, async () => {
  if (!preview.value || !reviewOpen.value) return
  const extra = preview.value.suggestions.filter((s) => accepted.value.includes(`${s.type}:${s.id}`))
  try {
    const r = await fetchWrapper.post<Preview>(`${API_BASE}/audit/preview`, selectionBody(extra))
    if (preview.value) preview.value.summary = r.summary
  } catch { /* summary stays as is */ }
})

const apply = async () => {
  if (!preview.value) return
  applying.value = true
  try {
    const extra = preview.value.suggestions.filter((s) => accepted.value.includes(`${s.type}:${s.id}`))
    const r = await fetchWrapper.post<any>(`${API_BASE}/audit/apply`, { ...selectionBody(extra), note: note.value })
    reviewOpen.value = false
    clearStaged()
    flash(`Removed ${r.summary.copies} copies, ${r.summary.issues} issues, ${r.summary.volumes} volumes, ${r.summary.series} series.`)
    await Promise.all([tab.value === 'empty' ? loadEmpty() : loadCopies(), loadLocations()])
  } catch (e) {
    flash(errText(e), true)
  } finally {
    applying.value = false
  }
}

// ---- Quick add ----
interface AddOptions {
  publishers: { publisher_id: number; publisher_name: string }[]
  series: { series_id: number; title: string; publisher_id: number | null }[]
  volumes: { volume_id: number; series_id: number; volume_number: number }[]
}
const formats = ['paperback', 'hardcover', 'digital', 'cgc_slab', 'cbcs_slab', 'other']
const addOpen = ref(false)
const adding = ref(false)
const addError = ref('')
const addOptions = reactive<AddOptions>({ publishers: [], series: [], volumes: [] })
const add = reactive({
  seriesText: '', publisherId: '' as string | number, volume: '', issues: '',
  format: 'paperback', locationId: '', allowExtra: false
})

const seriesLabels = computed(() => {
  const pub = new Map(addOptions.publishers.map((p) => [p.publisher_id, p.publisher_name]))
  const counts = new Map<string, number>()
  addOptions.series.forEach((s) => counts.set(s.title, (counts.get(s.title) || 0) + 1))
  return addOptions.series.map((s) => ({
    id: s.series_id,
    label: counts.get(s.title)! > 1 ? `${s.title} (${pub.get(s.publisher_id ?? -1) || 'no publisher'}, #${s.series_id})` : s.title
  }))
})
const addSeries = computed(() => {
  const t = add.seriesText.trim().toLowerCase()
  const hit = seriesLabels.value.find((o) => o.label.toLowerCase() === t)
  return hit ? addOptions.series.find((s) => s.series_id === hit.id)! : null
})
const addVolumes = computed(() => addOptions.volumes.filter((v) => v.series_id === addSeries.value?.series_id))
const addVolumeExists = computed(() => addVolumes.value.some((v) => String(v.volume_number) === add.volume.trim()))
const canAdd = computed(() => !!add.seriesText.trim() && !!add.issues.trim())

const openAdd = async () => {
  addError.value = ''
  add.issues = ''
  add.locationId = /^\d+$/.test(locationId.value) ? locationId.value : ''
  addOpen.value = true
  try {
    Object.assign(addOptions, await fetchWrapper.get<AddOptions>(`${API_BASE}/audit/add-options`))
  } catch (e) {
    addError.value = errText(e)
  }
}

const submitAdd = async () => {
  adding.value = true
  addError.value = ''
  try {
    const body: any = {
      volume_number: add.volume.trim(), issue_numbers: add.issues, format: add.format,
      location_id: add.locationId || null, allow_extra_copy: add.allowExtra
    }
    if (addSeries.value) body.series_id = addSeries.value.series_id
    else body.new_series = { title: add.seriesText.trim(), publisher_id: add.publisherId || null }
    const r = await fetchWrapper.post<any>(`${API_BASE}/audit/add`, body)
    const c = r.created
    addOpen.value = false
    flash(
      `Added ${c.copies} copies (${c.issues} new issues, ${c.volumes} new volumes, ${c.series} new series).` +
        (r.skipped.length ? ` Skipped, already have a copy: #${r.skipped.join(', #')}.` : '')
    )
    add.seriesText = ''; add.volume = ''; add.publisherId = ''
    await Promise.all([loadCopies(), loadLocations()])
  } catch (e) {
    addError.value = errText(e)
  } finally {
    adding.value = false
  }
}

// ---- Needs details ----
const stubs = ref<any[]>([])
const loadStubs = async () => {
  stubs.value = (await fetchWrapper.get<any>(`${API_BASE}/audit/stubs`)).results
}
const completeStubs = async (list: { type: string; id: number }[]) => {
  try {
    await fetchWrapper.post(`${API_BASE}/audit/stubs/complete`, { items: list.map((r) => ({ type: r.type, id: r.id })) })
    await loadStubs()
  } catch (e) {
    flash(errText(e), true)
  }
}

// ---- Trash ----
const trashTypes = ['copy', 'issue', 'volume', 'series']
const trashType = ref('copy')
const trash = ref<any[]>([])
const loadTrash = async (t = trashType.value) => {
  trashType.value = t
  const r = await fetchWrapper.get<any>(`${API_BASE}/audit/trash?type=${t}`)
  trash.value = r.results
}
const restoreOne = async (id: number) => {
  try {
    await fetchWrapper.post(`${API_BASE}/audit/restore`, { type: trashType.value, ids: [id] })
    flash('Restored.')
    await Promise.all([loadTrash(), loadLocations()])
  } catch (e) {
    flash(errText(e), true)
  }
}

// ---- History ----
const sessions = ref<any[]>([])
const openSession = ref<number | null>(null)
const sessionItems = ref<any[]>([])
const loadSessions = async () => {
  sessions.value = (await fetchWrapper.get<any>(`${API_BASE}/audit/sessions`)).results
}
const toggleSession = async (id: number) => {
  if (openSession.value === id) { openSession.value = null; return }
  sessionItems.value = (await fetchWrapper.get<any>(`${API_BASE}/audit/sessions/${id}`)).results
  openSession.value = id
}
const restoreSession = async (id: number) => {
  if (!window.confirm('Restore everything removed in this audit?')) return
  try {
    await fetchWrapper.post(`${API_BASE}/audit/sessions/${id}/restore`)
    flash('Audit restored.')
    await Promise.all([loadSessions(), loadLocations()])
  } catch (e) {
    flash(errText(e), true)
  }
}

const switchTab = async (key: string) => {
  tab.value = key
  message.value = null
  try {
    if (key === 'empty') await loadEmpty()
    if (key === 'stubs') await loadStubs()
    if (key === 'trash') await loadTrash()
    if (key === 'history') await loadSessions()
    if (key === 'audit') await loadLocations()
  } catch (e) {
    flash(errText(e), true)
  }
}

onMounted(() => loadLocations().catch((e) => flash(errText(e), true)))
</script>

<style scoped lang="scss">
.audit-page {
  padding: 1.5rem 1.5rem 5rem;
}
.series-head {
  background: #f1f3f5;
  padding: 0.35rem 0.6rem;
  border: 1px solid #dee2e6;
}
.audit-table tr.staged td {
  background: #f8d7da;
  text-decoration: line-through;
}
.audit-table tr.verified td {
  background: #e9f7ef;
}
.session-items {
  max-height: 14rem;
  overflow-y: auto;
  font-size: 0.85rem;
  background: #fafafa;
}
.staging-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: #fff;
  border-top: 2px solid #dc3545;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}
</style>
