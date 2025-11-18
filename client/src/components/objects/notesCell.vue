<template>
    <div v-if="notes" class="notes-cell">
        <span class="notes-icon">
        <font-awesome-icon :icon="['fas', 'sticky-note']" class="has-notes" />
        <span class="notes-tooltip">{{ notes }}</span>
        </span>
    </div>
    <span v-else class="no-notes">-</span>
</template>

<script>
export default {
    name: 'NotesCell',
    props: {
        notes: String
    }
}
</script>

<style scoped lang="scss">
@use "@/styles/dashboards.scss";
</style>
