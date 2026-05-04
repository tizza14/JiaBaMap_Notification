<script setup>
import { ref, onMounted, shallowRef } from "vue";
import googleMapsLoader from "../components/googleMapsLoader.js";
import Swal from "sweetalert2";
import { z } from "zod";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();

const navigation = [
  { name: "首頁", link: "/dashboard" },
  { name: "餐廳資訊", link: "/storesignup" },
  { name: "菜單管理", link: "/menu-management" },
  { name: "訂單管理", link: "/" },
];

const logout = () => sessionStorage.removeItem("storeToken");

const username = ref("");
const password = ref("");
const storeName = ref("");
const storeAddress = ref("");
const storePhone = ref("");
const storeIntro = ref("");
const storeTaxId = ref("");
const contactName = ref("");
const contactEmail = ref("");
const contactPhone = ref("");
const predictions = shallowRef([]);
const placeId = ref("");

let AutocompleteSessionToken;
let AutocompleteSuggestion;
let request = {
  input: "",
  includedPrimaryTypes: ["establishment"],
  region: "tw",
  language: "zh-TW",
  includedRegionCodes: ["tw"],
};

async function initGoogleAutocomplete() {
  ({ AutocompleteSessionToken, AutocompleteSuggestion } =
    await googleMapsLoader.importLibrary("places"));
  request.sessionToken = new AutocompleteSessionToken();
}

async function fetchSuggestions() {
  if (storeAddress.value) {
    request.input = storeAddress.value;
    const { suggestions } =
      await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    predictions.value = suggestions.map((ele) => ele.placePrediction);
  }
}

function clickPrediction(predict) {
  storeAddress.value = `${predict.mainText.text}: ${predict.secondaryText.text}`;
  placeId.value = predict.placeId;
  predictions.value = [];
  request.sessionToken = new AutocompleteSessionToken();
}

function handleEnter(event) {
  if (event.target.tagName === "TEXTAREA") {
    return;
  }
  event.preventDefault();
}

function clear() {
  storeAddress.value = "";
}

async function handleSubmit() {
  const form = {
    username: username.value.trim(),
    password: password.value,
    storeName: storeName.value.trim(),
    storeAddress: storeAddress.value.trim(),
    storePhone: storePhone.value.trim(),
    storeIntro: storeIntro.value.trim(),
    storeTaxId: storeTaxId.value.trim(),
    contactName: contactName.value.trim(),
    contactEmail: contactEmail.value.trim(),
    contactPhone: contactPhone.value.trim(),
    placeId: placeId.value,
  };

  const registerSchema = z.object({
    username: z.string().min(5, "帳號至少需要5個字元"),
    password: z.string().min(8, "密碼至少需要8個字元"),
    storeName: z.string().min(1, "店名至少需要1個字元"),
    placeId: z.string().optional(),
    storePhone: z.string().regex(/^0\d{1,9}$/, "請輸入正確電話格式"),
    storeIntro: z.string().max(50, "店家簡介最多50字元"),
    storeTaxId: z.string().regex(/\d{8}/, "請輸入正確統一編號格式"),
    contactName: z.string().min(1, "姓名至少需1個字元"),
    contactEmail: z.string().email("請輸入正確的email"),
    contactPhone: z.string().regex(/^09\d{8}$/, "請輸入正確手機號碼"),
  });

  try {
    registerSchema.parse(form);

    const { data } = await axios.post(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/auth/store/register`,
      form,
    );

    sessionStorage.setItem("storeToken", data.token);

    await Swal.fire({
      title: "註冊成功",
      text: "歡迎加入 JiaBaMap！",
      icon: "success",
      confirmButtonText: "OK",
    });

    router.push({ name: "dashboard" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      Swal.fire({
        title: "Error",
        html: err.errors.map((error) => error.message).join("<br>"),
        icon: "error",
        confirmButtonText: "OK",
      });
    } else {
      Swal.fire({
        title: "Error",
        text: err.response?.data?.message || "請再試一次",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }
}

onMounted(initGoogleAutocomplete);
</script>

<template>
  <div class="flex items-center justify-center min-h-screen animated-gradient">
    <div
      class="max-w-2xl px-8 pt-6 pb-8 mt-20 mb-4 bg-white rounded shadow-md contentBox"
    >
      <div class="flex justify-center w-full mb-4 titleBox">
        <h2 class="text-2xl font-bold">成為我們的合作夥伴，</h2>
        <h2 class="text-2xl font-bold">拓展更多可能！</h2>
      </div>
      <form @submit.prevent="handleSubmit" @keydown.enter="handleEnter">
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="username"
            >✨ 帳號名稱:
            <span class="text-xs font-normal text-red-600"
              >*至少需5個字元</span
            ></label
          >
          <input
            v-model="username"
            id="username"
            type="text"
            placeholder="請輸入帳號"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="password"
            >✨ 密碼:
            <span class="text-xs font-normal text-red-600"
              >*至少需8個字元</span
            ></label
          >
          <input
            v-model="password"
            id="password"
            type="password"
            placeholder="請輸入密碼"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="storeName"
            >✨ 店家名稱:
            <span class="text-xs font-normal text-red-600">*</span></label
          >
          <input
            v-model="storeName"
            id="storeName"
            type="text"
            placeholder="請輸入店家名稱"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="storeAddress"
            >✨ 店家地址:
            <span class="text-xs font-normal text-gray-400"
              >（輸入後可從選單選取以綁定 Google 地點）</span
            ></label
          >
          <div class="relative w-full border rounded hover:shadow-md">
            <input
              v-model="storeAddress"
              @input="fetchSuggestions"
              id="storeAddress"
              type="text"
              placeholder="請輸入店家地址"
              class="w-full px-3 py-2 pr-10 leading-tight text-gray-700 appearance-none focus:outline-orange-300"
            />
            <font-awesome-icon
              :icon="['fa', 'circle-xmark']"
              @click="clear"
              class="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 cursor-pointer top-1/2 right-3"
            />
          </div>
          <div v-if="predictions.length !== 0" class="mt-1">
            <ul class="w-full border rounded">
              <li
                @click="clickPrediction(predict)"
                v-for="predict in predictions"
                :key="predict.placeId"
                class="w-full px-3 leading-tight text-gray-700 border cursor-pointer hover:bg-gray-200"
              >
                {{ `${predict.mainText.text}: ${predict.secondaryText.text}` }}
              </li>
            </ul>
          </div>
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="storePhone"
            >✨ 店家電話:
            <span class="text-xs font-normal text-red-600">*</span></label
          >
          <input
            v-model="storePhone"
            id="storePhone"
            type="tel"
            placeholder="請輸入店家電話"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="storeIntro"
            >✨ 店家簡介:
            <span class="text-xs font-normal text-red-600"
              >*最多50個字元</span
            ></label
          >
          <textarea
            v-model="storeIntro"
            id="storeIntro"
            type="text"
            placeholder="請輸入店家簡介"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          ></textarea>
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="storeTaxId"
            >✨ 店家統一編號:
            <span class="text-xs font-normal text-red-600">*</span></label
          >
          <input
            v-model="storeTaxId"
            id="storeTaxId"
            type="text"
            placeholder="請輸入店家統一編號"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="contactName"
            >✨ 聯絡人姓名:
            <span class="text-xs font-normal text-red-600">*</span></label
          >
          <input
            v-model="contactName"
            id="contactName"
            type="text"
            placeholder="請輸入聯絡人姓名"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-4">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="contactEmail"
            >✨ 聯絡人信箱:
            <span class="text-xs font-normal text-red-600">*</span></label
          >
          <input
            v-model="contactEmail"
            id="contactEmail"
            type="text"
            placeholder="請輸入聯絡人信箱"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="mb-8">
          <label
            class="block mb-2 text-sm font-bold text-gray-700"
            for="contactPhone"
            >✨ 聯絡人手機號碼:
            <span class="text-xs font-normal text-red-600">*</span></label
          >
          <input
            v-model="contactPhone"
            id="contactPhone"
            type="tel"
            placeholder="請輸入聯絡人手機號碼"
            class="w-full px-3 py-2 leading-tight text-gray-700 border rounded appearance-none hover:shadow-md focus:outline-orange-300"
          />
        </div>
        <div class="flex items-center justify-center">
          <button
            type="submit"
            class="px-4 py-2 font-bold text-white bg-orange-400 rounded hover:bg-orange-500 hover:shadow-lg focus:outline-none focus:shadow-outline"
          >
            註冊成為 JiaBaMap 的合作夥伴
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scope>
.animated-gradient {
  background: linear-gradient(
    45deg,
    #ff9a9e,
    #fad0c4,
    #fbc2eb,
    #a18cd1,
    #efd170,
    #ff9a9e
  );
  background-size: 300% 300%;
  animation: gradientAnimation 15s ease infinite;
}

@keyframes gradientAnimation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@media (max-width: 768px) {
  .contentBox {
    margin-right: 10px;
    margin-left: 10px;
  }
  .titleBox {
    flex-wrap: wrap;
  }
}
</style>
