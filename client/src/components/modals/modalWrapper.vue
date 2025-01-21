<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container d-flex justify-content-between">
          <div class="modal-items w-100">
            <div class="modal-header d-flex justify-content-between">
              <div>
                <h3 class="capitalize">{{ modalName }} View</h3>
              </div>
              <div>
                <ul class="button-group">
                  <li
                    class="btn button-item button-item-submit btn-primary"
                    @click="closeAndExit"
                  >X</li>
                </ul>
              </div>
            </div>
            <div class="modal-body">
              <div v-if="modalUsed === 'series'">
                <SeriesForm :title_id="selectedID" />
              </div>
            </div>
            <div class="modal-footer">
              <div class="form-controls">
                <ul class="button-group">
                  <li
                    class="btn button-item button-item-submit"
                    @click="saveRecord"
                  >Save</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import {onMounted, ref, watchEffect} from "vue";
import SeriesForm from '@/components/forms/seriesForm.vue';

export default {
  components: { SeriesForm },
  emits: ['saveAndClose'],
  props: {
    modalUsed: '',
    show: false,
    selectedId: null,
  },
  setup(props, {emit}) {
    const modalName = ref('');
    const selectedID = ref(null);

    function switchModal(modal) {
      modalName.value = modal;
    }

    function closeAndExit() {
      emit('saveAndClose', 'true');
    }

    function saveRecord() {
      emit('saveAndClose', 'true');
    }

    watchEffect(() => {
      if (props.modalUsed) {
        modalName.value = props.modalUsed;
      }
      if (props.selectedId) {
        selectedID.value = props.selectedId;
      }
    })

    onMounted(() => {

    })
    return { modalName, selectedID, closeAndExit, saveRecord, SeriesForm }
  },
}
</script>


<style scoped lang="scss">
@use "@/styles/core";
@use "@/styles/modals";
</style>
