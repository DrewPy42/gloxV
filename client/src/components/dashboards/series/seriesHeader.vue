<template>
  <div>
    <h1>Series Dashboard</h1>
    <div class="record-count">{{ seriesStore.message }}</div>
    <div class="pagination-container">
      <pagination
        :total-pages="seriesStore.totalPages"
        :current-page="seriesStore.currentPage"
        @page-changed="seriesStore.changePage"
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
            <th scope="col" class="text-center">Notes</th>
          </tr>
        </thead>
        <seriesItems :records="seriesStore.records"/>
      </table>
    </div>
     <pagination
        :total-pages="seriesStore.totalPages"
        :current-page="seriesStore.currentPage"
        @page-changed="seriesStore.changePage"
      />
  </div>
</template>

<script>
import Pagination from '@/components/dashboards/Pagination.vue';
import { onMounted } from "vue";
import SeriesItems from '@/components/dashboards/series/seriesItems.vue';
import { useSeriesStore } from '@/core/stores/seriesStore';

export default {
  components: {
    SeriesItems,
    Pagination
  },
  name: 'seriesHeader',
  setup() {
    const seriesStore = useSeriesStore();

    onMounted(() => {
      seriesStore.fetchSeries();
    });

    return { seriesStore }
  }
}

</script>

<style scoped lang="scss">
  @use "@/styles/dashboards.scss";
</style>
