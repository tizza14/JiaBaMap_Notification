<script setup>
import { useAuth } from "@/stores/authStore";
import { useRouter, useRoute } from "vue-router";
import { ref, watchEffect, inject, computed } from "vue";
import { storeToRefs } from "pinia";
import axios from "axios";

const auth = useAuth();
const router = useRouter();
const route = useRoute();
const $swal = inject("$swal");
const { userData } = storeToRefs(auth);

// 修改 emit 宣告，加入 validationErrors
const emit = defineEmits([
  "save",
  "preview",
  "checkContent",
  "validationErrors",
]);

const currentProfilePicture = ref("/image/default_user.png");

// 動態監聽
watchEffect(() => {
  currentProfilePicture.value =
    userData.value?.profilePicture || "/image/default_user.png";
});

// 處理圖片錯誤
const handleImageError = (event) => {
  event.target.src = "/image/default_user.png";
};

// 定義 props
const props = defineProps({
  checkContent: {
    type: Function,
    required: true,
  },
  currentTitle: {
    type: String,
    required: true,
  },
  currentRestaurantName: {
    type: String,
    required: true,
  },
  getCurrentContent: {
    type: Function,
    required: true,
  },
});

// 配置 SweetAlert 樣式
const swalWithBootstrapButtons = $swal.mixin({
  customClass: {
    confirmButton:
      "bg-red-500 text-white px-6 py-2 rounded mx-2 hover:bg-red-600",
    cancelButton:
      "bg-gray-500 text-white px-6 py-2 rounded mx-2 hover:bg-gray-600",
    actions: "flex justify-center gap-4",
  },
  buttonsStyling: false,
  allowOutsideClick: false,
  allowEscapeKey: false,
  allowEnterKey: true,
});

// 修改驗證函數
const validateContent = () => {
  // 直接從 DOM 獲取當前輸入值
  const title = document.getElementById("title").value;
  const restaurantName = document.getElementById("restaurant").value;

  // 發出驗證錯誤事件
  const validationErrors = {};

  // 檢查餐廳名稱
  if (!restaurantName.trim()) {
    validationErrors.restaurantName = "請填寫餐廳名稱";
  } else if (restaurantName.length > 20) {
    validationErrors.restaurantName = "餐廳名稱不能超過20個字";
  }

  // 檢查文章標題
  if (!title.trim()) {
    validationErrors.title = "請填寫文章標題";
  } else if (title.length > 20) {
    validationErrors.title = "文章標題不能超過20個字";
  }

  // 發送驗證結果
  emit("validationErrors", validationErrors);

  // 返回驗證結果
  return Object.keys(validationErrors).length === 0 && props.checkContent();
};

// 修改發送功能
const submitArticle = async () => {
  if (!validateContent()) {
    return;
  }

  try {
    // 先觸發存檔
    await emit("save");

    // 從 localStorage 獲取資料
    const formData = JSON.parse(localStorage.getItem("formData"));
    if (!formData) {
      throw new Error("無法獲取表單資料");
    }

    // 準備文章資料
    const articleData = {
      userId: userData.value._id,
      user: userData.value.name,
      userPhoto: userData.value.profilePicture,
      restaurantName: formData.restaurantName,
      title: formData.title,
      content: formData.content,
      photo: formData.fileList?.[0]?.data || "default-image.jpg",
      eatdate: formData.date,
    };
    const subData = new FormData();
    subData.append("userId", auth.userData._id);
    subData.append("user", auth.userData.name);
    subData.append("restaurantName", formData.restaurantName);
    subData.append("title", formData.title);
    subData.append("content", formData.content);
    subData.append("eatdate", formData.date);
    subData.append("userPhoto", auth.userData.profilePicture || "");

    const base64Data = formData.fileList?.[0]?.data;
    // 如果 Base64 資料存在，將其轉為 File
    if (base64Data) {
      // 提取 Base64 的資料部分
      const [meta, base64Content] = base64Data.split(",");

      // 獲取 MIME 類型（例如 "image/jpeg"）
      const mimeType = meta.match(/:(.*?);/)[1];

      // 將 Base64 解碼為二進位數據
      const binaryData = atob(base64Content);

      // 將二進位數據轉換為 Uint8Array
      const byteNumbers = new Array(binaryData.length)
        .fill(0)
        .map((_, i) => binaryData.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);

      // 建立 File 物件
      const uniqueName = `photo_${Date.now()}.jpg`;
      const file = new File([byteArray], uniqueName, { type: mimeType });
      subData.append("photo", file);
    }

    // 發送 API 請求
    const response = await axios.post(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/articles`,
      subData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${auth.token}`,
        },
      },
    );

    if (response.status === 200) {
      // 清除 localStorage
      localStorage.removeItem("formData");
      localStorage.removeItem("noteData");
      localStorage.removeItem("storeData");
      localStorage.removeItem("editingDraft");
      localStorage.removeItem("previewNoteData");
    }

    await swalWithBootstrapButtons.fire({
      title: "成功！",
      text: "食記發表成功",
      icon: "success",
      confirmButtonText: "確定",
      allowOutsideClick: false,
      didClose: () => {
        router.push("/articlelist");
      },
    });
  } catch (error) {
    // 確保錯誤提示會顯示
    await swalWithBootstrapButtons.fire({
      title: "錯誤！",
      text: error.response?.data?.message || "發表失敗，請稍後再試",
      icon: "error",
      confirmButtonText: "確定",
      allowOutsideClick: false,
    });
  }
};

// 判斷是否是編輯已發布的文章
const isEditingPublished = computed(() => {
  return route.query.type === "published";
});

// 存檔功能
const saveDraft = async () => {
  // 只在非已發布文章編輯時執行存檔
  if (!isEditingPublished.value) {
    await emit("save");

    // 顯示成功訊息
    await swalWithBootstrapButtons.fire({
      title: "成功！",
      text: "草稿已儲存",
      icon: "success",
      confirmButtonText: "確定",
      allowOutsideClick: false,
    });

    router.push({
      path: "/myarticle",
      query: { status: "draft" },
      replace: true,
    });
  }
};
</script>

<template>
  <!-- 導覽列 -->
  <header
    class="fixed top-0 left-0 z-50 flex flex-wrap items-center w-full gap-4 px-4 py-2 bg-white border-b border-orange-200 shadow-md md:flex-nowrap md:gap-0"
  >
    <!-- 左側內容 -->
    <div class="flex items-center space-x-4">
      <router-link to="/">
        <img
          src="@/assets/logo.jpg"
          alt="Logo"
          class="w-auto min-w-[60px] max-w-[100px] md:max-w-[130px] h-auto"
        />
      </router-link>
      <router-link
        to="/myarticle"
        class="p-2 rounded-md hover:bg-amber-100 whitespace-nowrap text-amber-500"
      >
        回到文章列表
      </router-link>
      <router-link
        to="/user"
        class="p-2 rounded-md hover:bg-amber-100 whitespace-nowrap text-amber-500"
      >
        個人頁面
      </router-link>
    </div>

    <!-- 右側內容 -->
    <div class="flex items-center ml-auto space-x-4">
      <!-- 存檔按鈕 - 只在非已發布文章編輯時顯示 -->
      <button
        v-if="!isEditingPublished"
        class="px-4 py-2 text-sm transition border-2 rounded border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-white md:text-base whitespace-nowrap"
        @click="saveDraft"
      >
        存檔
      </button>

      <!-- 發送按鈕 -->
      <button
        class="px-4 py-2 text-sm text-white transition rounded bg-amber-400 hover:bg-amber-500 md:text-base whitespace-nowrap"
        @click="submitArticle"
      >
        {{ isEditingPublished ? "更新" : "發送" }}
      </button>
      <!-- 會員頭貼 -->
      <div class="relative inline-block text-left group">
        <div class="w-10 h-10 rounded-full cursor-pointer bg-slate-400">
          <img
            :src="currentProfilePicture"
            alt="avatar"
            class="object-cover w-full h-full rounded-full"
            @error="handleImageError"
          />
        </div>
      </div>
    </div>
  </header>

  <!-- 內容區域 -->
  <div class="p-2 mt-16 md:mt-20">
    <slot></slot>
  </div>
</template>

<style scoped></style>
