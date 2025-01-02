<template>
  <div>
    <h1>Series Dashboard</h1>
  </div>
</template>

<script setup lang="js">
//connect to the backend series express server and return the series data
import { ref } from 'vue'

const series = ref(props.series)
const fetchSeries = async () => {
  const response = await fetch('http://localhost:3000/series')
  const data = await response.json()
  series.value = data;
}




</script>
<style scoped lang="scss" />
