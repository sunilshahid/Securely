import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Key, Activity, Database, Clock, HardDrive, Plus, X, Trash2, Eye, EyeOff, Check, LayoutDashboard, Settings, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Logo from "./Logo";

import { AdminStats, ApiKey } from "../types";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"dashboard" | "keys" | "settings">("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // TOTP State
  const [totpSetup, setTotpSetup] = useState<any>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [totpActive, setTotpActive] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState({ text: "", type: "" });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecoveryCodes, setCopiedRecoveryCodes] = useState(false);

  const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
  const usedBackupCode = localStorage.getItem("adminUsedBackupCode") === "true" || sessionStorage.getItem("adminUsedBackupCode") === "true";

  const fetchData = async () => {
    try {
      const statsRes = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.status === 401) {
        localStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminToken");
        return navigate("/admin/login");
      }
      setStats(await statsRes.json());

      const keysRes = await fetch("/api/admin/api-keys", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApiKeys(await keysRes.json());
      
      const totpRes = await fetch("/api/admin/settings/totp/status", {
         headers: { Authorization: `Bearer ${token}` }
      });
      const totpData = await totpRes.json();
      setTotpActive(totpData.enabled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [token, navigate]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = (e.target as any).label.value;
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ label })
    });
    const data = await res.json();
    setNewKey(data);
    setApiKeys([...apiKeys, {
      id: data.id,
      label: data.label,
      rateLimitQuota: data.rateLimitQuota,
      isActive: data.isActive,
      createdAt: data.createdAt,
      requestCount: data.requestCount || 0
    }]);
    (e.target as HTMLFormElement).reset();
  };

  const handleDeleteKey = async (id: string) => {
    const res = await fetch(`/api/admin/api-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setApiKeys(apiKeys.filter(k => k.id !== id));
    }
  };

  const startTotpSetup = async () => {
    const res = await fetch("/api/admin/settings/totp/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setTotpSetup(await res.json());
  };

  const [totpVerifyError, setTotpVerifyError] = useState("");

  const verifyTotpSetup = async () => {
    setTotpVerifyError("");
    const res = await fetch("/api/admin/settings/totp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ 
        totpCode: totpVerifyCode, 
        secret: totpSetup.secret,
        backupCodes: totpSetup.backupCodes
      })
    });
    if (res.ok) {
      setTotpActive(true);
      setTotpSetup({ ...totpSetup, verified: true });
      localStorage.removeItem("adminUsedBackupCode");
      sessionStorage.removeItem("adminUsedBackupCode");
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setTotpVerifyError(data.error || "Invalid code");
    }
  };

  const disableTotp = async () => {
    const res = await fetch("/api/admin/settings/totp/disable", {
       method: "POST",
       headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
       setTotpActive(false);
       setTotpSetup(null);
       localStorage.removeItem("adminUsedBackupCode");
       sessionStorage.removeItem("adminUsedBackupCode");
       window.location.reload();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg({ text: "", type: "" });
    const res = await fetch("/api/admin/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMsg({ text: "Password updated successfully.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setPwdMsg({ text: data.error || "Failed to update password.", type: "error" });
    }
  };

  const handleCopySecret = () => {
    if (!totpSetup?.secret) return;
    navigator.clipboard.writeText(totpSetup.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    if (!totpSetup?.backupCodes) return;
    navigator.clipboard.writeText(totpSetup.backupCodes.join("\n"));
    setCopiedRecoveryCodes(true);
    setTimeout(() => setCopiedRecoveryCodes(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-emerald-500 font-mono p-8 flex items-center justify-center">Loading Control Plane...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-neutral-800 gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Securely Control Plane</h1>
          </Link>
          <div className="flex gap-4">
            <Link to="/" className="text-sm px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded transition text-neutral-300">Public App</Link>
            <button 
              onClick={() => { localStorage.removeItem("adminToken"); sessionStorage.removeItem("adminToken"); localStorage.removeItem("adminUsername"); navigate("/"); }}
              className="text-sm px-4 py-2 border border-neutral-700 hover:border-neutral-500 rounded transition text-neutral-300"
            >
              Sign Out
            </button>
          </div>
        </header>

        {usedBackupCode && (
          <div className="mb-6 bg-red-500/10 border border-red-500 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 justify-between animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="text-red-400 font-bold text-sm sm:text-base">Security Alert: Backup Code Used</p>
                <p className="text-xs sm:text-sm text-red-300/80">You recovered your account using a backup code. You should immediately delete and re-setup your 2FA in Settings.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("settings")}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold text-sm shrink-0 transition"
            >
              Go to Settings
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-neutral-900 border border-neutral-800 p-1 rounded-lg w-full sm:w-max mx-auto sm:mx-0 shadow-sm">
          <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />} label="Dashboard" />
          <TabButton active={activeTab === "keys"} onClick={() => setActiveTab("keys")} icon={<Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />} label="API Keys" />
          <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />} label="Settings" />
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
           <div className="animate-in fade-in zoom-in-95 duration-200">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
               <StatCard icon={<Database />} title="Total Bins (All Time)" value={stats?.totalBinsAllTime || 0} />
               <StatCard icon={<Activity className="text-emerald-500" />} title="Active Bins" value={stats?.activeBins || 0} />
               <StatCard icon={<HardDrive />} title="Storage Used" value={formatBytes(stats?.storageSize || 0)} />
               <StatCard icon={<Clock />} title="Uptime" value={formatUptime(stats?.serverUptime || 0)} />
             </div>
             
             <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-12">
               <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                 <Shield className="w-5 h-5 text-red-500" /> Security Alerts (Brute Force Blocks)
               </h2>
               {stats?.securityLogs && stats.securityLogs.length > 0 ? (
                 <div className="space-y-3">
                   {stats.securityLogs.map(log => (
                     <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                       <span className="text-red-400 font-mono text-sm tracking-wide">IP: {log.ip}</span>
                       <span className="text-xs text-neutral-400">{new Date(log.timestamp).toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-sm text-neutral-500 italic">No security alerts detected. System is secure.</div>
               )}
             </div>
           </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "keys" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-500" /> API Keys Management
              </h2>
            </div>
            
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="text-xs uppercase bg-neutral-950 text-neutral-500">
                  <tr>
                    <th className="py-3 px-4 rounded-tl">Label</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Requests</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 rounded-tr text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center">No API Keys provisioned.</td></tr>
                  ) : apiKeys.map(k => (
                    <tr key={k.id} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 transition relative group">
                      <td className="py-3 px-4 font-medium text-white">{k.label}</td>
                      <td className="py-3 px-4">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{k.requestCount || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${k.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {k.isActive ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                         <button onClick={() => handleDeleteKey(k.id)} className="text-neutral-500 hover:text-red-400 transition" title="Delete API Key">
                            <Trash2 className="w-4 h-4 ml-auto" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-bold text-white mb-4">Generate New API Key</h3>
              <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-4">
                <input 
                   name="label" 
                   required 
                   placeholder="e.g., Backup Server, CI/CD..." 
                   className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-4 py-2 text-white outline-none focus:border-emerald-500 transition"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 transition">
                  <Plus className="w-4 h-4" /> Create Key
                </button>
              </form>

              {newKey && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg relative break-all animate-in fade-in">
                  <button type="button" onClick={() => setNewKey(null)} className="absolute top-2 right-2 text-emerald-500 hover:text-emerald-400"><X className="w-4 h-4" /></button>
                  <p className="text-sm text-emerald-400 font-medium mb-2 pr-6 flex items-center gap-2"><Check className="w-4 h-4"/> Save this key now. It will never be shown again.</p>
                  <code className="block w-full p-3 bg-neutral-950 border border-emerald-500/30 rounded font-mono text-emerald-300 break-all mb-4">
                    {newKey.rawKey}
                  </code>
                  
                  <p className="text-sm text-emerald-400 font-medium mb-2">API Endpoint URLs:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2 items-center">
                       <span className="font-mono bg-neutral-950 px-2 py-1 rounded text-neutral-400 border border-neutral-800 shrink-0">POST</span>
                       <code className="bg-neutral-950 border border-emerald-500/30 rounded px-2 py-1 font-mono text-emerald-300 truncate">{window.location.origin}/api/v1/bin</code>
                    </div>
                    <div className="flex gap-2 items-center">
                       <span className="font-mono bg-neutral-950 px-2 py-1 rounded text-neutral-400 border border-neutral-800 shrink-0">GET </span>
                       <code className="bg-neutral-950 border border-emerald-500/30 rounded px-2 py-1 font-mono text-emerald-300 truncate">{window.location.origin}/api/v1/bin/:id</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Password Management */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Change Master Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-neutral-400 mb-1">Current Password</label>
                   <div className="relative">
                     <input 
                       type={showCurrentPwd ? "text" : "password"}
                       required
                       value={currentPassword}
                       onChange={e => setCurrentPassword(e.target.value)}
                       className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition pr-10"
                       placeholder="••••••••"
                     />
                     <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300">
                        {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-neutral-400 mb-1">New Password</label>
                   <div className="relative">
                     <input 
                       type={showNewPwd ? "text" : "password"}
                       required
                       value={newPassword}
                       onChange={e => setNewPassword(e.target.value)}
                       className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 transition pr-10"
                       placeholder="••••••••"
                     />
                     <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300">
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                 </div>
                 {pwdMsg.text && (
                    <div className={`p-3 rounded text-sm ${pwdMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {pwdMsg.text}
                    </div>
                 )}
                 <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded p-3 font-bold transition">
                    Update Password
                 </button>
              </form>
            </div>

            {/* TOTP Settings Area */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
                {totpActive && (
                   <button onClick={disableTotp} className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded transition border border-red-500/20">
                     Disable 2FA
                   </button>
                )}
              </div>
              
              {!totpActive && !totpSetup && (
                <div className="text-center p-6 border border-dashed border-neutral-700 rounded-lg">
                  <Shield className="w-8 h-8 text-neutral-500 mx-auto mb-3" />
                  <h3 className="text-white font-medium mb-1">Protect Admin Session</h3>
                  <p className="text-xs text-neutral-400 mb-4">Enable Time-Based One-Time Password (TOTP)</p>
                  <button onClick={startTotpSetup} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded text-sm transition border border-neutral-700">
                    Setup 2FA
                  </button>
                </div>
              )}

              {totpSetup && !totpSetup.verified && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg inline-block text-center w-full">
                    <QRCodeSVG value={totpSetup.uri} size={150} className="mx-auto" />
                  </div>
                  <p className="text-xs text-neutral-400 text-center">Scan with Google Authenticator or Authy</p>
                  
                  <div 
                    onClick={handleCopySecret}
                    className="bg-neutral-950 border border-neutral-800 p-3 text-center rounded-lg cursor-pointer hover:border-emerald-500/50 transition group"
                  >
                    <p className="text-xs text-neutral-500 mb-2">Or enter manual setup key (click to copy):</p>
                    <div className="flex justify-center items-center gap-2">
                       <code className="text-sm text-emerald-400 font-mono tracking-wider break-all">{totpSetup.secret}</code>
                       {copiedSecret ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400 shrink-0 transition" />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 h-[42px]">
                      <input 
                        value={totpVerifyCode}
                        onChange={e => setTotpVerifyCode(e.target.value)}
                        placeholder="6-digit code"
                        className="flex-1 min-w-0 h-full bg-neutral-950 border border-neutral-700 rounded-md px-3 text-white outline-none focus:border-emerald-500 text-center tracking-widest font-mono text-sm sm:text-base"
                      />
                      <button onClick={verifyTotpSetup} className="bg-emerald-600 hover:bg-emerald-500 px-6 h-full shrink-0 items-center justify-center rounded-md text-white font-medium text-sm transition">Verify</button>
                    </div>
                    {totpVerifyError && <p className="text-red-400 text-xs font-medium text-center">{totpVerifyError}</p>}
                  </div>
                </div>
              )}

              {totpActive && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 p-3 rounded text-sm font-medium flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" /> 2FA is Active and Required
                  </div>

                  {totpSetup?.verified && (
                    <div className="mt-6 border-t border-neutral-800 pt-4">
                      <p className="text-sm font-medium text-red-400 mb-2">Emergency Recovery Codes</p>
                      <p className="text-xs text-neutral-500 mb-4">Save these safely. They are your only way in if you lose your phone.</p>
                      <div 
                        onClick={handleCopyBackupCodes}
                        className="grid grid-cols-2 gap-2 p-3 bg-neutral-950/50 border border-neutral-800 rounded-lg cursor-pointer hover:border-emerald-500/50 transition group relative"
                      >
                        {totpSetup.backupCodes.map((c: string, i: number) => (
                          <div key={i} className="bg-neutral-900 border border-neutral-800 px-2 py-1.5 rounded text-xs text-neutral-300 text-center font-mono tracking-wider">{c}</div>
                        ))}
                        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                           {copiedRecoveryCodes ? (
                              <span className="flex items-center gap-2 text-emerald-400 font-medium text-sm"><Check className="w-5 h-5"/> Copied all codes!</span>
                           ) : (
                              <span className="flex items-center gap-2 text-white font-medium text-sm"><Copy className="w-5 h-5"/> Click to copy all</span>
                           )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
   return (
      <button 
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 px-2 py-2 sm:px-4 sm:py-2 flex-1 sm:flex-none rounded-md text-[11px] sm:text-sm font-medium transition whitespace-nowrap ${active ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
      >
        {icon} {label}
      </button>
   );
}

function StatCard({ icon, title, value }: any) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex items-center gap-4">
      <div className="bg-neutral-800 p-3 rounded-lg text-neutral-400">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-neutral-500">{title}</div>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

// Utils
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
