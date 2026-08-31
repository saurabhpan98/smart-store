import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import ReorderList from './pages/ReorderList';
import Analytics from './pages/Analytics';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');

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
      />
      <main className="flex-1 h-full overflow-hidden">
        {activeTab === 'pos' && <POS />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'reorder' && <ReorderList />}
        {activeTab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}