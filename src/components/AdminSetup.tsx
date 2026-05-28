import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Key, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Logo from "./Logo";

export default function AdminSetup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/admin/setup/check")
      .then(res => res.json())
      .then(data => {
        if (data.hasAdmin) {
          navigate("/admin/login");
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        setError("Failed to connect to server. Please try again.");
        setLoading(false);
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

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-500 font-mono">Checking system status...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-2xl relative">
        <Link to="/" className="absolute top-6 left-6 text-neutral-500 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex justify-center mb-6 text-emerald-500">
          <Logo className="w-12 h-12" />
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
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition pr-10"
                placeholder="••••••••"
              />
              <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300"
              >
                 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded p-3 font-bold transition flex items-center justify-center gap-2 mt-4">
            <Key className="w-4 h-4" /> Initialize System
          </button>
        </form>
      </div>
    </div>
  );
}
