<script setup>
import { ref, computed, onUnmounted } from "vue";
import { useAuth } from "@/stores/authStore";
import { storeToRefs } from "pinia";
import axios from 'axios';
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'


const user = useAuth();
const { userData, logout } = storeToRefs(user);

const selectedFile = ref(null);
const menuVisible = ref(false);
const isEditing = ref(false);

const igLink = ref(userData.value?.igLink || "");
const editedUsername = ref(userData.value?.name || "使用者");
const editedProfilePicture = ref(
  userData.value?.profilePicture || "/image/default_user.png",
);

console.log(userData.value);

// 計算屬性 - 生成 IG 連結
const instagramLink = computed(() => 
  igLink.value ? `https://instagram.com/${igLink.value}` : ""
);

// 切換編輯模式
const toggleEditMode = () => {
  isEditing.value = true;
  igLink.value = userData.value?.igLink || "";
  editedUsername.value = userData.value?.name || "使用者";
  editedProfilePicture.value =
    userData.value?.profilePicture || "/image/default_user.png";
};

// 儲存更新
const saveProfile = async () => {
  try {
    const formData = new FormData();

    if (selectedFile.value) {
      formData.append("profilePicture", selectedFile.value);
    }

    formData.append("name", editedUsername.value);
    formData.append("igLink", igLink.value);

    const userId = userData.value?._id; 
    const token = localStorage.getItem("userToken");

    const response = await axios.put(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/user/update/${userId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, // 若需要 JWT
        },
      }
    );

    const updatedUser = response.data;

    //更新到前端 (Pinia / Composition API)
    userData.value = updatedUser;

    // 若後端回傳了新的頭像連結
    editedProfilePicture.value =
      updatedUser.profilePicture || "/image/default_user.png";

    isEditing.value = false;

    console.log("更新成功")
  } catch (err) {
    console.error("更新失敗：", err)
    // 2. 在錯誤時使用 SweetAlert2 顯示提示
    Swal.fire({
      title: "更新失敗",
      text: err?.response?.data?.message || err.message || "請稍後再試",
      icon: "error",
      confirmButtonText: "確定",
    })
  }
};

//取消編輯
const cancelEdit = () => {
  isEditing.value = false;
  igLink.value = userData.value?.igLink || "";
  editedUsername.value = userData.value?.name || "使用者";
  editedProfilePicture.value =
    userData.value?.profilePicture || "/image/default_user.png";
};

// 切換選單顯示/隱藏
const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

// 更新頭像
const onPhotoChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const newImage = URL.createObjectURL(file);
    editedProfilePicture.value = newImage;
    // 儲存檔案於 selectedFile，之後要上傳時用
    selectedFile.value = file;
  }
};

// 點擊其他地方時關閉下拉選單
const handleClickOutside = (event) => {
  if (
    menuVisible.value &&
    !event.target.closest("#dropdownMenu") && // 點擊的元素不在選單內
    !event.target.closest("#dropdownButton")
  ) {
    menuVisible.value = false;
  }
};

document.addEventListener("click", handleClickOutside);

const handleImageError = (event) => {
  event.target.src = "/image/default_user.png";
};

// 移除全域事件監聽器
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="p-4 my-10">
    <!-- 非編輯模式 -->
    <div v-if="!isEditing">
      <!-- 個人照片 -->
      <div class="flex justify-center">
        <img
          :src="editedProfilePicture"
          alt="Profile Picture"
          class="object-cover w-24 h-24 border border-gray-300 rounded-full"
        />
      </div>

      <!-- 名稱和數據 -->
      <div class="mt-4 text-center">
        <h2 class="text-2xl font-bold text-gray-700">{{ editedUsername }}</h2>
      </div>

      <!-- 社群連結 -->
      <div class="mt-4 text-center">
        <p class="mb-2 text-sm text-gray-500">社群連結：</p>
        <a
          :href="instagramLink"
          class="underline text-amber-500 hover:text-amber-400"
          v-if="igLink"
          target="_blank"
        >
          Instagram: {{ igLink }}
        </a>
        <p v-else class="flex items-center justify-center text-gray-500">
          <font-awesome-icon
            :icon="['fab', 'instagram']"
            class="w-5 h-5 mr-1 text-amber-500"
          />Instagram 未連結
        </p>
      </div>

      <!-- 編輯個人檔案按鈕 -->
      <div class="relative flex items-center justify-center mt-6">
        <div class="w-full"></div>
        <button
          @click="toggleEditMode"
          class="w-full py-2 mx-2 text-white rounded-md min-w-36 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          編輯個人檔案
        </button>
        <div class="relative w-full">
          <button
            id="dropdownButton"
            @click="toggleMenu"
            class="p-1 text-2xl text-gray-500 rounded-md hover:bg-amber-100 focus:outline-none"
          >
            ⋯
          </button>

          <!-- 下拉選單 -->
          <div
            v-if="menuVisible"
            class="absolute left-0 z-10 w-40 mt-2 bg-white rounded-lg shadow-lg"
          >
            <router-link
              to="/createnote"
              class="block w-full px-4 py-2 text-left text-amber-500 hover:bg-amber-100"
            >
              撰寫食記
            </router-link>
            <button
              @click="logout"
              class="block w-full px-4 py-2 text-left text-amber-500 hover:bg-amber-100"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ---------------------------------------------------------------------------------------- -->

    <!-- 編輯模式 -->
    <div v-else>
      <!-- 更換照片 -->
      <div class="relative flex justify-center">
        <img
          :src="editedProfilePicture"
          alt="Profile Picture"
          class="object-cover w-24 h-24 border border-gray-300 rounded-full"
          @error="handleImageError"
        />
        <label
          for="photo-upload"
          class="absolute inset-0 flex items-center justify-center bg-black rounded-full cursor-pointer bg-opacity-20"
        >
          <span class="text-xl text-white"
            ><font-awesome-icon :icon="['fas', 'camera']"
          /></span>
        </label>
        <input
          id="photo-upload"
          type="file"
          @change="onPhotoChange"
          accept="image/*"
          class="hidden"
        />
      </div>

      <!-- 編輯名字 -->
      <div class="mt-4 text-center">
        <input
          v-model="editedUsername"
          type="text"
          class="w-1/2 p-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="輸入名字"
        />
      </div>

      <!-- 編輯 IG 帳號 -->
      <div class="mt-4 text-center">
        <p class="mb-2 text-sm text-gray-500">您的社群連結：</p>
        <span class="text-2xl text-amber-500"
          ><font-awesome-icon
            :icon="['fab', 'instagram']"
            class="w-5 h-5 mr-1 text-amber-500"
        /></span>
        <div class="flex items-center justify-center">
          <input
            v-model="igLink"
            type="text"
            placeholder="輸入 IG 帳號"
            class="w-1/2 p-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <!-- 保存/取消按鈕 -->
      <div class="flex justify-center mt-6 space-x-4">
        <button
          @click="saveProfile"
          class="px-4 py-2 text-white rounded-md bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          儲存
        </button>
        <button
          @click="cancelEdit"
          class="px-4 py-2 text-white bg-gray-400 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
label {
  width: 6rem;
  height: 6rem;
  transition: background 0.3s;
  left: 50%;
  transform: translateX(-50%);
}

label:hover {
  background: rgba(0, 0, 0, 0.5);
}

input[type="file"] {
  display: none;
}
</style>
