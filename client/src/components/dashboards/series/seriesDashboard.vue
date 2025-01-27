<template>
  <div class="dashboard">
      <SeriesHeader />
  </div>
</template>

<script>
//connect to the backend series express server and return the series data
import { ref } from 'vue'
import SeriesHeader from './seriesHeader.vue'

export default {
  components: {
    SeriesHeader
  },
  setup() {

  }
}



</script>
<style scoped lang="scss">
  @use "@/styles/dashboards.scss";
</style>
