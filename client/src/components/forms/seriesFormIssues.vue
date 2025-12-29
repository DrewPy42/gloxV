<template>
  <div class="table-responsive">
    <table class="table table-striped table-hover">
      <thead>
      <tr class="table-header">
        <th></th>
        <th class="text-center">Image</th>
        <th class="text-center">Issue Number</th>
        <th class="text-center">Publication Date</th>
        <th class="text-center">Copies</th>
        <th class="text-center">Notes</th>
      </tr>
      </thead>
      <tbody>
        <tr v-show="issueStore.records.length === 0 && !issueStore.loading">
          <td colspan="7" class="no-records">
            <font-awesome-icon :icon="['fas', 'angle-left']" class="red" />
            No Issues Found
          </td>
        </tr>
        <tr v-for="record in issueStore.records" :key="record.issue_id">
          <td class='clickable'><font-awesome-icon
            :icon="['fas', 'gear']"
          /></td>
          <td class="text-center">
            <img
              :src="getCoverImage(record)"
              :alt="`Issue: ${record.issue_number} cover`"
              class="publisher-icon clickable"
              @click="openCoverViewer(record)"
              @error="handleImageError($event)"
            />
          </td>
          <td class="text-center">{{ record.issue_number }}</td>
          <td class="text-center">{{ formatDate(record.cover_date || record.issue_date) }}</td>
          <td class="text-center">{{ record.copy_count }}</td>
          <td class="text-center">
            <NotesCell :notes="record.notes || record.issue_notes" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <ArtViewer
    v-model="showCoverViewer"
    title="Cover Art"
    :image-url="selectedCoverUrl"
    action-text="Change Cover"
    @action="handleCoverChange"
  />
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useIssueStore, fetchWrapper } from '@/core'
import { useFormatting } from '@/composables'
import ArtViewer from '../modals/artViewer.vue'
import NotesCell from '../objects/notesCell.vue'

export default {
  name: 'SeriesFormIssues',
  components: {
    FontAwesomeIcon,
    ArtViewer,
    NotesCell
  },
  props: {
    title_id: Number,
    series_id: Number,
    volume_id: Number
  },
  setup(props) {
    const issueStore = useIssueStore()
    const { formatDate } = useFormatting()
    const showCoverViewer = ref(false)
    const selectedCoverUrl = ref('')
    const selectedIssue = ref(null)

    const getCoverImage = (record, bustCache = false) => {
      // New schema uses cover_image_path, old used cover_art_file
      const coverFile = record.cover_image_path || record.cover_art_file
      if (!coverFile) {
        return '/images/covers/missing_cover.svg'
      }
      const baseUrl = coverFile.startsWith('/') ? coverFile : `/images/covers/uploads/${coverFile}`
      return bustCache ? `${baseUrl}?t=${Date.now()}` : baseUrl
    }

    const handleImageError = (event) => {
      event.target.src = '/images/covers/missing_cover.svg'
    }

    const fetchIssues = async () => {
      const filters = {}
      if (props.volume_id) {
        filters.volume_id = props.volume_id
      } else if (props.series_id || props.title_id) {
        filters.series_id = props.series_id || props.title_id
      }
      
      if (Object.keys(filters).length > 0) {
        await issueStore.fetchRecords({ filters, limit: 200 })
      }
    }

    const openCoverViewer = (record) => {
      selectedIssue.value = record
      selectedCoverUrl.value = getCoverImage(record)
      showCoverViewer.value = true
    }

    const handleCoverChange = async () => {
      if (!selectedIssue.value) {
        console.error('No issue selected')
        return
      }

      try {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = 'image/*'

        fileInput.onchange = async (event) => {
          const file = event.target.files?.[0]
          if (!file) return

          try {
            const uploadUrl = `http://localhost:3000/api/issues/${selectedIssue.value.issue_id}/cover`
            const response = await fetchWrapper.upload(uploadUrl, file, 'cover')

            if (response.cover_image_path || response.cover_art_file) {
              selectedIssue.value.cover_image_path = response.cover_image_path || response.cover_art_file
              selectedCoverUrl.value = getCoverImage(selectedIssue.value, true)
            }

            await fetchIssues()
            console.log('Cover updated successfully')
          } catch (error) {
            console.error('Error uploading cover:', error)
            alert('Failed to upload cover image. Please try again.')
          }
        }

        fileInput.click()
      } catch (error) {
        console.error('Error initiating cover change:', error)
      }
    }

    onMounted(() => {
      fetchIssues()
    })

    watch(() => props.volume_id, (newVolumeId) => {
      if (newVolumeId) {
        fetchIssues()
      }
    })

    return { 
      issueStore, 
      formatDate, 
      getCoverImage, 
      handleImageError, 
      handleCoverChange, 
      openCoverViewer,
      showCoverViewer, 
      selectedCoverUrl
    }
  }
}
</script>

<style scoped lang="scss">
@use "@/styles/modals";
</style>
