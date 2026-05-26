import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Key } from "lucide-react";

export default function AdminSetup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/admin/setup/check")
      .then(res => res.json())
      .then(data => {
        if (data.hasAdmin) {
          navigate("/admin/login");
        }
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("adminToken", data.token);
      navigate("/admin/dashboard");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-2xl">
        <div className="flex justify-center mb-6 text-emerald-500">
          <Shield className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-2">Welcome to Securely</h1>
        <p className="text-center text-neutral-400 mb-8 text-sm">Initialize the master admin account.</p>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Master Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Master Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded p-3 font-bold transition flex items-center justify-center gap-2 mt-4">
            <Key className="w-4 h-4" /> Initialize System
          </button>
        </form>
      </div>
    </div>
  );
}
