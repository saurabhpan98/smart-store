// src/components/Sidebar.jsx
import React from 'react';
import { ShoppingCart, Package, ShoppingBag, BarChart3, Settings as SettingsIcon, LogOut, Store, BookOpen, Receipt, Landmark } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout, user, shopName }) {
  const menuItems = [
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory Stock', icon: Package },
    { id: 'reorder', label: 'To-Order List', icon: ShoppingBag },
    { id: 'khata', label: 'Customer Khata (Udhaar)', icon: BookOpen },
    { id: 'register', label: 'Daily Cash Register', icon: Landmark },
    { id: 'expenses', label: 'Store Expenses', icon: Receipt },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Store Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 h-screen">
      <div>
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow">
            <Store className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm tracking-wide truncate text-slate-100">
              {shopName || 'Smart Store'}
            </h2>
            <p className="text-xs text-slate-400 truncate">{user?.username || 'Admin'}</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-all"
        >
          <LogOut className="h-4 w-4" /> Lock / Sign Out
        </button>
      </div>
    </aside>
  );
}