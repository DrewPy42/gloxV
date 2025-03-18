<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary bg-gradient" role="navigation">
    <div class="container-fluid">
      <div class="row col-lg-1">
        <img class="main-menu-logo"
             src="/images/datamap/datamap_updated_logo.jpg"
             alt="DataMAP logo" />
      </div>
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <div>
            <router-link class="nav-link" to="/">
              <font-awesome-icon :icon="['fas', 'house']" class="icon" />
              Home
            </router-link>
          </div>
        </li>
        <li class="nav-item dropdown">
          <menu-dropdown
            :menu-title="'Series'"
            :menu-id="'menuSeries'"
            :menu-options="menu.seriesMenuOptions"
            :show="showMenu('menuSeries')"
            :menu-icon-code = "'fa'"
            :menu-icon-name = "'fa-book'"
            @mouseenter="menuHover('menuSeries')"
            @mouseleave="menuHover('menuSeries')"
          />
        </li>
        <li class="nav-item dropdown">
          <menu-dropdown
            :menu-title="'Tools'"
            :menu-id="'menuTools'"
            :menu-options="menu.toolsMenuOptions"
            :show="showMenu('menuTools')"
            :menu-icon-code = "'fas'"
            :menu-icon-name = "'wrench'"
            @mouseenter="menuHover('menuTools')"
            @mouseleave="menuHover('menuTools')"
          />
        </li>
      </ul>
    </div>
  </nav>
</template>

<script>
import { RouterLink } from 'vue-router';
import MenuDropdown from "./menuDropdown.vue";
import { MainMenu } from '@/core';
import { ref } from 'vue';

export default {
  components: {
    RouterLink,
    MenuDropdown
  },
  setup() {
    const menu = MainMenu;
    const menuStatus = ref([
      { id: 'menuSeries', show: false },
      { id: 'menuTools', show: false }
    ])

    function menuHover(menu) {
      const menuIndex = menuStatus.value.findIndex((obj => obj.id === menu));
      menuStatus.value[menuIndex].show = !menuStatus.value[menuIndex].show;
    }

    function showMenu(menu) {
      const stepIndex = menuStatus.value.findIndex((obj => obj.id === menu));
      return menuStatus.value[stepIndex].show;
    }
    return {
      menu,
      showMenu,
      menuHover
    };
  }
}

</script>

<style lang="scss">
@use '../../styles/menus.scss';
</style>
