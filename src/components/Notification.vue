<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { storeToRefs } from 'pinia'

const router = useRouter()
const auth = useAuth()
const notifStore = useNotificationStore()
const { notifications, unreadCount } = storeToRefs(notifStore)

const isDropdownOpen = ref(false)
const dropdownRef = ref(null)

const formatTime = (timestamp) => {
  const diffMin = Math.floor((Date.now() - new Date(timestamp)) / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} 小時前`
  return new Date(timestamp).toLocaleDateString('zh-TW')
}

const handleNotificationClick = async (notification) => {
  await notifStore.markAsRead(notification._id)
  isDropdownOpen.value = false
  if (notification.relatedType?.includes('article')) {
    router.push(`/articlelist/${notification.relatedId}`)
  } else if (notification.relatedType?.includes('restaurant')) {
    router.push(`/store/${notification.relatedId}`)
  }
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isDropdownOpen.value = false
  }
}

watch(() => auth.userData, (user) => {
  if (user?.id) {
    notifStore.initSocket(user.id)
    notifStore.fetchNotifications(user.id)
  } else {
    notifStore.disconnectSocket()
  }
}, { immediate: true })

onMounted(() => {
  if ('Notification' in window && window.Notification.permission !== 'granted') {
    window.Notification.requestPermission()
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click.stop="isDropdownOpen = !isDropdownOpen"
      class="hover:bg-amber-100 p-2 rounded-md relative"
    >
      <div class="flex items-center text-amber-500 whitespace-nowrap">
        <font-awesome-icon :icon="['fas', 'bell']" class="ml-1" />
        <span
          v-if="unreadCount > 0"
          class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-2 py-1 min-w-[20px] text-center"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>
    </button>

    <div
      v-if="isDropdownOpen"
      class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span class="text-sm font-semibold text-gray-700">通知</span>
        <button
          v-if="unreadCount > 0"
          @click="notifStore.markAllAsRead(auth.userData?.id)"
          class="text-xs text-amber-500 hover:text-amber-700 transition-colors"
        >
          全部標記已讀
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div
          v-for="notification in notifications"
          :key="notification._id"
          @click="handleNotificationClick(notification)"
          class="p-3 hover:bg-amber-50 cursor-pointer border-b border-gray-100 transition-colors"
          :class="{ 'bg-blue-50/40': !notification.read }"
        >
          <div class="flex items-start space-x-3">
            <img
              :src="notification.userImg || notification.metadata?.userImg || '/default-avatar.jpg'"
              class="w-10 h-10 rounded-full object-cover flex-shrink-0"
              alt="User avatar"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm">
                <span class="font-medium">{{ notification.userName || notification.metadata?.userName }}</span>
                {{ notifStore.getNotificationMessage(notification.actionType) }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {{ formatTime(notification.timestamp || notification.createdAt) }}
              </p>
            </div>
            <div
              v-if="!notification.read"
              class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"
            ></div>
          </div>
        </div>

        <div v-if="notifications.length === 0" class="p-4 text-center text-gray-400 text-sm">
          目前沒有通知
        </div>
      </div>
    </div>
  </div>
</template>
