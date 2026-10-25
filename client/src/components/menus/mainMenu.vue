<template>
  <nav class="navbar navbar-expand-lg navbar-dark" role="navigation">
    <div class="container-fluid">
      <div class="row">
        <img class="main-menu-logo"
             src="/images/favicon/favicon.svg"
             alt="WibbitWorks logo" />
      </div>
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <router-link class="nav-link" to="/">
            <font-awesome-icon :icon="['fas', 'house']" class="icon" />
            Home
          </router-link>
        </li>
        <li class="nav-item dropdown">
          <menu-dropdown
            :menu-title="'Dashboards'"
            :menu-id="'menuDashboards'"
            :menu-options="menu.dashboardsMenuOptions"
            :show="showMenu('menuDashboards')"
            :menu-icon-code = "'fa'"
            :menu-icon-name = "'fa-chart-line'"
            @mouseenter="menuHover('menuDashboards')"
            @mouseleave="menuHover('menuDashboards')"
          />
        </li>
        <li class="nav-item dropdown">
          <menu-dropdown
            :menu-title="'Reports'"
            :menu-id="'menuReports'"
            :menu-options="menu.reportsMenuOptions"
            :show="showMenu('menuReports')"
            :menu-icon-code = "'fa'"
            :menu-icon-name = "'fa-print'"
            @mouseenter="menuHover('menuReports')"
            @mouseleave="menuHover('menuReports')"
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

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import MenuDropdown from "./menuDropdown.vue";
import { MainMenu } from '@/core';
import { ref } from 'vue';

// Get the menu options by calling MainMenu()
const menu = MainMenu();

const menuStatus = ref([
  { id: 'menuDashboards', show: false },
  { id: 'menuReports', show: false },
  { id: 'menuTools', show: false }
]);

function menuHover(menuId: string) {
  const menuIndex = menuStatus.value.findIndex((obj: any) => obj.id === menuId);
  if (menuIndex !== -1) {
    menuStatus.value[menuIndex].show = !menuStatus.value[menuIndex].show;
  }
}

function showMenu(menuId: string) {
  const stepIndex = menuStatus.value.findIndex((obj: any) => obj.id === menuId);
  return stepIndex !== -1 ? menuStatus.value[stepIndex].show : false;
}
</script>

<style lang="scss">
@use '../../styles/menus.scss';
</style>
