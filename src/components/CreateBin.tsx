import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Plus, Lock, Files, Clock, Save, Download } from "lucide-react";
import { generateRandomKey, deriveKeyFromPassword, encryptData, exportKeyBase64 } from "../crypto";

export default function CreateBin() {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiryHours, setExpiryHours] = useState(24);
  const [password, setPassword] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [theme, setTheme] = useState("dark"); // just a dummy theme setting

  const handleCreate = async () => {
    if (!content.trim() && !file) return;
    setIsEncrypting(true);

    try {
      let key: CryptoKey;
      let saltStr: string | undefined;
      if (password) {
        const derived = await deriveKeyFromPassword(password);
        key = derived.key;
        saltStr = derived.salt;
      } else {
        key = await generateRandomKey();
      }

      // Serialize the payload text
      const textPayload = JSON.stringify({
        text: content,
        theme,     // Customization setting stored encrypted
        filename: file ? file.name : null,
        mimeType: file ? file.type : null,
        salt: saltStr // Only stored inside the encrypted text to be extracted on decryption if needed? Wait. If using password, they need the salt. 
        // Best approach for PBKDF2: the salt shouldn't be encrypted, it should be public.
      });

      // Encrypt Text
      const textEncResult = await encryptData(key, textPayload);

      // Encrypt File
      let fileEncResult = null;
      if (file) {
        const fileBuffer = await file.arrayBuffer();
        fileEncResult = await encryptData(key, fileBuffer);
      }

      const binId = Math.random().toString(36).substring(2, 10);
      const hostUrl = window.location.origin;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      // Post to API
      const response = await fetch("/api/v1/bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          binId,
          encryptedTextBlob: textEncResult.encryptedBlob,
          encryptedFileBlob: fileEncResult ? fileEncResult.encryptedBlob : null,
          ivText: textEncResult.iv,
          ivFile: fileEncResult ? fileEncResult.iv : null,
          isPasswordProtected: !!password,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to upload to server");

      let shareUrl = `${hostUrl}/v/${binId}`;
      if (password) {
        // Embed the salt in the hash if using a password so the client knows it
        shareUrl += `#pwdSalt=${saltStr}`;
      } else {
        const base64Key = await exportKeyBase64(key);
        shareUrl += `#key=${base64Key}`;
      }

      setResultUrl(shareUrl);
    } catch (e) {
      console.error(e);
      alert("Encryption failed.");
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Securely</h1>
          </div>
          <Link to="/admin" className="text-sm text-neutral-400 hover:text-emerald-400 transition">Admin Panel</Link>
        </header>

        {resultUrl ? (
          <div className="bg-neutral-800 border border-emerald-500/30 p-8 rounded-xl text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Your zero-knowledge bin is secured.</h2>
            <p className="text-neutral-400">The server does not know your key. Do not lose this URL!</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={resultUrl} 
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-neutral-300 font-mono text-sm"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(resultUrl)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded font-medium transition"
              >
                Copy
              </button>
            </div>
            <div className="pt-4">
              <button onClick={() => {setResultUrl(""); setContent(""); setFile(null); setPassword("");}} className="text-emerald-400 hover:underline">Create another</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 focus-within:border-emerald-500/50 transition duration-200">
                <textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste your secrets, logs, or sensitive markdown here..."
                  className="w-full h-80 bg-transparent resize-none p-6 text-neutral-300 outline-none font-mono text-sm"
                />
              </div>

              {/* File Drop Placeholder */}
              <div className="bg-neutral-800 border border-dashed border-neutral-700 rounded-xl p-6 relative">
                <input 
                  type="file" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <div className="flex flex-col items-center justify-center text-neutral-500 pointer-events-none">
                  {file ? (
                    <>
                      <Files className="w-8 h-8 mb-2 text-emerald-500" />
                      <p className="text-emerald-400">{file.name}</p>
                    </>
                  ) : (
                    <>
                      <Plus className="w-8 h-8 mb-2" />
                      <p>Drag and drop or click to attach an encrypted file</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2 font-medium">
                    <Clock className="w-4 h-4" /> Expires In
                  </label>
                  <select 
                    value={expiryHours} 
                    onChange={e => setExpiryHours(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-neutral-300 outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={24}>1 Day</option>
                    <option value={72}>3 Days</option>
                    <option value={168}>1 Week</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2 font-medium">
                    <Lock className="w-4 h-4" /> Password (Optional)
                  </label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Leave empty for auto-key"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-neutral-300 outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-neutral-500 mt-2">If provided, the URL will not contain the key. Recipients must enter it manually.</p>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isEncrypting || (!content.trim() && !file)}
                    onClick={handleCreate}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded p-4 font-semibold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                  >
                    {isEncrypting ? "Encrypting Locally..." : "Seal & Generate Link"}
                    {!isEncrypting && <Lock className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
