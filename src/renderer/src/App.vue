<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-layout">
          <TitleBar />
          <main class="app-main">
            <HomeView />
          </main>
        </div>
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
    primaryColor: '#d6a84b',
    primaryColorHover: '#e5ba61',
    primaryColorPressed: '#b98a32',
    bodyColor: '#0b0d10',
    cardColor: '#13171d',
    modalColor: '#171c24',
    popoverColor: '#171c24',
    inputColor: '#10141a',
    tableColor: '#13171d',
    borderColor: '#2a313b',
    textColor1: '#f4f6f8',
    textColor2: '#b8c0ca',
    textColor3: '#8a949f',
    borderRadius: '8px',
    fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"
  },
  Button: {
    colorPrimary: '#d6a84b',
    textColorPrimary: '#111317',
    colorHoverPrimary: '#e5ba61',
    colorPressedPrimary: '#b98a32',
    textColorHoverPrimary: '#111317',
    textColorPressedPrimary: '#111317'
  },
  Input: {
    color: '#10141a',
    colorFocus: '#10141a',
    border: '1px solid #2a313b',
    borderFocus: '1px solid #d6a84b',
    textColor: '#f4f6f8',
    placeholderColor: '#747e89'
  },
  Tag: {
    borderPrimary: '1px solid rgba(214, 168, 75, 0.4)',
    colorPrimary: 'rgba(214, 168, 75, 0.12)',
    textColorPrimary: '#e5ba61'
  },
  Drawer: {
    color: '#13171d',
    headerBorderBottom: '1px solid #2a313b',
    bodyPadding: '20px',
    titleTextColor: '#f4f6f8'
  }
}
</script>

<style>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
}

.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
</style>
