// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Store, Save, CheckCircle2, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

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

  // Admin Credentials State (Optional Independent Fields)
  const [credForm, setCredForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [credStatus, setCredStatus] = useState({ message: '', type: '' });

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

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    await window.api.settings.update(settings);
    setSaved(true);
    if (onSettingsUpdated) onSettingsUpdated(settings);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setCredStatus({ message: '', type: '' });

    if (!credForm.currentPassword) {
      setCredStatus({ message: 'Current password is required to authorize changes.', type: 'error' });
      return;
    }

    if (!credForm.newUsername.trim() && !credForm.newPassword.trim()) {
      setCredStatus({ message: 'Please enter a new Username OR a new Password to update.', type: 'error' });
      return;
    }

    if (credForm.newPassword && credForm.newPassword !== credForm.confirmPassword) {
      setCredStatus({ message: 'New passwords do not match!', type: 'error' });
      return;
    }

    try {
      const res = await window.api.auth.changeCredentials({
        currentPassword: credForm.currentPassword,
        newUsername: credForm.newUsername,
        newPassword: credForm.newPassword
      });

      if (res.success) {
        setCredStatus({ message: res.message || 'Credentials updated successfully!', type: 'success' });
        setCredForm({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
      } else {
        setCredStatus({ message: res.message || 'Failed to update credentials', type: 'error' });
      }
    } catch (err) {
      setCredStatus({ message: 'Error updating credentials', type: 'error' });
    }
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto space-y-6">
      {/* 1. Store Profile Settings */}
      <div className="max-w-3xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Store Profile & Settings</h1>
            <p className="text-xs text-slate-500">Configure your shop name and details displayed on bills & receipts.</p>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm">
            <CheckCircle2 className="h-4 w-4" /> Store settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSettingsSubmit} className="space-y-4 text-sm">
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

      {/* 2. Admin Username & Password Change */}
      <div className="max-w-3xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Admin Login Security</h2>
            <p className="text-xs text-slate-500">Update username, password, or both. Leave blank what you don't want to change.</p>
          </div>
        </div>

        {credStatus.message && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            credStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {credStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {credStatus.message}
          </div>
        )}

        <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password (Required) *</label>
            <input
              required
              type="password"
              placeholder="Enter current password to verify identity"
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={credForm.currentPassword || ''}
              onChange={(e) => setCredForm({ ...credForm, currentPassword: e.target.value })}
            />
          </div>

          <div className="border-t pt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">New Username (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty if you don't want to change username"
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={credForm.newUsername || ''}
              onChange={(e) => setCredForm({ ...credForm, newUsername: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New Password (Optional)</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={credForm.newPassword || ''}
                onChange={(e) => setCredForm({ ...credForm, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={credForm.confirmPassword || ''}
                onChange={(e) => setCredForm({ ...credForm, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition"
            >
              <KeyRound className="h-4 w-4" /> Save Security Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}