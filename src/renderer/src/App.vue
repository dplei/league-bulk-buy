<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <TitleBar />
        <HomeView />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import TitleBar from './components/TitleBar.vue'
import HomeView from './components/HomeView.vue'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#c89b3c',
    primaryColorHover: '#e0b84a',
    primaryColorPressed: '#a67c2e',
    bodyColor: '#0d0d1a',
    cardColor: '#16213e',
    modalColor: '#16213e',
    popoverColor: '#16213e',
    inputColor: '#0f3460',
    tableColor: '#16213e',
    borderColor: '#2a2a3e',
    textColor1: '#e5d5a0',
    textColor2: '#c4b484',
    textColor3: '#888',
    borderRadius: '6px'
  },
  Button: {
    colorPrimary: '#c89b3c',
    textColorPrimary: '#1a1a2e',
    colorHoverPrimary: '#e0b84a',
    colorPressedPrimary: '#a67c2e',
    textColorHoverPrimary: '#1a1a2e',
    textColorPressedPrimary: '#1a1a2e'
  },
  Input: {
    color: '#0f3460',
    colorFocus: '#0f3460',
    border: '1px solid #2a2a3e',
    borderFocus: '1px solid #c89b3c',
    textColor: '#e5d5a0',
    placeholderColor: '#666'
  },
  Tag: {
    borderPrimary: '1px solid #c89b3c',
    colorPrimary: 'rgba(200, 155, 60, 0.15)',
    textColorPrimary: '#c89b3c'
  },
  Drawer: {
    color: '#16213e',
    headerBorderBottom: '1px solid #2a2a3e',
    bodyPadding: '16px',
    titleTextColor: '#e5d5a0'
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #0d0d1a;
  color: #e5d5a0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
</style>
