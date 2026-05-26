/**
 * Zero-Knowledge Cryptography Utilities
 * AES-GCM 256 for symmetric encryption using Web Crypto API.
 */

const ALGO = "AES-GCM";

// Utility to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Utility to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a random encryption key (if user doesn't provide password)
export async function generateRandomKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Derive key from password using PBKDF2
export async function deriveKeyFromPassword(password: string, saltHex?: string): Promise<{ key: CryptoKey; salt: string }> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltArr = saltHex ? base64ToArrayBuffer(saltHex) : window.crypto.getRandomValues(new Uint8Array(16));
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltArr,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  return { key, salt: arrayBufferToBase64(saltArr) };
}

// Encrypt string or file array buffer
export async function encryptData(key: CryptoKey, data: ArrayBuffer | string): Promise<{ encryptedBlob: string; iv: string }> {
  const ivArr = window.crypto.getRandomValues(new Uint8Array(12));
  let dataBuffer: ArrayBuffer;
  if (typeof data === "string") {
    dataBuffer = new TextEncoder().encode(data);
  } else {
    dataBuffer = data;
  }

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGO, iv: ivArr },
    key,
    dataBuffer
  );

  return {
    encryptedBlob: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(ivArr),
  };
}

export async function decryptData(key: CryptoKey, encryptedBlob: string, iv: string): Promise<ArrayBuffer> {
  const encArray = base64ToArrayBuffer(encryptedBlob);
  const ivArray = base64ToArrayBuffer(iv);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGO, iv: ivArray },
      key,
      encArray
    );
    return decrypted;
  } catch (err) {
    throw new Error("Decryption failed. Incorrect key or corrupted data.");
  }
}

export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(raw);
}

export async function importKeyBase64(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    "raw",
    raw,
    { name: ALGO },
    true,
    ["encrypt", "decrypt"]
  );
}
