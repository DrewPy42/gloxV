<template>
  <div>
      <SeriesHeader />
  </div>
</template>

<script>
//connect to the backend series express server and return the series data
import { onMounted, ref } from 'vue'
import SeriesHeader from './seriesHeader.vue'

export default {
  components: {
    SeriesHeader
  },
  props: {
    series: Array
  },
  setup(props) {
    const series = ref(props.series)
    const fetchSeries = async () => {
      const response = await fetch('http://localhost:3000/api/series')
      series.value = await response.json();
    }
    onMounted(fetchSeries);

    return { series }
  }
}



</script>
<style scoped lang="scss" />
