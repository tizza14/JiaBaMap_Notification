<script setup>
import axios from "axios";
import { onMounted, onUnmounted, ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useStore } from "@/stores/storePage";
import StoreComment from "@/components/storeComment/StoreComment.vue";
import Header from "@/components/Header.vue";
import StoreType from "@/components/HomePage/StoreType.vue";
import SearchTag from "@/components/SearchTag.vue";
import SimilarRestaurants from "@/components/storePage/SimilarRestaurants.vue";
import RecommendedRestaurants from "@/components/storePage/RecommendedRestaurants.vue";
import SearchInput from "@/components/SearchInput.vue";
import { useAuth } from "@/stores/authStore";

const restaurantStore = useStore();
const route = useRoute();
const user = useAuth();
const userData = computed(() => user.userData);
const iconClassic = ref("far");
// 從 store 中解構需要的屬性
const {
  storeName,
  rating,
  userRatingCount,
  startPrice,
  endPrice,
  weekDayDescriptions,
  formattedAddress,
  websiteUri,
  nationalPhoneNumber,
  googleMapsUri,
  openNow,
  storePhoto,
  bannerPhoto,
  photoIds,
  staticMapUrl,
  menuItems,
  storeDbId,
} = storeToRefs(restaurantStore);

const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace(/\/+$/, "");
const photoUrls = computed(() =>
  (photoIds.value || []).map(
    (id) => `${BACKEND_URL}/restaurants/photos/${id}?maxWidth=800&maxHeight=600`,
  ),
);

const lightboxIndex = ref(null);
const openLightbox = (i) => { lightboxIndex.value = i; };
const closeLightbox = () => { lightboxIndex.value = null; };
const prevPhoto = () => { lightboxIndex.value = (lightboxIndex.value - 1 + photoUrls.value.length) % photoUrls.value.length; };
const nextPhoto = () => { lightboxIndex.value = (lightboxIndex.value + 1) % photoUrls.value.length; };

// 下拉選單狀態
const isDropdownVisible = ref(false);

const updateFavorite = async () => {
  if (!userData.value) {
    alert("請登入");
    return;
  }
  const token = localStorage.getItem("userToken");
  const headers = { Authorization: `Bearer ${token}` };
  const isFavorite = iconClassic.value === "fas";
  iconClassic.value = isFavorite ? "far" : "fas";
  try {
    if (!isFavorite) {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/user/favorites/${userData.value._id}`,
        { placeId: restaurantStore.placesId },
        { headers },
      );
    } else {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/user/favorites/delete/${userData.value._id}`,
        { data: { placeId: restaurantStore.placesId }, headers },
      );
    }
    await user.getUserdata();
  } catch (err) {
    iconClassic.value = isFavorite ? "fas" : "far";
    console.error("收藏操作失敗:", err);
  }
};

const checkFavorite = () => {
  if (userData.value) {
    iconClassic.value = userData.value.favorites.includes(
      restaurantStore.placesId,
    )
      ? "fas"
      : "far";
  }
};

const loadStorePage = async () => {
  try {
    if (route.query.id && route.query.id !== restaurantStore.placesId) {
      restaurantStore.placesId = route.query.id;
    }
    await restaurantStore.fetchPlaceDetail();
    await restaurantStore.fetchStorePhoto();
    await restaurantStore.fetchBannerPhoto();
    await restaurantStore.fetchSimilarRestaurants();
    await restaurantStore.fetchRecommendedRestaurants();
    restaurantStore.fetchSearchTopics();
    await restaurantStore.fetchMenu();
    checkFavorite();
    document.title = restaurantStore.storeName
      ? `${restaurantStore.storeName} | 呷飽地圖`
      : "呷飽地圖";
  } catch (error) {
    console.error("數據載入錯誤：", error);
  }
};

// 頁面載入時的初始化
onMounted(loadStorePage);

watch(
  () => route.query.id,
  () => {
    if (route.name === "store") {
      loadStorePage();
    }
  },
);

const shareRestaurant = async () => {
  const url = window.location.href;
  const title = storeName.value || "餐廳推薦";
  const text = `${title} — 在呷飽地圖發現的好餐廳！`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if (err.name !== "AbortError") console.error("Share failed:", err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      alert("已複製連結到剪貼簿！");
    } catch {
      alert(`請手動複製此連結：${url}`);
    }
  }
};

// 點擊頁面其他地方時隱藏下拉選單
function handleDocumentClick(event) {
  const button = document.getElementById("dropdownButton");
  const menu = document.getElementById("dropdownMenu");
  if (!button || !menu) {
    return; // 如果元素不存在，直接退出函數
  }

  if (!button.contains(event.target) && !menu.contains(event.target)) {
    isDropdownVisible.value = false;
  }
}

document.addEventListener("click", handleDocumentClick);

// 導航標籤
const activeTab = ref("overview");
const tabs = [
  { id: "overview", label: "總覽" },
  { id: "photos", label: "照片" },
  { id: "menu", label: "菜單" },
  { id: "comments", label: "評論" },
  { id: "more", label: "更多餐廳" },
];

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 120; // header + sticky nav height
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
  activeTab.value = id;
};

let observer = null;
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeTab.value = entry.target.id;
        }
      }
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  tabs.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <div>
    <Header />
    <div
      class="fixed top-2 left-1/2 transform -translate-x-1/2 z-40 w-[600px] hidden md:block"
    >
      <SearchInput />
    </div>
    <!-- 橫幅圖片區 -->
    <div class="relative w-full h-48">
      <img
        v-if="bannerPhoto"
        :src="bannerPhoto"
        alt="Banner"
        class="object-cover w-full h-full"
        loading="lazy"
        decoding="async"
      />
      <img
        v-else
        src="@/assets/logo.jpg"
        alt="Banner"
        class="object-cover w-full h-full"
        loading="lazy"
        decoding="async"
      />
      <div
        class="absolute top-0 left-0 w-full h-full bg-gray-800 opacity-25"
      ></div>
    </div>

    <!-- 導航標籤 -->
    <nav
      class="sticky top-[57px] z-40 flex items-center px-4 space-x-4 overflow-x-auto bg-white shadow md:overflow-visible"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="scrollToSection(tab.id)"
        class="px-4 py-4 font-bold border-b-2 whitespace-nowrap transition-colors"
        :class="activeTab === tab.id
          ? 'border-amber-500 text-amber-500'
          : 'border-transparent text-gray-500 hover:border-amber-300 hover:text-amber-400'"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- 主要內容區 -->
    <div class="w-full max-w-[1024px] mx-auto bg-white mt-6 px-4 md:px-6 py-4">
      <!-- 總覽 -->
      <div id="overview">
      <!-- 店家基本資訊 -->
      <div
        class="flex flex-col items-center space-y-4 md:flex-row md:items-start md:space-y-0 md:space-x-4"
      >
        <img
          :src="storePhoto"
          alt="Store Thumbnail"
          class="object-cover w-40 h-32 rounded-lg"
          loading="lazy"
          decoding="async"
        />
        <div class="space-y-2 text-center md:text-left">
          <div class="relative flex">
            <h2 class="py-1 text-3xl font-black text-gray-700 mr">
              {{ storeName }}
            </h2>
            <button
              @click="updateFavorite"
              class="absolute right-[-25px] top-3 flex items-center"
            >
              <font-awesome-icon
                :icon="[iconClassic, 'bookmark']"
                size="xl"
                style="color: orange"
              />
            </button>
          </div>
          <div
            class="flex flex-wrap items-center justify-center gap-3 md:justify-start"
          >
            <span class="px-2 py-1 bg-orange-600 rounded-2xl text-yellow-50"
              >{{ rating }} ★</span
            >
            <a href="#"
              ><span class="text-gray-400">{{ userRatingCount }}則評論</span></a
            >
          </div>
          <div
            class="flex flex-wrap justify-center gap-3 py-2 md:justify-start"
          >
            <a
              v-if="startPrice != null && endPrice != null"
              class="text-black rounded"
              >均消價位：{{ `${startPrice}-${endPrice}` }}元</a
            >
            <a v-else class="text-black rounded">均消價位：未提供</a>
            <!-- <a href="#" class="text-blue-400 rounded"><font-awesome-icon :icon="['fas', 'star']" />找相似餐廳</a>
                        <a href="#" class="hover:text-amber-500">火鍋</a>
                        <a href="#" class="hover:text-amber-500">日本料理</a>
                        <a href="#" class="hover:text-amber-500">咖哩</a>
                        <a href="#" class="hover:text-amber-500">合菜</a> -->
          </div>
        </div>
      </div>

      </div><!-- /overview -->

      <!-- 照片 -->
      <div id="photos" class="mt-10">
        <h3 class="mb-4 text-xl font-bold text-gray-700">照片</h3>
        <div v-if="photoUrls.length" class="grid grid-cols-3 gap-2">
          <img
            v-for="(url, i) in photoUrls.slice(0, 9)"
            :key="i"
            :src="url"
            alt="店家照片"
            class="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
            decoding="async"
            @click="openLightbox(i)"
            @error="(e) => e.target.style.display = 'none'"
          />
        </div>
        <p v-else class="text-sm text-gray-400">尚無照片</p>

        <!-- 燈箱 -->
        <div
          v-if="lightboxIndex !== null"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          @click.self="closeLightbox"
        >
          <button @click="prevPhoto" class="absolute left-4 text-white text-3xl px-3 py-1 hover:text-amber-400">‹</button>
          <img :src="photoUrls[lightboxIndex]" class="max-h-[80vh] max-w-[90vw] rounded-lg object-contain" />
          <button @click="nextPhoto" class="absolute right-4 text-white text-3xl px-3 py-1 hover:text-amber-400">›</button>
          <button @click="closeLightbox" class="absolute top-4 right-4 text-white text-xl hover:text-amber-400">✕</button>
        </div>
      </div>

      <!-- 菜單 -->
      <div id="menu" class="mt-10">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-700">菜單</h3>
          <router-link
            v-if="storeDbId"
            :to="`/storecart/${restaurantStore.placesId}`"
            class="px-4 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition"
          >
            線上訂餐
          </router-link>
        </div>

        <!-- 菜單列表 -->
        <template v-if="menuItems.length">
          <div
            v-for="category in [...new Set(menuItems.map(m => m.category))]"
            :key="category"
            class="mb-6"
          >
            <h4 class="mb-3 text-base font-bold text-amber-600 border-b border-amber-100 pb-1">{{ category }}</h4>
            <div class="divide-y divide-gray-100">
              <div
                v-for="item in menuItems.filter(m => m.category === category)"
                :key="item._id"
                class="flex items-center gap-4 py-3"
                :class="{ 'opacity-40': !item.isAvailable }"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.name"
                  class="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  loading="lazy"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-800">{{ item.name }}</span>
                    <span v-if="!item.isAvailable" class="text-xs text-gray-400">（售完）</span>
                  </div>
                  <p v-if="item.description" class="mt-0.5 text-xs text-gray-500 truncate">{{ item.description }}</p>
                </div>
                <span class="flex-shrink-0 font-bold text-amber-600">NT$ {{ item.price }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="py-6 text-center text-gray-400 text-sm">
          此餐廳尚未提供菜單資訊
        </div>
      </div>

      <!-- 店家詳情區 -->
      <div class="flex items-center mt-10 space-x-4">
        <!-- 地圖和評價 -->
        <div class="flex flex-col">
          <a
            :href="googleMapsUri"
            target="_blank"
            class="cursor-pointer hover:opacity-90"
          >
            <img
              v-if="staticMapUrl"
              :src="staticMapUrl"
              :alt="formattedAddress"
              class="object-cover w-40 h-40 rounded-lg"
              loading="lazy"
              decoding="async"
              @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
            />
            <div
              class="w-40 h-40 rounded-lg bg-gray-100 items-center justify-center text-gray-400 text-xs text-center p-2"
              style="display:none"
            >
              <font-awesome-icon :icon="['fas', 'map-location-dot']" class="text-2xl mb-1" /><br/>地圖載入失敗
            </div>
            <div
              v-if="!staticMapUrl"
              class="w-40 h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center p-2"
            >
              <font-awesome-icon :icon="['fas', 'map-location-dot']" class="text-2xl mb-1" /><br/>地圖未提供
            </div>
          </a>
          <a
            :href="googleMapsUri"
            target="_blank"
            class="cursor-pointer hover:opacity-90"
          >
            <div class="w-40 mt-2">
              <div
                class="flex items-center justify-center py-1 mb-1 rounded bg-amber-500"
              >
                <font-awesome-icon
                  :icon="['fab', 'google']"
                  class="w-4 h-4 mr-1 text-blue-600"
                />
                <div class="flex items-center">
                  <span class="text-sm">評價:</span>
                  <span class="text-sm text-gray-500"
                    >{{ userRatingCount }}+</span
                  >
                </div>
              </div>
            </div>
          </a>
        </div>

        <!-- 店家資訊 -->
        <div class="space-y-2">
          <!-- 營業時間下拉選單 -->
          <div class="relative inline-block ml-12">
            <button
              id="dropdownButton"
              class="p-2 font-bold rounded-md text-amber-500 hover:bg-amber-100 focus:outline-none"
              @click="isDropdownVisible = !isDropdownVisible"
            >
              {{ openNow ? "目前營業中" : "目前休息中" }}
              <span class="ml-1">&#x25BC;</span>
            </button>
            <div
              id="dropdownMenu"
              v-if="isDropdownVisible"
              class="absolute z-10 w-64 transform -translate-x-1/2 bg-white rounded-md shadow-lg left-1/2"
            >
              <ul class="mt-1">
                <li
                  v-for="(desc, i) in weekDayDescriptions"
                  :key="i"
                >
                  <span
                    class="block p-2 text-amber-500 hover:bg-amber-100"
                    :class="{ 'rounded-b-md': i === weekDayDescriptions.length - 1 }"
                  >{{ desc }}</span>
                </li>
                <li v-if="!weekDayDescriptions?.length" class="p-2 text-amber-500">
                  營業時間未提供
                </li>
              </ul>
            </div>
          </div>
          <p>店家地址 | {{ formattedAddress }}</p>
          <p v-if="startPrice != null && endPrice != null">
            均消價位 | {{ `${startPrice}-${endPrice}` }}元
          </p>
          <p v-else>均消價位 | 未提供</p>
          <p>
            訂位電話 |
            {{ nationalPhoneNumber != null ? nationalPhoneNumber : "未提供" }}
          </p>
          <a v-if="websiteUri" :href="websiteUri">
            <button class="p-2 mt-6 mr-4 rounded-lg shadow">
              <font-awesome-icon
                :icon="['fas', 'calendar-week']"
                class="w-5 h-5 mr-2 text-amber-500"
              />相關連結
            </button>
          </a>
          <button @click="shareRestaurant" class="p-2 mt-6 mr-4 rounded-lg shadow">
            <font-awesome-icon
              :icon="['fas', 'arrow-up-from-bracket']"
              class="w-5 h-5 mr-2 text-amber-500"
            />分享餐廳
          </button>
          <a :href="googleMapsUri">
            <button class="p-2 mt-6 rounded-lg shadow">
              <font-awesome-icon
                :icon="['fas', 'arrow-up-from-bracket']"
                class="w-5 h-5 mr-2 text-amber-500"
              />google評價
            </button>
          </a>

          <router-link :to="`/storecart/${restaurantStore.placesId}`">
            <button class="p-2 mt-6 mx-4 rounded-lg shadow text-amber-500">
              訂餐
            </button>
          </router-link>
        </div>
      </div>

      <!-- 評論 -->
      <div id="comments" class="mt-10">
        <StoreComment />
      </div>

      <!-- 更多餐廳 -->
      <div id="more" class="w-full max-w-[800px] mx-auto mt-10">
        <SimilarRestaurants />
        <RecommendedRestaurants />
      </div>

      <!-- 搜尋相關主題 -->
      <SearchTag />

      <!-- 地圖區域 -->
      <div class="mt-10 text-gray-700">
        <h3 class="mb-2 text-2xl font-bold">
          {{ storeName }} 的食記
        </h3>
      </div>
      <!-- 熱門餐廳分類 -->
      <div class="mt-10 text-gray-700">
        <StoreType />
      </div>
    </div>
  </div>
</template>
