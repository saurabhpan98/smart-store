// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (creds) => ipcRenderer.invoke('auth:login', creds),
  },
  inventory: {
    getAll: () => ipcRenderer.invoke('inventory:getAll'),
    saveItem: (item) => ipcRenderer.invoke('inventory:saveItem', item),
    deleteItem: (id) => ipcRenderer.invoke('inventory:deleteItem', id),
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (cat) => ipcRenderer.invoke('categories:create', cat),
  },
  pos: {
    checkout: (data) => ipcRenderer.invoke('pos:checkout', data),
  },
  analytics: {
    getData: () => ipcRenderer.invoke('analytics:getData'),
  },
  backup: {
    exportDb: () => ipcRenderer.invoke('db:backup'),
  },
  orders: {
    getAll: () => ipcRenderer.invoke('orders:getAll'),
    add: (order) => ipcRenderer.invoke('orders:add', order),
    moveToInventory: (orderId) => ipcRenderer.invoke('orders:moveToInventory', orderId),
    delete: (id) => ipcRenderer.invoke('orders:delete', id),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data) => ipcRenderer.invoke('settings:update', data),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  }
});