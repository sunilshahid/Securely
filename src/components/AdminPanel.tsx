import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Key, Activity, Database, Clock, HardDrive, Plus, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { AdminStats, ApiKey } from "../types";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // TOTP State
  const [totpSetup, setTotpSetup] = useState<any>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [totpActive, setTotpActive] = useState(false); // mock locally, would normally fetch from profile

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    if (!token) return navigate("/admin/login");

    const fetchData = async () => {
      try {
        const statsRes = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsRes.status === 401) {
          localStorage.removeItem("adminToken");
          return navigate("/admin/login");
        }
        setStats(await statsRes.json());

        const keysRes = await fetch("/api/admin/api-keys", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setApiKeys(await keysRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = (e.target as any).label.value;
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ label })
    });
    const data = await res.json();
    setNewKey(data);
    setApiKeys([...apiKeys, {
      id: data.id,
      label: data.label,
      rateLimitQuota: data.rateLimitQuota,
      isActive: data.isActive,
      createdAt: data.createdAt
    }]);
  };

  const startTotpSetup = async () => {
    const res = await fetch("/api/admin/settings/totp/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setTotpSetup(await res.json());
  };

  const verifyTotpSetup = async () => {
    const res = await fetch("/api/admin/settings/totp/verify", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        totpCode: totpVerifyCode, 
        secret: totpSetup.secret,
        backupCodes: totpSetup.backupCodes
      })
    });
    if (res.ok) {
      setTotpActive(true);
      setTotpSetup({ ...totpSetup, verified: true });
    } else {
      alert("Invalid code");
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-emerald-500 font-mono p-8">Loading System Metrics...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-10 pb-6 border-b border-neutral-800">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Securely Control Plane</h1>
          </Link>
          <div className="flex gap-4">
            <Link to="/" className="text-sm px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded transition text-neutral-300">Public App</Link>
            <button 
              onClick={() => { localStorage.removeItem("adminToken"); navigate("/"); }}
              className="text-sm px-4 py-2 border border-neutral-700 hover:border-neutral-500 rounded transition text-neutral-300"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<Database />} title="Total Bins (All Time)" value={stats?.totalBinsAllTime || 0} />
          <StatCard icon={<Activity className="text-emerald-500" />} title="Active Bins" value={stats?.activeBins || 0} />
          <StatCard icon={<HardDrive />} title="Storage Used" value={formatBytes(stats?.storageSize || 0)} />
          <StatCard icon={<Clock />} title="Uptime" value={formatUptime(stats?.serverUptime || 0)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* API Keys Table */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-500" /> API Keys
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="text-xs uppercase bg-neutral-950 text-neutral-500">
                  <tr>
                    <th className="py-3 px-4 rounded-tl">Label</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 rounded-tr text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center">No API Keys provisioned.</td></tr>
                  ) : apiKeys.map(k => (
                    <tr key={k.id} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 transition">
                      <td className="py-3 px-4 font-medium text-white">{k.label}</td>
                      <td className="py-3 px-4">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${k.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {k.isActive ? "Active" : "Revoked"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 border-t border-neutral-800 pt-6">
              <form onSubmit={handleGenerateKey} className="flex gap-4">
                <input 
                   name="label" 
                   required 
                   placeholder="New API Key Label..." 
                   className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-4 py-2 text-white outline-none focus:border-emerald-500 transition"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium flex items-center gap-2 transition">
                  <Plus className="w-4 h-4" /> Create Key
                </button>
              </form>

              {newKey && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg relative">
                  <button onClick={() => setNewKey(null)} className="absolute top-2 right-2 text-emerald-500 hover:text-emerald-400"><X className="w-4 h-4" /></button>
                  <p className="text-sm text-emerald-400 font-medium mb-2">Save this key now. It will never be shown again.</p>
                  <code className="block w-full p-3 bg-neutral-950 border border-emerald-500/30 rounded font-mono text-emerald-300 break-all">
                    {newKey.rawKey}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Security Settings Area */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
            
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
                
                <div className="flex gap-2">
                  <input 
                    value={totpVerifyCode}
                    onChange={e => setTotpVerifyCode(e.target.value)}
                    placeholder="6-digit code"
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded p-2 text-white outline-none focus:border-emerald-500 text-center tracking-widest font-mono"
                  />
                  <button onClick={verifyTotpSetup} className="bg-emerald-600 hover:bg-emerald-500 px-4 rounded text-white font-medium text-sm transition">Verify</button>
                </div>
              </div>
            )}

            {totpSetup?.verified && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 p-3 rounded text-sm font-medium flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" /> 2FA Currently Active
                </div>

                <div className="mt-6 border-t border-neutral-800 pt-4">
                  <p className="text-sm font-medium text-red-400 mb-2">Emergency Recovery Codes</p>
                  <p className="text-xs text-neutral-500 mb-4">Save these safely. They are your only way in if you lose your phone.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {totpSetup.backupCodes.map((c: string, i: number) => (
                      <code key={i} className="bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-xs text-neutral-300 text-center">{c}</code>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
