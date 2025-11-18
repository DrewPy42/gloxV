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
          <td class="text-center">{{ formatDate(record.issue_date) }}</td>
          <td class="text-center">{{ record.copy_count }}</td>
          <td class="text-center">
            <NotesCell :record="record.issue_notes" />
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
import { formatDate } from '@/core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MenuDropdown from "../menus/menuDropdown.vue";
import { useIssueStore } from '@/core/stores/issueStore'
import ArtViewer from '../modals/artViewer.vue'
import NotesCell from '../objects/notesCell.vue'

export default {
  name: 'SeriesFormIssues',
  components: {
    ArtViewer,
    NotesCell
  },
  props: {
    title_id: Number,
    volume_id: Number
  },
  setup(props) {
    const issueStore = useIssueStore()
    const showCoverViewer = ref(false)
    const selectedCoverUrl = ref('')
    
    const getCoverImage = (record) => {
      return record.cover_art_file 
        ? `/images/covers/uploads/${record.cover_art_file}`
        : '/images/covers/missing_cover.svg';
    };

    const handleImageError = (event) => {
      event.target.src = '/images/covers/missing_cover.svg';
    };

    const fetchIssues = async () => {
      if (props.volume_id) {
        await issueStore.fetchIssuesByVolumeId(props.volume_id);
      } else if (props.title_id) {
        await issueStore.fetchIssuesByTitleId(props.title_id);
      }
    }

    const openCoverViewer = (record) => {
      selectedCoverUrl.value = getCoverImage(record);
      showCoverViewer.value = true;
    };

    const handleCoverChange = async () => {
      try {
        // TODO: Implement cover change logic
        // This could open a file picker, upload the new cover,
        // and update the issue record
        console.log('Changing cover for issue:', selectedIssue.value.issue_id)
        
        // After successful upload, you might want to refresh the issue data
        // await issueStore.fetchByVolumeId(props.volume_id)
        
        // Close the viewer
        showCoverViewer.value = false
      } catch (error) {
        console.error('Error updating cover:', error)
      }
    }

    onMounted(() => {
      fetchIssues()
    })

    // Watch for volume_id changes to refetch issues
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
      selectedCoverUrl,
      NotesCell
    }
  }
}
</script>

<style scoped lang="scss">
@use "@/styles/modals";
</style>
