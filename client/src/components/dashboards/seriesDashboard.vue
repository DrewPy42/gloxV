<template>
  <div>
    <h1>Series Dashboard</h1>
  </div>
</template>

<script setup lang="ts">
import { SeriesModel } from '@/core'

const props = defineProps<{
  series: SeriesModel[]
}>()
</script>
<style scoped lang="scss" />
