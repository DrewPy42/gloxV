<template>
  <div>
    <h1>Series Dashboard</h1>
    <div class="record-count">{{ message }}</div>
    <pagination
      :total-pages="totalPages"
      :current-page="currentPage"
      @page-changed="changePage"
    />
    <table class="table table-striped table-hover">
      <thead>
        <tr class="table-header">
          <th class="text-center">Series ID</th>
          <th>Title</th>
          <th class="text-center">ISSN</th>
          <th class="text-center">Total Price</th>
          <th class="text-center">Total Value</th>
          <th class="text-center">Value Gain</th>
          <th class="text-center">Volumes</th>
          <th class="text-center">Issues</th>
          <th class="text-center">Copies</th>
        </tr>
      </thead>
      <seriesItems :records="series"/>
    </table>
  </div>
</template>

<script>
import Pagination from '../Pagination.vue';
import { onMounted, ref, watchEffect } from "vue";
import SeriesItems from '@/components/dashboards/series/seriesItems.vue'

export default {
  name: "seriesHeader",
  components: {
    SeriesItems,
    Pagination,
  },
  setup(props) {
    const message = ref('Loading series data...')
    const series = ref(props.series)
    const currentPage = ref(1)
    const totalPages = ref(1)

    const fetchSeries = async () => {
      const response = await fetch('http://localhost:3000/api/series')
      series.value = await response.json();
      totalPages.value = Math.ceil(series.value.length / 10)
      message.value = `Displaying ${series.value.length} series`
    }
    onMounted(fetchSeries);

    const changePage = (page) => {
      currentPage.value = page
    }

    return { message, series, currentPage, totalPages, changePage }
  }
}

</script>

<style scoped lang="scss">

</style>
