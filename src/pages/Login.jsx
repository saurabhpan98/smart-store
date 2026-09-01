// src/pages/Login.jsx
import React, { useState } from 'react';
import { Lock, User, Store } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await window.api.auth.login({ username, password });
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('System login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 border border-slate-800">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Shop Admin Access</h1>
          <p className="text-xs text-slate-500">Enter local credentials to open store POS</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Store'}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-6">
          Default seed login: <b>admin</b> / <b>admin123</b>
        </p>
      </div>
    </div>
  );
}