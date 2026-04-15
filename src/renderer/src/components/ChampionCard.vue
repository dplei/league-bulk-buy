<template>
  <div
    class="champion-card"
    :class="{
      selected: isSelected,
      owned: champion.owned,
      'on-sale': champion.onSale
    }"
    @click="!champion.owned && $emit('toggle', champion.itemId)"
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
  </div>
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
  border: 2px solid #2a2a3e;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: #1a1a2e;
  position: relative;
  user-select: none;
}

.champion-card:hover:not(.owned) {
  border-color: #c89b3c;
  transform: translateY(-2px);
}

.champion-card.selected {
  border-color: #c89b3c;
  background: #252540;
}

.champion-card.owned {
  opacity: 0.5;
  cursor: not-allowed;
}

.champion-card.on-sale {
  border-color: #e05c5c;
}

.champion-avatar {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.champion-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge,
.check-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.owned-badge {
  background: rgba(0, 0, 0, 0.7);
  color: #888;
}

.sale-badge {
  background: #e05c5c;
  color: white;
  top: 4px;
  right: 4px;
}

.check-mark {
  top: 4px;
  left: 4px;
  right: auto;
  background: #c89b3c;
  color: #1a1a2e;
  font-size: 14px;
  padding: 2px 5px;
}

.champion-info {
  padding: 6px 8px;
}

.champion-name {
  font-size: 13px;
  font-weight: 600;
  color: #e5d5a0;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.champion-prices {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price {
  font-size: 11px;
}

.price .original {
  color: #666;
  text-decoration: line-through;
  margin-right: 4px;
}

.price.ip .current {
  color: #7ec8e3;
}

.price.rp .current {
  color: #a87ee3;
}
</style>
