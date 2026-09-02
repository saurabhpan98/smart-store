// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (creds) => ipcRenderer.invoke('auth:login', creds),
    changeCredentials: (data) => ipcRenderer.invoke('auth:changeCredentials', data),
  },
  inventory: {
    getAll: () => ipcRenderer.invoke('inventory:getAll'),
    saveItem: (item) => ipcRenderer.invoke('inventory:saveItem', item),
    deleteItem: (id) => ipcRenderer.invoke('inventory:deleteItem', id),
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (cat) => ipcRenderer.invoke('categories:create', cat),
    update: (cat) => ipcRenderer.invoke('categories:update', cat),
    delete: (id) => ipcRenderer.invoke('categories:delete', id),
  },
  pos: {
    checkout: (data) => ipcRenderer.invoke('pos:checkout', data),
  },
  credit: {
    getAll: () => ipcRenderer.invoke('credit:getAll'),
    settlePayment: (data) => ipcRenderer.invoke('credit:settlePayment', data),
  },
  analytics: {
    getData: () => ipcRenderer.invoke('analytics:getData'),
  },
  backup: {
    exportDb: () => ipcRenderer.invoke('db:backup'),
  },
  orders: {
    getAll: () => ipcRenderer.invoke('orders:getAll'),
    save: (order) => ipcRenderer.invoke('orders:save', order),
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