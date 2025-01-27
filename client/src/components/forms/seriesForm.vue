<template>
  <div>
    <div>
      <Form
        @submit="onSubmit"
        @invalid-submit="onInvalidSubmit"
        :validation-schema="schema"
        v-slot="{ errors, isSubmitting }"
      >
        <div class="form-group">
          <div class="input-block input-group mb-3">
            <label
              class="input-label input-group-text col-3"
              for="series_title"
            >Title</label>
            <Field
              type="text"
              id="series_title"
              name="series_title"
              v-model="seriesRecord.title"
              rules="required"
              class="form-control"
              :class="{ 'is-invalid': errors['series_title'] }"
            />
          </div>
          <ErrorMessage class="red" name="series_title" />
          <div class="input-block input-group mb-3">
            <label
              class="input-label input-group-text col-3"
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
          <div class="input-block input-group mb-3">
            <label
              class="input-label input-group-text col-3"
              for="series_publisher"
            >Publisher</label>
            <Field
              as="select"
              id="series_publisher"
              name="series_publisher"
              v-model="seriesRecord.publisher_id"
              class="form-control"
              :class="{ 'is-invalid': errors['series_publisher'] }"
            >
              <option value="">Select Publisher</option>
              <option
                v-for="publisher in publishers"
                :key="publisher.publisher_id"
                :value="publisher.publisher_id"
              >{{ publisher.publisher_name }}</option>
            </Field>
          </div>
          <ErrorMessage class="red" name="series_publisher" />
        </div>
        <div class="stats-block">
          <h4>Stats Block</h4>
          <div class="input-block input-group mb-3">
            <div>Volumes: {{ seriesRecord.volume_count }}</div>
            <div>Issues: {{ seriesRecord.issue_count }}</div>
            <div>Copies: {{ seriesRecord.copy_count }}</div>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ErrorMessage, Field, Form } from 'vee-validate'
import * as yup from "yup";

export default {
  name: 'SeriesForm',
  components: { ErrorMessage, Form, Field },
  props: {
    title_id: Number
  },
  setup (props) {
    const seriesRecord = ref({});
    const publishers = ref([]);
    const limitedSeries = ref(false);
    const fetchTitle = async () => {
      if (!props.title_id) return;
      const query = `?id=${props.title_id}`;
      const response = await fetch(`http://localhost:3000/api/series${query}`);
      const data = await response.json();
      seriesRecord.value = data.results[0];
      limitedSeries.value = !!data.results[0].limited_series;
    }

    const fetchPublishers = async () => {
      const query = `?getall=true`;
      const response = await fetch(`http://localhost:3000/api/publisher${query}`);
      const data = await response.json();
      publishers.value = data.results;
    }

    const schema = yup.object().shape({
      series_title: yup.string().required(),
      series_publisher: yup.string().required(),
      limited_series: yup.boolean(),
    })

    function onSubmit() {
      console.log('Form submitted')
    }

    function onInvalidSubmit() {
      console.log('Form invalid')
    }


    onMounted(() => {
      fetchTitle();
      fetchPublishers();
    });

    return { publishers, seriesRecord, limitedSeries, schema, onSubmit, onInvalidSubmit }
  },
}

</script>

<style scoped lang="scss">
  @use "@/styles/forms.scss";
</style>
