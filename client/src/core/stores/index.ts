import { createBaseStore } from './baseStore'
import type {
  CollectedEdition,
  CollectionStats,
  Copy,
  Cover,
  HighValueCopy,
  Issue,
  IssueCredit,
  Location,
  Person,
  Publisher,
  PublisherStats,
  Series,
  Storyline,
  StorylineIssue,
  Tag,
  Volume
} from '@/core'
import { API_BASE, fetchWrapper } from '@/core'
import { ref } from 'vue'
import { defineStore } from 'pinia'

// ============================================================================
// Series Store
// ============================================================================

export const useSeriesStore = createBaseStore<Series>('series', {
  baseUrl: `${API_BASE}/series`,
  entityName: 'series',
  idField: 'series_id'
})

// Extended series store with summary
export const useSeriesStoreExtended = () => {
  const baseStore = useSeriesStore()

  const fetchSeriesSummary = async (id: number) => {
    try {

      return await fetchWrapper.get<Series>(`${API_BASE}/series/${id}/summary`)
    } catch (err) {
      console.error('Error fetching series summary:', err)
      return null
    }
  }

  const fetchSeriesLinks = async (id: number) => {
    try {
      const data = await fetchWrapper.get<{ results: any[] }>(`${API_BASE}/series/${id}/links`)
      return data.results
    } catch (err) {
      console.error('Error fetching series links:', err)
      return []
    }
  }

  return {
    ...baseStore,
    fetchSeriesSummary,
    fetchSeriesLinks
  }
}

// ============================================================================
// Volume Store
// ============================================================================

export const useVolumeStore = createBaseStore<Volume>('volumes', {
  baseUrl: `${API_BASE}/volumes`,
  entityName: 'volumes',
  idField: 'volume_id'
})

// ============================================================================
// Issue Store
// ============================================================================

export const useIssueStore = createBaseStore<Issue>('issues', {
  baseUrl: `${API_BASE}/issues`,
  entityName: 'issues',
  idField: 'issue_id'
})

// Extended issue store
export const useIssueStoreExtended = () => {
  const baseStore = useIssueStore()

  const fetchIssueCopies = async (issueId: number) => {
    try {
      const data = await fetchWrapper.get<{ results: Copy[] }>(
        `${API_BASE}/issues/${issueId}/copies`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching issue copies:', err)
      return []
    }
  }

  const fetchIssueStorylines = async (issueId: number) => {
    try {
      const data = await fetchWrapper.get<{ results: Storyline[] }>(
        `${API_BASE}/issues/${issueId}/storylines`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching issue storylines:', err)
      return []
    }
  }

  return {
    ...baseStore,
    fetchIssueCopies,
    fetchIssueStorylines
  }
}

// ============================================================================
// Copy Store
// ============================================================================

export const useCopyStore = createBaseStore<Copy>('copies', {
  baseUrl: `${API_BASE}/copies`,
  entityName: 'copies',
  idField: 'copy_id'
})

// Extended copy store
export const useCopyStoreExtended = () => {
  const baseStore = useCopyStore()

  const fetchValueHistory = async (copyId: number) => {
    try {
      const data = await fetchWrapper.get<{ results: any[] }>(
        `${API_BASE}/copies/${copyId}/value-history`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching value history:', err)
      return []
    }
  }

  return {
    ...baseStore,
    fetchValueHistory
  }
}

// ============================================================================
// Publisher Store
// ============================================================================

export const usePublisherStore = createBaseStore<Publisher>('publishers', {
  baseUrl: `${API_BASE}/publishers`,
  entityName: 'publishers',
  idField: 'publisher_id'
})

// Extended publisher store
export const usePublisherStoreExtended = () => {
  const baseStore = usePublisherStore()

  const fetchAllPublishers = async () => {
    try {
      const data = await fetchWrapper.get<{ results: Publisher[] }>(
        `${API_BASE}/publishers?getall=true`
      )
      baseStore.records = data.results || []
      return data.results
    } catch (err) {
      console.error('Error fetching all publishers:', err)
      return []
    }
  }

  return {
    ...baseStore,
    fetchAllPublishers
  }
}

// ============================================================================
// Location Store
// ============================================================================

export const useLocationStore = createBaseStore<Location>('locations', {
  baseUrl: `${API_BASE}/locations`,
  entityName: 'locations',
  idField: 'location_id'
})

// Extended location store
export const useLocationStoreExtended = () => {
  const baseStore = useLocationStore()

  const fetchCabinetContents = async (cabinetNumber: number) => {
    try {

      return await fetchWrapper.get<{ cabinet_number: number; drawers: any[] }>(
        `${API_BASE}/locations/cabinet/${cabinetNumber}`
      )
    } catch (err) {
      console.error('Error fetching cabinet contents:', err)
      return null
    }
  }

  const fetchTree = async () => {
    try {
      const data = await fetchWrapper.get<{ tree: import('../models').LocationTreeNode[] }>(
        `${API_BASE}/locations/tree`
      )
      return data.tree
    } catch (err) {
      console.error('Error fetching location tree:', err)
      return []
    }
  }

  const fetchPath = async (id: number) => {
    try {
      const data = await fetchWrapper.get<{ path: import('../models').Location[] }>(
        `${API_BASE}/locations/${id}/path`
      )
      return data.path
    } catch (err) {
      console.error('Error fetching location path:', err)
      return []
    }
  }

  const fetchCounts = async (id: number) => {
    try {

      return await fetchWrapper.get<import('../models').LocationCounts>(
        `${API_BASE}/locations/${id}/counts`
      )
    } catch (err) {
      console.error('Error fetching location counts:', err)
      return null
    }
  }

  const fetchLocationLinks = async (id: number) => {
    try {

      return await fetchWrapper.get<{
        continues_to: import('../models').LocationLink[]
        overflow_from: import('../models').LocationLink[]
      }>(`${API_BASE}/locations/${id}/links`)
    } catch (err) {
      console.error('Error fetching location links:', err)
      return { continues_to: [], overflow_from: [] }
    }
  }

  const fetchAllLinks = async () => {
    try {
      const data = await fetchWrapper.get<{ results: import('../models').LocationLink[] }>(
        `${API_BASE}/location-links`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching all location links:', err)
      return []
    }
  }

  const moveLocation = async (id: number, newParentId: number | null) => {
    try {
      await fetchWrapper.put(`${API_BASE}/locations/${id}/move`, { parent_location_id: newParentId })
      return true
    } catch (err) {
      console.error('Error moving location:', err)
      return false
    }
  }

  const createLink = async (fromId: number, toId: number, notes?: string) => {
    try {
      await fetchWrapper.post(`${API_BASE}/location-links`, {
        from_location_id: fromId,
        to_location_id: toId,
        notes: notes ?? null
      })
      return true
    } catch (err) {
      console.error('Error creating location link:', err)
      return false
    }
  }

  const deleteLink = async (linkId: number) => {
    try {
      await fetchWrapper.delete(`${API_BASE}/location-links/${linkId}`)
      return true
    } catch (err) {
      console.error('Error deleting location link:', err)
      return false
    }
  }

  // Fetch all locations as a flat list (no pagination) — used for path lookups
  const fetchFlat = async (): Promise<import('../models').Location[]> => {
    try {
      const data = await fetchWrapper.get<{ results: import('../models').Location[] }>(
        `${API_BASE}/locations?limit=2000`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching flat locations:', err)
      return []
    }
  }

  // Fetch copies at a location, optionally including descendants
  const fetchCopiesAtLocation = async (
    locationId: number,
    includeDescendants = false,
    page = 1,
    limit = 50
  ) => {
    try {
      const desc = includeDescendants ? '&include_descendants=true' : ''

      return await fetchWrapper.get<{
        results: import('../models').Copy[]
        count: { total: number }[]
      }>(`${API_BASE}/copies?location_id=${locationId}${desc}&page=${page}&limit=${limit}`)
    } catch (err) {
      console.error('Error fetching copies at location:', err)
      return { results: [], count: [{ total: 0 }] }
    }
  }

  return {
    ...baseStore,
    fetchCabinetContents,
    fetchTree,
    fetchPath,
    fetchCounts,
    fetchLocationLinks,
    fetchAllLinks,
    moveLocation,
    createLink,
    deleteLink,
    fetchFlat,
    fetchCopiesAtLocation
  }
}

// ============================================================================
// Storyline Store
// ============================================================================

export const useStorylineStore = createBaseStore<Storyline>('storylines', {
  baseUrl: `${API_BASE}/storylines`,
  entityName: 'storylines',
  idField: 'storyline_id'
})

// Extended storyline store
export function useStorylineStoreExtended() {
  const baseStore = useStorylineStore()

  const fetchStorylineWithIssues = async (id: number) => {
    try {

      return await fetchWrapper.get<{
        storyline: Storyline
        issues: StorylineIssue[]
        series: { series_id: number; title: string }[]
      }>(`${API_BASE}/storylines/${id}`)
    } catch (err) {
      console.error('Error fetching storyline with issues:', err)
      return null
    }
  }

  const addIssueToStoryline = async (
    storylineId: number,
    issueId: number,
    data: { part_number?: number; part_label?: string; reading_order?: number }
  ) => {
    try {
      await fetchWrapper.post(`${API_BASE}/storylines/${storylineId}/issues`, {
        issue_id: issueId,
        ...data
      })
      return true
    } catch (err) {
      console.error('Error adding issue to storyline:', err)
      return false
    }
  }

  const removeIssueFromStoryline = async (storylineId: number, issueId: number) => {
    try {
      await fetchWrapper.delete(`${API_BASE}/storylines/${storylineId}/issues/${issueId}`)
      return true
    } catch (err) {
      console.error('Error removing issue from storyline:', err)
      return false
    }
  }

  return Object.assign(baseStore, {
    fetchStorylineWithIssues,
    addIssueToStoryline,
    removeIssueFromStoryline
  })
}

// ============================================================================
// Cover Store
// ============================================================================

export const useCoverStore = createBaseStore<Cover>('covers', {
  baseUrl: `${API_BASE}/covers`,
  entityName: 'covers',
  idField: 'cover_id'
})

// ============================================================================
// Collected Edition Store
// ============================================================================

export const useCollectedEditionStore = createBaseStore<CollectedEdition>('collectedEditions', {
  baseUrl: `${API_BASE}/collected-editions`,
  entityName: 'collected editions',
  idField: 'collected_edition_id'
})

// ============================================================================
// Tag Store
// ============================================================================

export const useTagStore = createBaseStore<Tag>('tags', {
  baseUrl: `${API_BASE}/tags`,
  entityName: 'tags',
  idField: 'tag_id'
})

// Extended tag store
export const useTagStoreExtended = () => {
  const baseStore = useTagStore()

  const fetchCategories = async () => {
    try {
      const data = await fetchWrapper.get<{ results: { tag_category: string; tag_count: number }[] }>(
        `${API_BASE}/tags/categories`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching tag categories:', err)
      return []
    }
  }

  const applyTag = async (tagId: number, entityType: string, entityId: number) => {
    try {
      await fetchWrapper.post(`${API_BASE}/tags/${tagId}/apply`, {
        entity_type: entityType,
        entity_id: entityId
      })
      return true
    } catch (err) {
      console.error('Error applying tag:', err)
      return false
    }
  }

  const removeTag = async (tagId: number, entityType: string, entityId: number) => {
    try {
      await fetchWrapper.delete(`${API_BASE}/tags/${tagId}/remove`, {
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId })
      } as any)
      return true
    } catch (err) {
      console.error('Error removing tag:', err)
      return false
    }
  }

  const fetchEntityTags = async (entityType: string, entityId: number) => {
    try {
      const data = await fetchWrapper.get<{ results: Tag[] }>(
        `${API_BASE}/tags/entity/${entityType}/${entityId}`
      )
      return data.results
    } catch (err) {
      console.error('Error fetching entity tags:', err)
      return []
    }
  }

  return {
    ...baseStore,
    fetchCategories,
    applyTag,
    removeTag,
    fetchEntityTags
  }
}

// ============================================================================
// Person Store
// ============================================================================

export const usePersonStore = createBaseStore<Person>('persons', {
  baseUrl: `${API_BASE}/persons`,
  entityName: 'persons',
  idField: 'person_id'
})

// ============================================================================
// Credit Store
// ============================================================================

export const useCreditStore = createBaseStore<IssueCredit>('credits', {
  baseUrl: `${API_BASE}/credits`,
  entityName: 'credits',
  idField: 'issue_credit_id'
})

// Extended credit store
export const useCreditStoreExtended = () => {
  const baseStore = useCreditStore()

  const fetchJobTitles = async () => {
    try {
      const data = await fetchWrapper.get<{ results: any[] }>(`${API_BASE}/credits/job-titles`)
      return data.results
    } catch (err) {
      console.error('Error fetching job titles:', err)
      return []
    }
  }

  const fetchJobCategories = async () => {
    try {
      const data = await fetchWrapper.get<{ results: any[] }>(`${API_BASE}/credits/job-categories`)
      return data.results
    } catch (err) {
      console.error('Error fetching job categories:', err)
      return []
    }
  }

  return {
    ...baseStore,
    fetchJobTitles,
    fetchJobCategories
  }
}

// ============================================================================
// Stats Store (read-only)
// ============================================================================

export const useStatsStore = defineStore('stats', () => {
  const collectionStats = ref<CollectionStats | null>(null)
  const publisherStats = ref<PublisherStats[]>([])
  const highValueCopies = ref<HighValueCopy[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCollectionStats = async () => {
    loading.value = true
    try {
      const data = await fetchWrapper.get<CollectionStats>(`${API_BASE}/stats`)
      collectionStats.value = data
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchPublisherStats = async () => {
    loading.value = true
    try {
      const data = await fetchWrapper.get<{ results: PublisherStats[] }>(
        `${API_BASE}/stats/by-publisher`
      )
      publisherStats.value = data.results
      return data.results
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  const fetchHighValueItems = async (limit: number = 25) => {
    loading.value = true
    try {
      const data = await fetchWrapper.get<{ copies: HighValueCopy[]; collected_editions: any[] }>(
        `${API_BASE}/stats/high-value?limit=${limit}`
      )
      highValueCopies.value = data.copies
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchSeriesStats = async (seriesId: number) => {
    try {

      return await fetchWrapper.get<any>(`${API_BASE}/stats?series_id=${seriesId}`)
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  return {
    collectionStats,
    publisherStats,
    highValueCopies,
    loading,
    error,
    fetchCollectionStats,
    fetchPublisherStats,
    fetchHighValueItems,
    fetchSeriesStats
  }
})
