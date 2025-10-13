<template>
  <div>
    <div>
      <Form
        @submit="onSubmit"
        @invalid-submit="onInvalidSubmit"
        :validation-schema="schema"
        v-slot="{ errors, isSubmitting }"
      >
        <div class="card-group">
          <div class="card w-75">
            <div class="card-header fw-bold">Series Details</div>
            <div class="card-body">
              <div class="form-group mx-3">
                <div class="input-block input-group my-1">
                  <label
                    class="input-label input-group-text col-4"
                    for="series_title"
                  >Title</label>
                  <Field
                    type="text"
                    id="series_title"
                    name="series_title"
                    v-model="seriesRecord.title"
                    rules="required"
                    class="form-control form-input"
                    :class="{ 'is-invalid': errors['series_title'] }"
                  />
                </div>
                <ErrorMessage class="red" name="series_title" />
                <div class="input-block input-group my-1">
                  <label
                    class="input-label input-group-text col-4"
                    for="sort_title"
                  >Sorting Title</label>
                  <Field
                    type="text"
                    id="sort_title"
                    name="sort_title"
                    v-model="seriesRecord.sort_title"
                    class="form-control form-input"
                    :class="{ 'is-invalid': errors['sort_title'] }"
                  />
                </div>
                <ErrorMessage class="red" name="sort_title" />
                <div class="input-block input-group my-1">
                  <label
                    class="input-label input-group-text col-4"
                    for="limited_series"
                  >Limited Series</label>
                  <input
                    type="checkbox"
                    id="limited_series"
                    name="limited_series"
                    v-model="limitedSeries"
                    class="form-check-input"
                    :class="{ 'is-invalid': errors['limited_series'] }"
                  />
                </div>
                <ErrorMessage class="red" name="limited_series" />
                <div class="input-block input-group my-1">
                  <label
                    class="input-label input-group-text col-4"
                    for="series_publisher"
                  >Publisher</label>
                  <Field
                    as="select"
                    id="series_publisher"
                    name="series_publisher"
                    v-model="seriesRecord.publisher_id"
                    class="form-control form-input"
                    :class="{ 'is-invalid': errors['series_publisher'] }"
                  >
                    <option value="">Select Publisher</option>
                    <option
                      v-for="publisher in publishers"
                      :key="publisher.publisher_id"
                      :value="publisher.publisher_id"
                    >{{ publisher.publisher_name }}
                    </option>
                  </Field>
                </div>
                <ErrorMessage class="red" name="series_publisher" />
              </div>
              <div class="card-img-bottom>">
                <img
                  v-if="logoExists"
                  :src="`/images/logos/${seriesRecord.logo}`"
                  :alt="`${seriesRecord.publisher_name} logo`"
                  class="publisher-logo-small rounded mx-3"
                />
                <font-awesome-icon
                  v-else
                  :icon="['fas', 'file-circle-question']"
                  class="red-icon no-logo rounded mx-3"
                />
              </div>
            </div>
          </div>
          <div class="stats-block card w-25">
            <div class="card-header fw-bold">Series Stats</div>
            <div class="card-body">
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Volumes</div>
                <div class="form-control form-input">{{ seriesRecord.volume_count }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Issues</div>
                <div class="form-control form-input">{{ seriesRecord.issue_count }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Copies</div>
                <div class="form-control form-input">{{ seriesRecord.copy_count }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Total Price</div>
                <div class="form-control form-input">{{ formatCurrency(seriesRecord.series_cover_price) }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Total Value</div>
                <div class="form-control form-input">{{ formatCurrency(seriesRecord.series_value) }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Value Gain</div>
                <div class="form-control form-input">{{ formatPercentage(seriesRecord.series_value_change) }}</div>
              </div>
            </div>
            <div class="card-footer text-end">
              <a href="#"
                 @click.prevent="regenStats(seriesRecord.title_id)"
                 class="btn btn-primary">Regenerate Stats</a>
            </div>
          </div>
        </div>
      </Form>
      <div class="card w-50">
        <div class="card-header fw-bold">Volumes</div>
          <SeriesFormVolumes
            :title_id="title_id"
          />
      </div>
      <div class="card w-100">
        <div class="card-header fw-bold">Issues</div>
        <div class="card-body">
          <SeriesFormIssues
            :title_id="title_id"
            :volume_id="seriesRecord.volume_id"
            v-if="seriesRecord.volume_id"
          />
          <div v-else class="alert alert-warning">
            <strong>Note: </strong> Select or create a volume to manage issues.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ErrorMessage, Field, Form } from 'vee-validate'
import { formatCurrency, formatPercentage, checkImageExists, fetchWrapper } from '@/core'
import { useSeriesStore } from '@/core/stores/seriesStore'
import * as yup from 'yup'
import SeriesFormVolumes from '@/components/forms/seriesFormVolumes.vue'
import SeriesFormIssues from '@/components/forms/seriesFormIssues.vue'

export default {
  components: { 
    ErrorMessage,
    Form,
    Field,
    SeriesFormVolumes,
    SeriesFormIssues
  },
  name: 'SeriesForm',
  props: {
    title_id: Number
  },
  setup(props) {
    const seriesStore = useSeriesStore()
    const publishers = ref([]);
    const limitedSeries = ref(false);
    const title_id = ref(props.title_id);
    const logoExists = ref(false);
    const selectedVolume = ref(null);

    // Get current series record from store
    const seriesRecord = computed(() => {
      if (seriesStore.records.length > 0) {
        return seriesStore.records.find(series => series.title_id === props.title_id) || {}
      }
      return {}
    })

    const fetchTitle = async () => {
      if (!props.title_id) return
      
      // First check if the series is already in the store
      let currentSeries = seriesStore.records.find(series => series.title_id === props.title_id)
      
      // If not found, fetch it directly via API
      if (!currentSeries) {
        const query = `?id=${props.title_id}`
        const url = `http://localhost:3000/api/series${query}`
        const data = await fetchWrapper.get(url)
        if (data.results && data.results.length > 0) {
          currentSeries = data.results[0]
          // Add it to the store records for consistency
          seriesStore.records.push(currentSeries)
        }
      }
      
      if (currentSeries) {
        limitedSeries.value = !!currentSeries.limited_series
      }
    }

    const fetchPublishers = async () => {
      const query = `?getall=true`
      const url = `http://localhost:3000/api/publisher${query}`
      const data = await fetchWrapper.get(url)
      publishers.value = data.results
    }

    const schema = yup.object().shape({
      series_title: yup.string().required(),
      series_publisher: yup.string().required(),
      limited_series: yup.boolean()
    })

    function onSubmit() {
      console.log('Form submitted')
    }

    function onInvalidSubmit() {
      console.log('Form invalid')
    }

    function regenStats(id) {
      const query = `?id=${id}`;
      const url = `http://localhost:3000/api/stats${query}`;
      fetchWrapper.get(url)
        .then(data => {
          // Update the series in the store
          const seriesIndex = seriesStore.records.findIndex(series => series.title_id === id)
          if (seriesIndex !== -1) {
            seriesStore.records[seriesIndex].volume_count = data.volumes;
            seriesStore.records[seriesIndex].issue_count = data.issues;
            seriesStore.records[seriesIndex].copy_count = data.copies;
            seriesStore.records[seriesIndex].series_cover_price = data.cprice;
            seriesStore.records[seriesIndex].series_value = data.cvalue;
            seriesStore.records[seriesIndex].series_value_change = data.cgain;
          }
        })
        .catch(err => console.error(err));
    }

    onMounted(async () => {
      await fetchTitle()
      await fetchPublishers()
      if (seriesRecord.value.logo) {
        logoExists.value = await checkImageExists(`/images/logos/${seriesRecord.value.logo}`)
      }
    })

    return {
      publishers, seriesRecord, limitedSeries, logoExists, schema, title_id,
      formatCurrency, formatPercentage, onSubmit, onInvalidSubmit, regenStats,
      seriesStore
    }
  }
}

</script>

<style scoped lang="scss">
@use "@/styles/forms.scss";
</style>
