<script setup>
import { ref, onMounted } from "vue";
import * as jose from "jose";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const token = localStorage.getItem("storeToken");
const storeId = token ? jose.decodeJwt(token).id : null;

const navigation = ref([
  { name: "首頁", link: "/dashboard" },
  { name: "餐廳資訊", link: "/store-profile" },
  { name: "菜單管理", link: "/menu-management" },
  { name: "訂單管理", link: "/order-management" },
]);

const stats = ref({ totalOrders: 0, activeOrders: 0, todayRevenue: 0 });
const recentOrders = ref([]);
const isLoading = ref(true);

const authHeaders = { Authorization: `Bearer ${token}` };

const statusLabel = {
  pending: "待確認",
  preparing: "備餐中",
  ready: "可取餐",
  completed: "已完成",
  cancelled: "已取消",
};

const statusClass = {
  pending: "text-yellow-500",
  preparing: "text-blue-500",
  ready: "text-purple-500",
  completed: "text-green-500",
  cancelled: "text-red-500",
};

const currency = (value) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadDashboard = async () => {
  if (!storeId) return;
  isLoading.value = true;
  try {
    const [statsRes, ordersRes] = await Promise.all([
      axios.get(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/order/store/${storeId}/stats`,
        { headers: authHeaders }
      ),
      axios.get(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/order/store/${storeId}`,
        { params: { limit: 5, page: 1 }, headers: authHeaders }
      ),
    ]);
    stats.value = statsRes.data;
    recentOrders.value = ordersRes.data.orders || [];
  } catch (error) {
    console.error("載入 Dashboard 失敗：", error);
  } finally {
    isLoading.value = false;
  }
};

const logout = () => {
  localStorage.removeItem("storeToken");
  router.push({ name: "storesignin" });
};

onMounted(loadDashboard);
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-md flex flex-col">
      <div class="p-6 text-lg font-semibold text-center text-gray-800 border-b">
        餐廳後台
      </div>
      <nav class="flex-1 py-4">
        <ul>
          <li v-for="item in navigation" :key="item.name">
            <router-link
              :to="item.link"
              class="block px-6 py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition"
              active-class="bg-amber-50 text-amber-600 border-r-4 border-amber-400"
            >
              {{ item.name }}
            </router-link>
          </li>
        </ul>
      </nav>
      <div class="p-4 border-t">
        <button
          class="w-full px-4 py-2 text-sm font-medium text-gray-700 rounded hover:bg-red-50 hover:text-red-600 transition"
          @click="logout"
        >
          登出
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">餐廳管理首頁</h1>
        <p class="text-sm text-gray-500 mt-1">今日概覽</p>
      </header>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-16">
        <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <!-- 統計卡片 -->
        <section class="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div class="p-5 bg-white rounded-lg shadow-sm border-l-4 border-amber-400">
            <p class="text-sm font-medium text-gray-500">總訂單數</p>
            <p class="mt-2 text-3xl font-bold text-gray-800">{{ stats.totalOrders }}</p>
          </div>
          <div class="p-5 bg-white rounded-lg shadow-sm border-l-4 border-green-400">
            <p class="text-sm font-medium text-gray-500">今日營收</p>
            <p class="mt-2 text-3xl font-bold text-gray-800">{{ currency(stats.todayRevenue) }}</p>
          </div>
          <div class="p-5 bg-white rounded-lg shadow-sm border-l-4 border-blue-400">
            <p class="text-sm font-medium text-gray-500">活躍訂單</p>
            <p class="mt-2 text-3xl font-bold text-gray-800">{{ stats.activeOrders }}</p>
          </div>
        </section>

        <!-- 最近訂單 -->
        <section>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">最近訂單</h2>
            <router-link to="/order-management" class="text-sm text-amber-500 hover:underline">
              查看全部 →
            </router-link>
          </div>
          <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">訂單編號</th>
                  <th class="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">品項數</th>
                  <th class="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">總金額</th>
                  <th class="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">狀態</th>
                  <th class="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">取貨時間</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-if="recentOrders.length === 0">
                  <td colspan="5" class="text-center py-8 text-gray-400">目前沒有訂單</td>
                </tr>
                <tr v-for="order in recentOrders" :key="order.orderId">
                  <td class="px-4 py-3 text-sm font-mono text-gray-600">
                    #{{ String(order.orderId).slice(-6) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-800">{{ order.items?.length || 0 }} 項</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-800">
                    {{ currency(order.totalAmount) }}
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <span :class="statusClass[order.status] || 'text-gray-500'">
                      {{ statusLabel[order.status] || order.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatTime(order.pickupTime) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
