<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import SearchInput from "./SearchInput.vue";
import { useRoute } from "vue-router";
import Login from '@/components/Login.vue';
import { useAuth } from '@/stores/authStore';
import Notification from "./Notification.vue";



const emit = defineEmits(["search-toggle"]);
const route = useRoute();
const user = useAuth();
const { userData } = storeToRefs(user); // 使用 storeToRefs 讓資料響應式

// 響應式狀態
const isMenuOpen = ref(false);
const menuContainer = ref(null);
const isSearchOpen = ref(false);
const showLoginModal = ref(false);
const isStoreLoggedIn = ref(!!localStorage.getItem("storeToken"));

// 登出店家
const logoutStore = () => {
  localStorage.removeItem("storeToken");
  isStoreLoggedIn.value = false;
  window.location.href = "/";
};

// 監聽 localStorage 變化 (處理其他頁面登入/登出的情況)
const checkStoreStatus = () => {
  isStoreLoggedIn.value = !!localStorage.getItem("storeToken");
};

// 新增：判斷是否為首頁
const isHome = computed(() => route.path === "/");

// 新增：監聽視窗寬度變化
const windowWidth = ref(window.innerWidth);

// 新增：判斷是否為 UserProfile 頁面
const isUserProfile = computed(() => route.path === "/user");

// 切換搜尋欄
const toggleSearch = () => {
  isSearchOpen.value = !isSearchOpen.value;
  isMenuOpen.value = false;
  emit("search-toggle", isSearchOpen.value);
};

// 切換選單開關
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
  isSearchOpen.value = false;
};

// 控制下拉選單的開關
const handleClickOutside = (event) => {
  if (
    !event.target.closest(".menu-button") &&
    !event.target.closest(".mobile-menu")
  ) {
    isMenuOpen.value = false;
  }
};

//控制登入模態的開關
const openLoginModal = () => (showLoginModal.value = true);
const closeLoginModal = () => (showLoginModal.value = false);

const checkScreenWidth = () => {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value > 768) {
    isMenuOpen.value = false;
  }
};

const currentProfilePicture = computed(() => {
  return userData.value?.profilePicture || "/image/default_user.png";
});

// 當頭像載入失敗時自動替換為備用圖片
const handleImageError = (event) => {
  event.target.src = "/image/default_user.png";
};

// 生命週期鉤子
onMounted(() => {
  window.addEventListener("resize", checkScreenWidth);
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenWidth);
  document.removeEventListener("click", handleClickOutside);
  isSearchOpen.value = false;
});

// 路由監聽，如果路由改變，則關閉搜尋欄和選單，並重新檢查店家登入狀態
watch(route, () => {
  isSearchOpen.value = false;
  isMenuOpen.value = false;
  checkStoreStatus(); // 強制檢查 Token 狀態
});
</script>

<template>
  <div>
  <Login :visible="showLoginModal" @close="closeLoginModal" />
  <header
    class="fixed top-0 left-0 right-0 z-50 flex items-center p-2 bg-white border-b border-orange-200"
    :class="{
      'flex-wrap': !isHome && windowWidth >= 768 && windowWidth < 1167,
    }"
  >
    <!-- 第一行：LOGO 和搜尋欄 -->
    <div class="flex items-center justify-between w-full">
      <!-- LOGO -->
      <router-link to="/" class="w-[130px] flex-shrink-0">
        <img src="@/assets/logo.jpg" alt="Logo" class="w-full" />
      </router-link>

      <!-- 中間區域：搜尋欄 -->
      <div class="justify-center flex-1 hidden mx-4 md:flex">
        <div v-if="route.path !== '/'" class="w-[500px]">
          <SearchInput />
        </div>
      </div>


      <!-- 手機版選單按鈕 -->
      <div class="flex items-center space-x-4 md:hidden">
        <Notification />

        <button @click="toggleSearch" class="text-amber-500">
          <font-awesome-icon
            :icon="['fas', 'magnifying-glass']"
            class="w-5 h-5"
          />
        </button>
        <button @click="toggleMenu" class="text-amber-500 menu-button">
          <font-awesome-icon :icon="['fas', 'bars']" class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- 手機版搜尋欄 -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="transform -translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
    >
      <div
        v-if="isSearchOpen"
        class="absolute left-0 right-0 p-2 bg-white shadow-md top-full md:hidden"
      >
        <SearchInput />
      </div>
    </Transition>

    <!-- 手機版選單 -->
    <div
      v-if="isMenuOpen"
      ref="menuContainer"
      class="absolute right-0 bg-white shadow-lg top-full md:hidden mobile-menu"
    >
      <div class="pt-2 text-center w-26">
        <ul>
          <li v-if="!user.userData">
            <button
              @click="openLoginModal"
              class="w-full p-2 text-center text-amber-500 hover:bg-amber-100"
            >
              會員登入
            </button>
          </li>
          <li v-if="user.userData" class="flex cursor-pointer align-center">
            <div class="w-10 h-10 ml-2 rounded-full bg-slate-400">
              <img
                :src="currentProfilePicture"
                alt="avatar"
                class="object-cover w-full h-full rounded-full"
                @error="handleImageError"
              />
            </div>
            <router-link
              to="/user"
              class="pl-4 font-bold leading-10 text-amber-500"
              >{{ user.userData?.name || "使用者" }}</router-link
            >
          </li>
          <hr v-if="user.userData" class="mt-2 border-amber-200" />
          <router-link
            to="search"
            class="block p-2 text-amber-500 hover:bg-amber-100"
            >搜尋餐廳</router-link
          >
          <hr class="border-amber-200" />
          <li>
            <a href="#" class="block p-2 text-amber-500 hover:bg-amber-100"
              >線上訂位</a
            >
          </li>
          <router-link
            to="/articlelist"
            class="block p-2 text-amber-500 hover:bg-amber-100"
            >熱門食記</router-link
          >
          <router-link
            to="/myarticle"
            class="block p-2 text-amber-500 hover:bg-amber-100"
            >發表食記</router-link
          >
          <hr class="border-amber-200" />
          <!-- 店家專區 - 手機版動態顯示 -->
          <template v-if="!isStoreLoggedIn">
            <li>
              <router-link to="/storesignup" class="block p-2 text-amber-500 hover:bg-amber-100">
                店家註冊
              </router-link>
            </li>
            <li>
              <router-link to="/storesignin" class="block p-2 text-amber-500 hover:bg-amber-100">
                店家登入
              </router-link>
            </li>
          </template>
          <template v-else>
            <li>
              <router-link to="/dashboard" class="block p-2 font-bold text-amber-600 hover:bg-amber-100">
                管理後台
              </router-link>
            </li>
            <li>
              <button @click="logoutStore" class="w-full p-2 text-center text-red-500 hover:bg-red-50">
                登出店家
              </button>
            </li>
          </template>

          <hr class="border-amber-200" />
          <li v-if="user.userData">
            <button
              @click="user.logout"
              class="w-full p-2 text-center text-amber-500 hover:bg-amber-100"
            >
              <font-awesome-icon
                :icon="['fas', 'right-from-bracket']"
                class="mr-2"
              />
              登出
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- 桌面版主選單 -->
    <div
      v-if="!isHome"
      class="items-center justify-start hidden w-full pl-4 mt-2 space-x-4 md:flex xl:w-auto xl:mt-0 xl:justify-end xl:pl-0"
    >
      <!-- 左側連結群組 -->
      <div class="flex items-center space-x-4">
        <router-link
          to="/myarticle"
          class="p-2 rounded-md text-amber-500 hover:bg-amber-100 min-w-20"
        >
          發表食記
        </router-link>
        <router-link
          to="/articlelist"
          class="p-2 rounded-md text-amber-500 hover:bg-amber-100 min-w-20"
        >
          熱門食記
        </router-link>
      </div>

      <!-- 右側下拉選單群組 -->
      <div class="flex items-center space-x-4">
        <!-- 店家專區的下拉選單 -->
        <div class="relative inline-block text-left group">
          <button
            class="flex items-center p-2 rounded-md text-amber-500 hover:bg-amber-100 focus:outline-none min-w-20 whitespace-nowrap font-medium"
          >
            {{ isStoreLoggedIn ? "管理後台" : "店家專區" }}<span class="ml-1">&#x25BC;</span>
          </button>
          <div
            class="absolute right-0 z-50 hidden w-32 mt-0 bg-white rounded-md shadow-lg group-hover:block"
          >
            <ul class="py-1">
              <template v-if="!isStoreLoggedIn">
                <li>
                  <router-link
                    to="/storesignup"
                    class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                    >店家註冊</router-link
                  >
                </li>
                <li>
                  <router-link
                    to="/storesignin"
                    class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                    >店家登入</router-link
                  >
                </li>
              </template>
              <template v-else>
                <li>
                  <router-link
                    to="/dashboard"
                    class="block px-4 py-2 text-amber-500 hover:bg-amber-100 font-bold"
                    >進入後台</router-link
                  >
                </li>
                <li>
                  <button
                    @click="logoutStore"
                    class="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    登出店家
                  </button>
                </li>
              </template>
            </ul>
          </div>
        </div>
        <Notification v-if="user.userData" />

        <!-- 會員頭貼 -->
        <div v-if="user.userData" class="relative inline-block text-left group">
          <div class="w-10 h-10 overflow-hidden rounded-full cursor-pointer">
            <img
              :src="currentProfilePicture"
              alt="avatar"
              class="object-cover w-full h-full rounded-full"
              @error="handleImageError"
            />
          </div>
          <div
            class="absolute right-0 z-50 hidden mt-0 bg-white rounded-md shadow-lg w-36 group-hover:block"
          >
            <ul class="py-1">
              <li>
                <router-link
                  to="/user"
                  class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                >
                  <font-awesome-icon :icon="['fas', 'user']" class="mr-2" />
                  個人檔案
                </router-link>
              </li>
              <li>
                <router-link
                  to="/user"
                  class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                >
                  <font-awesome-icon :icon="['fas', 'bookmark']" class="mr-2" />
                  珍藏餐廳
                </router-link>
              </li>
              <li>
                <button
                  @click="user.logout"
                  class="w-full px-4 py-2 text-left text-amber-500 hover:bg-amber-100"
                >
                  <font-awesome-icon
                    :icon="['fas', 'right-from-bracket']"
                    class="mr-2"
                  />
                  登出
                </button>
              </li>
            </ul>
          </div>
        </div>
        <button
          v-if="!user.userData"
          class="p-2 rounded-md text-amber-500 hover:bg-amber-100 min-w-20"
          @click="openLoginModal"
        >
          會員登入
        </button>
      </div>
    </div>
    <!-- 首頁版本的選單 -->
    <div v-else class="items-center justify-end hidden space-x-4 md:flex">
      <!-- 左側連結群組 -->
      <div class="flex items-center space-x-4">
        <router-link
          to="/myarticle"
          class="p-2 rounded-md text-amber-500 hover:bg-amber-100 min-w-20"
        >
          發表食記
        </router-link>
        <router-link
          to="/articlelist"
          class="p-2 rounded-md text-amber-500 hover:bg-amber-100 min-w-20"
        >
          熱門食記
        </router-link>
      </div>

      <!-- 右側下拉選單群組 -->
      <div class="flex items-center space-x-4">
        <!-- 店家專區的下拉選單 -->
        <div class="relative inline-block text-left group">
          <button
            class="flex items-center p-2 rounded-md text-amber-500 hover:bg-amber-100 focus:outline-none min-w-20 whitespace-nowrap font-medium"
          >
            {{ isStoreLoggedIn ? "管理後台" : "店家專區" }}<span class="ml-1">&#x25BC;</span>
          </button>
          <div
            class="absolute right-0 z-50 hidden w-32 mt-0 bg-white rounded-md shadow-lg group-hover:block"
          >
            <ul class="py-1">
              <template v-if="!isStoreLoggedIn">
                <li>
                  <router-link
                    to="/storesignup"
                    class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                    >店家註冊</router-link
                  >
                </li>
                <li>
                  <router-link
                    to="/storesignin"
                    class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                    >店家登入</router-link
                  >
                </li>
              </template>
              <template v-else>
                <li>
                  <router-link
                    to="/dashboard"
                    class="block px-4 py-2 text-amber-500 hover:bg-amber-100 font-bold"
                    >進入後台</router-link
                  >
                </li>
                <li>
                  <button
                    @click="logoutStore"
                    class="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    登出店家
                  </button>
                </li>
              </template>
            </ul>
          </div>
        </div>
        <Notification v-if="user.userData" />

        <!-- 會員頭貼 -->
        <div v-if="user.userData" class="relative inline-block text-left group">
          <div class="w-10 h-10 overflow-hidden rounded-full cursor-pointer">
            <img
              :src="currentProfilePicture"
              alt="avatar"
              class="object-cover w-full h-full rounded-full"
              @error="handleImageError"
            />
          </div>
          <div
            class="absolute right-0 z-50 hidden mt-0 bg-white rounded-md shadow-lg w-36 group-hover:block"
          >
            <ul class="py-1">
              <li>
                <router-link
                  to="/user"
                  class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                >
                  <font-awesome-icon :icon="['fas', 'user']" class="mr-2" />
                  個人檔案
                </router-link>
              </li>
              <li>
                <router-link
                  to="/user"
                  class="block px-4 py-2 text-amber-500 hover:bg-amber-100"
                >
                  <font-awesome-icon :icon="['fas', 'bookmark']" class="mr-2" />
                  珍藏餐廳
                </router-link>
              </li>
              <li>
                <button
                  @click="user.logout"
                  class="w-full px-4 py-2 text-center text-amber-500 hover:bg-amber-100"
                >
                  <font-awesome-icon
                    :icon="['fas', 'right-from-bracket']"
                    class="mr-2"
                  />
                  登出
                </button>
              </li>
            </ul>
          </div>
        </div>
        <button
          v-if="!user.userData"
          class="p-2 rounded-md text-amber-500 hover:bg-amber-100 min-w-20"
          @click="openLoginModal"
        >
          會員登入
        </button>
      </div>
    </div>
  </header>

  <!-- 添加一個佔位 div 來處理 margin -->
  <div :class="{ 'mt-8': isSearchOpen && windowWidth < 768 }"></div>
  </div>
</template>

<style scoped>
header {
  transition: all 0.3s ease;
}

@media (max-width: 767px) {
  header {
    flex-wrap: nowrap;
  }
}
</style>
