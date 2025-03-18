<template>
  <div class="dropdown">
    <div
      class="dropdown-toggle"
      :class="{ show: show}"
      :id="menuId"
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      <font-awesome-icon v-if=menuIconName :icon="[menuIconCode, menuIconName]" class="icon" />
      {{ menuTitle }}
    </div>
    <ul
      class="dropdown-menu"
      :class="{ show: show}"
      :aria-labelledby="menuId"
      role="menu"
    >
      <li v-for="option in menuOptions" :key="option.title" class="nav-item">
        <router-link
          class="nav-link dropdown-item"
          :to="option.link"
        >
          {{ option.title }}
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  name: "menuDropdown",
  components: { FontAwesomeIcon },
  props: {
    menuId: String,
    menuOptions: Array,
    menuTitle: String,
    menuIconCode: String,
    menuIconName: String,
    show: false,
  },
  setup(props) {
    return {};
  },
}
</script>

<style lang="scss">
@use "../../styles/menus.scss";
</style>
