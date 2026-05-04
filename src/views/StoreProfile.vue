<script setup>
import { ref, onMounted } from "vue";
import * as jose from "jose";
import axios from "axios";
import Swal from "sweetalert2";
import StoreSidebar from "@/components/StoreSidebar.vue";

const token = sessionStorage.getItem("storeToken");
const storeId = token ? jose.decodeJwt(token).id : null;
const authHeaders = { Authorization: `Bearer ${token}` };

const isLoading = ref(true);
const isSaving = ref(false);
const form = ref({
  storeName: "",
  storePhone: "",
  storeIntro: "",
  storeAddress: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  paymentOptions: [],
});

const paymentChoices = [
  { value: "cash", label: "現金" },
  { value: "online", label: "線上付款" },
  { value: "credit_card", label: "信用卡" },
  { value: "linepay", label: "LINE Pay" },
];

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
const businessHours = ref(
  weekDays.reduce((acc, d) => {
    acc[d] = { open: "", close: "", closed: false };
    return acc;
  }, {})
);

const loadProfile = async () => {
  if (!storeId) return;
  isLoading.value = true;
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/store/${storeId}`,
      { headers: authHeaders }
    );
    const store = response.data;
    form.value = {
      storeName: store.storeName || "",
      storePhone: store.storePhone || "",
      storeIntro: store.storeIntro || "",
      storeAddress: store.storeAddress || "",
      contactName: store.contactName || "",
      contactEmail: store.contactEmail || "",
      contactPhone: store.contactPhone || "",
      paymentOptions: store.paymentOptions || [],
    };

    // 解析 businessHours（Map 格式：{ "一": "09:00-18:00" } 或 "closed"）
    if (store.businessHours) {
      const raw = store.businessHours instanceof Map
        ? Object.fromEntries(store.businessHours)
        : store.businessHours;
      weekDays.forEach((d) => {
        const val = raw[d] || "";
        if (!val || val === "closed") {
          businessHours.value[d] = { open: "", close: "", closed: true };
        } else {
          const [open, close] = val.split("-");
          businessHours.value[d] = { open: open || "", close: close || "", closed: false };
        }
      });
    }
  } catch {
    Swal.fire({ title: "載入店家資料失敗！", icon: "error", confirmButtonText: "確定" });
  } finally {
    isLoading.value = false;
  }
};

const saveProfile = async () => {
  if (!form.value.storeName.trim()) {
    Swal.fire({ title: "店名不能為空！", icon: "warning", confirmButtonText: "確定" });
    return;
  }

  // 組合 businessHours 為字串格式
  const hoursMap = {};
  weekDays.forEach((d) => {
    const h = businessHours.value[d];
    hoursMap[d] = h.closed ? "closed" : h.open && h.close ? `${h.open}-${h.close}` : "";
  });

  isSaving.value = true;
  try {
    await axios.put(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/store/${storeId}`,
      { ...form.value, businessHours: hoursMap },
      { headers: authHeaders }
    );
    Swal.fire({ title: "儲存成功！", icon: "success", timer: 1500, showConfirmButton: false });
  } catch {
    Swal.fire({ title: "儲存失敗！", icon: "error", confirmButtonText: "確定" });
  } finally {
    isSaving.value = false;
  }
};

const togglePayment = (value) => {
  const idx = form.value.paymentOptions.indexOf(value);
  if (idx === -1) {
    form.value.paymentOptions.push(value);
  } else {
    form.value.paymentOptions.splice(idx, 1);
  }
};

onMounted(loadProfile);
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <StoreSidebar />

    <!-- Main -->
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">餐廳資訊</h1>
        <p class="text-sm text-gray-500 mt-1">編輯您的餐廳基本資料</p>
      </header>

      <div v-if="isLoading" class="flex justify-center py-16">
        <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <form v-else @submit.prevent="saveProfile" class="space-y-6 max-w-2xl">
        <!-- 基本資訊 -->
        <section class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">基本資訊</h2>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">
                店名 <span class="text-red-500">*</span>
              </label>
              <input v-model="form.storeName" class="w-full p-2 border rounded focus:outline-amber-400" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">地址</label>
              <input v-model="form.storeAddress" class="w-full p-2 border rounded focus:outline-amber-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">電話</label>
              <input v-model="form.storePhone" class="w-full p-2 border rounded focus:outline-amber-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">店家介紹</label>
              <textarea
                v-model="form.storeIntro"
                rows="3"
                class="w-full p-2 border rounded focus:outline-amber-400"
              ></textarea>
            </div>
          </div>
        </section>

        <!-- 聯絡人資訊 -->
        <section class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">聯絡人資訊</h2>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">聯絡人姓名</label>
              <input v-model="form.contactName" class="w-full p-2 border rounded focus:outline-amber-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">聯絡 Email</label>
              <input v-model="form.contactEmail" type="email" class="w-full p-2 border rounded focus:outline-amber-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">聯絡電話</label>
              <input v-model="form.contactPhone" class="w-full p-2 border rounded focus:outline-amber-400" />
            </div>
          </div>
        </section>

        <!-- 付款方式 -->
        <section class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">付款方式</h2>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="p in paymentChoices"
              :key="p.value"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="form.paymentOptions.includes(p.value)"
                @change="togglePayment(p.value)"
                class="w-4 h-4 accent-amber-400"
              />
              <span class="text-sm text-gray-700">{{ p.label }}</span>
            </label>
          </div>
        </section>

        <!-- 營業時間 -->
        <section class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">營業時間</h2>
          <div class="space-y-3">
            <div
              v-for="day in weekDays"
              :key="day"
              class="flex items-center gap-4"
            >
              <span class="w-8 text-sm font-medium text-gray-600 text-center">週{{ day }}</span>
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="businessHours[day].closed"
                  class="w-4 h-4 accent-gray-400"
                />
                <span class="text-sm text-gray-500">休息</span>
              </label>
              <template v-if="!businessHours[day].closed">
                <input
                  v-model="businessHours[day].open"
                  type="time"
                  class="p-1.5 border rounded text-sm focus:outline-amber-400"
                />
                <span class="text-gray-400">—</span>
                <input
                  v-model="businessHours[day].close"
                  type="time"
                  class="p-1.5 border rounded text-sm focus:outline-amber-400"
                />
              </template>
              <span v-else class="text-sm text-gray-400">公休</span>
            </div>
          </div>
        </section>

        <!-- 儲存按鈕 -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="isSaving"
            class="px-6 py-2 text-white bg-amber-400 rounded hover:bg-amber-500 disabled:bg-amber-200 transition font-medium"
          >
            {{ isSaving ? "儲存中..." : "儲存變更" }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>
