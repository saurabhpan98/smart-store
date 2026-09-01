// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import ReorderList from './pages/ReorderList';
import CustomerKhata from './pages/CustomerKhata';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');
  const [shopName, setShopName] = useState('Smart Store');

  useEffect(() => {
    if (window.api?.settings?.get) {
      window.api.settings.get().then((data) => {
        if (data?.shop_name) setShopName(data.shop_name);
      });
    }
  }, [user]);

  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => setUser(null)}
        user={user}
        shopName={shopName}
      />
      <main className="flex-1 h-full overflow-hidden">
        {activeTab === 'pos' && <POS />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'reorder' && <ReorderList />}
        {activeTab === 'khata' && <CustomerKhata />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'settings' && (
          <Settings onSettingsUpdated={(s) => setShopName(s.shop_name)} />
        )}
      </main>
    </div>
  );
}