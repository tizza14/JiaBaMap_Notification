import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

export const useStore = defineStore("store", () => {
  // 基本資料的 ref
  const storeName = ref("");
  const rating = ref("");
  const userRatingCount = ref("");
  const startPrice = ref("");
  const endPrice = ref("");
  const weekDayDescriptions = ref("");
  const formattedAddress = ref("");
  const websiteUri = ref("");
  const nationalPhoneNumber = ref("");
  const openNow = ref("");
  const storePhoto = ref("");
  const googleMapsUri = ref("");
  const bannerPhoto = ref("");
  const lat = ref("");
  const lng = ref("");
  const photoIds = ref([]);
  let placesId = ref("");
  const router = useRouter();
  const StoreId = (placeId) => {
    placesId.value = placeId;
    router.push({
      path: "/store",
      query: { id: placeId },
    });
  };

  // 相似餐廳相關狀態
  const similarRestaurants = ref([]);

  // 推薦餐廳相關狀態
  const recommendedRestaurants = ref([]);

  const fetchPlaceDetail = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/${placesId.value}`,
      );
      const resJson = await res.json();

      storeName.value = resJson.displayName;
      rating.value = resJson.rating;
      userRatingCount.value = resJson.userRatingCount;
      startPrice.value = resJson.startPrice;
      endPrice.value = resJson.endPrice;
      weekDayDescriptions.value = resJson.weekDayDescriptions;
      formattedAddress.value = resJson.formattedAddress;
      websiteUri.value = resJson.websiteUri;
      nationalPhoneNumber.value = resJson.nationalPhoneNumber;
      googleMapsUri.value = resJson.googleMapsUri;
      openNow.value = resJson.openNow;
      lat.value = resJson.lat;
      lng.value = resJson.lng;
      photoIds.value = resJson.photoIds;
      //一個array含兩組id
    } catch (err) {
      console.log("Failed to fetch place detail from Google API.");
      console.log(err);
    }
  };

  const fetchStorePhoto = async () => {
    try {
      storePhoto.value = `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${photoIds.value[0]}?maxWidth=400&maxHeight=320`;
    } catch (err) {
      console.log("Failed to set store photo URL.");
    }
  };

  const fetchBannerPhoto = async () => {
    try {
      bannerPhoto.value = `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${photoIds.value[1]}?maxWidth=1280&maxHeight=720`;
    } catch (err) {
      console.log("Failed to set banner photo URL.");
    }
  };

  const staticMapUrl = computed(() => {
    // 如果沒有位置資訊，返回空
    if (!formattedAddress.value || !lat.value || !lng.value) return null;

    return `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/staticmap?lat=${lat.value}&lng=${lng.value}`;
  });

  // 獲取類似餐廳
  const fetchSimilarRestaurants = async () => {
    similarRestaurants.value = [];

    // 先獲取當前餐廳的詳細資訊
    const detailRes = await fetch(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/${placesId.value}`,
    );

    const detailData = await detailRes.json();

    // 使用當前餐廳的位置搜尋附近餐廳
    const searchRes = await fetch(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/search?keyword=餐廳&lat=${detailData.lat}&lng=${detailData.lng}`,
    );

    const resJson = await searchRes.json();

    // 使用 Set 來儲存已經添加的餐廳 ID
    const addedIds = new Set();

    // 過濾掉當前餐廳和重複的餐廳
    const filteredRestaurants = resJson.filter((restaurant) => {
      // 如果是當前餐廳或已經添加過，則跳過
      if (restaurant.id === placesId.value || addedIds.has(restaurant.id)) {
        return false;
      }
      // 將餐廳 ID 加入已添加集合
      addedIds.add(restaurant.id);
      return true;
    });

    // 為每個餐廳獲取詳細資訊
    const detailedRestaurants = await Promise.all(
      filteredRestaurants.map(async (restaurant) => {
        const detailResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/${restaurant.id}`,
        );
        const detailData = await detailResponse.json();
        return {
          name: restaurant.name,
          rating: restaurant.rating || "N/A",
          userRatingCount: restaurant.userRatingCount || 0,
          address: restaurant.address || "未知地址",
          isOpen: restaurant.openNow || false,
          photoUrl: restaurant.photoId
            ? `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${
                restaurant.photoId
              }?maxWidth=400&maxHeight=320`
            : null,
          place_id: restaurant.id,
          googleMapsUri: detailData.googleMapsUri,
        };
      }),
    );

    similarRestaurants.value = detailedRestaurants;
  };

  // 獲取推薦餐廳
  const fetchRecommendedRestaurants = async () => {
    // 先獲取當前餐廳的詳細資訊
    const detailRes = await fetch(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/${placesId.value}`,
    );

    const detailData = await detailRes.json();

    // 定義搜尋關鍵字陣列
    const keywords = [
      "餐廳",
      "火鍋",
      "燒烤",
      "日式料理",
      "韓式料理",
      "中式料理",
      "義式料理",
      "早午餐",
      "甜點",
      "咖啡廳",
    ];
    // 隨機選擇 1 個關鍵字
    const selectedKeyword =
      keywords[Math.floor(Math.random() * keywords.length)];

    // 使用當前餐廳的位置搜尋附近餐廳
    const searchRes = await fetch(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/search?keyword=${selectedKeyword}&lat=${detailData.lat}&lng=${detailData.lng}`,
    );

    const resJson = await searchRes.json();

    // 獲取相似餐廳的 ID 列表
    const similarRestaurantIds = similarRestaurants.value.map(
      (r) => r.place_id,
    );

    // 使用 Set 來儲存已經添加的餐廳 ID
    const addedIds = new Set();

    // 過濾掉當前餐廳、相似餐廳和重複的餐廳
    const filteredRestaurants = resJson.filter((restaurant) => {
      // 如果是當前餐廳、相似餐廳或已經添加過，則跳過
      if (
        restaurant.id === placesId.value ||
        similarRestaurantIds.includes(restaurant.id) ||
        addedIds.has(restaurant.id)
      ) {
        return false;
      }
      // 將餐廳 ID 加入已添加集合
      addedIds.add(restaurant.id);
      return true;
    });

    // 為每個餐廳獲取詳細資訊
    const detailedRestaurants = await Promise.all(
      filteredRestaurants.map(async (restaurant) => {
        const detailResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/${restaurant.id}`,
        );
        const detailData = await detailResponse.json();
        return {
          name: restaurant.name,
          rating: restaurant.rating || "N/A",
          userRatingCount: restaurant.userRatingCount || 0,
          photoUrl: restaurant.photoId
            ? `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${restaurant.photoId}?maxWidth=400&maxHeight=320`
            : null,
          place_id: restaurant.id,
          googleMapsUri: detailData.googleMapsUri,
        };
      }),
    );

    recommendedRestaurants.value = detailedRestaurants;
  };

  // 儲存餐廳資料到本地
  const saveToLocalStorage = () => {
    const data = {
      storeName: storeName.value,
      rating: rating.value,
      userRatingCount: userRatingCount.value,
      startPrice: startPrice.value,
      endPrice: endPrice.value,
      weekDayDescriptions: weekDayDescriptions.value,
      formattedAddress: formattedAddress.value,
      websiteUri: websiteUri.value,
      nationalPhoneNumber: nationalPhoneNumber.value,
      googleMapsUri: googleMapsUri.value,
      openNow: openNow.value,
      lat: lat.value,
      lng: lng.value,
      placesId: placesId.value,
    };
    localStorage.setItem("storeData", JSON.stringify(data));
  };

  const loadFromLocalStorage = () => {
    const data = JSON.parse(localStorage.getItem("storeData"));
    if (data) {
      storeName.value = data.storeName || "";
      rating.value = data.rating || "";
      userRatingCount.value = data.userRatingCount || "";
      startPrice.value = data.startPrice || "";
      endPrice.value = data.endPrice || "";
      weekDayDescriptions.value = data.weekDayDescriptions || "";
      formattedAddress.value = data.formattedAddress || "";
      websiteUri.value = data.websiteUri || "";
      nationalPhoneNumber.value = data.nationalPhoneNumber || "";
      openNow.value = data.openNow || "";
      googleMapsUri.value = data.googleMapsUri || "";
      lat.value = data.lat || "";
      lng.value = data.lng || "";
      placesId.value = data.placesId || "";
    }
  };

  // 在資料變化時自動保存
  watch(
    [
      storeName,
      rating,
      userRatingCount,
      startPrice,
      endPrice,
      weekDayDescriptions,
      formattedAddress,
      websiteUri,
      nationalPhoneNumber,
      openNow,
      googleMapsUri,
      lat,
      lng,
      placesId,
    ],
    saveToLocalStorage,
    { deep: true },
  );

  // 頁面加載時還原資料
  loadFromLocalStorage();

  return {
    // 基本資料
    storeName,
    rating,
    userRatingCount,
    startPrice,
    endPrice,
    weekDayDescriptions,
    formattedAddress,
    websiteUri,
    nationalPhoneNumber,
    storePhoto,
    bannerPhoto,
    googleMapsUri,
    openNow,
    placesId,
    StoreId,

    // API 方法
    fetchPlaceDetail,
    fetchStorePhoto,
    fetchBannerPhoto,
    staticMapUrl,
    // 相似餐廳相關
    similarRestaurants,
    fetchSimilarRestaurants,
    // 推薦餐廳相關
    recommendedRestaurants,
    fetchRecommendedRestaurants,
    lat,
    lng,
  };
});
