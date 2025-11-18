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
            <NotesCell :record="record.notes" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { onMounted, ref, computed } from 'vue'
import { formatDate } from '@/core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MenuDropdown from "../menus/menuDropdown.vue";
import { getVolumeEditDropDown } from '@/core';
import { useVolumeStore } from '@/core/stores/volumeStore'
import NotesCell from '../objects/notesCell.vue'

export default {
  name: 'SeriesFormVolumes',
  props: {
    title_id: Number
  },
  emits: ['volumeSelected'],
  components: {
    NotesCell
  },
  setup(props) {
    const volumeStore = useVolumeStore()
    
    const fetchVolumes = async () => {
      if (!props.title_id) return;
      await volumeStore.fetchVolumesByTitleId(props.title_id);
    }
    
    onMounted(() => {
      fetchVolumes()
    })

    return { 
      volumeStore,
      formatDate,
      NotesCell 
    }
  }
}
</script>

<style scoped lang="scss">

</style>
