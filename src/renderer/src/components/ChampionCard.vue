<template>
  <button
    type="button"
    class="champion-card"
    :class="{
      selected: isSelected,
      owned: champion.owned,
      'on-sale': champion.onSale
    }"
    :disabled="champion.owned"
    :aria-pressed="champion.owned ? undefined : isSelected"
    :aria-label="`${champion.name}，${champion.owned ? '已拥有' : isSelected ? '已选择' : '未选择'}`"
    @click="$emit('toggle', champion.itemId)"
  >
    <div class="champion-avatar">
      <img
        :src="`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champion.itemId}.png`"
        :alt="champion.name"
        loading="lazy"
        @error="onImgError"
      />
      <div v-if="champion.owned" class="badge owned-badge">已拥有</div>
      <div v-if="champion.onSale" class="badge sale-badge">折扣</div>
      <div v-if="isSelected" class="check-mark">✓</div>
    </div>

    <div class="champion-info">
      <div class="champion-name">{{ champion.name }}</div>
      <div class="champion-prices">
        <span v-if="champion.ipPrice" class="price ip">
          <span v-if="champion.saleIpPrice" class="original">{{ champion.ipPrice }}</span>
          <span class="current">{{ champion.saleIpPrice ?? champion.ipPrice }} 精粹</span>
        </span>
        <span v-if="champion.rpPrice" class="price rp">
          <span v-if="champion.saleRpPrice" class="original">{{ champion.rpPrice }}</span>
          <span class="current">{{ champion.saleRpPrice ?? champion.rpPrice }} RP</span>
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { Champion } from '../../../preload/index.d'

defineProps<{
  champion: Champion
  isSelected: boolean
}>()

defineEmits<{ toggle: [id: number] }>()

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = `https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Aatrox.png`
}
</script>

<style scoped>
.champion-card {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 72px;
  padding: 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  color: inherit;
  text-align: left;
  transition: background-color 0.18s ease, border-color 0.18s ease;
  background: var(--color-surface);
  position: relative;
  user-select: none;
}

.champion-card:hover:not(.owned) {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.champion-card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.champion-card.selected {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.champion-card.owned {
  opacity: 0.45;
  cursor: not-allowed;
}

.champion-card.on-sale {
  border-color: var(--color-border);
}

.champion-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  overflow: hidden;
}

.champion-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.2s ease;
}

.champion-card.owned .champion-avatar img {
  filter: grayscale(0.55);
}

.badge,
.check-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
}

.owned-badge {
  background: rgba(10, 12, 15, 0.84);
  color: var(--color-text-muted);
}

.sale-badge {
  background: rgba(239, 107, 115, 0.9);
  color: white;
  top: 4px;
  right: 4px;
}

.check-mark {
  top: 4px;
  left: 4px;
  right: auto;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0;
  background: var(--color-accent);
  color: #111317;
  font-size: 11px;
  border-radius: 5px;
}

.champion-info {
  min-width: 0;
  padding-right: 5px;
}

.champion-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.champion-prices {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
}

.price {
  font-size: 12px;
  line-height: 1.35;
}

.price .original {
  color: var(--color-text-subtle);
  text-decoration: line-through;
  margin-right: 4px;
}

.price.ip .current {
  color: var(--color-blue-essence);
}

.price.rp .current {
  color: var(--color-rp);
}
</style>
