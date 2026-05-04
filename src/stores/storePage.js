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

  const primaryType = ref("");
  const similarRestaurants = ref([]);
  const recommendedRestaurants = ref([]);
  const searchTopics = ref([]);

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
      primaryType.value = resJson.primaryType || "";
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

  const RECOMMEND_KEYWORDS = ["火鍋", "燒烤", "日式料理", "韓式料理", "義式料理", "早午餐", "甜點", "咖啡廳"];

  const _mapRestaurant = (r) => ({
    name: r.name,
    rating: r.rating ?? null,
    userRatingCount: r.userRatingCount ?? null,
    address: r.address ?? "",
    photoUrl: r.photoId
      ? `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${r.photoId}?maxWidth=400&maxHeight=320`
      : null,
    place_id: r.id,
  });

  const fetchSimilarRestaurants = async () => {
    if (!lat.value || !lng.value) return;
    similarRestaurants.value = [];
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/search?keyword=餐廳&lat=${lat.value}&lng=${lng.value}`
      );
      const data = await res.json();
      similarRestaurants.value = data
        .filter((r) => r.id !== placesId.value)
        .slice(0, 8)
        .map(_mapRestaurant);
    } catch (err) {
      console.error("fetchSimilarRestaurants error:", err);
    }
  };

  const fetchRecommendedRestaurants = async () => {
    if (!lat.value || !lng.value) return;
    const excludeIds = new Set([placesId.value, ...similarRestaurants.value.map((r) => r.place_id)]);
    const keyword = RECOMMEND_KEYWORDS[Math.floor(Math.random() * RECOMMEND_KEYWORDS.length)];
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/search?keyword=${encodeURIComponent(keyword)}&lat=${lat.value}&lng=${lng.value}`
      );
      const data = await res.json();
      recommendedRestaurants.value = data
        .filter((r) => !excludeIds.has(r.id))
        .slice(0, 8)
        .map(_mapRestaurant);
    } catch (err) {
      console.error("fetchRecommendedRestaurants error:", err);
    }
  };

  const TYPE_LABEL = {
    japanese_restaurant:   "日式料理",
    chinese_restaurant:    "中式料理",
    korean_restaurant:     "韓式料理",
    italian_restaurant:    "義式料理",
    french_restaurant:     "法式料理",
    american_restaurant:   "美式料理",
    ramen_restaurant:      "拉麵",
    sushi_restaurant:      "壽司",
    hot_pot_restaurant:    "火鍋",
    cafe:                  "咖啡廳",
    bakery:                "麵包烘焙",
    dessert_shop:          "甜點",
    ice_cream_shop:        "冰淇淋甜點",
    bar:                   "酒吧",
    fast_food_restaurant:  "速食",
    steak_house:           "牛排",
    pizza_restaurant:      "披薩",
    seafood_restaurant:    "海鮮料理",
    vegetarian_restaurant: "素食",
    brunch_restaurant:     "早午餐",
    breakfast_restaurant:  "早餐",
    restaurant:            "餐廳",
  };

  const TYPE_RELATED = {
    japanese_restaurant:   ["壽司", "拉麵", "日式甜點", "居酒屋"],
    chinese_restaurant:    ["台灣小吃", "熱炒", "麻辣火鍋", "港式飲茶"],
    korean_restaurant:     ["韓式炸雞", "韓國燒烤", "部隊鍋", "韓式甜點"],
    italian_restaurant:    ["披薩", "義大利麵", "燉飯"],
    hot_pot_restaurant:    ["麻辣鍋", "涮涮鍋", "日式火鍋", "薑母鴨"],
    cafe:                  ["甜點", "早午餐", "下午茶", "手沖咖啡"],
    bakery:                ["甜點", "咖啡廳", "下午茶"],
    dessert_shop:          ["咖啡廳", "下午茶", "冰淇淋", "手搖飲"],
    steak_house:           ["燒烤", "美式漢堡", "牛肉料理"],
    seafood_restaurant:    ["海鮮熱炒", "生魚片", "日式料理"],
    ramen_restaurant:      ["日式料理", "拉麵", "居酒屋"],
    sushi_restaurant:      ["日式料理", "生魚片", "迴轉壽司"],
    brunch_restaurant:     ["咖啡廳", "早餐", "輕食"],
  };

  const fetchSearchTopics = () => {
    const address = formattedAddress.value;
    const type = primaryType.value;

    const areaMatch = address.match(/[^\s市縣]+[區鄉鎮市]/);
    const area = areaMatch ? areaMatch[0] : "";
    const cityMatch = address.match(/(台北市|新北市|台中市|台南市|高雄市|桃園市)/);
    const city = cityMatch ? cityMatch[0] : "";

    const typeLabel = TYPE_LABEL[type] || null;
    const related = TYPE_RELATED[type] || ["附近美食", "附近咖啡廳", "附近甜點", "附近火鍋"];

    const candidates = [
      typeLabel && area ? `${area}${typeLabel}` : null,
      typeLabel && city ? `${city}${typeLabel}` : null,
      typeLabel ? `附近${typeLabel}` : null,
      ...related,
      area ? `${area}美食` : null,
      city ? `${city}必吃` : null,
    ];

    searchTopics.value = [...new Set(candidates.filter(Boolean))].slice(0, 8);
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
    primaryType,
    similarRestaurants,
    fetchSimilarRestaurants,
    recommendedRestaurants,
    fetchRecommendedRestaurants,
    searchTopics,
    fetchSearchTopics,
    lat,
    lng,
  };
});
