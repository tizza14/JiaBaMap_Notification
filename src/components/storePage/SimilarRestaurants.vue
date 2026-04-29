<script setup>
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/storePage";
import { Carousel, Slide, Navigation } from "vue3-carousel";
import "vue3-carousel/dist/carousel.css";

const restaurantStore = useStore();
const { storeName, similarRestaurants } = storeToRefs(restaurantStore);
</script>

<template>
  <div class="w-full">
    <div class="mt-10 text-gray-700">
      <h3 class="mb-2 text-2xl font-bold">{{ storeName }} 的相似餐廳</h3>
      <div
        v-if="similarRestaurants && similarRestaurants.length"
        class="relative"
      >
        <Carousel
          :breakpoints="{
            640: {
              itemsToShow: 2,
              snapAlign: 'start',
            },
            768: {
              itemsToShow: 3,
              snapAlign: 'center',
            },
          }"
          :wrap-around="true"
          :transition="500"
          :mouseDrag="true"
          :touchDrag="true"
          :gap="1"
          class="flex justify-center"
        >
          <Slide
            v-for="restaurant in similarRestaurants"
            :key="restaurant.place_id"
            class="flex-shrink-0 px-1"
          >
            <div class="bg-white rounded-lg shadow-md mb-4 max-w-[250px]">
              <a
                :href="restaurant.googleMapsUri"
                target="_blank"
                class="block cursor-pointer"
              >
                <div class="overflow-hidden">
                  <img
                    v-if="restaurant?.photoUrl"
                    :src="restaurant.photoUrl"
                    :alt="restaurant.name"
                    class="object-cover w-[250px] h-[160px] rounded-t-lg"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div class="p-4">
                  <h4
                    class="text-lg font-bold text-center truncate md:text-left"
                  >
                    {{ restaurant?.name }}
                  </h4>
                  <div
                    class="flex flex-col items-center justify-between gap-2 mt-2 md:flex-row"
                  >
                    <p
                      class="px-2 text-center text-white rounded-full bg-amber-500 w-fit"
                    >
                      {{ restaurant?.rating }}
                      <span>
                        <svg
                          class="svg-inline--fa fa-star"
                          aria-hidden="true"
                          focusable="false"
                          data-prefix="fas"
                          data-icon="star"
                          role="img"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 576 512"
                        >
                          <path
                            class=""
                            fill="currentColor"
                            d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"
                          ></path>
                        </svg>
                      </span>
                    </p>
                    <p class="text-sm text-gray-400">
                      {{ restaurant?.userRatingCount }}則評論
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </Slide>

          <template #addons>
            <Navigation>
              <template #next>
                <button
                  class="p-3 rounded-full shadow-lg bg-amber-500 opacity-80 hover:bg-gray-300"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="black"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </template>
              <template #prev>
                <button
                  class="p-3 rounded-full shadow-lg bg-amber-500 opacity-80 hover:bg-gray-300"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 18L9 12L15 6"
                      stroke="black"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </template>
            </Navigation>
          </template>
        </Carousel>
      </div>

      <!-- 如果沒有數據顯示加載狀態 -->
      <div v-else class="py-4 text-center">正在加載餐廳資料...</div>
    </div>
  </div>
</template>
