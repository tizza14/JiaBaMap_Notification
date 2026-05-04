<script setup>
import { ref, computed, onMounted, watch } from "vue";
import * as jose from "jose";
import axios from "axios";
import Swal from "sweetalert2";
import { useNotificationStore } from "@/stores/notificationStore";
import StoreSidebar from "@/components/StoreSidebar.vue";

const token = sessionStorage.getItem("storeToken");
const storeId = token ? jose.decodeJwt(token).id : null;
const authHeaders = { Authorization: `Bearer ${token}` };

const orders = ref([]);
const isLoading = ref(true);
const currentPage = ref(1);
const totalPages = ref(1);
const totalCount = ref(0);
const selectedStatus = ref("");
const updatingId = ref(null);

// 展開訂單品項
const expandedOrders = ref(new Set());

const statusLabel = {
  pending: "待確認",
  preparing: "備餐中",
  ready: "可取餐",
  completed: "已完成",
  cancelled: "已取消",
};

const statusClass = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

// 每個狀態的下一步操作
const nextActions = {
  pending: { label: "開始備餐", next: "preparing" },
  preparing: { label: "備餐完成", next: "ready" },
  ready: { label: "確認取餐", next: "completed" },
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

const fetchOrders = async (page = 1) => {
  if (!storeId) return;
  isLoading.value = true;
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/order/store/${storeId}`,
      {
        params: {
          page,
          limit: 15,
          status: selectedStatus.value || undefined,
        },
        headers: authHeaders,
      }
    );
    orders.value = response.data.orders || [];
    totalPages.value = response.data.totalPages || 1;
    currentPage.value = response.data.currentPage || 1;
    totalCount.value = response.data.totalCount || 0;
  } catch (error) {
    Swal.fire({ title: "載入訂單失敗！", icon: "error", confirmButtonText: "確定" });
  } finally {
    isLoading.value = false;
  }
};

const updateStatus = async (order, newStatus) => {
  updatingId.value = order.orderId;
  try {
    await axios.patch(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/order/${order.orderId}/status`,
      { status: newStatus },
      { headers: authHeaders }
    );
    order.status = newStatus;
  } catch {
    Swal.fire({ title: "更新狀態失敗！", icon: "error", confirmButtonText: "確定" });
  } finally {
    updatingId.value = null;
  }
};

const cancelOrder = async (order) => {
  const result = await Swal.fire({
    title: "確定要取消此訂單？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "取消訂單",
    cancelButtonText: "返回",
  });
  if (result.isConfirmed) {
    await updateStatus(order, "cancelled");
  }
};

const toggleExpand = (orderId) => {
  if (expandedOrders.value.has(orderId)) {
    expandedOrders.value.delete(orderId);
  } else {
    expandedOrders.value.add(orderId);
  }
};

const activeCount = computed(
  () => orders.value.filter((o) => ["pending", "preparing", "ready"].includes(o.status)).length
);

const notificationStore = useNotificationStore();

onMounted(() => {
  fetchOrders(1);
  if (storeId) {
    notificationStore.initSocket(storeId, "store");
  }
});

// 收到新訂單通知時自動刷新
watch(
  () => notificationStore.notifications,
  (notifications) => {
    const latest = notifications[0];
    if (latest?.actionType === "new_order" && !latest.read) {
      fetchOrders(currentPage.value);
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <StoreSidebar />

    <!-- Main -->
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="mb-6 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">訂單管理</h1>
          <p class="text-sm text-gray-500 mt-1">共 {{ totalCount }} 筆訂單</p>
        </div>
      </header>

      <!-- 狀態篩選 -->
      <div class="flex gap-2 mb-6 flex-wrap">
        <button
          v-for="(label, key) in { '': '全部', ...statusLabel }"
          :key="key"
          @click="selectedStatus = key; fetchOrders(1)"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium transition',
            selectedStatus === key
              ? 'bg-amber-400 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border',
          ]"
        >
          {{ label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-16">
        <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- 訂單列表 -->
      <div v-else class="space-y-3">
        <div v-if="orders.length === 0" class="text-center py-16 text-gray-400">
          目前沒有訂單
        </div>

        <div
          v-for="order in orders"
          :key="order.orderId"
          class="bg-white rounded-lg shadow-sm overflow-hidden"
        >
          <!-- 訂單標頭 -->
          <div class="flex items-center justify-between px-5 py-4">
            <div class="flex items-center gap-4">
              <button @click="toggleExpand(order.orderId)" class="text-gray-400 hover:text-gray-600">
                <span class="text-lg">{{ expandedOrders.has(order.orderId) ? '▲' : '▼' }}</span>
              </button>
              <div>
                <p class="font-mono text-sm text-gray-500">#{{ String(order.orderId).slice(-6) }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatTime(order.orderTime) }}</p>
              </div>
              <span :class="['px-3 py-1 rounded-full text-xs font-medium', statusClass[order.status]]">
                {{ statusLabel[order.status] }}
              </span>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="font-semibold text-gray-800">{{ currency(order.totalAmount) }}</p>
                <p class="text-xs text-gray-400">取貨：{{ formatTime(order.pickupTime) }}</p>
              </div>

              <!-- 操作按鈕 -->
              <div class="flex gap-2">
                <button
                  v-if="nextActions[order.status]"
                  @click="updateStatus(order, nextActions[order.status].next)"
                  :disabled="updatingId === order.orderId"
                  class="px-3 py-1.5 text-sm text-white bg-amber-400 rounded hover:bg-amber-500 disabled:bg-amber-200 transition"
                >
                  {{ updatingId === order.orderId ? "更新中..." : nextActions[order.status].label }}
                </button>
                <button
                  v-if="['pending', 'preparing'].includes(order.status)"
                  @click="cancelOrder(order)"
                  class="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition"
                >
                  取消
                </button>
              </div>
            </div>
          </div>

          <!-- 展開品項 -->
          <div v-if="expandedOrders.has(order.orderId)" class="border-t bg-gray-50 px-5 py-3">
            <p class="text-xs font-semibold text-gray-500 mb-2">訂單品項</p>
            <div class="space-y-1">
              <div
                v-for="(item, i) in order.items"
                :key="i"
                class="flex justify-between text-sm text-gray-700"
              >
                <span>{{ item.productName }} × {{ item.quantity }}</span>
                <span>${{ item.price * item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分頁 -->
      <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-6">
        <button
          @click="fetchOrders(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-4 py-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-40"
        >
          上一頁
        </button>
        <span class="px-4 py-2 text-sm text-gray-600">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          @click="fetchOrders(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-40"
        >
          下一頁
        </button>
      </div>
    </main>
  </div>
</template>
