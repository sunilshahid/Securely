import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Plus, Lock, Files as FilesIcon, Clock, Save, Download, ChevronDown, Check, Eye, EyeOff, Bold, Italic, Heading, Code, List, Link as LinkIcon, Code2, MonitorPlay, Image as ImageIcon, LayoutTemplate, Sparkles, LayoutPanelTop, X, Share2, Scan, ArrowLeft } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import Logo from "./Logo";
import ScanQRModal from "./ScanQRModal";
import { generateRandomKey, deriveKeyFromPassword, encryptData, exportKeyBase64 } from "../crypto";
import RichTextEditor from "./RichTextEditor";
import JSZip from "jszip";

function CustomSelect({ value, onChange, options, className = "" }: { value: any, onChange: (v: any) => void, options: {value: any, label: string}[], className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative z-40 ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2.5 text-neutral-300 text-sm outline-none hover:border-emerald-500/50 focus:border-emerald-500 flex items-center justify-between transition"
      >
        <span>{selectedOption ? selectedOption.label : "Select..."}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 mt-1 min-w-full w-max bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          {options.map((opt) => (
            <button
              key={opt.value.toString()}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm font-medium transition flex items-center justify-between gap-4 ${value === opt.value ? "bg-emerald-500/10 text-emerald-400" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"}`}
            >
              {opt.label}
              {value === opt.value && <Check className="w-3 h-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NumberInput({ label, value, onChange, min = 0, max = 999 }: { label: string, value: number, onChange: (v: number) => void, min?: number, max?: number }) {
  return (
    <div className="flex-1 bg-neutral-900 border border-neutral-700 rounded overflow-hidden flex flex-col focus-within:border-emerald-500 transition">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold text-center pt-1.5 pb-0.5 bg-neutral-950/50">
        {label}
      </div>
      <div className="flex items-center">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="px-2 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition">-</button>
        <input type="number" value={value === 0 && label !== "Minutes" && label !== "Hours" ? "" : value} onChange={e => {
          let v = parseInt(e.target.value);
          if (isNaN(v)) v = 0;
          if(v < min) v = min;
          if(v > max) v = max;
          onChange(v);
        }} className="flex-1 w-full min-w-0 bg-transparent text-center outline-none text-white font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none break-all" />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="px-2 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition">+</button>
      </div>
    </div>
  )
}

export default function CreateBin() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [editorMode, setEditorMode] = useState<"visual" | "raw">("visual");

  const [expiryMode, setExpiryMode] = useState("24h");
  const [durationDays, setDurationDays] = useState(0);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);

  const initDate = new Date();
  initDate.setHours(initDate.getHours() + 24);
  const [dateMonth, setDateMonth] = useState(initDate.getMonth());
  const [dateDay, setDateDay] = useState(initDate.getDate());
  const [dateYear, setDateYear] = useState(initDate.getFullYear());
  const [dateHour, setDateHour] = useState(initDate.getHours());
  const [dateMinute, setDateMinute] = useState(initDate.getMinutes());
  
  const [showExpiryDropdown, setShowExpiryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [theme, setTheme] = useState("dark"); // just a dummy theme setting
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExpiryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const expiryOptions = [
    { value: "burn", label: "Burn after reading" },
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "10m", label: "10 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "24h", label: "24 Hours" },
    { value: "custom_duration", label: "Custom duration..." },
    { value: "custom_date", label: "Custom date & time..." },
  ];

  const monthsList = Array.from({length: 12}, (_, i) => ({
    value: i, label: new Date(2000, i, 1).toLocaleString('default', { month: 'short' })
  }));
  const daysInMonth = new Date(dateYear, dateMonth + 1, 0).getDate();
  const daysList = Array.from({length: daysInMonth}, (_, i) => ({
    value: i + 1, label: (i + 1).toString().padStart(2, '0')
  }));
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({length: 5}, (_, i) => ({
    value: currentYear + i, label: (currentYear + i).toString()
  }));
  const hoursList = Array.from({length: 24}, (_, i) => ({
    value: i, label: i.toString().padStart(2, '0')
  }));
  const minutesList = Array.from({length: 60}, (_, i) => ({
    value: i, label: i.toString().padStart(2, '0')
  }));

  const handleCreate = async () => {
    if (!content.trim() && files.length === 0) return;
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

      // Format payload text without file metadata since we send multiple files now
      const textPayload = JSON.stringify({
        text: content,
        theme,     // Customization setting stored encrypted
        salt: saltStr
      });

      // Encrypt Text
      const textEncResult = await encryptData(key, textPayload);

      // Encrypt individual files
      const encryptedFiles = await Promise.all(
        files.map(async (f) => {
          const buffer = await f.arrayBuffer();
          const { encryptedBlob, iv } = await encryptData(key, buffer);
          return {
            filename: f.name,
            mimeType: f.type,
            encryptedBlob, // we name it this or what backend expects? wait backend schema expects same
            iv
          };
        })
      );

      const binId = Math.random().toString(36).substring(2, 10);
      const hostUrl = window.location.origin;

      let expiresAt = new Date();
      let burnAfterReading = false;
      
      switch (expiryMode) {
        case "burn":
          burnAfterReading = true;
          expiresAt.setDate(expiresAt.getDate() + 7); // keep max 7 days if unread
          break;
        case "1m":
          expiresAt.setMinutes(expiresAt.getMinutes() + 1);
          break;
        case "5m":
          expiresAt.setMinutes(expiresAt.getMinutes() + 5);
          break;
        case "10m":
          expiresAt.setMinutes(expiresAt.getMinutes() + 10);
          break;
        case "1h":
          expiresAt.setHours(expiresAt.getHours() + 1);
          break;
        case "24h":
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case "custom_duration": {
          expiresAt.setDate(expiresAt.getDate() + durationDays);
          expiresAt.setHours(expiresAt.getHours() + durationHours);
          expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
          break;
        }
        case "custom_date":
          expiresAt = new Date(dateYear, dateMonth, dateDay, dateHour, dateMinute);
          break;
      }

      // Post to API
      const response = await fetch("/api/v1/bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          binId,
          encryptedTextBlob: textEncResult.encryptedBlob,
          encryptedFiles: encryptedFiles.length > 0 ? encryptedFiles : null,
          ivText: textEncResult.iv,
          isPasswordProtected: !!password,
          pwdSalt: saltStr,
          expiresAt: expiresAt.toISOString(),
          burnAfterReading,
        }),
      });

      if (!response.ok) throw new Error("Failed to upload to server");

      let shareUrl = `${hostUrl}/v/${binId}`;
      if (!password) {
        const base64Key = await exportKeyBase64(key);
        shareUrl += `#key=${encodeURIComponent(base64Key)}`;
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
          <Link to="/" onClick={() => {setResultUrl(""); setContent(""); setFiles([]); setPassword("");}} className="flex items-center gap-2 hover:opacity-80 transition">
            <Logo className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Securely</h1>
          </Link>
          <div className="flex items-center gap-3 -translate-x-[6px]">
            <Link to="/guide" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 hover:bg-neutral-700 px-4 py-1.5 rounded-full transition bg-neutral-800 border border-neutral-700 shadow-sm">Guide</Link>
            <Link to="/admin" className="text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 px-4 py-1.5 rounded-full transition bg-neutral-800 border border-neutral-700 shadow-sm">Admin</Link>
          </div>
        </header>

        {showScanner && <ScanQRModal onClose={() => setShowScanner(false)} />}

        {/* Floating Scan QR Button */}
        <button 
          onClick={() => setShowScanner(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20 transition-transform duration-200 hover:scale-105 active:scale-95 flex items-center justify-center z-[60]"
          title="Scan QR Code"
        >
          <Scan className="w-6 h-6" />
        </button>

        {resultUrl ? (
          <div className="bg-neutral-800 border border-emerald-500/30 p-8 rounded-xl text-center space-y-6 relative">
            <button 
              onClick={() => {setResultUrl(""); setContent(""); setFiles([]); setPassword("");}}
              className="absolute top-6 left-6 text-neutral-400 hover:text-white transition flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 mt-2">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Your zero-knowledge bin is secured.</h2>
            <p className="text-neutral-400">The server does not know your key. Do not lose this URL!</p>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                readOnly 
                value={resultUrl} 
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-emerald-400 font-mono text-sm focus:outline-none"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(resultUrl)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded font-medium transition"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-3 justify-center mb-6">
              {navigator.share && (
                <>
                  <button 
                    onClick={async () => {
                      try {
                        const canvas = document.getElementById("share-qr") as HTMLCanvasElement;
                        const filesArray: File[] = [];
                        if (canvas) {
                          const paddedCanvas = document.createElement("canvas");
                          const pad = 36;
                          paddedCanvas.width = canvas.width + pad * 2;
                          paddedCanvas.height = canvas.height + pad * 2;
                          const ctx = paddedCanvas.getContext("2d");
                          if (ctx) {
                            ctx.fillStyle = "#ffffff";
                            ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
                            ctx.drawImage(canvas, pad, pad);
                            
                            const blob = await new Promise<Blob | null>(resolve => paddedCanvas.toBlob(resolve, "image/png"));
                            if (blob) {
                               filesArray.push(new File([blob], "secure-bin-qr.png", { type: "image/png" }));
                            }
                          }
                        }
                        
                        const shareData: any = {
                          title: 'Secure Encrypted Bin',
                          text: 'I shared a secure encrypted text & files bin with you. Open here: ',
                          url: resultUrl,
                        };
                        
                        if (filesArray.length > 0 && navigator.canShare && navigator.canShare({ files: filesArray })) {
                          shareData.files = filesArray;
                        }

                        await navigator.share(shareData);
                      } catch (e: any) {
                        if (e.name !== 'AbortError') {
                          console.error('Error sharing:', e);
                        }
                      }
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-5 py-3 rounded font-medium transition flex items-center justify-center gap-2"
                    title="Share Link & QR"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                  <a 
                    href={`whatsapp://send?text=${encodeURIComponent(`Secure Bin: ${resultUrl}`)}`}
                    className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 px-5 py-3 rounded font-medium transition flex items-center gap-2"
                  >
                    WhatsApp
                  </a>
                </>
              )}
            </div>
            <div className="pt-6 border-t border-neutral-700/50 flex flex-col items-center">
              <p className="text-sm text-neutral-400 mb-4">Scan with another device to open</p>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <QRCodeCanvas id="share-qr" value={resultUrl} size={160} level={"H"} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 focus-within:border-emerald-500/50 transition duration-200 flex flex-col h-[400px]">
                <div className="flex bg-neutral-900 border-b border-neutral-700/50">
                  <button 
                    type="button"
                    onClick={() => setEditorMode("visual")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${editorMode === "visual" ? "text-emerald-400 border-b-2 border-emerald-500 bg-neutral-800/80" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"}`}
                  ><LayoutTemplate className="w-4 h-4" /> Visual Editor</button>
                  <button 
                    type="button"
                    onClick={() => setEditorMode("raw")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${editorMode === "raw" ? "text-emerald-400 border-b-2 border-emerald-500 bg-neutral-800/80" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"}`}
                  ><Code2 className="w-4 h-4" /> Raw MD/HTML (Advanced)</button>
                </div>
                {editorMode === "visual" ? (
                  <RichTextEditor content={content} onChange={setContent} />
                ) : (
                  <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Enter raw Markdown or HTML..."
                    className="w-full h-full bg-transparent resize-none p-6 text-neutral-300 outline-none font-mono text-sm leading-relaxed"
                  />
                )}
              </div>

              {/* File Drop Placeholder */}
              <div className="bg-neutral-800 border border-dashed border-neutral-700 rounded-xl p-6 relative group transition duration-200 focus-within:border-emerald-500/50 hover:border-emerald-500/50">
                <input 
                  type="file" 
                  multiple
                  onChange={e => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setFiles(prev => [...prev, ...newFiles]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="flex flex-col items-center justify-center text-neutral-500">
                  <Plus className="w-8 h-8 mb-2 group-hover:text-emerald-500 transition-colors" />
                  <p>Drag and drop or click to attach encrypted files</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="bg-neutral-800 rounded-xl p-4 space-y-2 mt-4 border border-neutral-700">
                  <h4 className="text-sm font-medium text-neutral-300">Attached Files ({files.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FilesIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-sm text-neutral-200 truncate">{f.name}</span>
                          <span className="text-xs text-neutral-500 flex-shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-neutral-500 hover:text-red-400 p-1 rounded transition z-20"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 space-y-6">
                <div ref={dropdownRef}>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2 font-medium">
                    <Clock className="w-4 h-4" /> Auto-Destroy
                  </label>
                  
                  <div className="relative z-50">
                    <button
                      type="button"
                      onClick={() => setShowExpiryDropdown(!showExpiryDropdown)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-neutral-300 outline-none hover:border-emerald-500/50 focus:border-emerald-500 flex items-center justify-between transition"
                    >
                      <span>{expiryOptions.find(o => o.value === expiryMode)?.label || "Select..."}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showExpiryDropdown ? "rotate-180" : ""}`} />
                    </button>

                    {showExpiryDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95">
                        {expiryOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setExpiryMode(opt.value);
                              setShowExpiryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm font-medium transition flex items-center justify-between ${expiryMode === opt.value ? "bg-emerald-500/10 text-emerald-400" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"}`}
                          >
                            {opt.label}
                            {expiryMode === opt.value && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {expiryMode === "custom_duration" && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 flex gap-2">
                      <NumberInput label="Days" min={0} max={365} value={durationDays} onChange={setDurationDays} />
                      <NumberInput label="Hours" min={0} max={23} value={durationHours} onChange={setDurationHours} />
                      <NumberInput label="Minutes" min={0} max={59} value={durationMinutes} onChange={setDurationMinutes} />
                    </div>
                  )}

                  {expiryMode === "custom_date" && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 space-y-3">
                       <div className="flex gap-2">
                         <CustomSelect value={dateMonth} onChange={setDateMonth} options={monthsList} className="flex-[3]" />
                         <CustomSelect value={dateDay} onChange={setDateDay} options={daysList} className="flex-[2]" />
                         <CustomSelect value={dateYear} onChange={setDateYear} options={yearsList} className="flex-[3]" />
                       </div>
                       <div className="flex gap-2 items-center">
                         <CustomSelect value={dateHour} onChange={setDateHour} options={hoursList} className="flex-1" />
                         <span className="text-neutral-500 font-bold">:</span>
                         <CustomSelect value={dateMinute} onChange={setDateMinute} options={minutesList} className="flex-1" />
                       </div>
                       <div className="bg-neutral-900/50 border border-neutral-800 p-3 rounded-lg text-xs text-neutral-400 space-y-1">
                         <p className="font-medium text-neutral-300">Timezone Handling</p>
                         <p>The time you select above is in your local timezone. Our system automatically converts this to Universal Time (UTC) to ensure it triggers at the exact right moment, no matter where in the world the recipient is.</p>
                       </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2 font-medium">
                    <Lock className="w-4 h-4" /> Password (Recommended)
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Leave empty for auto-key"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-neutral-300 outline-none focus:border-emerald-500 pr-10"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">If provided, the URL will not contain the key. Recipients must enter it manually.</p>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isEncrypting || (!content.trim() && files.length === 0)}
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
