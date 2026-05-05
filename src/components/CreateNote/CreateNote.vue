<script setup>
import { ref, onMounted, onBeforeMount, onUnmounted, inject, nextTick } from "vue";
import CreateNoteNavbar from "@/components/CreateNote/CreateNoteNavbar.vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "@/stores/authStore";
import axios from "axios";
import swal from "sweetalert2";

const router = useRouter();
const route = useRoute();
const $swal = inject("$swal");
const auth = useAuth();

// 自動儲存狀態
const autoSaveStatus = ref(""); // "" | "saving" | "saved" | "error"
const currentDraftId = ref(null);
let autoSaveTimer = null;

// 定義響應式變數
const date = ref("");
const title = ref("");
const content = ref("");
const fileList = ref([]); // 儲存檔案清單
const editor = ref(null); // 綁定編輯器
const restaurantName = ref("");
const placeId = ref("");
const photo = ref("");

// 檢查內容是否為空
const hasContent = ref(false);

// 計算純文字內容的字數
const contentWordCount = ref(0);

// 添加錯誤提示的響應式變數
const errors = ref({
  date: false,
  restaurantName: "",
  title: "",
  content: false,
});

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({
      title: "",
      content: "",
      restaurantName: "",
      placeId: "",
      photo: "",
    }),
  },
});

// 清除所有數據的函數
const clearAllData = () => {
  // 只有從文章列表來的時候才清除所有數據
  if (route.query.from === "articleList") {
    date.value = "";
    title.value = "";
    content.value = "";
    fileList.value = [];
    restaurantName.value = "";
    if (editor.value) {
      editor.value.innerHTML = "";
    }
    localStorage.removeItem("formData");
    localStorage.removeItem("previewNoteData");
  }
};

// 在組件掛載前檢查路由
onBeforeMount(() => {
  // 如果是從文章列表來的，清除所有數據
  if (route.query.from === "articleList") {
    clearAllData();
  }
});

// 初始化表單資料
onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
});

onMounted(async () => {
  try {
    // 初始化預設值
    const defaultFormData = {
      date: new Date().toISOString().split("T")[0],
      title: "",
      content: "",
      restaurantName: "",
      fileList: [],
    };

    // 如果是編輯已發佈文章
    if (route.query.type === "published" && route.query.id) {
      try {
        // 從後端獲取文章數據
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/articles/${route.query.id}`,
        );
        const articleData = response.data;

        // 填充表單數據
        title.value = articleData.title;
        content.value = articleData.content;
        restaurantName.value = articleData.restaurantName;
        placeId.value = articleData.placeId;
        photo.value = articleData.photo;
        date.value = new Date(articleData.eatdateAt)
          .toISOString()
          .split("T")[0];

        // 等待 DOM 更新後設置編輯器內容
        await nextTick(() => {
          if (editor.value) {
            editor.value.innerHTML = articleData.content;
            updateContent();
          }
        });
      } catch (error) {
        // ... error handling ...
      }
    } else {
      // 如果是新建文章或編輯草稿
      // 檢查是否有預覽後返回的數據
      const previewData = localStorage.getItem("previewNoteData");
      // 檢查是否有一般的表單數據
      const storedData = localStorage.getItem("formData");

      // 從 MyArticle.vue 傳入的本地草稿 key（用完即清）
      const draftId = route.query.draftId;
      const localDraftRaw = draftId ? localStorage.getItem(`draft_${draftId}`) : null;
      if (localDraftRaw) {
        localStorage.removeItem(`draft_${draftId}`);
      }

      let formData;
      // 優先使用預覽數據
      if (previewData) {
        formData = JSON.parse(previewData);
      }
      // 其次使用本地草稿 key（MyArticle 傳入）
      else if (localDraftRaw) {
        formData = JSON.parse(localDraftRaw);
      }
      // 再使用一般表單數據
      else if (storedData) {
        formData = JSON.parse(storedData);
      }
      // 最後使用預設值
      else {
        formData = defaultFormData;
      }

      // 設置表單數據
      title.value = formData.title || "";
      content.value = formData.content || "";
      restaurantName.value = formData.restaurantName || "";
      date.value = formData.date || defaultFormData.date;
      if (formData.fileList) {
        fileList.value = formData.fileList;
      }

      // 等待 DOM 更新後設置編輯器內容
      await nextTick(() => {
        if (editor.value) {
          editor.value.innerHTML = formData.content || "";
          updateContent();
        }
      });

      // 如果是從預覽返回，將預覽數據保存到 formData
      if (previewData) {
        localStorage.setItem("formData", previewData);
        localStorage.removeItem("previewNoteData");
      }
    }
  } catch (error) {
    // 使用預設值
    date.value = new Date().toISOString().split("T")[0];
    title.value = "";
    content.value = "";
    restaurantName.value = "";
    fileList.value = [];
  }

  // 初始化 currentDraftId（讓 saveNote 能正確帶 draftId 進 localStorage）
  const draftIdFromRoute = route.query.draftId;
  if (draftIdFromRoute && draftIdFromRoute !== "local") {
    currentDraftId.value = draftIdFromRoute;
  }

  // 啟動自動儲存（每 30 秒），編輯已發布文章時不啟動
  if (route.query.type !== "published") {
    autoSaveTimer = setInterval(autoSaveDraft, 30000);
  }
});

// 更新內容時檢查圖片是否仍然存在
const updateContent = () => {
  if (editor.value) {
    content.value = editor.value.innerHTML;
    const imgTags = editor.value.querySelectorAll("img");
    const existingImages = Array.from(imgTags).map((img) => img.src);
    fileList.value = fileList.value.filter((file) =>
      existingImages.includes(file.data),
    );
    hasContent.value = editor.value.textContent.trim() !== "";

    // 計算純文字字數
    const pureText = editor.value.innerHTML.replace(/<[^>]+>/g, "").trim();
    contentWordCount.value = pureText.length;

    // 更新內容錯誤狀態
    errors.value.content = contentWordCount.value < 300;
  }
};

// 在 setup 中添加 swal 配置
const swalWithBootstrapButtons = $swal.mixin({
  customClass: {
    confirmButton:
      "bg-red-500 text-white px-6 py-2 rounded mx-2 hover:bg-red-600",
    cancelButton:
      "bg-gray-500 text-white px-6 py-2 rounded mx-2 hover:bg-gray-600",
    actions: "flex justify-center gap-4",
  },
  buttonsStyling: false,
});

// 預覽筆記
const goToPreview = () => {
  // 檢查編輯器是否存在
  if (!editor.value) {
    console.error("編輯器不存在");
    return;
  }

  // 先強制更新編輯器內容
  updateContent();

  // 直接從編輯器元素獲取內容
  const editorContent = editor.value.querySelector(".ProseMirror").innerHTML;

  // 檢查內容是否為空
  if (!editorContent.trim()) {
    swalWithBootstrapButtons.fire({
      title: "提醒",
      text: "請填寫內容後再預覽！",
      icon: "warning",
      confirmButtonText: "確定",
    });
    return;
  }

  // 儲存筆記資料到預覽專用的 localStorage key
  const previewData = {
    date: date.value,
    title: title.value,
    content: editorContent,
    fileList: fileList.value,
    restaurantName: restaurantName.value,
    placeId: placeId.value,
    photo: photo.value,
    isPublished: route.query.type === "published",
  };

  // 根據文章類型使用不同的 localStorage key
  const storageKey =
    route.query.type === "published"
      ? "publishedPreviewData"
      : "previewNoteData";

  localStorage.setItem(storageKey, JSON.stringify(previewData));

  // 導航到預覽頁面
  router.push({
    path: "/previewnote",
    query: {
      type: route.query.type === "published" ? "published" : "draft",
    },
  });
};

// 處理圖片插入
const onImageSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) {
    await swalWithBootstrapButtons.fire({
      title: "錯誤",
      text: "請選擇要上傳的圖片",
      icon: "error",
      confirmButtonText: "確定",
    });
    return;
  }

  // 檢查檔案類型
  if (!file.type.startsWith("image/")) {
    await swalWithBootstrapButtons.fire({
      title: "錯誤",
      text: "請選擇圖片檔案",
      icon: "error",
      confirmButtonText: "確定",
    });
    return;
  }

  try {
    // 顯示上傳中提示
    // const loadingToast = await swalWithBootstrapButtons.fire({
    //   title: '上傳中...',
    //   allowOutsideClick: false,
    //   showConfirmButton: false,
    //   didOpen: () => {
    //     swalWithBootstrapButtons.showLoading();
    //   }
    // });

    const reader = new FileReader();
    reader.onload = (e) => {
      editor.value.focus();

      const imageHtml = `
        <div class="my-4">
          <img src="${e.target.result}" alt="插入圖片" 
            class="block max-w-full mx-auto rounded" 
            style="max-width: auto; height: 300px;">
        </div>
      `;
      insertHtmlAtCursor(imageHtml);

      fileList.value.push({
        name: file.name,
        data: e.target.result,
      });

      updateContent();

      // 關閉上傳提示
      // loadingToast.close();

      // 顯示成功提示
      swalWithBootstrapButtons.fire({
        title: "上傳成功",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
    };

    reader.onerror = async () => {
      await swalWithBootstrapButtons.fire({
        title: "錯誤",
        text: "讀取圖片失敗，請稍後再試",
        icon: "error",
        confirmButtonText: "確定",
      });
    };

    reader.readAsDataURL(file);
  } catch (error) {
    await swalWithBootstrapButtons.fire({
      title: "錯誤",
      text: "上傳圖片失敗，請稍後再試",
      icon: "error",
      confirmButtonText: "確定",
    });
  }
};

// 強制插入 HTML 到游標位置
const insertHtmlAtCursor = (html) => {
  const selection = window.getSelection(); // 選取範圍
  const editorElement = editor.value;

  // 若未選取範圍或未聚焦，將游標移動到內容末尾
  if (!selection || selection.rangeCount === 0) {
    editorElement.focus(); // 聚焦內容框
    const range = document.createRange();
    range.selectNodeContents(editorElement); // 設置選取內容
    range.collapse(false); // 游標設置到最後
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // 插入 HTML
  const range = selection.getRangeAt(0);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const fragment = document.createDocumentFragment();
  let node;
  while ((node = tempDiv.firstChild)) {
    fragment.appendChild(node);
  }
  range.insertNode(fragment);
  range.collapse(false); // 保持游標在插入圖片後

  // 更新內容
  updateContent();
};

// 檢查內容並返回是否有效
const checkContent = () => {
  // 重置所有錯誤
  errors.value = {
    date: !date.value,
    restaurantName: !restaurantName.value,
    title: !title.value,
    content:
      !content.value ||
      content.value.replace(/<[^>]+>/g, "").trim().length < 300,
  };

  // 更新編輯器的錯誤狀態
  if (editor.value) {
    if (errors.value.content) {
      editor.value.classList.add("border-red-500");
    } else {
      editor.value.classList.remove("border-red-500");
    }
  }

  // 檢查是否所有欄位都有效
  const isValid = !Object.values(errors.value).some((error) => error);

  return isValid; // 返回驗證結果
};

// 儲存筆記
const saveNote = async () => {
  const formData = {
    date: date.value,
    restaurantName: restaurantName.value,
    title: title.value,
    content: content.value,
    fileList: fileList.value,
    draftId: currentDraftId.value || undefined,
  };

  localStorage.setItem("formData", JSON.stringify(formData));
  return true;
};

// 簡化錯誤處理方法
const handleValidationErrors = (validationErrors) => {
  // 直接設置新的錯誤訊息
  errors.value = {
    ...errors.value,
    restaurantName: validationErrors.restaurantName || "",
    title: validationErrors.title || "",
  };
};

// 儲存文章
const saveArticle = async () => {
  try {
    // 檢查是否為已發佈文章的編輯
    if (route.query.type === "published" && route.query.id) {
      // 準備更新的數據
      const updateData = {
        title: title.value,
        content: content.value,
        restaurantName: restaurantName.value,
        placeId: placeId.value,
        photo: photo.value,
        eatdate: date.value,
      };

      // 發送 PATCH 請求更新文章
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/articles/${route.query.id}`,
        updateData,
      );

      // 顯示成功訊息
      await swal.fire({
        title: "成功",
        text: "文章已更新",
        icon: "success",
        confirmButtonText: "確定",
      });

      // 導航回文章列表
      router.push("/myarticle?status=published");
    } else {
      // 原有的草稿儲存邏輯保持不變
      const formData = {
        title: title.value,
        content: content.value,
        restaurantName: restaurantName.value,
        placeId: placeId.value,
        photo: photo.value,
        date: date.value,
      };
      localStorage.setItem("formData", JSON.stringify(formData));
    }
  } catch (error) {
    await swal.fire({
      title: "錯誤",
      text: error.response?.data?.message || "儲存文章失敗，請稍後再試",
      icon: "error",
      confirmButtonText: "確定",
    });
  }
};

// 添加獲取當前內容的方法
const getCurrentContent = () => {
  if (editor.value) return editor.value.innerHTML;
  return "";
};

// 自動儲存草稿到伺服器
const autoSaveDraft = async () => {
  // 編輯中的已發布文章不自動儲存為草稿
  if (route.query.type === "published") return;
  // 未登入只存 localStorage
  if (!auth.userData?._id) {
    saveNote();
    return;
  }

  autoSaveStatus.value = "saving";
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/articles/draft`,
      {
        userId: auth.userData._id,
        user: auth.userData.name,
        userPhoto: auth.userData.profilePicture || "",
        draftId: currentDraftId.value,
        title: title.value,
        content: content.value,
        restaurantName: restaurantName.value,
        placeId: placeId.value,
        eatdate: date.value,
      }
    );
    currentDraftId.value = data.draftId;
    autoSaveStatus.value = "saved";
    // 同步更新 localStorage
    saveNote();
    setTimeout(() => { autoSaveStatus.value = ""; }, 2000);
  } catch {
    autoSaveStatus.value = "error";
    setTimeout(() => { autoSaveStatus.value = ""; }, 3000);
  }
};
</script>

<template>
  <div class="w-full min-h-screen bg-white">
    <CreateNoteNavbar
      @save="saveNote"
      @preview="goToPreview"
      @validationErrors="handleValidationErrors"
      :checkContent="checkContent"
      :currentTitle="title"
      :currentRestaurantName="restaurantName"
      :getCurrentContent="getCurrentContent"
    />
    <!-- 自動儲存狀態提示 -->
    <transition name="fade">
      <div
        v-if="autoSaveStatus"
        class="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow text-sm z-50"
        :class="{
          'bg-gray-700 text-white': autoSaveStatus === 'saving',
          'bg-green-500 text-white': autoSaveStatus === 'saved',
          'bg-red-500 text-white': autoSaveStatus === 'error',
        }"
      >
        <span v-if="autoSaveStatus === 'saving'">自動儲存中...</span>
        <span v-else-if="autoSaveStatus === 'saved'">草稿已自動儲存</span>
        <span v-else-if="autoSaveStatus === 'error'">自動儲存失敗</span>
      </div>
    </transition>
    <div
      class="max-w-4xl p-4 mx-auto mt-6 bg-white rounded-lg shadow-lg m-11 md:p-4"
    >
      <div class="flex items-center mb-4">
        <label for="date" class="block mr-2 text-sm font-medium text-gray-700"
          >用餐日期：</label
        >
        <div class="relative flex-grow">
          <input
            type="date"
            id="date"
            v-model="date"
            :class="{ 'border-red-500': errors.date }"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            @input="errors.date = false"
          />
          <span
            v-if="errors.date"
            class="absolute left-0 text-sm text-red-500 top-full"
          >
            請選擇用餐日期
          </span>
        </div>
      </div>
      <div class="mb-4">
        <label
          for="restaurant"
          class="block mb-1 text-sm font-medium text-gray-700"
          >餐廳名稱</label
        >
        <div class="relative">
          <input
            id="restaurant"
            type="text"
            v-model="restaurantName"
            placeholder="輸入餐廳名稱"
            :class="{ 'border-red-500': errors.restaurantName }"
            class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span
            v-if="errors.restaurantName"
            class="absolute left-0 text-sm text-red-500 top-full"
          >
            {{ errors.restaurantName }}
          </span>
        </div>
      </div>
      <div class="mb-4">
        <label for="title" class="block mb-1 text-sm font-medium text-gray-700"
          >文章標題</label
        >
        <div class="relative">
          <input
            id="title"
            type="text"
            v-model="title"
            placeholder="輸入文章標題"
            :class="{ 'border-red-500': errors.title }"
            class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span
            v-if="errors.title"
            class="absolute left-0 text-sm text-red-500 top-full"
          >
            {{ errors.title }}
          </span>
        </div>
      </div>
      <div class="mb-4">
        <label class="block mb-1 text-sm font-medium text-gray-700"
          >文章內容</label
        >
        <div class="relative">
          <div
            contenteditable="true"
            ref="editor"
            :class="{ 'border-red-500': errors.content }"
            class="w-full px-3 py-2 overflow-y-auto text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 h-100"
            @input="updateContent"
          ></div>
          <span
            v-if="errors.content"
            class="absolute left-0 text-sm text-red-500 top-full"
          >
            文章內容至少需要300字（目前 {{ contentWordCount }} 字）
          </span>
          <!-- 字數計數器 -->
          <div
            class="mt-2 text-sm"
            :class="{
              'text-red-500': contentWordCount < 300,
              'text-green-500': contentWordCount >= 300,
            }"
          >
            目前字數：{{ contentWordCount }} / 300
            <span v-if="contentWordCount < 300"
              >（還需要 {{ 300 - contentWordCount }} 字）</span
            >
            <span v-else>（已達到最低字數要求）</span>
          </div>
        </div>
      </div>
      <div class="mb-4">
        <label class="block mb-1 text-sm font-medium text-gray-700"
          >插入圖片</label
        >
        <input
          type="file"
          @change="onImageSelect"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:bg-amber-400 file:text-white hover:file:bg-amber-500 file:transition file:cursor-pointer"
        />
        <!-- 顯示已插入的檔案名稱 -->
        <ul class="mt-2">
          <li
            v-for="file in fileList"
            :key="file.name"
            class="text-sm text-gray-600"
          >
            已插入檔案：{{ file.name }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
img {
  display: block;
  margin: auto;
  max-width: 100%;
  border-radius: 0.375rem;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

input[type="file"]::-webkit-file-upload-button {
  border: none;
}

/* 添加錯誤提示的間距 */
.mb-4 {
  margin-bottom: 2rem;
}
/* 全局選擇器，避免作用範圍問題 */
div.overflow-x-auto.hide-scrollbar {
  padding-top: 0 !important;
}
</style>
