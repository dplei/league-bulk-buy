<template>
  <div class="title-bar">
    <div class="title-bar-left">
      <span class="title-text">League Bulk Buy</span>
    </div>
    <div class="title-bar-controls" @mousedown.stop>
      <button class="ctrl-btn minimize" @click="handleMinimize">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="ctrl-btn close" @click="handleClose">
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
  height: 36px;
  background: #0a0a16;
  padding: 0 8px 0 14px;
  -webkit-app-region: drag;
  flex-shrink: 0;
  border-bottom: 1px solid #1a1a2e;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 13px;
  font-weight: 600;
  color: #c89b3c;
  letter-spacing: 0.5px;
}

.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #888;
  transition: all 0.15s;
}

.ctrl-btn:hover {
  background: #2a2a3e;
  color: #e5d5a0;
}

.ctrl-btn.close:hover {
  background: #e05c5c;
  color: white;
}
</style>
