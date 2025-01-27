<template>
  <modal-wrapper
    :show="modalOpen"
    :modal-used="modalType"
    @save-and-close="modalOpen = false"
    :selected-id="selectedID"
  />
  <tbody>
    <tr v-show="totalRecords === 0 && !loading">
      <td colspan="10" class="no-records">
        <font-awesome-icon :icon="['fas', 'angle-left']" class="red" />
        No Records Found
      </td>
    </tr>
    <tr
      class="table-row"
      v-for="record in records"
      :key="record.id">
      <td class='clickable' @click="toggleModal(record.title_id)"><a href="#">{{ record.title }}</a></td>
      <td class="text-center">
        <font-awesome-icon
          v-if="record.limited_series"
          :icon="['fas', 'circle-check']"
          class="blue-icon"
        />
      </td>
      <td class="text-center">
        <img
          v-if="record.logo"
          :src="`/images/logos/${record.logo}`"
          :alt="`${record.publisher_name} logo`"
          class="publisher-icon"
        />
        <font-awesome-icon
          v-else
          :icon="['fas', 'file-circle-question']"
          class="red-icon"
        />
      </td>
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
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  name: 'seriesItems',
  components: {
    FontAwesomeIcon,
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

    // const publisherIcon = (record.value) => {
    //   return {
    //     'background-image': 'url(https://via.placeholder.com/150)',
    //     'background-size': 'cover',
    //     'background-position': 'center',
    //     'width': '50px',
    //     'height': '50px',
    //     'border-radius': '50%'
    //   }
    // }

    return { modalOpen, modalType, selectedID, formatCurrency, formatPercentage,
      makeViewLink, toggleModal, modalWrapper }
  }
}

</script>


<style scoped lang="scss">
@use "@/styles/dashboards.scss";
</style>
