<template>
  <Transition name="modal">
<div v-if="show" class="modal-mask">
  <div class="modal-wrapper">
    <div class="modal-container d-flex justify-content-between">
      <div class="modal-items w-75">
        <div class="modal-header">
          <button @click="closeAndExit">X</button>
        </div>
        <div class="modal-body">
          <div v-if="modalUsed === 'series'">
            <SeriesForm :title_id="selectedID" />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeAndExit">Close</button>
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
    return { modalName, selectedID, closeAndExit, switchModal, SeriesForm }
  },
}
</script>


<style scoped lang="scss">
@use "@/styles/core";
@use "@/styles/modals";
</style>
