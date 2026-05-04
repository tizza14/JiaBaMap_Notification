<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import * as jose from "jose";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import StoreSidebar from "@/components/StoreSidebar.vue";

// 從 JWT 取得 storeId
const token = sessionStorage.getItem("storeToken");
const storeId = token ? jose.decodeJwt(token).id : null;

const menus = ref([]);
const showModal = ref(false);
const isEditing = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const imagePreview = ref(null);
const menuForm = ref({ name: "", description: "", price: "", category: "", image: null });
const editingId = ref(null);

const searchQuery = ref("");
const selectedCategory = ref("");
const minPrice = ref("");
const maxPrice = ref("");
const currentPage = ref(1);
const totalPages = ref(1);

const authHeaders = computed(() => ({
  Authorization: `Bearer ${token}`,
}));

const openAddModal = () => {
  isEditing.value = false;
  menuForm.value = { name: "", description: "", price: "", category: "", image: null };
  imagePreview.value = null;
  showModal.value = true;
};

const openEditModal = (menu) => {
  isEditing.value = true;
  editingId.value = menu._id;
  menuForm.value = { ...menu, image: null };
  imagePreview.value = menu.imageUrl || null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  isEditing.value = false;
  menuForm.value = { name: "", description: "", price: "", category: "", image: null };
  imagePreview.value = null;
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  menuForm.value.image = file;
  imagePreview.value = URL.createObjectURL(file);
};

const validateForm = () => {
  if (!menuForm.value.name.trim()) {
    Swal.fire({ title: "名稱不能為空！", icon: "warning", confirmButtonText: "確定" });
    return false;
  }
  if (!menuForm.value.category) {
    Swal.fire({ title: "請選擇分類！", icon: "warning", confirmButtonText: "確定" });
    return false;
  }
  if (!menuForm.value.price || menuForm.value.price <= 0) {
    Swal.fire({ title: "價格必須大於 0！", icon: "warning", confirmButtonText: "確定" });
    return false;
  }
  return true;
};

const fetchMenus = async (page = 1) => {
  if (!storeId) return;
  isLoading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_BASE_URL}/menu`, {
      params: {
        page,
        limit: 10,
        storeId,
        name: searchQuery.value || undefined,
        category: selectedCategory.value || undefined,
        minPrice: minPrice.value || undefined,
        maxPrice: maxPrice.value || undefined,
      },
    });
    menus.value = Array.isArray(response.data.menus) ? response.data.menus : [];
    totalPages.value = response.data.totalPages || 1;
    currentPage.value = response.data.currentPage || 1;
  } catch (error) {
    Swal.fire({ title: "無法取得菜單資料！", icon: "error", confirmButtonText: "確定" });
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  searchQuery.value = "";
  selectedCategory.value = "";
  minPrice.value = "";
  maxPrice.value = "";
  fetchMenus(1);
};

const buildFormData = () => {
  const formData = new FormData();
  formData.append("name", menuForm.value.name);
  formData.append("description", menuForm.value.description || "");
  formData.append("price", menuForm.value.price);
  formData.append("category", menuForm.value.category);
  if (menuForm.value.image) {
    formData.append("image", menuForm.value.image);
  }
  return formData;
};

const addMenu = async () => {
  if (!validateForm()) return;
  isSaving.value = true;
  try {
    const formData = buildFormData();
    formData.append("storeId", storeId);
    const response = await axios.post(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/menu`,
      formData,
      { headers: { ...authHeaders.value, "Content-Type": "multipart/form-data" } }
    );
    if (response.status === 200) {
      await fetchMenus(currentPage.value);
      closeModal();
      Swal.fire({ title: "新增成功！", icon: "success", confirmButtonText: "好的" });
    }
  } catch (error) {
    Swal.fire({ title: "新增失敗！", icon: "error", confirmButtonText: "確定" });
  } finally {
    isSaving.value = false;
  }
};

const updateMenu = async () => {
  if (!validateForm()) return;
  isSaving.value = true;
  try {
    const response = await axios.put(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/menu/${editingId.value}`,
      buildFormData(),
      { headers: { ...authHeaders.value, "Content-Type": "multipart/form-data" } }
    );
    if (response.status === 200) {
      await fetchMenus(currentPage.value);
      closeModal();
      Swal.fire({ title: "更新成功！", icon: "success", confirmButtonText: "好的" });
    }
  } catch (error) {
    Swal.fire({ title: "更新失敗！", icon: "error", confirmButtonText: "確定" });
  } finally {
    isSaving.value = false;
  }
};

const toggleAvailability = async (menu) => {
  try {
    const response = await axios.patch(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/menu/${menu._id}/availability`,
      {},
      { headers: authHeaders.value }
    );
    menu.isAvailable = response.data.isAvailable;
  } catch {
    Swal.fire({ title: "切換狀態失敗！", icon: "error", confirmButtonText: "確定" });
  }
};

const deleteMenu = async (id) => {
  const result = await Swal.fire({
    title: "確定要刪除嗎？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!result.isConfirmed) return;

  try {
    await axios.delete(`${import.meta.env.VITE_BACKEND_BASE_URL}/menu/${id}`, {
      headers: authHeaders.value,
    });
    menus.value = menus.value.filter((m) => m._id !== id);
    Swal.fire({ title: "刪除成功！", icon: "success", confirmButtonText: "好的" });
  } catch {
    Swal.fire({ title: "刪除失敗！", icon: "error", confirmButtonText: "確定" });
  }
};

const navigation = ref([
  { name: "首頁", link: "/dashboard" },
  { name: "餐廳資訊", link: "/store-profile" },
  { name: "菜單管理", link: "/menu-management" },
  { name: "訂單管理", link: "/order-management" },
]);

const currency = (value) => {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0
  }).format(value);
};

const logout = () => {
  sessionStorage.removeItem("storeToken");
  window.location.href = "/storesignin";
};

onMounted(fetchMenus);
</script>

<template>
  <div class="flex h-screen bg-gray-100 overflow-hidden">
    <StoreSidebar />

    <!-- 主內容區 -->
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="mb-6 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-800">菜單管理</h1>
        <div class="text-sm text-gray-500">店家 ID: {{ storeId?.substring(0, 8) }}...</div>
      </header>

      <!-- 原有的操作按鈕與搜尋 -->
      <div class="bg-white p-4 rounded shadow-sm mb-6">
        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="openAddModal"
            class="px-4 py-2 text-white transition rounded bg-amber-500 hover:bg-amber-600 flex items-center"
          >
            <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
            新增菜單
          </button>
          
          <div class="h-6 w-px bg-gray-300 mx-2"></div>

          <input
            v-model="searchQuery"
            @keyup.enter="fetchMenus(1)"
            placeholder="搜尋名稱..."
            class="p-2 border rounded w-52 focus:ring-2 focus:ring-amber-400 outline-none"
          />
          <select v-model="selectedCategory" class="p-2 border rounded focus:ring-2 focus:ring-amber-400 outline-none">
            <option value="">所有分類</option>
            <option value="飲料">飲料</option>
            <option value="主食">主食</option>
            <option value="甜點">甜點</option>
            <option value="湯品">湯品</option>
          </select>
          <button
            @click="fetchMenus(1)"
            class="px-4 py-2 text-white transition rounded bg-gray-700 hover:bg-gray-800"
          >
            搜尋
          </button>
        </div>
      </div>

      <!-- 菜單列表表格區 -->
      <div class="bg-white rounded shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">圖片</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">價格</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="isLoading">
              <td colspan="6" class="px-6 py-10 text-center text-gray-400">載入中...</td>
            </tr>
            <tr v-else-if="menus.length === 0">
              <td colspan="6" class="px-6 py-10 text-center text-gray-400">目前沒有菜單資料</td>
            </tr>
            <tr v-for="menu in menus" :key="menu._id" class="hover:bg-gray-50 transition">
              <td class="px-6 py-4 whitespace-nowrap">
                <img v-if="menu.imageUrl" :src="menu.imageUrl" class="w-12 h-12 rounded-lg object-cover border" />
                <div v-else class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">無圖</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">{{ menu.name }}</div>
                <div class="text-xs text-gray-500 truncate w-40">{{ menu.description }}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 font-semibold">{{ currency(menu.price) }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ menu.category }}</td>
              <td class="px-6 py-4">
                <button
                  @click="toggleAvailability(menu)"
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium transition',
                    menu.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                  ]"
                >
                  ● {{ menu.isAvailable ? "上架中" : "已下架" }}
                </button>
              </td>
              <td class="px-6 py-4 text-sm font-medium">
                <button @click="openEditModal(menu)" class="text-amber-600 hover:text-amber-900 mr-3">編輯</button>
                <button @click="deleteMenu(menu._id)" class="text-red-600 hover:text-red-900">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁 -->
      <div v-if="totalPages > 1" class="mt-6 flex justify-center">
        <nav class="flex gap-1">
          <button 
            @click="fetchMenus(currentPage - 1)" 
            :disabled="currentPage === 1"
            class="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <font-awesome-icon :icon="['fas', 'chevron-left']" />
          </button>
          <button 
            v-for="page in totalPages" :key="page"
            @click="fetchMenus(page)"
            :class="['px-4 py-2 border rounded transition', page === currentPage ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-gray-50']"
          >
            {{ page }}
          </button>
          <button 
            @click="fetchMenus(currentPage + 1)" 
            :disabled="currentPage === totalPages"
            class="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <font-awesome-icon :icon="['fas', 'chevron-right']" />
          </button>
        </nav>
      </div>
    </main>
    
    <!-- 新增/編輯 Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4">{{ isEditing ? "編輯項目" : "新增項目" }}</h2>
          <form @submit.prevent="isEditing ? updateMenu() : addMenu()">
            <!-- 圖片上傳 -->
            <div class="mb-4">
              <label class="block mb-1 text-sm font-medium text-gray-700">商品圖片</label>
              <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-amber-400 transition cursor-pointer relative">
                <div v-if="!imagePreview" class="space-y-1 text-center">
                  <font-awesome-icon :icon="['fas', 'image']" class="mx-auto h-12 w-12 text-gray-400" />
                  <div class="flex text-sm text-gray-600">
                    <span class="text-amber-600 font-medium">點擊上傳</span>
                  </div>
                  <p class="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <img v-else :src="imagePreview" class="absolute inset-0 w-full h-full object-cover rounded-md" />
                <input type="file" accept="image/*" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">名稱 <span class="text-red-500">*</span></label>
                <input v-model="menuForm.name" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 outline-none focus:ring-2 focus:ring-amber-500" required />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">價格 <span class="text-red-500">*</span></label>
                <div class="mt-1 relative rounded-md shadow-sm">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input v-model.number="menuForm.price" type="number" class="block w-full border border-gray-300 rounded-md pl-7 p-2 outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">分類 <span class="text-red-500">*</span></label>
                <select v-model="menuForm.category" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 outline-none focus:ring-2 focus:ring-amber-500" required>
                  <option value="飲料">飲料</option>
                  <option value="主食">主食</option>
                  <option value="甜點">甜點</option>
                  <option value="湯品">湯品</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">描述</label>
                <textarea v-model="menuForm.description" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 outline-none focus:ring-2 focus:ring-amber-500"></textarea>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition">
                取消
              </button>
              <button type="submit" :disabled="isSaving" class="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600 transition disabled:opacity-50">
                {{ isSaving ? "儲存中..." : (isEditing ? "確認更新" : "立即新增") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
