<script setup>
import axios from "axios";
import { useAuth } from "@/stores/authStore";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const user = useAuth();
const orders = ref([]);
const isLoading = ref(true);

const statusLabel = {
  pending: "待付款",
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

const getOrders = async () => {
  if (!user.userData?._id) return;
  isLoading.value = true;
  try {
    const token = localStorage.getItem("userToken");
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/order/${user.userData._id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    orders.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    orders.value = [];
  } finally {
    isLoading.value = false;
  }
};

const delOrder = async (orderId) => {
  const token = localStorage.getItem("userToken");
  await axios.delete(`${import.meta.env.VITE_BACKEND_BASE_URL}/order/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await getOrders();
};

const goToPay = (orderId) => {
  router.push({ path: `/checkout/${orderId}` });
};

onMounted(getOrders);
</script>

<template>
  <div class="min-h-screen py-8 bg-gray-100 px-4">
    <h1 class="text-2xl font-bold text-gray-700 mb-6 text-center">我的訂單</h1>

    <div v-if="isLoading" class="flex justify-center py-24">
      <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="orders.length === 0" class="flex flex-col items-center py-24 text-gray-400">
      <font-awesome-icon :icon="['fas', 'bag-shopping']" class="text-5xl mb-4 text-gray-300" />
      <p class="text-lg">目前沒有任何訂單</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
      <div
        v-for="order in orders"
        :key="order.orderId"
        class="p-4 bg-white rounded-lg shadow-md flex flex-col"
      >
        <div class="flex justify-between items-start mb-3">
          <p class="text-sm text-gray-500">{{ order.orderTime?.slice(0, 10) }}</p>
          <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusClass[order.isPaid ? (order.status || 'completed') : 'pending']]">
            {{ statusLabel[order.status] ?? statusLabel.pending }}
          </span>
        </div>

        <div class="flex justify-center my-3">
          <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <font-awesome-icon :icon="['fas', 'utensils']" class="text-2xl text-amber-400" />
          </div>
        </div>

        <p class="text-lg text-center font-semibold text-gray-800">{{ order.restaurantName }}</p>
        <p class="text-sm text-center text-gray-500 mb-3">{{ order.itemsLength }} 項商品</p>

        <div class="border-t my-3"></div>

        <p class="text-xl font-bold text-center text-gray-800 mb-4">共 {{ order.totalAmount }} 元</p>

        <div class="flex items-center justify-between mt-auto">
          <button
            @click="delOrder(order.orderId)"
            class="text-red-400 hover:text-red-500"
            title="刪除訂單"
          >
            <font-awesome-icon :icon="['fas', 'trash']" />
          </button>

          <button
            v-if="!order.isPaid && order.status !== 'cancelled'"
            @click="goToPay(order.orderId)"
            class="px-4 py-2 text-white bg-amber-500 rounded-full hover:bg-amber-400 text-sm"
          >
            立刻結帳
          </button>

          <button
            v-else-if="order.status === 'ready'"
            class="px-4 py-2 text-white bg-purple-500 rounded-full text-sm cursor-default"
            disabled
          >
            請前往取餐
          </button>

          <div v-else></div>
        </div>
      </div>
    </div>
  </div>
</template>
