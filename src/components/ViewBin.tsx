import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Shield, LockOpen, Unlock, AlertTriangle, Download, FileText, Eye, EyeOff } from "lucide-react";
import Logo from "./Logo";
import { deriveKeyFromPassword, importKeyBase64, decryptData } from "../crypto";

export default function ViewBin() {
  const { binId } = useParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isRawHtml, setIsRawHtml] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [binData, setBinData] = useState<any>(null);
  
  const [decryptedText, setDecryptedText] = useState("");
  const [decryptedFiles, setDecryptedFiles] = useState<{url: string, name: string}[]>([]);

  const [salt, setSalt] = useState<string | null>(null);
  const [base64Key, setBase64Key] = useState<string | null>(null);

  useEffect(() => {
    // Parse URL hash for key
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const k = hashParams.get("key");

    if (k) setBase64Key(decodeURIComponent(k));
  }, []);

  const fetchBin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/bin/${binId}`);
      if (res.status === 404) throw new Error("Bin not found or expired.");
      if (!res.ok) throw new Error("Could not retrieve bin.");
      
      const data = await res.json();
      setBinData(data);
      setHasFetched(true);
      if (data.pwdSalt) setSalt(data.pwdSalt);

      if (data.isPasswordProtected) {
        setNeedsPassword(true);
        setLoading(false);
      } else {
        if (!base64Key) throw new Error("Missing decryption key in URL.");
        await performDecryption(data, null, base64Key);
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

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

      const rawText = parsed.text || "";
      const isPureHtml = rawText.trim().startsWith('<') && rawText.trim().endsWith('>');
      setIsRawHtml(isPureHtml);

      let html = "";
      if (isPureHtml) {
        // If the user seems to be providing pure HTML, skip Markdown parsing which can mess up indentation and styling
        html = rawText;
      } else {
        html = await marked.parse(rawText);
      }

      // DOMPurify strips potentially unsafe CSS (like animations and URLs) from style tags if not forced to parse them as body content.
      const cleanHtml = DOMPurify.sanitize(html, {
        ADD_TAGS: ['style', 'iframe', 'video', 'audio', 'source'],
        ADD_ATTR: ['class', 'style', 'target', 'allow', 'allowfullscreen', 'frameborder', 'controls'],
        FORCE_BODY: true
      });

      setDecryptedText(cleanHtml);

      const filesOut: {url: string, name: string}[] = [];

      // Support backwards compatibility for single file
      if (parsed.filename && data.encryptedFileBlob && data.ivFile) {
        const fileBuffer = await decryptData(key, data.encryptedFileBlob, data.ivFile);
        const blob = new Blob([fileBuffer], { type: parsed.mimeType || 'application/octet-stream' });
        filesOut.push({
          name: parsed.filename,
          url: URL.createObjectURL(blob)
        });
      }

      // Handle array of files
      if (data.encryptedFiles && Array.isArray(data.encryptedFiles)) {
        for (const f of data.encryptedFiles) {
          const fileBuffer = await decryptData(key, f.encryptedBlob, f.iv);
          const blob = new Blob([fileBuffer], { type: f.mimeType || 'application/octet-stream' });
          filesOut.push({
            name: f.filename || 'attachment',
            url: URL.createObjectURL(blob)
          });
        }
      }

      setDecryptedFiles(filesOut);

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
            <Logo className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white hover:text-emerald-400 transition">Securely</h1>
          </Link>
        </header>

        {error || !hasFetched || needsPassword ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
            {error ? (
              <div className="max-w-md w-full bg-red-950/30 border border-red-500 p-8 rounded-xl text-center text-red-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Accessing Bin</h2>
                <p>{error}</p>
              </div>
            ) : !hasFetched ? (
              <div className="max-w-md w-full bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center shadow-2xl">
                <FileText className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Encrypted Bin</h2>
                <p className="text-neutral-400 mb-6 text-sm">Click the button below to fetch and reveal the secret. If this bin is set to "Burn after reading", it will be deleted from the server immediately upon fetching.</p>
                <button 
                  onClick={fetchBin}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded py-3 font-semibold transition"
                >
                  Reveal Secret
                </button>
              </div>
            ) : (
              <div className="max-w-md w-full bg-neutral-800 p-8 rounded-xl border border-neutral-700 text-center shadow-2xl">
                <LockOpen className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Password Required</h2>
                <p className="text-neutral-400 mb-6 text-sm">This bin was encrypted with a custom password.</p>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="relative mb-4">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoFocus
                      className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white outline-none focus:border-emerald-500 pr-10"
                      placeholder="Enter password..."
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded py-3 font-semibold transition"
                  >
                    Decrypt
                  </button>
                </form>
              </div>
            )}
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
                className={`${isRawHtml ? '' : 'prose prose-invert prose-emerald max-w-none'} text-neutral-300 font-sans overflow-x-auto break-words`}
                dangerouslySetInnerHTML={{ __html: decryptedText }}
              />

              {decryptedFiles.length > 0 && (
                <div className="mt-8 pt-6 border-t border-neutral-700">
                  <h3 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">
                    {decryptedFiles.length === 1 ? "Attachment" : `Attachments (${decryptedFiles.length})`}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {decryptedFiles.map((file, idx) => (
                      <a 
                        key={idx}
                        href={file.url} 
                        download={file.name}
                        className="flex max-w-full items-center gap-3 bg-neutral-900 border border-neutral-700 hover:border-emerald-500 transition rounded-lg px-4 py-3"
                      >
                        <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-neutral-200 text-sm font-medium break-all">{file.name}</div>
                          <div className="text-emerald-500 text-xs mt-0.5 flex items-center gap-1">
                            <Download className="w-3 h-3 flex-shrink-0" /> <span>Download</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
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
