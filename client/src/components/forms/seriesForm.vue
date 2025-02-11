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
                    for="alt_titles"
                  >Alternate Title</label>
                  <Field
                    type="text"
                    id="alt_titles"
                    name="alt_titles"
                    v-model="seriesRecord.alt_titles"
                    class="form-control form-input"
                    :class="{ 'is-invalid': errors['alt_titles'] }"
                  />
                </div>
                <div v-if="seriesRecord.previous_title_id || seriesRecord.new_title_id">
                  <div class="input-block input-group my-1">
                    <div class="col">
                      <a v-if="seriesRecord.previous_title_id" href="#" class="btn btn-info"></a>
                    </div>
                    <div class="col">
                      <a v-if="seriesRecord.new_title_id" href="#" class="btn btn-info">New Title</a>
                    </div>
                  </div>
                </div>
                <ErrorMessage class="red" name="alt_titles" />
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
                <div class="form-control form-input">{{ formatCurrency(seriesRecord.series_price) }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Total Value</div>
                <div class="form-control form-input">{{ formatCurrency(seriesRecord.series_value) }}</div>
              </div>
              <div class="input-block input-group m-1">
                <div class="input-label input-group-text col-3">Value Gain</div>
                <div class="form-control form-input">{{ formatPercentage(seriesRecord.series_value_gain) }}</div>
              </div>
            </div>
            <div class="card-footer text-end">
              <a href="#" class="btn btn-primary">Regenerate Stats</a>
            </div>
          </div>
        </div>
      </Form>
      <div class="card-group">
        <SeriesFormVolumes :title_id="title_id" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ErrorMessage, Field, Form } from 'vee-validate'
import { formatCurrency, formatPercentage, checkImageExists, fetchWrapper } from '@/core'
import * as yup from 'yup'
import SeriesFormVolumes from '@/components/forms/seriesFormVolumes.vue'

export default {
  name: 'SeriesForm',
  components: { ErrorMessage, Form, Field, SeriesFormVolumes },
  props: {
    title_id: Number
  },
  setup(props) {
    const seriesRecord = ref({});
    const publishers = ref([]);
    const limitedSeries = ref(false);
    const title_id = ref(props.title_id);
    const logoExists = ref(false);
    const fetchTitle = async () => {
      if (!props.title_id) return
      const query = `?id=${props.title_id}`
      const url = `http://localhost:3000/api/series${query}`;
      const data = fetchWrapper.get(url);
      seriesRecord.value = data.results[0];
      limitedSeries.value = !!data.results[0].limited_series;
    }

    const fetchPublishers = async () => {
      const query = `?getall=true`;
      const url = `http://localhost:3000/api/publisher${query}`;
      const data = fetchWrapper.get(url);
      publishers.value = data.results;
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

    onMounted( () => {
      fetchTitle()
      fetchPublishers()
      logoExists.value = checkImageExists(`/images/logos/${seriesRecord.value.logo}`);
    })

    return {
      publishers, seriesRecord, limitedSeries, logoExists, schema, title_id,
      formatCurrency, formatPercentage, onSubmit, onInvalidSubmit
    }
  }
}

</script>

<style scoped lang="scss">
@use "@/styles/forms.scss";
</style>
