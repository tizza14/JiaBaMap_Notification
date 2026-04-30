<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";

const route = useRoute();
const status = route.query.status;
const orderId = route.query.orderId;
const orderDetail = ref(null);

const VITE_BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

const getOrderDetails = async (id) => {
  try {
    const res = await axios.get(`${VITE_BACKEND_BASE_URL}/order/detail/${id}`);
    orderDetail.value = res.data;
  } catch (error) {
    console.error("取得訂單資料錯誤:", error);
  }
};

onMounted(() => {
  if (orderId) {
    getOrderDetails(orderId);
  }
});
</script>

<template>
  <div
    class="flex flex-col items-center max-w-lg p-6 m-auto mt-16 mb-10 text-center bg-white border border-gray-200 rounded-lg shadow-lg"
  >
    <h1 class="mb-6 text-3xl font-semibold text-amber-500">訂單明細</h1>

    <div v-if="status === 'success'">
      <div v-if="orderDetail && orderDetail.items">
        <h2 class="mb-2 text-xl font-bold text-green-500">付款成功！</h2>
        <p class="mb-6 text-lg">請依照您指定的訂餐時間前往取餐。</p>
        <p class="mb-6 font-medium text-md">訂單編號：{{ orderId }}</p>

        <div class="p-4 mb-6 text-left rounded-md shadow-md bg-gray-50">
          <div
            v-for="item in orderDetail.items"
            :key="item.productId"
            class="flex justify-between my-3"
          >
            <p class="text-sm font-semibold text-gray-700">
              {{ item.productName }}
            </p>
            <p class="text-sm text-gray-500">
              ${{ item.price }} / {{ item.quantity }} 份
            </p>
          </div>
          <hr />
          <div class="flex justify-between py-2">
            <p class="text-lg font-bold text-gray-800">總金額</p>
            <p class="text-lg font-bold text-gray-800">
              ${{ orderDetail.totalAmount }}
            </p>
          </div>
        </div>
      </div>
      <div v-else>
        <div class="flex justify-center py-6">
          <div class="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="text-gray-400">訂單資料載入中...</p>
      </div>
    </div>

    <div v-else-if="status === 'cancelled'">
      <h2 class="mb-2 text-xl font-bold text-gray-500">付款已取消</h2>
      <p class="font-medium text-md">訂單編號：{{ orderId }}</p>
    </div>

    <div v-else>
      <h2 class="mb-2 text-xl font-bold text-red-500">付款失敗，請重新嘗試</h2>
      <p class="font-medium text-md">訂單編號：{{ orderId }}</p>
    </div>
  </div>
</template>
