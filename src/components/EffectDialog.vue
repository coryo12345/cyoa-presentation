<template>
  <div v-if="state.dialog.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-gray-800 text-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
      <h2 class="text-xl font-semibold mb-4" v-html="state.dialog.title"></h2>
      <p class="mb-4 whitespace-pre-line" v-html="state.dialog.description"></p>
      <div class="flex justify-end gap-3">
        <button
          @click="close"
          class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { state } from '@/game/state';

function close() {
  state.dialog.show = false;
  if (state.dialog.callback && typeof state.dialog.callback === 'function') {
    state.dialog.callback();
  }
}
</script>
