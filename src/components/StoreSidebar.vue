<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as jose from "jose";
import axios from "axios";

const route = useRoute();
const router = useRouter();

const token = sessionStorage.getItem("storeToken");
const storeId = token ? jose.decodeJwt(token).id : null;
const activeOrderCount = ref(0);

const navigation = [
  { name: "首頁", link: "/dashboard" },
  { name: "餐廳資訊", link: "/store-profile" },
  { name: "菜單管理", link: "/menu-management" },
  { name: "訂單管理", link: "/order-management" },
];

const fetchActiveCount = async () => {
  if (!storeId) return;
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/order/store/${storeId}/stats`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    activeOrderCount.value = data.activeOrders ?? 0;
  } catch {
    // 靜默失敗，不影響頁面
  }
};

const logout = () => {
  sessionStorage.removeItem("storeToken");
  router.push({ name: "storesignin" });
};

onMounted(fetchActiveCount);
</script>

<template>
  <aside class="w-64 bg-white shadow-md flex flex-col flex-shrink-0">
    <div class="p-6 text-lg font-semibold text-center text-gray-800 border-b">餐廳後台</div>
    <nav class="flex-1 py-4">
      <ul>
        <li v-for="item in navigation" :key="item.name">
          <router-link
            :to="item.link"
            class="flex items-center px-6 py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition"
            :class="{ 'bg-amber-100 text-amber-600 border-r-4 border-amber-500': route.path === item.link }"
          >
            {{ item.name }}
            <span
              v-if="item.link === '/order-management' && activeOrderCount > 0"
              class="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full"
            >
              {{ activeOrderCount }}
            </span>
          </router-link>
        </li>
      </ul>
    </nav>
    <button
      class="px-6 py-4 text-left text-gray-600 hover:bg-red-50 hover:text-red-600 transition border-t"
      @click="logout"
    >
      登出系統
    </button>
  </aside>
</template>
