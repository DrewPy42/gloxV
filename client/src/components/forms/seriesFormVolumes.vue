<template>
  <div class="table-responsive">
    <table class="table table-striped table-hover">
      <thead>
      <tr class="table-header">
        <th class="text-center">Volume</th>
        <th class="text-center">Issue Range</th>
        <th class="text-center">Start Date</th>
        <th class="text-center">End Date</th>
        <th class="text-center">Notes</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="volume in volumes" :key="volume.id">
        <td class="text-center">{{ volume.volume_number }}</td>
        <td class="text-center">{{ volume.issue_range }}</td>
        <td class="text-center">{{ formatDate(volume.start_date) }}</td>
        <td class="text-center">{{ formatDate(volume.end_date) }}</td>
        <td>{{ volume.notes }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import { fetchWrapper, formatDate } from '@/core'

export default {
  name: 'SeriesFormVolumes',
  props: {
    title_id: Number
  },
  setup(props) {
    const title_id = ref(props.title_id)
    const volumes = ref([])
    const fetchVolumes = async () => {
      if (!props.title_id) return;
      const query = `?title_id=${props.title_id}`;
      const url = `http://localhost:3000/api/volume${query}`;
      const data = await fetchWrapper.get(url);
      volumes.value = data.results;
    }
    onMounted(() => {
      fetchVolumes()
    })

    return { volumes, formatDate }
  }
}
</script>

<style scoped lang="scss">

</style>
