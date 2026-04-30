<template>
  <div class="box-border w-full h-screen overflow-y-auto md:w-1/2">
    <div
      class="box-border sticky top-0 z-40 flex flex-col w-full pb-3 space-x-0 bg-white"
    >
      <div class="flex flex-col bg-white">
        <div class="p-3 font-bold text-gray-500 bg-white">
          <h3>台灣『美食餐廳』 | 精選TOP 15間熱門店家</h3>
        </div>

        <div class="hidden text-sm text-gray-600 bg-white md:flex">
          <div class="px-3">
            <a href="#">台灣</a>
          </div>
          <div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" />
          </div>
          <div class="px-3">
            <span>所有餐廳</span>
          </div>
        </div>
      </div>

      <div class="relative flex flex-row items-start w-full px-2 mx-3 bg-white">
        <!-- 餐廳排序 -->
        <div class="relative inline-block w-1/4 mx-1 md:w-1/6">
          <button
            @click="toggleSort"
            class="flex items-center justify-between w-full p-1 mt-2 text-xs text-white rounded-md bg-amber-500"
          >
            <div>
              <font-awesome-icon :icon="['fas', 'bars']" />
            </div>
            <span>{{ Search.sortOptions[Search.sortOrder] }}</span>
            <div>
              <font-awesome-icon :icon="['fas', 'chevron-down']" />
            </div>
          </button>
          <div
            v-if="sortMenu"
            class="absolute left-0 z-10 w-full p-1 mt-1 text-xs text-center text-white rounded-md shadow-md bg-amber-400 top-full"
          >
            <ul>
              <li
                v-for="(label, value) in sortOptions"
                :key="value"
                @click="setSortOrder(value)"
                class="z-10 py-1 cursor-pointer hover:bg-amber-500"
              >
                <span>{{ label }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 價位分類 -->
        <div class="relative inline-block w-1/4 mx-1 md:w-1/6">
          <button
            @click="toggleCost"
            class="flex items-center justify-between w-full p-1 mt-2 text-xs text-white rounded-md bg-amber-500"
          >
            <div>
              <font-awesome-icon :icon="['fas', 'bars']" />
            </div>
            <span>{{ Search.costOptions[Search.selectedCost] }}</span>
            <div>
              <font-awesome-icon :icon="['fas', 'chevron-down']" />
            </div>
          </button>
          <div
            v-if="costMenu"
            class="absolute left-0 z-10 w-full p-1 mt-1 text-xs text-center text-white rounded-md shadow-md bg-amber-400 top-full"
          >
            <ul>
              <li
                v-for="(label, value) in costOptions"
                :key="value"
                @click="setCostRange(value)"
                class="py-1 cursor-pointer hover:bg-amber-500"
              >
                <span>{{ label }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 篩選條件 -->
        <div
          class="w-1/4 p-1 mx-1 mt-2 text-xs text-center border rounded-md md:w-1/6 md:border-none"
        >
          <label>
            <input type="checkbox" v-model="Search.isOpen" /> 營業中
          </label>
        </div>
        <div
          class="w-1/4 p-1 mx-1 mt-2 text-xs text-center border rounded-md md:w-1/6 md:border-none"
        >
          <label> <input type="checkbox" v-model="Search.isOrderable" /> 可訂購 </label>
        </div>
      </div>
    </div>

    <div v-if="Search.filteredResult[0]">
      <div
        v-for="place in Search.filteredResult"
        :key="place.id"
        :data-place-id="place.id"
        class="flex items-center py-1 transition-colors duration-200 border-b"
        :class="{ 'bg-amber-100': restaurantStore.hoveredPlaceId === place.id }"
        @mouseenter="handleMouseEnter(place.id)"
        @mouseleave="handleMouseLeave"
      >
        <div class="relative w-40 h-32 ml-3">
          <Loader
            v-if="loading[place.id]"
            class="absolute inset-0 z-20 flex items-center justify-center object-cover w-full h-full bg-white/50"
          />
          <img
            v-if="place.photoId"
            :src="photoGet(place.photoId)"
            alt="Place image"
            class="object-cover w-full h-full"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div class="flex flex-col justify-between w-3/5 ml-3 sm:text-xl">
          <div class="ml-3">
            <h2
              class="font-bold text-gray-500 text-base h-6 w-[350px] text-ellipsis whitespace-nowrap overflow-hidden"
            >
              <a
                href="#"
                class="text-amber-500 hover:text-orange-500"
                @click="StoreId(place.id)"
                >{{ place.name }}</a
              >
            </h2>
          </div>
          <div class="flex mt-3 ml-3 text-xs">
            <div
              class="items-center px-2 py-1 mr-2 text-white bg-orange-600 rounded-2xl"
            >
              <p>
                {{ place.rating }} <font-awesome-icon :icon="['fas', 'star']" />
              </p>
            </div>
            <p class="flex items-center mr-2 font-light">
              (評論數: {{ place.userRatingCount }})
            </p>
          </div>
          <div class="flex mt-3 ml-3 text-xs">
            <p
              v-if="!place.startPrice || !place.endPrice"
              class="mr-2 font-light"
            >
              平均消費：未提供
            </p>
            <p v-else class="mr-2 font-light">
              平均消費： {{ place.startPrice }} ~ {{ place.endPrice }} 元
            </p>
            <p class="mr-2 font-light">
              距離 {{ place.distance.toFixed(2) || "??" }} 公里
            </p>
          </div>
          <div class="items-center hidden mx-3 mt-3 text-sm md:flex">
            <span>
              <font-awesome-icon
                :icon="['fas', 'circle']"
                :style="{
                  color: place?.openNow ? 'green' : 'red',
                  fontSize: '8px',
                  margin: '2px',
                }"
              />
            </span>
            <p class="ml-1 font-bold">
              {{ place?.openNow ? "營業中" : "已打烊" }}
            </p>
          </div>
          <div class="flex flex-wrap items-center mt-3 ml-3">
            <!-- <span>
          <a href="#" 
            class="items-center hidden px-3 py-1 mb-1 mr-2 text-sm bg-gray-200 rounded-full md:block">
            <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" class="text-orange-400"/>
                相似餐廳
          </a>
        </span> -->
            <span>
              <button
                @click="Search.nearSearch(router, place.lat, place.lng)"
                class="items-center hidden px-3 py-1 mb-1 mr-2 text-sm bg-gray-200 rounded-full md:block"
              >
                <font-awesome-icon
                  :icon="['fas', 'location-dot']"
                  class="text-orange-400"
                />
                附近
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="flex-wrap justify-items-center mt-[70px]">
        <p class="text-2xl font-bold">沒有符合關鍵字的餐廳</p>
        <img src="@/assets/notfindresult.png" alt="" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRestaurantStore } from "@/stores/searchPage";
import { useKeywordStore } from "@/stores/keywordStore.js";
import { computed, ref, watch } from "vue";
import { useStore } from "@/stores/storePage";
import Loader from "@/components/Loader.vue";

const restaurantStore = useRestaurantStore();
const Search = useKeywordStore();
const Store = useStore();

const handleMouseEnter = (placeId) => {
  restaurantStore.setHoveredPlace(placeId);
};
const handleMouseLeave = () => {
  restaurantStore.setHoveredPlace(null);
};

const StoreId = (placeId) => {
  Store.StoreId(placeId);
};

const sortMenu = ref(false);
const costMenu = ref(false);
const sortOptions = computed(() => Search.sortOptions);
const costOptions = computed(() => Search.costOptions);

const toggleSort = () => {
  sortMenu.value = !sortMenu.value;
};

const toggleCost = () => {
  costMenu.value = !costMenu.value;
};

const setSortOrder = (value) => {
  Search.setSortOrder(value);
  toggleSort();
};

const setCostRange = (value) => {
  Search.setCostRange(value);
  toggleCost();
};

const photoGet = (photoId) => {
  return `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${photoId}?maxWidth=400&maxHeight=320`;
};

const loading = ref({});

watch(
  () => Search.filteredResult,
  (newResults) => {
    newResults.forEach((place) => {
      if (!loading.value[place.id]) {
        loading.value[place.id] = true;
        setTimeout(() => {
          loading.value[place.id] = false;
        }, 1000);
      }
    });
  },
  { immediate: true },
);
</script>
