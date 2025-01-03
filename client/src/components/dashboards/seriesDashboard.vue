<template>
  <div>
    <h1>Series Dashboard</h1>
    <button @click="fetchSeries">Fetch Series</button>
    <ul>
      <li v-for="series in series" :key="series.id">
        {{ series.title }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="js">
//connect to the backend series express server and return the series data
import { ref } from 'vue'

const props = defineProps({
  series: Array
});

const series = ref(props.series)
const fetchSeries = async () => {
  const response = await fetch('http://localhost:3000/api/series')
  series.value = await response.json();
}


</script>
<style scoped lang="scss" />
