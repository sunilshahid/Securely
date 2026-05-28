import React, { useState, useRef } from "react";
import { X, Camera, Upload } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import jsQR from "jsqr";

export default function ScanQRModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processUrl = (url: string) => {
    if (url.includes(window.location.host) || url.startsWith("http")) {
      if (url.startsWith(window.location.origin)) {
        window.location.href = url;
      } else {
        window.open(url, "_blank");
        onClose();
      }
    } else {
      setError("Invalid secure bin QR code.");
    }
  };

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      processUrl(result[0].rawValue);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
             processUrl(code.data);
          } else {
             setError("No QR code found in the image.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden shadow-emerald-900/20 my-auto">
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Camera className="w-5 h-5" />
            Scan QR Code
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-neutral-400 text-sm mb-6 text-center">
            Point your camera at a Secure Bin QR code or upload an image.
          </p>

          <div className="relative rounded-xl overflow-hidden bg-black/50 aspect-square flex items-center justify-center ring-1 ring-neutral-800 mb-6">
            <Scanner 
              onScan={handleScan}
              onError={(e) => setError("Camera access denied or unavailable.")}
            />
          </div>
          
          <div className="flex flex-col items-center">
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
             <button 
               onClick={() => fileInputRef.current?.click()} 
               className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition rounded-lg p-3 font-medium flex items-center justify-center gap-2"
             >
               <Upload className="w-4 h-4" /> Scan from Image File
             </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mt-4">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
