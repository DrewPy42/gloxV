<template>
  <div class="app-container">
    <header>
      <mainMenu />
    </header>

    <div class="content">
      <RouterView />
    </div>

    <footer class="bg-primary bg-gradient p-3">
      <div class="col-md-12 text-end">
        <div class="copyright fs-6 text-white">
          Copyright ©{{ currentYear }} by M. Andrew Patterson. All rights reserved.
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { RouterView } from 'vue-router'
import mainMenu from './components/menus/mainMenu.vue'
import { computed, ref, onMounted } from 'vue'

export default {
  components: {
    mainMenu,
    RouterView
  },
  setup() {
    const message = ref('')
    const currentYear = computed(() => {
      return new Date().getFullYear()
    })

    return { currentYear }
  }
}
</script>

<style lang="scss" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Ensure the page height stretches to full viewport height */
}

.content {
  flex: 1; /* Pushes the footer to the bottom if there's not enough content */
}
</style>
