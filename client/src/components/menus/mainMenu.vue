<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary bg-gradient">
    <div class="container-fluid">
      <div class="row col-lg-1">
        <img class="" src="/images/datamap/datamap_updated_logo.jpg" alt="Banner of comic book covers" />
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
        <li class="nav-item">
          <div>
            <router-link class="nav-link" to="/series">
              <font-awesome-icon :icon="['far', 'envelope']" class="icon" />
              Series
            </router-link>
          </div>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped lang="scss">
@use '../../styles/menus.scss';
</style>
