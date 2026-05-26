import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Shield, LockOpen, Unlock, AlertTriangle, Download, FileText } from "lucide-react";
import { deriveKeyFromPassword, importKeyBase64, decryptData } from "../crypto";

export default function ViewBin() {
  const { binId } = useParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [binData, setBinData] = useState<any>(null);
  
  const [decryptedText, setDecryptedText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const [salt, setSalt] = useState<string | null>(null);
  const [base64Key, setBase64Key] = useState<string | null>(null);

  useEffect(() => {
    // Parse URL hash for key or salt
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const k = hashParams.get("key");
    const s = hashParams.get("pwdSalt");

    if (k) setBase64Key(k);
    if (s) setSalt(s);

    const fetchBin = async () => {
      try {
        const res = await fetch(`/api/v1/bin/${binId}`);
        if (res.status === 404) throw new Error("Bin not found or expired.");
        if (!res.ok) throw new Error("Could not retrieve bin.");
        
        const data = await res.json();
        setBinData(data);

        if (data.isPasswordProtected) {
          setNeedsPassword(true);
          setLoading(false);
        } else {
          if (!k) throw new Error("Missing decryption key in URL.");
          await performDecryption(data, null, k);
        }
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };

    fetchBin();
  }, [binId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await performDecryption(binData, password, null);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const performDecryption = async (data: any, pwd: string | null, b64Key: string | null) => {
    try {
      let key: CryptoKey;
      if (pwd) {
        if (!salt) throw new Error("Missing salt in URL hash for password derivation.");
        const derived = await deriveKeyFromPassword(pwd, salt);
        key = derived.key;
      } else if (b64Key) {
        key = await importKeyBase64(b64Key);
      } else {
        throw new Error("No key material available.");
      }

      // Decrypt text
      const textBuffer = await decryptData(key, data.encryptedTextBlob, data.ivText);
      const textJson = new TextDecoder().decode(textBuffer);
      const parsed = JSON.parse(textJson);

      // Sanitize standard text
      const html = await marked(parsed.text || "");
      const cleanHtml = DOMPurify.sanitize(html);
      setDecryptedText(cleanHtml);

      if (parsed.filename && data.encryptedFileBlob && data.ivFile) {
        setFileName(parsed.filename);
        const fileBuffer = await decryptData(key, data.encryptedFileBlob, data.ivFile);
        const blob = new Blob([fileBuffer], { type: parsed.mimeType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      }

      setLoading(false);
      setNeedsPassword(false);
    } catch (err: any) {
       console.error("Decryption failed:", err);
       throw new Error("Cannot decrypt. Invalid key or corrupted data.");
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-500 font-mono">Decrypting locally...</div>;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white hover:text-emerald-400 transition">Securely</h1>
          </Link>
        </header>

        {error ? (
          <div className="bg-red-500/10 border border-red-500 p-8 rounded-xl text-center text-red-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Accessing Bin</h2>
            <p>{error}</p>
          </div>
        ) : needsPassword ? (
          <div className="max-w-md mx-auto bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center shadow-2xl">
            <LockOpen className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Password Required</h2>
            <p className="text-neutral-400 mb-6 text-sm">This bin was encrypted with a custom password.</p>
            <form onSubmit={handlePasswordSubmit}>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 mb-4"
                placeholder="Enter password..."
              />
              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded py-3 font-semibold transition"
              >
                Decrypt
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-neutral-800 rounded-xl p-8 border border-neutral-700 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-6">
                <Unlock className="w-4 h-4" />
                Decrypted Locally
              </div>
              
              <div 
                className="prose prose-invert prose-emerald max-w-none text-neutral-300 font-sans"
                dangerouslySetInnerHTML={{ __html: decryptedText }}
              />

              {fileUrl && (
                <div className="mt-8 pt-6 border-t border-neutral-700">
                  <h3 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">Attachment</h3>
                  <a 
                    href={fileUrl} 
                    download={fileName}
                    className="inline-flex items-center gap-3 bg-neutral-900 border border-neutral-700 hover:border-emerald-500 transition rounded-lg px-4 py-3"
                  >
                    <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-neutral-200 text-sm font-medium">{fileName}</div>
                      <div className="text-emerald-500 text-xs mt-0.5 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Download Encrypted File
                      </div>
                    </div>
                  </a>
                </div>
              )}
            </div>
            <div className="text-center text-xs text-neutral-500">
              The server never saw your key or data. Protected by AES-GCM 256.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
