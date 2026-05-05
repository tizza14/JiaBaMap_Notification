<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import Swal from "sweetalert2";
import DatePicker from "@/components/DatePicker.vue";
import { useRoute, useRouter } from "vue-router";

const VITE_BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;
const paymentBackendUrl = (
  import.meta.env.VITE_BACKEND_NGROK_URL || VITE_BACKEND_BASE_URL
)?.replace(/\/+$/, "");

const route = useRoute();
const router = useRouter();
const orderId = route.params.orderId;

const orderDetail = ref(null);
const shoppingCart = {
  packages: {
    id: "4",
    amount: "",
    products: [],
  },
  orderId: "",
};
let pickupPhone = ref(null);
let pickupName = ref(null);
const selectedPayment = ref("LINEPay");
const selectedInvoice = ref("紙本發票");
const formattedDateTime = ref("");

const updateFormattedDateTime = (newFormattedDateTime) => {
  formattedDateTime.value = newFormattedDateTime;
};

const getOrderDetails = async (orderId) => {
  try {
    const res = await axios.get(
      `${VITE_BACKEND_BASE_URL}/order/detail/${orderId}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } },
    );
    orderDetail.value = res.data;
    shoppingCart.packages.products = orderDetail.value.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
      price: item.price,
    }));
    shoppingCart.orderId = orderDetail.value.orderId;
    shoppingCart.packages.amount = orderDetail.value.totalAmount;
  } catch (error) {
    console.error("取得訂單資料錯誤:", error);
  }
};

onMounted(() => {
  if (orderId) {
    getOrderDetails(orderId);
  }
});

const savePickupInfo = async () => {
  await axios.put(`${VITE_BACKEND_BASE_URL}/order/${orderId}`, {
    pickupName: pickupName.value || "",
    pickupPhone: pickupPhone.value || "",
    pickupTime: formattedDateTime.value || undefined,
  }, { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } });
};

const handelPayment = async (shoppingCart) => {
  try {
    const url = `${paymentBackendUrl}/payments/linepay/reserve`;
    const { data } = await axios.post(url, shoppingCart);
    const paymentUrl = data?.response?.info?.paymentUrl?.web;
    const returnCode = data?.response?.returnCode;

    if (returnCode === "0000") {
      window.location.href = paymentUrl;
    } else {
      Swal.fire({
        title: "Error!",
        text: data.response.returnMessage,
        icon: "error",
        confirmButtonText: "好",
      }).then(() => {
        router.push(`/checkout/${orderId}`);
      });
    }
  } catch (err) {
    console.error("建立付款請求失敗:", err);
    Swal.fire({
      title: "Error!",
      text: "建立付款請求失敗，請稍後再試",
      icon: "error",
      confirmButtonText: "好",
    }).then(() => {
      router.push(`/checkout/${orderId}`);
    });
  }
};

const addProducts = () => {
  router.push(`/storecart`);
};

const gotoOrderDetail = (id) => {
  router.push(`/checkout-detail?orderId=${id}&status=success`);
};

const submitOrder = async (payment) => {
  try {
    await savePickupInfo();
  } catch (err) {
    console.error("儲存取貨資訊失敗:", err);
  }

  if (payment === "LINEPay") {
    handelPayment(shoppingCart);
  } else {
    gotoOrderDetail(orderId);
  }
};
</script>

<template>
  <div
    class="w-[70vw] lg:w-[50vw] flex flex-col gap-6 mt-16 mb-10 m-auto text-center"
  >
    <h1 class="text-2xl font-bold text-amber-500">
      <font-awesome-icon :icon="['fas', 'file-invoice-dollar']" /> 購物車結帳
    </h1>
    <!-- Stepper -->
    <div data-hs-stepper="">
      <!-- Stepper Nav -->
      <ul class="relative flex flex-row gap-x-2">
        <li
          class="flex items-center flex-1 gap-x-2 shrink basis-0 group"
          data-hs-stepper-nav-item='{
            "index": 1
          }'
        >
          <span
            class="inline-flex items-center text-xs align-middle min-w-7 min-h-7 group"
          >
            <span
              class="flex items-center justify-center font-medium text-gray-800 bg-gray-100 rounded-full size-7 shrink-0 group-focus:bg-gray-200 hs-stepper-active:bg-amber-500 hs-stepper-active:text-white hs-stepper-success:bg-amber-500 hs-stepper-success:text-white hs-stepper-completed:bg-teal-500 hs-stepper-completed:group-focus:bg-teal-600"
            >
              <span
                class="hs-stepper-success:hidden hs-stepper-completed:hidden"
                >1</span
              >
              <svg
                class="hidden shrink-0 size-3 hs-stepper-success:block"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span class="text-sm font-medium text-gray-800 ms-2">
              確認明細
            </span>
          </span>
          <div
            class="flex-1 w-full h-px bg-gray-200 group-last:hidden hs-stepper-success:bg-amber-500 hs-stepper-completed:bg-teal-600"
          ></div>
        </li>

        <li
          class="flex items-center flex-1 gap-x-2 shrink basis-0 group"
          data-hs-stepper-nav-item='{
            "index": 2
          }'
        >
          <span
            class="inline-flex items-center text-xs align-middle min-w-7 min-h-7 group"
          >
            <span
              class="flex items-center justify-center font-medium text-gray-800 bg-gray-100 rounded-full size-7 shrink-0 group-focus:bg-gray-200 hs-stepper-active:bg-amber-500 hs-stepper-active:text-white hs-stepper-success:bg-amber-500 hs-stepper-success:text-white hs-stepper-completed:bg-teal-500 hs-stepper-completed:group-focus:bg-teal-600"
            >
              <span
                class="hs-stepper-success:hidden hs-stepper-completed:hidden"
                >2</span
              >
              <svg
                class="hidden shrink-0 size-3 hs-stepper-success:block"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span class="text-sm font-medium text-gray-800 ms-2">
              確認付款
            </span>
          </span>
          <div
            class="flex-1 w-full h-px bg-gray-200 group-last:hidden hs-stepper-success:bg-amber-500 hs-stepper-completed:bg-teal-600"
          ></div>
        </li>

        <li
          class="flex items-center flex-1 gap-x-2 shrink basis-0 group"
          data-hs-stepper-nav-item='{
              "index": 3
            }'
        >
          <span
            class="inline-flex items-center text-xs align-middle min-w-7 min-h-7 group"
          >
            <span
              class="flex items-center justify-center font-medium text-gray-800 bg-gray-100 rounded-full size-7 shrink-0 group-focus:bg-gray-200 hs-stepper-active:bg-amber-500 hs-stepper-active:text-white hs-stepper-success:bg-amber-500 hs-stepper-success:text-white hs-stepper-completed:bg-teal-500 hs-stepper-completed:group-focus:bg-teal-600"
            >
              <span
                class="hs-stepper-success:hidden hs-stepper-completed:hidden"
                >3</span
              >
              <svg
                class="hidden shrink-0 size-3 hs-stepper-success:block"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span class="text-sm font-medium text-gray-800 ms-2">
              確認結帳
            </span>
          </span>
          <div
            class="flex-1 w-full h-px bg-gray-200 group-last:hidden hs-stepper-success:bg-amber-500 hs-stepper-completed:bg-teal-600"
          ></div>
        </li>
        <!-- End Item -->
      </ul>
      <!-- End Stepper Nav -->

      <!-- Stepper Content -->
      <div class="mt-5 leading-relaxed sm:mt-8" v-if="orderDetail">
        <!-- First Content -->
        <div data-hs-stepper-content-item='{"index": 1}'>
          <div
            class="flex flex-col justify-center gap-4 p-4 border border-gray-200 border-dashed bg-gray-50 rounded-xl"
          >
            <div class="flex flex-col text-left">
              <h3 class="mb-1 text-lg font-bold text-amber-500">
                {{ orderDetail.storeName }}
              </h3>
              <div class="flex gap-2 my-2">
                <font-awesome-icon
                  :icon="['fas', 'phone-flip']"
                  style="color: #f59e0b"
                  class="fa-lg"
                />
                <p>{{ orderDetail.storePhone }}</p>
              </div>
              <div class="flex gap-2 my-2 cursor-pointer">
                <font-awesome-icon
                  :icon="['fas', 'location-dot']"
                  class="fa-lg"
                  style="color: #f59e0b"
                />
                <p>{{ orderDetail.storeAddress }}</p>
              </div>
            </div>
            <div class="text-left">
              <h2 class="mb-1 font-bold">取貨方式</h2>
              <p class="p-2 my-2 text-sm tracking-widest bg-rose-50">
                <font-awesome-icon
                  :icon="['fas', 'circle-exclamation']"
                  style="color: #ff5e7d"
                />
                尖峰時段取餐時間需視現場狀況，請多包涵，建議可使用數位支付，並綁定手機載具，可節省取餐時間。
              </p>
              <div class="grid gap-2 my-2 sm:grid-cols-2">
                <label
                  for="hs-radio-in-form"
                  class="flex w-full p-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-amber-500"
                >
                  <input
                    type="radio"
                    name="hs-radio-in-form"
                    class="shrink-0 mt-0.5 border-gray-200 rounded-full text-amber-600 disabled:opacity-50 disabled:pointer-events-none"
                    id="hs-radio-in-form"
                    checked=""
                  />
                  <span class="text-sm text-gray-500 ms-3">到店自取</span>
                </label>
              </div>
              <h2 class="mb-1 font-bold">預計取貨時間</h2>
              <DatePicker @update:formattedDateTime="updateFormattedDateTime" />
            </div>
            <div class="text-left">
              <h2 class="mb-1 font-bold">訂購內容</h2>
              <p class="text-right">
                ${{ orderDetail.totalAmount }} /
                {{ orderDetail.items.length }} 份
              </p>
              <div class="flex flex-col justify-between gap-4 p-4 bg-white">
                <div v-for="item in orderDetail.items" :key="item.productId">
                  <h3>{{ item.productName }}</h3>
                  <p class="text-gray-400">
                    {{ item.spec }} / ${{ item.price }} / {{ item.quantity }} 份
                  </p>
                </div>
                <div class="flex gap-6">
                  <font-awesome-icon
                    :icon="['fas', 'pen']"
                    style="color: #f59e0b"
                  />
                  <font-awesome-icon
                    :icon="['fas', 'trash']"
                    style="color: #898989"
                  />
                </div>
              </div>
              <button
                class="items-center px-3 py-2 my-3 text-sm font-medium text-white border border-transparent rounded-lg bg-amber-500 gap-x-1"
                @click="addProducts"
              >
                繼續加購
              </button>
            </div>
            <div class="leading-loose text-left">
              <h2 class="mb-1 font-bold">結帳明細</h2>
              <hr />
              <div class="flex justify-between my-5">
                <p>商品 x {{ orderDetail.items.length }}</p>
                <p>${{ orderDetail.totalAmount }}</p>
              </div>
              <hr />
              <div class="flex justify-between my-5 font-bold text-orange-500">
                <p>應付金額</p>
                <p>${{ orderDetail.totalAmount }}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- End First Content -->

        <!-- Second Content -->
        <div
          data-hs-stepper-content-item='{
            "index": 2
          }'
          style="display: none"
        >
          <div
            class="flex flex-col items-center justify-center gap-4 p-4 border border-gray-200 border-dashed rounded-lg bg-gray-50"
          >
            <div
              class="flex justify-between w-full p-4 font-bold text-white rounded-lg bg-amber-500"
            >
              <div class="flex gap-4">
                <p class="px-3 py-1 bg-white rounded-lg text-amber-500">
                  {{ orderDetail.items.length }} 份
                </p>
                <p class="flex items-center justify-center text-white">
                  應付金額
                </p>
              </div>
              <p class="flex items-center justify-center">
                ${{ orderDetail.totalAmount }}
              </p>
            </div>
            <div class="w-full text-left">
              <h2 class="mb-1 font-bold">取貨人資訊</h2>
              <div class="max-w-sm">
                <label for="pickup-name" class="block mb-2 text-sm font-medium"
                  >姓名</label
                >
                <input
                  type="text"
                  id="pickup-name"
                  class="block w-full px-4 py-3 mb-2 text-sm border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
                  placeholder="請輸入取貨人姓名"
                  v-model="pickupName"
                  required
                />
              </div>
              <div class="max-w-sm">
                <label for="pickup-phone" class="block mb-2 text-sm font-medium"
                  >聯絡電話</label
                >
                <input
                  type="tel"
                  id="pickup-phone"
                  class="block w-full px-4 py-3 mb-2 text-sm border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
                  placeholder="請輸入取貨人聯絡電話"
                  v-model="pickupPhone"
                  required
                />
              </div>
            </div>
            <div class="w-full text-left">
              <h2 class="mb-1 font-bold">付款方式</h2>
              <div class="grid mb-2 space-y-2">
                <label
                  for="cash-payment"
                  class="flex w-full max-w-xs p-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                >
                  <input
                    type="radio"
                    name="payment-form"
                    class="shrink-0 mt-0.5 border-gray-200 rounded-full text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none mb-2"
                    id="cash-payment"
                    value="現金"
                    v-model="selectedPayment"
                  />
                  <span class="text-sm text-gray-500 ms-3">現金</span>
                </label>
                <label
                  for="linepay-payment"
                  class="flex w-full max-w-xs p-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                >
                  <input
                    type="radio"
                    name="payment-form"
                    class="shrink-0 mt-0.5 border-gray-200 rounded-full text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none mb-2"
                    id="linepay-payment"
                    v-model="selectedPayment"
                    value="LINEPay"
                  />
                  <span class="text-sm text-gray-500 ms-3">
                    <img src="/LINEPay.png" alt="LINEPay" />
                  </span>
                </label>
              </div>
            </div>
            <div class="w-full text-left">
              <h3 class="mb-1 font-bold">開立發票</h3>
              <div class="grid mb-2 space-y-2">
                <label
                  for="paper-invoice"
                  class="flex w-full max-w-xs p-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                >
                  <input
                    type="radio"
                    name="invoice-type"
                    class="shrink-0 mt-0.5 border-gray-200 rounded-full text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none mb-2"
                    id="paper-invoice"
                    value="紙本發票"
                    v-model="selectedInvoice"
                  />
                  <span class="text-sm text-gray-500 ms-3">紙本發票</span>
                </label>
                <label
                  for="mobile-invoice"
                  class="flex w-full max-w-xs p-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                >
                  <input
                    type="radio"
                    name="invoice-type"
                    class="shrink-0 mt-0.5 border-gray-200 rounded-full text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none mb-2"
                    id="mobile-invoice"
                    value="手機載具"
                    v-model="selectedInvoice"
                  />
                  <span class="text-sm text-gray-500 ms-3">手機載具</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <!-- End Second Content -->

        <!-- Third Content -->
        <div
          data-hs-stepper-content-item='{
            "index": 3
          }'
          style="display: none"
        >
          <div
            class="flex flex-col items-center justify-center p-4 text-left border border-gray-200 border-dashed bg-gray-50 rounded-xl"
          >
            <h3 class="mb-1 font-bold text-left">確認訂單明細</h3>
            <table class="w-full">
              <tbody>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>訂購門市</td>
                  <td>{{ orderDetail.storeName }}</td>
                </tr>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>取貨人</td>
                  <td>{{ pickupName }}</td>
                </tr>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>聯絡電話</td>
                  <td>{{ pickupPhone }}</td>
                </tr>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>取貨方式</td>
                  <td>自取</td>
                </tr>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>預計取貨時間</td>
                  <td>{{ formattedDateTime }}</td>
                </tr>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>付款方式</td>
                  <td>{{ selectedPayment }}</td>
                </tr>
                <tr class="h-12 px-4 py-2 border-b border-gray-300">
                  <td>開立發票方式</td>
                  <td>{{ selectedInvoice }}</td>
                </tr>
                <tr class="h-12 px-4 py-2">
                  <td>應付金額</td>
                  <td>${{ orderDetail.totalAmount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- End Third Content -->

        <!-- Final Content -->
        <div
          data-hs-stepper-content-item='{
            "isFinal": true
          }'
          style="display: none"
        >
          <div
            class="flex flex-col items-center justify-center h-48 p-4 border border-gray-200 border-dashed bg-gray-50 rounded-xl"
          >
            <font-awesome-icon
              :icon="['fas', 'spinner']"
              spin-pulse
              class="fa-3x"
            />
            <h3 class="my-3 text-lg text-gray-500">付款中...</h3>
          </div>
        </div>
        <!-- End Final Content -->

        <!-- Button Group -->
        <div class="flex items-center justify-between mt-5 gap-x-2">
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm gap-x-1 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
            data-hs-stepper-back-btn=""
          >
            <svg
              class="shrink-0 size-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m15 18-6-6 6-6"></path>
            </svg>
            上一步
          </button>
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-lg bg-amber-500 gap-x-1 disabled:pointer-events-none"
            data-hs-stepper-next-btn=""
          >
            下一步
            <svg
              class="shrink-0 size-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-lg bg-amber-500 gap-x-1 disabled:pointer-events-none"
            data-hs-stepper-finish-btn=""
            style="display: none"
            @click.prevent="submitOrder(selectedPayment)"
          >
            送出訂單
          </button>
        </div>
        <!-- End Button Group -->
      </div>
      <!-- End Stepper Content -->
    </div>
    <!-- End Stepper -->
  </div>
</template>
