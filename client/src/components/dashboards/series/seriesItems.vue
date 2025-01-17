<template>
  <modal-wrapper
    :show="modalOpen"
    :modal-used="modalType"
    @save-and-close="modalOpen = false"
    :selected-id="selectedID"
  />
  <tbody>
    <tr v-show="totalRecords === 0 && !loading">
      <td colspan="9" class="no-records">
        <font-awesome-icon :icon="['fas', 'angle-left']" class="red" />
        No Records Found
      </td>
    </tr>
    <tr
      class="table-row"
      v-for="record in records"
      :key="record.id">
      <td></td>
      <td class='clickable' @click="toggleModal(record.title_id)"><a href="#">{{ record.title }}</a></td>
      <td class="text-center">{{ record.issn }}</td>
      <td class="text-center">{{ formatCurrency(record.series_price) }}</td>
      <td class="text-center">{{ formatCurrency(record.series_value) }}</td>
      <td class="text-center">{{ formatPercentage(record.series_value_gain) }}</td>
      <td class="text-center">{{ record.volume_count }}</td>
      <td class="text-center">{{ record.issue_count }}</td>
      <td class="text-center">{{ record.copy_count }}</td>
    </tr>
  </tbody>
</template>

<script>
import { formatCurrency, formatPercentage, makeViewLink } from '@/core';
import modalWrapper from '@/components/modals/modalWrapper.vue'
import { ref } from 'vue'

export default {
  name: 'seriesItems',
  components: {
    modalWrapper
  },
  props: {
    records: Array,
    totalRecords: Number,
    loading: Boolean
  },
  setup() {
    const modalOpen = ref(false);
    const modalType = ref('series');
    const selectedID = ref(null);

    function toggleModal(id) {
      selectedID.value = id;
      modalOpen.value = true;
    }

    return { modalOpen, modalType, selectedID, formatCurrency, formatPercentage, makeViewLink, toggleModal, modalWrapper }
  }
}

</script>


<style scoped lang="scss">
@use "@/styles/dashboards.scss";
</style>
