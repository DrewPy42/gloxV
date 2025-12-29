<template>
  <div class="table-responsive">
    <table class="table table-striped table-hover">
      <thead>
      <tr class="table-header">
        <th></th>
        <th class="text-center">Volume</th>
        <th class="text-center">Issue Range</th>
        <th class="text-center">Start Date</th>
        <th class="text-center">End Date</th>
        <th class="text-center">Notes</th>
      </tr>
      </thead>
      <tbody>
        <tr v-show="volumeStore.records.length === 0 && !volumeStore.loading">
          <td colspan="6" class="no-records">
            <font-awesome-icon :icon="['fas', 'angle-left']" class="red" />
            No Records Found
          </td>
        </tr>
        <tr
          v-for="record in volumeStore.records"
          :key="record.volume_id"
          @click="$emit('volumeSelected', record)"
        >
          <td></td>
          <td class="text-center">{{ record.volume_number }}</td>
          <td class="text-center">{{ record.issue_range }}</td>
          <td class="text-center">{{ formatDate(record.start_date) }}</td>
          <td class="text-center">{{ formatDate(record.end_date) }}</td>
          <td class="text-center">
            <NotesCell :notes="record.notes" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useVolumeStore } from '@/core/stores'
import NotesCell from '../objects/notesCell.vue'
import { useFormatting } from '@/composables'

export default {
  name: 'SeriesFormVolumes',
  props: {
    title_id: Number,
    series_id: Number
  },
  emits: ['volumeSelected'],
  components: {
    FontAwesomeIcon,
    NotesCell
  },
  setup(props) {
    const volumeStore = useVolumeStore()
    const { formatDate } = useFormatting()
    
    const fetchVolumes = async () => {
      const seriesId = props.series_id || props.title_id
      if (!seriesId) return
      await volumeStore.fetchRecords({ 
        filters: { series_id: seriesId },
        limit: 100
      })
    }
    
    onMounted(() => {
      fetchVolumes()
    })

    return { 
      volumeStore,
      formatDate
    }
  }
}
</script>

<style scoped lang="scss">
</style>
