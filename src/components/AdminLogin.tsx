import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Logo from "./Logo";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [useBackupMode, setUseBackupMode] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  useEffect(() => {
    const savedUsername = localStorage.getItem("adminUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, totpCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (data.requireTotp) {
          setRequireTotp(true);
          return;
        }
        throw new Error(data.error);
      }

      if (rememberMe) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUsername", username);
        if (data.usedBackupCode) {
          localStorage.setItem("adminUsedBackupCode", "true");
        } else {
          localStorage.removeItem("adminUsedBackupCode");
        }
      } else {
        sessionStorage.setItem("adminToken", data.token);
        if (data.usedBackupCode) {
          sessionStorage.setItem("adminUsedBackupCode", "true");
        } else {
          sessionStorage.removeItem("adminUsedBackupCode");
        }
        localStorage.removeItem("adminUsername");
      }
      navigate("/admin/dashboard");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-2xl relative">
        <Link to="/" className="absolute top-6 left-6 text-neutral-500 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex justify-center mb-6 text-emerald-500">
          <Logo className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-8">Admin Access</h1>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requireTotp ? (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Username</label>
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
                <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
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
              <div className="flex items-center mt-2">
                <input 
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500 bg-neutral-950 accent-emerald-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-neutral-400">
                  Remember me
                </label>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1 flex justify-between items-end">
                 <span>{useBackupMode ? "Emergency Backup Code" : "Authenticator Code (TOTP)"}</span>
              </label>
              <input 
                type="text" 
                required
                autoFocus
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                className={`w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition font-mono tracking-widest text-center ${useBackupMode ? "text-lg" : "text-xl"}`}
                placeholder={useBackupMode ? "8-character code" : "123456"}
              />
              {!useBackupMode && (
                <button
                   type="button"
                   onClick={() => setUseBackupMode(true)}
                   className="text-xs text-neutral-500 hover:text-emerald-400 transition mt-3 text-left block"
                >
                   Lost access to your authenticator?
                </button>
              )}
            </div>
          )}
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded p-3 font-bold transition flex items-center justify-center gap-2 mt-4">
            <Lock className="w-4 h-4" /> {requireTotp ? (useBackupMode ? "Recover Account" : "Verify 2FA") : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
