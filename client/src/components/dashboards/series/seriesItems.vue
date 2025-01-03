<template>
  <tr v-show="totalRecords === 0 && !loading">
    <td colspan="9" class="no-records"><font-awesome-icon :icon="['fas', 'angle-left']" class="red" /> No Records Found</td>
  </tr>
  <tr
      class="table-row"
      v-for="record in records"
      :key="record.id">
    <td class="text-center">{{ record.title_id }}</td>
    <td>{{ record.title }}</td>
    <td class="text-center">{{ record.issn }}</td>
    <td class="text-center">{{ formatCurrency(record.series_price) }}</td>
    <td class="text-center">{{ formatCurrency(record.series_value) }}</td>
    <td class="text-center">{{ formatPercentage(record.series_value_gain) }}</td>
    <td class="text-center">{{ record.volume_count }}</td>
    <td class="text-center">{{ record.issue_count }}</td>
    <td class="text-center">{{ record.copy_count }}</td>
  </tr>
</template>

<script>
import { formatCurrency, formatPercentage } from '@/core/index.js'

export default {
  name: "seriesItems",
  props: {
    records: Array,
    totalRecords: Number,
    loading: Boolean
  },
  setup() {

    return {formatCurrency, formatPercentage}
  }
}

</script>


<style scoped lang="scss">

</style>
