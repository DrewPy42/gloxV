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
        <tr v-for="record in records" :key="volume.id">
          <td class='clickable'><font-awesome-icon
            :icon="['fas', 'gear']"
          /></td>
          <td class="text-center">{{ record.volume_number }}</td>
          <td class="text-center">{{ record.issue_range }}</td>
          <td class="text-center">{{ formatDate(record.start_date) }}</td>
          <td class="text-center">{{ formatDate(record.end_date) }}</td>
          <td>{{ record.notes }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import { fetchWrapper, formatDate } from '@/core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MenuDropdown from "../menus/menuDropdown.vue";
import { getVolumeEditDropDown } from '@/core';

export default {
  name: 'SeriesFormVolumes',
  props: {
    title_id: Number
  },
  emits: ['volumeSelected'],
  setup(props) {
    const title_id = ref(props.title_id)
    const records = ref([])
    const fetchVolumes = async () => {
      if (!props.title_id) return;
      const query = `?title_id=${props.title_id}`;
      const url = `http://localhost:3000/api/volume${query}`;
      const data = await fetchWrapper.get(url);
      records.value = data.results;
    }
    onMounted(() => {
      fetchVolumes()
    })

    return { records, formatDate }
  }
}
</script>

<style scoped lang="scss">

</style>
