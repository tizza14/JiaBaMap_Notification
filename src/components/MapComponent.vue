<template>
  <div
    ref="mapContainer"
    class="hidden md:block md:w-1/2 h-[calc(100vh-72px)]"
  ></div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, nextTick } from "vue";
import { useRestaurantStore } from "@/stores/searchPage";
import { watch } from "vue";
import loader from "./googleMapsLoader";

const store = useRestaurantStore();

const map = ref(null); // Google 地圖實例
let markers = [];
let infoWindows = [];
const mapContainer = ref(null); // 地圖 DOM 容器
// const places = ref([]); // 從 Local Storage 加載的地點資料
// const districts = ref([]);

watch(
  () => store.hoveredPlaceId,
  (newPlaceId) => {
    if (!map.value) return;

    markers.forEach((marker) => {
      // 停止所有動畫並恢復預設層級
      marker.setAnimation(null);
      marker.setZIndex(1);
    });

    if (!newPlaceId) {
      infoWindows.forEach((window) => window.close());
      return;
    }

    // 找到對應的標記
    const marker = markers.find((m) => m.placeId === newPlaceId);
    if (marker) {
      // 顯著效果：跳動 (BOUNCE) 並置頂
      marker.setAnimation(google.maps.Animation.BOUNCE);
      marker.setZIndex(1000);
      
      // 開啟對應的 InfoWindow
      const index = markers.indexOf(marker);
      if (index !== -1 && infoWindows[index]) {
        infoWindows.forEach((window) => window.close());
        infoWindows[index].open({
          map: map.value,
          anchor: marker,
        });
      }
    }
  },
);

// 初始化 Google 地圖
const initMap = async () => {
  const customMapStyle = [
    {
      featureType: "poi",
      elementType: "all",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "transit",
      elementType: "all",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "water",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ];

  try {
    await loader.load(); // 確保 Google Maps API 加載完成
    const initialCenter = districts.value;

    map.value = new google.maps.Map(mapContainer.value, {
      center: initialCenter,
      zoom: 15,
      styles: customMapStyle,
      mapId: "DEMO_MAP_ID", // AdvancedMarkerElement 需要 mapId
    });

    // 地圖加載完成後首次更新標記
    google.maps.event.addListenerOnce(map.value, "tilesloaded", () => {
      updateMarkers();
    });
  } catch (error) {
    console.error("地圖初始化失敗:", error);
  }
};

const updateMarkers = () => {
  if (!map.value) {
    return;
  }
  clearMarkers();
  places.value.forEach((place) => {
    // 1. 準備 InfoWindow
    const openingStatus = place.openNow ? "營業中" : "已打烊";
    const infoWindow = new google.maps.InfoWindow({
      content: `
            <div class="flex w-[320px] h-[120px] bg-white rounded-lg p-2 overflow-hidden relative">
              <button class="absolute text-gray-500 top-1 right-2 hover:text-gray-700 z-10" 
                      onclick="this.closest('.gm-style-iw').querySelector('.gm-ui-hover-effect').click()" 
                      style="outline: none; background: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                ✕
              </button>
              <img 
                src="${photoGet(place.photoId)}" 
                alt="${place.name}"
                class="w-[100px] h-[105px] object-cover rounded"
                onerror="this.src='https://placehold.co/100x105?text=No+Photo'"
              />
              <div class="pl-2 w-[200px] overflow-hidden">
                <h3 class="text-base font-bold leading-6 truncate text-amber-500">${place.name}</h3>
                <div class="flex items-center text-sm mb-1">
                  ${
                    place.rating
                      ? `
                    <div class="bg-orange-600 px-2 h-[18px] rounded-[9px] flex items-center justify-center text-white text-xs">
                      <span class="mr-1">${place.rating.toFixed(1)}</span>
                      <svg style="width: 10px; height: 10px;" fill="currentColor" viewBox="0 0 576 512"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"></path></svg>
                    </div>
                    <span class="ml-2 text-gray-500 text-xs">(${place.userRatingCount || 0}則評論)</span>
                  `
                      : '<span class="text-gray-400 text-xs">暫無評分</span>'
                  }
                </div>
                <p class="text-xs text-gray-600 line-clamp-2 mb-1">${place.address || "地址未提供"}</p>
                <span class="block text-xs font-bold ${place.openNow ? "text-green-600" : "text-red-600"}">${openingStatus}</span>
              </div>
            </div>
          `,
    });

    google.maps.event.addListener(infoWindow, "domready", () => {
      const closeButton = document.querySelector(".gm-ui-hover-effect");
      const contentWrapper = document.querySelector(".gm-style-iw-c");
      if (closeButton) closeButton.style.display = "none";
      if (contentWrapper) {
        contentWrapper.style.padding = "0";
        contentWrapper.style.borderRadius = "4px";
        contentWrapper.style.overflow = "hidden";
      }
    });

    // 2. 準備 Marker
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map: map.value,
      title: place.name,
      // 移除 icon 屬性以回復 Google Maps 預設的紅色圖釘造型
    });
    
    marker.placeId = place.id;

    // 3. 事件綁定
    marker.addListener("click", () => {
      store.setHoveredPlace(place.id);
      infoWindows.forEach((otherInfoWindow) => otherInfoWindow.close());
      infoWindow.open({
        map: map.value,
        anchor: marker,
      });
    });

    marker.addListener("mouseover", () => {
      store.setHoveredPlace(place.id);
    });

    marker.addListener("mouseout", () => {
      store.setHoveredPlace(null);
    });

    markers.push(marker);
    infoWindows.push(infoWindow);
  });
};

// 清除地圖上的標記
const clearMarkers = () => {
  markers.forEach((marker) => {
    marker.setMap(null); // 從地圖上移除標記
  });
  infoWindows.forEach((infoWindow) => {
    infoWindow.close();
  });
  markers = []; // 清空標記數組
  infoWindows = [];
};

// 設定事件監聽器以監控 Local Storage 資料變化
onMounted(async () => {
  try {
    await nextTick();
    if (!mapContainer.value) {
      throw new Error("地圖容器未掛載");
    }
    if (!map.value) {
      await initMap();
    }
    if (places.value && places.value.length > 0) {
      updateMarkers();
    }
  } catch (error) {
    console.error("mounted 鉤子發生錯誤:", error);
  }
});

onBeforeUnmount(() => {
  clearMarkers();
  if (map.value) {
    google.maps.event.clearInstanceListeners(map.value); // 清除地圖上的所有事件
    map.value = null; // 銷毀地圖
  }
});

import { useKeywordStore } from "@/stores/keywordStore.js";

const Search = useKeywordStore();

const places = computed(() => Search.result);
const districts = computed(() => Search.coordinate);

const photoGet = (photoId) => {
  if (!photoId) return "https://placehold.co/100x105?text=No+Photo";
  return `${import.meta.env.VITE_BACKEND_BASE_URL}/restaurants/photos/${photoId}`;
};

watch(
  () => places.value,
  (newPlaces) => {
    if (!map.value) {
      return;
    }
    if (newPlaces && newPlaces.length > 0) {
      updateMarkers(); // 數據更新時重新繪製標記
      map.value.setCenter(districts.value);
    } else {
      clearMarkers(); // 如果沒有地點，清空標記
    }
  },
  { immediate: true },
);
</script>
