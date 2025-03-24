<template>
  <div class="container-fluid">
    <div class="card w-50 my-3">
      <div class="card-header fw-bold">Collection Stats</div>
      <div class="card-body">
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Titles</div>
          <div class="form-control form-input">{{ stats.titles }}</div>
        </div>
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Volumes</div>
          <div class="form-control form-input">{{ stats.volume_count }}</div>
        </div>
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Issues</div>
          <div class="form-control form-input">{{ stats.issue_count }}</div>
        </div>
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Copies</div>
          <div class="form-control form-input">{{ stats.copy_count }}</div>
        </div>
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Total Price</div>
          <div class="form-control form-input">{{ formatCurrency(stats.series_cover_price) }}</div>
        </div>
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Total Value</div>
          <div class="form-control form-input">{{ formatCurrency(stats.series_value) }}</div>
        </div>
        <div class="input-block input-group m-1">
          <div class="input-label input-group-text col-3">Value Gain</div>
          <div class="form-control form-input">{{ formatPercentage(stats.series_value_change) }}</div>
        </div>
      </div>
    </div>
    <div class="card-">
      <a href="#"
         @click.prevent="regenAllStats()"
         class="btn btn-primary">Regenerate Stats</a>
      <div v-if="showProgress" class="progress my-2 w-50">
        <div
          class="progress-bar progress-bar-striped progress-bar-animated"
          role="progressbar"
          aria-label="Stats Progress"
          :aria-valuenow=progress
          aria-valuemin="0"
          aria-valuemax="100"
          :style="{ width: progress + '%' }"
          >
          {{ progress }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import { fetchWrapper, formatCurrency, formatPercentage } from '@/core'

export default {
  name: 'statsForm',
  methods: { formatCurrency, formatPercentage },
  components: {},
  setup() {
    const stats = ref([])
    const progress = ref(0)
    const showProgress = ref(true)
    let currentProgress = null;

    function getStats() {
      const url = `http://localhost:3000/api/stats?id=all`
      fetchWrapper.get(url)
        .then(data => {
          stats.value.titles = data.titles
          stats.value.volume_count = data.volumes
          stats.value.issue_count = data.issues
          stats.value.copy_count = data.copies
          stats.value.series_cover_price = data.cprice
          stats.value.series_value = data.cvalue
          stats.value.series_value_change = data.cgain
        })
        .catch(err => console.error(err))
    }

    const regenAllStats = () => {
      showProgress.value = true;
      if (currentProgress) {
        currentProgress.close();
      }
      const url = `http://localhost:3000/api/stats?regen=true`;
      currentProgress = new EventSource(url);
      currentProgress.onmessage = (event) => {
        if (event.data === "complete") {
          progress.value = 100;
          // showProgress.value = false;
          currentProgress.close();
          getStats();
        } else {
          progress.value = parseInt(event.data, 10);
        }
      };
      currentProgress.onerror = () => {
        console.error('Error with EventSource');
        currentProgress.close();
      }
    }

    onMounted(() => {
      getStats();
      if (currentProgress) {
        currentProgress.close();
      }
    })

    return {
      progress, showProgress, stats, regenAllStats
    }
  }
}
</script>

<style scoped lang="scss">
@use "@/styles/forms.scss";
</style>
