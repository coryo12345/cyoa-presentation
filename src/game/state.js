import { PAGES } from './pages';
import { useStorage } from '@vueuse/core';
import { reactive } from 'vue';
import { ITEM_MAP } from './items';
import { endings } from './endings';

// TODO - third quest area

const storedState = useStorage('cyoa-app', {
  /** @type {string[]} */
  history: ['main_menu'],
  /** @type {Record<string, string[]>} */
  actionsTaken: {},
  /** @type {string[]} */
  inventory: [],
  allowCheckpoints: true,
});

const checkpoint = useStorage('cyoa-app-checkpoint', '');

export const state = reactive({
  restart() {
    storedState.value.history = ['main_menu'];
    storedState.value.inventory = [];
    storedState.value.actionsTaken = {};
    checkpoint.value = '';
    return false;
  },
  set allowCheckpoints(allow) {
    storedState.value.allowCheckpoints = !!allow;
  },
  get allowCheckpoints() {
    return storedState.value.allowCheckpoints;
  },
  /**
   * @returns {import('@/game/pages').Page}
   */
  get currentPage() {
    let page = PAGES.find((page) => page.id === storedState.value.history[storedState.value.history.length - 1]);
    while (!page) {
      storedState.value.history.pop();
      page = PAGES.find((page) => page.id === storedState.value.history[storedState.value.history.length - 1]);
    }
    return page;
  },
  /**
   * Attempts to take a link.
   * @param {import('@/game/pages').PageLink} link
   */
  takeLink(link) {
    if (typeof link.onLink === 'function' && link.onLink() === false) {
      return;
    }
    this.goTo(link.link_to);
  },
  /**
   * @param {string} pageId
   */
  goTo(pageId) {
    storedState.value.history.push(pageId);
    const page = PAGES.find((p) => p.id === pageId);
    if (page?.isEnding) {
      endings.addAchievedEnding(pageId);
    }
  },
  /**
   * @returns {import('@/game/items').Item[]}
   */
  get inventory() {
    return storedState.value.inventory.map((id) => ITEM_MAP[id]);
  },
  /**
   * @param {import('@/game/items').Item | string} item
   * @param {number} count
   */
  addItem(item, count = 1) {
    for (let i = 0; i < count; i++) {
      if (typeof item === 'object') {
        storedState.value.inventory.push(item.id);
      } else {
        storedState.value.inventory.push(item);
      }
    }
  },
  /**
   * @param {import('@/game/items').Item | string} item
   * @param {number} count
   */
  removeItem(item, count = 1) {
    const id = typeof item === 'object' ? item.id : item;
    while (count > 0 && storedState.value.inventory.includes(id)) {
      let idx = storedState.value.inventory.findIndex((itemId) => itemId === id);
      storedState.value.inventory.splice(idx, 1);
      count--;
    }
  },
  dialog: {
    show: false,
    title: '',
    description: '',
    callback: null,
  },
  /**
   * @param {string} title
   * @param {string} description
   * @param {() => void} callback
   */
  openDialog(title, description, callback = null) {
    this.dialog.show = true;
    this.dialog.title = interpolateItemNames(title, true).text;
    this.dialog.description = interpolateItemNames(description, true).text;
    this.dialog.callback = callback;
  },
  /**
   * @param {import('@/game/pages').Page} page
   * @param {import('@/game/pages').PageAction} action
   */
  takeAction(page, action) {
    if (typeof action.condition === 'function' && !action.condition()) {
      return;
    }
    let lockAction = true;
    if (typeof action.action === 'function') {
      if (action.action() === false) {
        lockAction = false;
      }
    } else if (action.effect) {
      const { text, items } = interpolateItemNames(action.effect, true);
      if (items.length) {
        items.forEach((item) => this.addItem(item.id));
      }
      this.openDialog(interpolateItemNames(action.name, true).text, text);
    }
    if (!storedState.value.actionsTaken[page.id]) {
      storedState.value.actionsTaken[page.id] = [];
    }
    if (lockAction) {
      storedState.value.actionsTaken[page.id].push(action.name);
    }
  },
  get getAvailableActions() {
    return (
      this.currentPage.actions?.filter(
        (action) =>
          !storedState.value.actionsTaken[this.currentPage.id]?.includes(action.name) &&
          (typeof action.condition === 'function' ? action.condition() : true),
      ) ?? []
    );
  },
  saveCheckpoint() {
    checkpoint.value = JSON.stringify(storedState.value);
  },
  /**
   * @returns {boolean} true if we need to navigate to the next link because something went wrong. false if checkpoint was loaded successfully.
   */
  loadCheckpoint() {
    if (!checkpoint.value || !checkpoint.value.length) {
      return true;
    }
    try {
      storedState.value = JSON.parse(checkpoint.value);
    } catch (e) {
      console.error('Error loading checkpoint', e);
      return true;
    }
    return false;
  },
  getCheckpointInfo() {
    try {
      return JSON.parse(checkpoint.value);
    } catch (e) {
      return null;
    }
  },
  hasCheckpoint() {
    return !!checkpoint.value && checkpoint.value.length > 0;
  },
  /**
   * Debug methods for the debug app. NOT to be used for the actual game.
   * These methods DO NOT handle edge cases, or trigger the appropriate events.
   */
  debug: {
    /**
     * @returns a copy of the current state for debug purposes
     */
    getFullState() {
      return JSON.parse(JSON.stringify(storedState.value));
    },
    /**
     *
     * @param {string} pageId
     * @param {string} actionName
     */
    removeAction(pageId, actionName) {
      if (!storedState.value.actionsTaken[pageId]) {
        storedState.value.actionsTaken[pageId] = [];
      }
      storedState.value.actionsTaken[pageId] = storedState.value.actionsTaken[pageId].filter((a) => a !== actionName);
    },
  },
});

/**
 * @param {string} text
 * @returns {{text: string, items: (import('@/game/items').Item)[]}}
 */
export function interpolateItemNames(str, useHtml = false) {
  const items = [];
  const text = str.replaceAll(/\[([^\[]*)\]/g, (match, name) => {
    if (!match) return '';
    const item = ITEM_MAP[name];
    if (!item) return match;
    items.push(item);
    return useHtml ? `<span class="underline italic text-gray-200">${item.name}</span>` : item.name;
  });

  return { text, items };
}
