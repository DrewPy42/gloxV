<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container d-flex justify-content-between">
          <div class="modal-items w-75">
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
  emits: ['saveAndClose'],
  props: {
    modalUsed: '',
    show: false,
  },
  setup(props, {emit}) {
    const modalName = ref('');

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
    })

    return { modalName, closeAndExit, switchModal, SeriesForm }
  },
}
</script>


<style scoped lang="scss">
@use "@/styles/core";
@use "@/styles/modals";
</style>
