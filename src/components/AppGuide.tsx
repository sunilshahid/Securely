import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Shield, Code, Settings, ChevronLeft } from "lucide-react";
import Logo from "./Logo";

export default function AppGuide() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-4xl mx-auto p-6 md:p-12">
        <header className="flex justify-between items-center mb-12">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <Logo className="w-8 h-8 text-emerald-500" />
            <span className="text-2xl font-bold tracking-tight text-white">Securely</span>
          </Link>
          <Link to="/" className="text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1 transition">
            <ChevronLeft className="w-4 h-4" /> Back to App
          </Link>
        </header>

        <main className="space-y-12">
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-8 h-8 text-emerald-500" />
              <h1 className="text-3xl font-bold tracking-tight">App Guide & Documentation</h1>
            </div>
            <p className="text-neutral-400 text-lg">
              Welcome to the Securely guide. This document explains all features, capabilities, and how to operate both the client side and the administrative tools.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold border-b border-neutral-800 pb-2">1. Client-Side: Creating Secure Bins</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-emerald-400">The Text Box Capabilities</h3>
              <p className="text-neutral-300 mb-4">
                The creation tool provides two different modes to build your secure content depending on your needs.
              </p>
              
              <ul className="list-disc list-inside space-y-2 text-neutral-400">
                <li><strong className="text-neutral-200">Visual Editor (WYSIWYG):</strong> The default mode designed for ordinary users. It provides an intuitive, rich-text interface to write, format text, add headers, lists, links, and text alignments without needing any coding knowledge.</li>
                <li><strong className="text-neutral-200">Raw MD/HTML (Advanced):</strong> For advanced users. Switch to this tab to unleash total control over the output.</li>
                <li><strong className="text-neutral-200">Markdown (MD):</strong> In the Raw tab, use standard Markdown (e.g., <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">**bold**</code>, <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300"># Headings</code>, lists).</li>
                <li><strong className="text-neutral-200">Pure HTML:</strong> Also in the Raw tab, if your text starts with <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">&lt;</code> and ends with <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">&gt;</code>, the app will interpret it as pure HTML. This unlocks advanced styling and custom layouts via CSS <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">&lt;style&gt;</code> tags.</li>
                <li><strong className="text-neutral-200">Videos & Iframes:</strong> You can embed videos using standard HTML5 <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">&lt;video&gt;</code> tags or embed external content using <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">&lt;iframe&gt;</code> tags within HTML.</li>
              </ul>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-emerald-400">Security Options</h3>
              <ul className="list-disc list-inside space-y-2 text-neutral-400">
                <li><strong className="text-neutral-200">Burn After Reading:</strong> Once the recipient opens the link, the bin is permanently deleted from the server. It cannot be recovered.</li>
                <li><strong className="text-neutral-200">Expiration Times:</strong> Set a lifecycle for the bin. You can choose quick presets (e.g., 10 minutes, 24 hours), or define a highly specific <strong className="text-emerald-400">Custom Duration</strong> or an exact <strong className="text-emerald-400">Custom Date & Time</strong>. If not read by the expiration point, it is automatically pruned.</li>
                <li><strong className="text-neutral-200">Password Protection:</strong> Define a custom password. If provided, the decryption key is NOT included in the sharing URL. The recipient must manually enter the password you shared with them separately.</li>
                <li><strong className="text-neutral-200">File Attachments:</strong> Securely attach files. Files are encrypted locally in the browser before ever touching the network.</li>
              </ul>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-emerald-400">Sharing & QR Codes</h3>
              <ul className="list-disc list-inside space-y-2 text-neutral-400">
                <li><strong className="text-neutral-200">Native Share & QR:</strong> Natively share the secure URL along with an automatically generated QR Code directly to other apps on your device.</li>
                <li><strong className="text-neutral-200">WhatsApp Sharing:</strong> Instantly forward the secure bin to WhatsApp contacts with a single click.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold border-b border-neutral-800 pb-2">2. Viewing Bins</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-emerald-400">The Decryption Process</h3>
              <p className="text-neutral-400 mb-4">
                When you or a recipient open a view link:
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-400">
                <li><strong className="text-neutral-200">QR Scanning:</strong> You can open an encrypted bin simply by clicking the <strong className="text-emerald-400">Scan QR</strong> button in the bottom right corner of the home page. You can scan using your device's camera or by uploading an image containing the QR code.</li>
                <li>If there is no password, the secret key in the URL anchor is used to decrypt the content locally in the browser.</li>
                <li>If there IS a password, you will be prompted to enter it. The app will derive the decryption key using a secure salt.</li>
                <li>The decrypted text (and any attached files) are revealed. Files can be downloaded directly from memory.</li>
                <li>If the bin was set to "Burn after reading", it is immediately destroyed upon fetching. Refreshing the page will show an error.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
              <Settings className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold">3. The Admin Panel</h2>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-emerald-400">Getting Started</h3>
              <p className="text-neutral-400 mb-4">
                The administrative panel is located at <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">/admin</code>.
              </p>
              <ul className="list-disc list-inside space-y-2 text-neutral-400 mb-6">
                <li><strong className="text-neutral-200">Setup:</strong> On the very first visit, you will be asked to create an admin account. This requires a setup key that is either pre-configured on the server or dynamically generated.</li>
                <li><strong className="text-neutral-200">Authentication:</strong> Once set up, you authenticate using your username and password at <code className="bg-neutral-800 px-1 py-0.5 rounded text-emerald-300">/admin/login</code>.</li>
                <li><strong className="text-neutral-200">MFA & Backup Codes:</strong> The admin panel utilizes Time-based One-Time Passwords (TOTP). During setup, you must scan a QR code with an authenticator app (e.g., Google Authenticator, Authy). You are also provided with one-time backup codes in case you lose access to your 2FA device.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-emerald-400">Admin Dashboard Capabilities</h3>
              <ul className="list-disc list-inside space-y-2 text-neutral-400">
                <li><strong className="text-neutral-200">Server Analytics:</strong> View total active bins, total space used, system uptime, and memory usage.</li>
                <li><strong className="text-neutral-200">Data Sweeping:</strong> Manually trigger the removal of expired bins to free up server resources.</li>
                <li><strong className="text-neutral-200">Bin Management:</strong> View the list of active bins (their IDs and expiration times). <em>Note: you cannot see the contents of the bins because they are encrypted with keys the server does not hold!</em></li>
                <li><strong className="text-neutral-200">Delete Bins:</strong> Force-delete active bins if necessary.</li>
              </ul>
            </div>
          </section>

          <div className="text-center pt-8 border-t border-neutral-800">
            <p className="text-neutral-500 text-sm">
              Powered by Securely. Fully open-source and endlessly customizable.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
