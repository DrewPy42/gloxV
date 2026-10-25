<template>
  <div class="reports-page">
    <h1>Reports</h1>
    <div class="row">
      <div v-for="report in reports" :key="report.link" class="col-md-6 col-lg-4 mb-4">
        <router-link :to="report.link" class="report-card card h-100 text-decoration-none">
          <div class="card-body">
            <h2 class="h5">
              <font-awesome-icon :icon="['fas', report.icon]" class="me-2" />
              {{ report.title }}
            </h2>
            <p class="text-muted mb-0">{{ report.description }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const reports = [
  {
    title: 'Summary Report',
    link: '/reports/summary',
    icon: 'chart-pie',
    description: 'Collection totals, plus breakdowns by publisher, comic age and condition, and the most valuable comics.'
  },
  {
    title: 'Inventory Report',
    link: '/reports/inventory',
    icon: 'clipboard-list',
    description: 'Every series, volume, issue and copy with condition, location, cost and value. Use it for collection audits and insurance.'
  }
]
</script>

<style scoped lang="scss">
.reports-page {
  padding: 1.5rem;

  h1 {
    margin-bottom: 1.5rem;
  }
}

.report-card:hover {
  border-color: #0d6efd;
}
</style>
