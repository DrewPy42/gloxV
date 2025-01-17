<template>
  <div>
    <div>
      <Form
        @submit="onSubmit"
        @invalid-submit="onInvalidSubmit"
        :validation-schema="schema"
      >
        <div class="form-group">
          <label for="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            v-model="seriesRecord.title"
            class="form-control"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ErrorMessage } from 'vee-validate'
import * as yup from "yup";

export default {
  name: 'SeriesForm',
  components: { ErrorMessage },
  props: {
    title_id: Number
  },
  setup (props) {
    const seriesRecord = ref({});
    const fetchTitle = async () => {
      if (!props.title_id) return;
      const query = `?id=${props.title_id}`
      const response = await fetch(`http://localhost:3000/api/series${query}`)
      const data = await response.json()
      seriesRecord.value = data.results[0];
    }

    const schema = yup.object().shape({
      title: yup.string().required(),
    })

    function onSubmit() {
      console.log('Form submitted')
    }

    function onInvalidSubmit() {
      console.log('Form invalid')
    }


    onMounted(fetchTitle);

    return { seriesRecord, schema, onSubmit, onInvalidSubmit }
  },
}

</script>

<style scoped lang="scss">

</style>
