<template>
  <div class="title-bar">
    <div class="title-bar-left">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="title-text">League Bulk Buy</span>
      <span class="title-context">英雄购买</span>
    </div>
    <div class="title-bar-controls" @mousedown.stop>
      <button class="ctrl-btn minimize" type="button" aria-label="最小化窗口" title="最小化" @click="handleMinimize">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="ctrl-btn close" type="button" aria-label="关闭窗口" title="关闭" @click="handleClose">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.2" fill="none"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
function handleMinimize() {
  window.api.minimizeWindow()
}

function handleClose() {
  window.api.closeWindow()
}
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  background: #090b0e;
  padding: 0 0 0 16px;
  -webkit-app-region: drag;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.brand-mark {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--color-accent);
  transform: rotate(45deg);
  box-shadow: 0 0 0 3px rgba(214, 168, 75, 0.1);
}

.title-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.2px;
}

.title-context {
  color: var(--color-text-subtle);
  font-size: 11px;
}

.title-context::before {
  content: '/';
  margin-right: 9px;
  color: var(--color-border-strong);
}

.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.ctrl-btn {
  width: 44px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-subtle);
  transition: background-color 0.18s ease, color 0.18s ease;
}

.ctrl-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.ctrl-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -3px;
}

.ctrl-btn.close:hover {
  background: #c83c45;
  color: white;
}
</style>
