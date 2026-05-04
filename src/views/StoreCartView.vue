<script setup>
import { ref, onMounted, computed } from "vue";
import { useAuth } from "@/stores/authStore";
import Swal from "sweetalert2";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const user = useAuth();
const userData = computed(() => user.userData);

const placeId = route.params.placeId;
const BACKEND_URL = import.meta.env.VITE_BACKEND_BASE_URL;

// 動態店家資訊
const storeId = ref(null);
const storeInfo = ref({
  name: "",
  address: "",
  phone: "",
  description: "",
  businessHours: "",
});
const isStoreLoading = ref(true);
const isOrderable = ref(false);

const categoryRefs = ref([]);
const selectedCategory = ref(0);
const cartItems = ref([]);
const menus = ref([]);

// 獲取店家資訊
const fetchStoreInfo = async () => {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/store/get/${placeId}`);
    storeId.value = data._id;
    isOrderable.value = true;
    storeInfo.value = {
      name: data.storeName || "",
      address: data.storeAddress || "",
      phone: data.storePhone || "",
      description: data.storeIntro || "",
      businessHours: data.businessHours || "",
    };
  } catch (error) {
    // 202 = 未註冊（getStoreByPlace 找不到時回傳）
    isOrderable.value = false;
  } finally {
    isStoreLoading.value = false;
  }
};

// 將菜單按分類整理的計算屬性
const categorizedMenu = computed(() => {
  const validCategories = ["飲料", "主食", "甜點", "湯品"];
  return validCategories
    .map((category) => ({
      name: category,
      items: menus.value.filter(
        (item) => item.category === category && item.isAvailable !== false,
      ),
    }))
    .filter((category) => category.items.length > 0);
});

// 獲取菜單數據
const fetchMenus = async () => {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/menu`, {
      params: { storeId: storeId.value, limit: 50 },
    });
    menus.value = Array.isArray(data.menus) ? data.menus : [];
  } catch (error) {
    console.error("獲取菜單失敗：", error);
    Swal.fire({ title: "錯誤", text: "無法獲取菜單數據", icon: "error" });
  }
};

const scrollToCategory = (index) => {
  selectedCategory.value = index;
  categoryRefs.value[index]?.scrollIntoView({ behavior: "smooth" });
};

onMounted(async () => {
  await fetchStoreInfo();
  if (!isOrderable.value) return;

  await fetchMenus();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = categoryRefs.value.findIndex((ref) => ref === entry.target);
          if (index !== -1) selectedCategory.value = index;
        }
      });
    },
    { threshold: 0.5 },
  );

  setTimeout(() => {
    categoryRefs.value.forEach((ref) => { if (ref) observer.observe(ref); });
  }, 100);
});

const openItemModal = async (item) => {
  if (!item.isAvailable) {
    Swal.fire({ title: "商品未上架", text: "此商品目前無法購買", icon: "info" });
    return;
  }

  let quantity = 1;

  const { value: note } = await Swal.fire({
    title: item.name,
    html: `
      <div class='flex flex-col items-center'>
        <div class='mb-4'>
          <img src='${item.imageUrl}' alt='商品圖片' class='object-cover w-24 h-24'>
        </div>
        <div class='text-gray-600'>
          單價: <span class='text-red-500'>\$${item.price}</span>
        </div>
        <div class='mt-2 text-sm text-gray-600'>${item.description || ""}</div>
        <input type='text' id='note-input' placeholder='備註'
          class='w-full p-2 mt-4 border border-gray-300 rounded-md' />
        <div class='flex items-center mt-4'>
          <button id='decrement-btn' class='px-2 py-1 bg-gray-300 rounded-md'>-</button>
          <div class='mx-4'><span id='quantity'>1</span></div>
          <button id='increment-btn' class='px-2 py-1 bg-gray-300 rounded-md'>+</button>
        </div>
        <div class='mt-2 text-gray-600'>總價: <span id='total-price' class='text-red-500'>\$${item.price}</span></div>
      </div>
    `,
    confirmButtonText: "加入購物車",
    showCancelButton: true,
    cancelButtonText: "取消",
    customClass: {
      confirmButton: "bg-amber-500 text-white",
      cancelButton: "bg-gray-300 text-gray-800",
    },
    didOpen: () => {
      const quantityEl = document.querySelector("#quantity");
      const totalPriceEl = document.querySelector("#total-price");
      document.querySelector("#decrement-btn").addEventListener("click", () => {
        if (quantity > 1) {
          quantity -= 1;
          quantityEl.textContent = quantity;
          totalPriceEl.textContent = item.price * quantity;
        }
      });
      document.querySelector("#increment-btn").addEventListener("click", () => {
        quantity += 1;
        quantityEl.textContent = quantity;
        totalPriceEl.textContent = item.price * quantity;
      });
    },
    preConfirm: () => {
      const noteInput = document.getElementById("note-input");
      return noteInput ? noteInput.value : "";
    },
  });

  if (note !== undefined) {
    cartItems.value.push({
      id: Date.now(),
      item,
      quantity,
      itemPrice: item.price * quantity,
      note,
    });

    const token = localStorage.getItem("userToken");
    await axios.post(`${BACKEND_URL}/order/`, {
      storeId: storeId.value,
      storeName: storeInfo.value.name,
      pickupTime: Date.now(),
      items: [{ productId: item._id, productName: item.name, price: item.price, quantity }],
    }, { headers: { Authorization: `Bearer ${token}` } });

    await Swal.fire({ title: "成功", text: "已加入購物車", icon: "success", timer: 1500 });
  }
};

const goToCart = () => router.push({ name: "Cart" });
</script>

<template>
  <div class="container mx-auto mt-8 sm:mt-16">

    <!-- 載入中 -->
    <div v-if="isStoreLoading" class="flex justify-center py-24">
      <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- 此餐廳未開通線上訂餐 -->
    <div v-else-if="!isOrderable" class="flex flex-col items-center py-24 text-center px-4">
      <font-awesome-icon :icon="['fas', 'ban']" class="text-5xl text-gray-300 mb-4" />
      <h2 class="text-xl font-bold text-gray-500 mb-2">此餐廳尚未開通線上訂餐功能</h2>
      <p class="text-sm text-gray-400 mb-6">目前僅支援已在 JiaBaMap 完成店家註冊的餐廳</p>
      <button @click="router.back()" class="px-4 py-2 bg-amber-400 text-white rounded hover:bg-amber-500">
        返回餐廳頁
      </button>
    </div>

    <!-- 正常內容 -->
    <template v-else>
      <!-- Header Section -->
      <header class="px-4 mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-600">{{ storeInfo.name }}</h1>
            <div class="text-sm text-gray-600">
              <span>{{ storeInfo.businessHours }}</span>
            </div>
            <div class="text-sm text-gray-600 mt-1">
              <font-awesome-icon :icon="['fas', 'location-dot']" class="text-orange-400" />
              {{ storeInfo.address }}
              <template v-if="storeInfo.phone">
                &nbsp;
                <font-awesome-icon :icon="['fas', 'phone']" class="text-orange-400" />
                {{ storeInfo.phone }}
              </template>
            </div>
            <div v-if="storeInfo.description" class="mt-1 text-sm text-gray-600">
              {{ storeInfo.description }}
            </div>
          </div>
          <button
            @click="goToCart"
            class="px-4 py-2 text-white rounded bg-amber-500 hover:bg-amber-400 flex-shrink-0 ml-4"
          >
            購物車 ({{ cartItems.length }})
          </button>
        </div>
      </header>

      <!-- Mobile Navigation -->
      <nav class="sticky top-0 z-10 overflow-x-auto bg-white rounded-md shadow md:hidden no-scrollbar">
        <div class="flex whitespace-nowrap">
          <button
            v-for="(category, index) in categorizedMenu"
            :key="index"
            :class="[
              'px-4 py-2 text-sm font-semibold',
              selectedCategory === index
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-gray-600',
            ]"
            @click="scrollToCategory(index)"
          >
            {{ category.name }}
          </button>
        </div>
      </nav>

      <!-- 無菜單 -->
      <div v-if="categorizedMenu.length === 0" class="py-16 text-center text-gray-400">
        此店家目前尚無上架菜單
      </div>

      <!-- Main Content -->
      <div v-else class="grid grid-cols-1 gap-8 px-4 mt-8 md:grid-cols-3">
        <div
          v-for="(category, index) in categorizedMenu"
          :key="index"
          :ref="(el) => (categoryRefs[index] = el)"
          class="scroll-mt-16"
        >
          <h2 class="mb-4 text-lg font-bold text-amber-500">{{ category.name }}</h2>
          <ul class="space-y-4">
            <li
              v-for="item in category.items"
              :key="item._id"
              class="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-amber-100"
              @click="openItemModal(item)"
            >
              <div class="flex items-center space-x-4">
                <img
                  :src="item.imageUrl"
                  alt="商品圖片"
                  class="object-cover w-16 h-16 rounded"
                />
                <div>
                  <span class="text-gray-800">{{ item.name }}</span>
                  <p class="text-sm text-gray-600">{{ item.description }}</p>
                </div>
              </div>
              <span class="text-gray-800">${{ item.price }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
