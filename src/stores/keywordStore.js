import { defineStore } from "pinia";
import axios from "axios";
import { reactive, ref, computed, inject } from "vue";

export const useKeywordStore = defineStore("keyword", () => {
  const keyword = ref("");
  const sortOrder = ref("default");
  let selectedDistrict = ref("中正區");
  let coordinate = ref({ lat: 25.032404, lng: 121.519033 });
  const isOpen = ref(false);
  const isOrderable = ref(false);
  const result = ref([]);
  const selectedCost = ref("default");
  const isStaleData = ref(false);
  const isSearching = ref(false);
  const Swal = inject("$swal");

  const sortOptions = {
    default: "預設",
    distance: "最近距離",
    rating: "最高評分",
    reviews: "最高人氣",
  };

  const costOptions = {
    default: "全部",
    cost1: "200內",
    cost2: "201~400",
    cost3: "401~600",
    cost4: "601~800",
    cost5: "801~1000",
    cost6: "1000以上",
  };

  const districts = reactive({
    我的位置: null,
    台北市: {
      中正區: { lat: 25.032404, lng: 121.519033 },
      大同區: { lat: 25.063093, lng: 121.513085 },
      中山區: { lat: 25.0685, lng: 121.5266 },
      松山區: { lat: 25.0585, lng: 121.5588 },
      大安區: { lat: 25.03976, lng: 121.543459 },
      萬華區: { lat: 25.0354, lng: 121.4997 },
      信義區: { lat: 25.0306, lng: 121.5701 },
      士林區: { lat: 25.0922, lng: 121.5245 },
      北投區: { lat: 25.1321, lng: 121.4987 },
      內湖區: { lat: 25.083, lng: 121.5868 },
      南港區: { lat: 25.0553, lng: 121.6171 },
      文山區: { lat: 24.9987, lng: 121.5549 },
    },
    新北市: {
      板橋區: { lat: 25.011, lng: 121.458 },
      三重區: { lat: 25.072, lng: 121.486 },
      中和區: { lat: 24.993, lng: 121.499 },
      永和區: { lat: 25.008, lng: 121.514 },
      新莊區: { lat: 25.036, lng: 121.432 },
      新店區: { lat: 24.971, lng: 121.537 },
      樹林區: { lat: 24.984, lng: 121.418 },
      鶯歌區: { lat: 24.953, lng: 121.353 },
      三峽區: { lat: 24.934, lng: 121.369 },
      淡水區: { lat: 25.164, lng: 121.448 },
      瑞芳區: { lat: 25.107, lng: 121.828 },
      土城區: { lat: 24.973, lng: 121.451 },
      蘆洲區: { lat: 25.085, lng: 121.473 },
      五股區: { lat: 25.082, lng: 121.426 },
      泰山區: { lat: 25.06, lng: 121.432 },
      林口區: { lat: 25.077, lng: 121.396 },
      深坑區: { lat: 25.002, lng: 121.615 },
      石碇區: { lat: 24.991, lng: 121.631 },
      坪林區: { lat: 24.937, lng: 121.701 },
      三芝區: { lat: 25.258, lng: 121.51 },
      石門區: { lat: 25.29, lng: 121.563 },
      八里區: { lat: 25.151, lng: 121.398 },
      平溪區: { lat: 25.025, lng: 121.738 },
      雙溪區: { lat: 24.998, lng: 121.829 },
      貢寮區: { lat: 25.016, lng: 121.917 },
      金山區: { lat: 25.223, lng: 121.636 },
      萬里區: { lat: 25.175, lng: 121.689 },
      烏來區: { lat: 24.789, lng: 121.551 },
    },
    桃園市: { lat: 24.965, lng: 121.224 },
    台中市: { lat: 24.198, lng: 120.63 },
    台南市: { lat: 22.994, lng: 120.202 },
    高雄市: { lat: 22.631, lng: 120.302 },
    基隆市: { lat: 25.125, lng: 121.741 },
    新竹市: { lat: 24.804, lng: 120.971 },
    嘉義市: { lat: 23.479, lng: 120.437 },
    新竹縣: { lat: 24.839, lng: 121.004 },
    苗栗縣: { lat: 24.564, lng: 120.818 },
    彰化縣: { lat: 24.081, lng: 120.538 },
    南投縣: { lat: 23.913, lng: 120.685 },
    雲林縣: { lat: 23.707, lng: 120.543 },
    嘉義縣: { lat: 23.459, lng: 120.346 },
    屏東縣: { lat: 22.673, lng: 120.488 },
    宜蘭縣: { lat: 24.678, lng: 121.769 },
    花蓮縣: { lat: 23.976, lng: 121.604 },
    台東縣: { lat: 22.758, lng: 121.144 },
    澎湖縣: { lat: 23.565, lng: 119.563 },
    金門縣: { lat: 24.436, lng: 118.317 },
    連江縣: { lat: 26.159, lng: 119.951 },
  });

  // 計算過濾後的結果
  const filteredResult = computed(() => {
    let filtered = [...result.value];

    if (isOpen.value) {
      filtered = filtered.filter((place) => place.openNow);
    }

    if (isOrderable.value) {
      filtered = filtered.filter((place) => place.isOrderable);
    }

    if (selectedCost.value !== "default") {
      filtered = filtered.filter((place) => {
        const price = place.startPrice || 0;
        if (selectedCost.value === "cost1") return price <= 200;
        if (selectedCost.value === "cost2") return price >= 200 && price < 400;
        if (selectedCost.value === "cost3") return price >= 400 && price < 600;
        if (selectedCost.value === "cost4") return price >= 600 && price < 800;
        if (selectedCost.value === "cost5") return price >= 800 && price < 1000;
        if (selectedCost.value === "cost6") return price >= 1000;
      });
    }

    // 計算距離
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // 地球半徑
      const toRadians = (deg) => deg * (Math.PI / 180);
      const dLat = toRadians(lat2 - lat1);
      const dLng = toRadians(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    filtered = filtered.map((place) => ({
      ...place,
      distance: calculateDistance(
        coordinate.value.lat,
        coordinate.value.lng,
        place.lat,
        place.lng,
      ),
    }));

    // 條件排序
    const sortFunctions = {
      default: () => 0,
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
      reviews: (a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0),
      distance: (a, b) => a.distance - b.distance,
    };

    filtered.sort(sortFunctions[sortOrder.value]);
    return filtered;
  });

  // 標籤搜尋方法
  const navigateToSearch = (router, tag) => {
    keyword.value = tag;
    router.push({ path: "/search" }).then(() => {
      handleSearch();
    });
  };

  const setKeyword = (value) => {
    keyword.value = value;
  };

  // const handleSearch = async () => {
  //   if (!keyword.value || keyword.value === '') {
  //     alert('請輸入有效關鍵字!!!');
  //     return;
  //   }
  //   try {
  //     const response = await axios.get(
  //       `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/search?keyword=${keyword.value}&lat=${coordinate.value.lat}&lng=${coordinate.value.lng}`
  //     );
  //     if (response.status === 200) {
  //       result.value = response.data;
  //     }
  //   } catch (error) {
  //     if (error.response) {
  //       result.value = [];
  //     }
  //   }
  // };

  const handleSearch = async () => {
    if (!keyword.value || keyword.value === "") {
      Swal.fire({ text: "請輸入有效關鍵字！", icon: "warning" });
      return;
    }
    isSearching.value = true;
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL.replace(/\/+$/, "");
      const response = await axios.get(`${baseUrl}/restaurants/search`, {
        params: {
          keyword: keyword.value,
          lat: coordinate.value.lat,
          lng: coordinate.value.lng,
        },
      });
      if (response.status === 200) {
        result.value = response.data;
        isStaleData.value = response.headers["x-cache-status"] === "STALE";
      }
    } catch (error) {
      console.error("Search error:", error);
      result.value = [];
      isStaleData.value = false;
    } finally {
      isSearching.value = false;
    }
  };

  const selectDistrict = (districtName) => {
    if (districtName === "我的位置") {
      if (!navigator.geolocation) {
        Swal.fire({ text: "您的瀏覽器不支援定位功能！", icon: "error" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          districts["我的位置"] = coords;
          selectedDistrict.value = "我的位置";
          coordinate.value = coords;
        },
        () => {
          Swal.fire({ text: "無法取得您的位置，請確認已允許定位權限！", icon: "warning" });
        }
      );
      return;
    }

    if (districts[districtName]) {
      selectedDistrict.value = districtName;
      coordinate.value = districts[districtName];
    } else if (districts["台北市"][districtName]) {
      selectedDistrict.value = districtName;
      coordinate.value = districts["台北市"][districtName];
    } else if (districts["新北市"][districtName]) {
      selectedDistrict.value = districtName;
      coordinate.value = districts["新北市"][districtName];
    }
  };

  const setSortOrder = (value) => {
    sortOrder.value = value;
  };

  const setOpen = () => {
    isOpen.value = !isOpen.value;
  };

  const setCostRange = (value) => {
    selectedCost.value = value;
  };

  const setResult = (value) => {
    result.value = value;
  };

  const nearSearch = (router, lat, lng) => {
    coordinate.value = { lat, lng };
    navigateToSearch(router, "餐廳");
  };

  // 返回所有狀態和方法
  return {
    keyword,
    sortOrder,
    selectedDistrict,
    coordinate,
    isOpen,
    isOrderable,
    result,
    selectedCost,
    isStaleData,
    isSearching,
    sortOptions,
    costOptions,
    districts,
    filteredResult,
    Swal,
    navigateToSearch,
    setKeyword,
    handleSearch,
    selectDistrict,
    setSortOrder,
    setOpen,
    setCostRange,
    setResult,
    nearSearch,
  };
});
