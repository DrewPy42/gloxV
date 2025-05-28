<template>
  <div class="dashboard">
      <SeriesHeader />
  </div>
</template>

<script>
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
