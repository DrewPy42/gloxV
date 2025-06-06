<template>
  <div class="table-responsive">
    <table class="table table-striped table-hover">
      <thead>
      <tr class="table-header">
        <th></th>
        <th class="text-center"></th>
        <th class="text-center">Issue Number</th>
        <th class="text-center">Volume</th>
        <th class="text-center">Publication Date</th>
        <th class="text-center">Copies</th>
        <th class="text-center">Notes</th>
      </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.id">
          <td class='clickable'><font-awesome-icon
            :icon="['fas', 'gear']"
          /></td>
          <td class="text-center">
            <img
              v-if="record.logo"
              :src="`/images/covers/${record.cover_art_file}`"
              :alt="`Issue: ${record.issue_number} cover`"
              class="publisher-icon clickable"
            />
            <font-awesome-icon
              v-else
              :icon="['fas', 'file-circle-question']"
              class="red-icon"
            />
          </td>
          <td class="text-center">{{ record.issue_number }}</td>
          <td class="text-center">{{ record.volume_number }}</td>
          <td class="text-center">{{ formatDate(record.copy_count) }}</td>
          <td class="text-center">{{ record.copies }}</td>
          <td>{{ record.issue_notes }}</td>
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

export default {
  name: 'SeriesFormIssues',
  props: {
    title_id: Number,
    volume_id: Number
  },
  setup(props) {
    const title_id = ref(props.title_id)
    const volume_id = ref(props.volume_id)
    const records = ref([])
    let query = '?';
    const fetchIssues = async () => {

      if (!props.volume_id) {
        query += `title_id=${props.title_id}`;
      }
      if (!props.title_id) {
        query += `&volume_id=${props.volume_id}`;
      }
      if (!props.title_id && !props.volume_id) {
        return;
      }
      // Construct the URL with the query parameters
      const url = `http://localhost:3000/api/issues${query}`;
      const data = await fetchWrapper.get(url);
      records.value = data.results;
    }
    onMounted(() => {
      fetchIssues()
    })

    return { records, formatDate }
  }
}
</script>

<style scoped lang="scss">

</style>
