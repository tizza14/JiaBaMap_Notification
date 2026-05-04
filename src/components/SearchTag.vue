<script setup>
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/storePage";
import { useKeywordStore } from "@/stores/keywordStore";
import { useRouter } from "vue-router";

const restaurantStore = useStore();
const keywordStore = useKeywordStore();
const { searchTopics, lat, lng } = storeToRefs(restaurantStore);
const router = useRouter();

const searchTopic = (topic) => {
  if (lat.value && lng.value) {
    keywordStore.coordinate = { lat: parseFloat(lat.value), lng: parseFloat(lng.value) };
  }
  keywordStore.navigateToSearch(router, topic);
};
</script>

<template>
  <div v-if="searchTopics.length" class="mt-8">
    <h3 class="flex items-center mb-4">
      <span class="text-lg font-bold">🔍 搜尋更多相關主題</span>
    </h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="topic in searchTopics"
        :key="topic"
        @click="searchTopic(topic)"
        class="px-3 py-1.5 text-gray-600 bg-gray-100 hover:bg-amber-100 hover:text-amber-600 rounded-full text-sm transition"
      >
        {{ topic }}
      </button>
    </div>
  </div>
</template>
