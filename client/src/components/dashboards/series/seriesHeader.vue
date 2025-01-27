<template>
  <div>
    <h1>Series Dashboard</h1>
    <div class="record-count">{{ message }}</div>
    <div class="pagination-container">
      <pagination
        :total-pages="totalPages"
        :current-page="currentPage"
        @page-changed="changePage"
      />
    </div >
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr class="table-header">
            <th>Title</th>
            <th scope="col" class="text-center">Limited Series</th>
            <th scope="col" class="text-center">Publisher</th>
            <th scope="col" class="text-center">Total Price</th>
            <th scope="col" class="text-center">Total Value</th>
            <th scope="col" class="text-center">Value Gain</th>
            <th scope="col" class="text-center">Volumes</th>
            <th scope="col" class="text-center">Issues</th>
            <th scope="col" class="text-center">Copies</th>
          </tr>
        </thead>
        <seriesItems :records="series"/>
      </table>
    </div>
  </div>
</template>

<script>
import Pagination from '@/components/dashboards/Pagination.vue';
import { onMounted, ref, watchEffect } from "vue";
import SeriesItems from '@/components/dashboards/series/seriesItems.vue'

export default {
  components: {
    SeriesItems,
    Pagination
  },
  name: 'seriesHeader',
  setup() {
    const message = ref('Loading series data...')
    const series = ref([])
    const count = ref([])
    const currentPage = ref(1)
    const totalPages = ref(1)

    const fetchSeries = async () => {
      const query = `?page=${currentPage.value}&limit=25`
      const response = await fetch(`http://localhost:3000/api/series${query}`)
      const data = await response.json()
      series.value = data.results
      count.value = data.count[0].total
      totalPages.value = Math.ceil(count.value / 25)
      message.value = `Displaying ${series.value.length} records of ${count.value} total records`
    }
    onMounted(fetchSeries);

    const changePage = (page) => {
      currentPage.value = page
    }
    watchEffect(() =>
    {
      if (currentPage.value > 0) {
        fetchSeries()
      }
    });

    return { message, series, count, currentPage, totalPages, changePage }
  }
}

</script>

<style scoped lang="scss">
  @use "@/styles/dashboards.scss";
</style>
