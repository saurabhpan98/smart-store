// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Store, Save, CheckCircle2 } from 'lucide-react';

export default function Settings({ onSettingsUpdated }) {
  const [settings, setSettings] = useState({
    shop_name: '',
    owner_name: '',
    phone: '',
    address: '',
    gstin: '',
    receipt_footer: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await window.api.settings.get();
      if (data) setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await window.api.settings.update(settings);
    setSaved(true);
    if (onSettingsUpdated) onSettingsUpdated(settings);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Store Profile & Settings</h1>
            <p className="text-xs text-slate-500">Configure your shop name and details displayed on bills.</p>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm">
            <CheckCircle2 className="h-4 w-4" /> Store settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Shop / Store Name *</label>
              <input
                required
                type="text"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={settings.shop_name || ''}
                onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner / Manager Name</label>
              <input
                type="text"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={settings.owner_name || ''}
                onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Store Phone Number</label>
              <input
                type="text"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">GSTIN / Tax ID (Optional)</label>
              <input
                type="text"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={settings.gstin || ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Shop Address</label>
            <textarea
              rows="2"
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Receipt Footer Note</label>
            <input
              type="text"
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={settings.receipt_footer || ''}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              <Save className="h-4 w-4" /> Save Store Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}