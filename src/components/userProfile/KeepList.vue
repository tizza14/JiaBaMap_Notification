<script setup>
import axios from "axios";
import { ref, onMounted, computed } from "vue";
import { useAuth } from "@/stores/authStore";
import { useStore } from "@/stores/storePage";
import { storeToRefs } from "pinia";

const user = useAuth();
const Store = useStore();
const { userData } = storeToRefs(user);
const dataReady = ref(false);
const restaurants = ref([]);
const backendUrl = import.meta.env.VITE_BACKEND_BASE_URL?.replace(/\/+$/, "");

const getDetails = async () => {
  const placeIds = userData.value?.favorites;
  if (!placeIds?.length) { dataReady.value = true; return; }
  const results = await Promise.allSettled(
    placeIds.map((placeId) => axios.get(`${backendUrl}/restaurants/${placeId}`)),
  );
  restaurants.value = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value.data);
  dataReady.value = true;
};

const photos = (photoId) => {
  if (!photoId) return "/image/default_store.png";
  return `${backendUrl}/restaurants/photos/${photoId}?maxWidth=400&maxHeight=320`;
};

const StoreId = (placeId) => {
  Store.StoreId(placeId);
};

onMounted(() => {
  getDetails();
});
</script>

<template>
  <div v-if="dataReady">
    <div class="box-border w-full h-screen pt-2 mt-2 overflow-y-auto lg:mt-12">
      <div
        v-for="(restaurant, index) in restaurants"
        :key="restaurant.id || index"
        class="flex items-center pb-2 mt-2 border-b"
      >
        <!-- 餐廳圖 -->
        <div class="w-40 h-32">
          <img
            :src="photos(restaurant.photoIds?.[0])"
            class="object-cover w-full h-full mx-3 rounded-md"
            @error="(e) => e.target.src = '/image/default_store.png'"
          />
        </div>
        <!-- 餐廳排名、名稱 -->
        <div class="flex flex-col justify-between ml-3 sm:text-xl">
          <div class="ml-3 text-left">
            <h2 class="text-base font-bold text-gray-500">
              <a href="#" @click="StoreId(restaurant.placeId)">{{
                restaurant.displayName
              }}</a>
            </h2>
          </div>
          <!-- 餐廳內容 -->
          <div class="flex mt-3 ml-3 text-xs">
            <div
              class="items-center px-2 mr-2 text-white bg-orange-600 rounded-2xl"
            >
              <p>
                {{ restaurant.rating }}
                <font-awesome-icon :icon="['fas', 'star']" />
              </p>
            </div>

            <p class="mr-2 font-light">
              (評論數: {{ restaurant.userRatingCount }})
            </p>
            <p
              v-if="restaurant.startPrice && restaurant.endPrice"
              class="mr-2 font-bold"
            >
              均消: {{ restaurant.startPrice }} ~ {{ restaurant.endPrice }}
            </p>
            <p v-else class="mr-2 font-bold">均消: 未提供</p>
          </div>

          <!-- 需判斷是否營業 -->
          <div class="items-center hidden mx-3 mt-3 text-sm md:flex">
            <!-- <span class="mr-2 text-center text-green-600">
                            <font-awesome-icon :icon="['fas', 'circle']" style="font-size: 8px;" />
                        </span> -->
            <!-- <p>營業時間: {{ restaurant.openingHours }}</p> -->
            <p>地址: {{ restaurant.formattedAddress }}</p>
          </div>

          <div class="flex flex-wrap items-center mt-3 ml-3">
            <!-- <span>
                            <a href="#" 
                               class="items-center hidden px-3 py-1 mb-1 mr-2 text-sm bg-gray-200 rounded-full md:block">
                                <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" class="text-orange-400"/>
                                 相似餐廳
                            </a>
                        </span>

                        <span>
                            <a href="#" 
                               class="items-center hidden px-3 py-1 mb-1 mr-2 text-sm bg-gray-200 rounded-full md:block">
                                <font-awesome-icon :icon="['fas', 'location-dot']" class="text-orange-400"/>
                                 附近                 
                            </a>
                        </span>

                        <span>
                            <a href="#"
                                v-for="tag in restaurant.tags" 
                                :key="`${restaurant.name}-${tag}`" 
                                class="items-center inline-block px-3 py-1 mb-1 mr-2 text-sm bg-gray-200 rounded-full"
                            >
                            {{ tag }}
                            </a>
                        </span> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
