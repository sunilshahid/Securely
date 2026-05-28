// /server.ts
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;

// Middleware
app.use(cors());
// Set a larger payload limit for encrypted blobs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================================
// File-based DB simulation (Zero-setup alternative to remote MongoDB)
// ==========================================
const DB_FILE = path.join(process.cwd(), "database.json");

interface SecurityLog {
  id: string;
  ip: string;
  timestamp: string;
}

const loginAttempts: Record<string, { attempts: number; lockUntil: number | null }> = {};

interface DBState {
  bins: any[];
  admins: any[];
  apiKeys: any[];
  securityLogs: SecurityLog[];
}
let memoryDb: DBState = { bins: [], admins: [], apiKeys: [], securityLogs: [] };

async function initDb() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    memoryDb = { bins: [], admins: [], apiKeys: [], securityLogs: [], ...parsed };
    // Cleanup expired bins periodically and on boot
    memoryDb.bins = memoryDb.bins.filter(
      (b) => new Date(b.expiresAt).getTime() > Date.now()
    );
    await saveDb();
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await saveDb();
    }
  }

  // Auto-seed admin from environment variables if none exist
  if (memoryDb.admins.length === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    memoryDb.admins.push({
      username: process.env.ADMIN_USERNAME,
      passwordHash,
      totpEnabled: false,
      totpSecret: null,
      backupCodes: [],
    });
    await saveDb();
    console.log(`Master admin auto-seeded from environment variables.`);
  }
}

async function saveDb() {
  await fs.writeFile(DB_FILE, JSON.stringify(memoryDb, null, 2));
}

// Ensure the JWT secret exists
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_for_sandbox_only";

// ==========================================
// Authentication Middleware
// ==========================================
const authenticateAdmin = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const enforceRateLimit = (req: any, res: any, next: any) => {
  // Simple rate limiting logic stub based on IP/API Key could go here
  next();
};

// ==========================================
// A. Public Endpoints
// ==========================================

// POST /api/v1/bin
app.post("/api/v1/bin", enforceRateLimit, async (req, res) => {
  try {
    // API key tracking (optional)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer sec_")) {
      const rawKey = authHeader.split(" ")[1];
      for (const k of memoryDb.apiKeys) {
        if (await bcrypt.compare(rawKey, k.keyHash)) {
          k.requestCount = (k.requestCount || 0) + 1;
          break;
        }
      }
    }

    const {
      binId,
      encryptedTextBlob,
      encryptedFileBlob,
      encryptedFiles,
      ivText,
      ivFile,
      isPasswordProtected,
      pwdSalt,
      expiresAt,
      burnAfterReading,
    } = req.body;

    if (!binId || !encryptedTextBlob || !ivText || !expiresAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newBin = {
      binId,
      encryptedTextBlob,
      encryptedFileBlob: encryptedFileBlob || null,
      encryptedFiles: encryptedFiles || null,
      ivText,
      ivFile: ivFile || null,
      isPasswordProtected: Boolean(isPasswordProtected),
      pwdSalt: pwdSalt || null,
      expiresAt,
      burnAfterReading: Boolean(burnAfterReading),
      createdAt: new Date().toISOString(),
    };

    memoryDb.bins.push(newBin);
    await saveDb();

    res.status(201).json({ binId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/bin/:binId
app.get("/api/v1/bin/:binId", enforceRateLimit, async (req, res) => {
  try {
    const { binId } = req.params;
    const bin = memoryDb.bins.find((b) => b.binId === binId);

    if (!bin) return res.status(404).json({ error: "Bin not found" });

    if (new Date(bin.expiresAt).getTime() < Date.now()) {
      // Auto-delete if expired and not yet cleaned up
      memoryDb.bins = memoryDb.bins.filter((b) => b.binId !== binId);
      await saveDb();
      return res.status(404).json({ error: "Bin expired" });
    }

    res.json({
      binId: bin.binId,
      encryptedTextBlob: bin.encryptedTextBlob,
      encryptedFileBlob: bin.encryptedFileBlob,
      encryptedFiles: bin.encryptedFiles,
      ivText: bin.ivText,
      ivFile: bin.ivFile,
      isPasswordProtected: bin.isPasswordProtected,
      pwdSalt: bin.pwdSalt,
      expiresAt: bin.expiresAt,
      createdAt: bin.createdAt,
    });

    if (bin.burnAfterReading) {
      memoryDb.bins = memoryDb.bins.filter((b) => b.binId !== binId);
      await saveDb();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==========================================
// B. Admin API Endpoints
// ==========================================

// GET /api/admin/setup/check
app.get("/api/admin/setup/check", async (req, res) => {
  res.json({ hasAdmin: memoryDb.admins.length > 0 });
});

// POST /api/admin/setup
app.post("/api/admin/setup", async (req, res) => {
  try {
    if (memoryDb.admins.length > 0) {
      return res.status(403).json({ error: "Admin already exists." });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = {
      username,
      passwordHash,
      totpEnabled: false,
      totpSecret: null,
      backupCodes: [],
    };

    memoryDb.admins.push(newAdmin);
    await saveDb();

    // Authenticate automatically on setup
    const token = jwt.sign({ username: newAdmin.username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/login
app.post("/api/admin/login", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const attemptRecord = loginAttempts[clientIp] || { attempts: 0, lockUntil: null };
    
    if (attemptRecord.lockUntil && attemptRecord.lockUntil > Date.now()) {
      const waitMinutes = Math.ceil((attemptRecord.lockUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many failed attempts. Try again in ${waitMinutes} minutes.` });
    }

    const handleFailedAttempt = async () => {
      attemptRecord.attempts += 1;
      if (attemptRecord.attempts >= 5) {
        attemptRecord.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
        // Log brute force attack
        memoryDb.securityLogs.push({
          id: crypto.randomUUID(),
          ip: clientIp,
          timestamp: new Date().toISOString()
        });
        await saveDb();
        loginAttempts[clientIp] = attemptRecord;
        return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
      }
      loginAttempts[clientIp] = attemptRecord;
      return res.status(401).json({ error: "Invalid credentials" });
    };

    const { username, password, totpCode } = req.body;
    const admin = memoryDb.admins.find((a) => a.username === username);

    if (!admin) return handleFailedAttempt();

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch) return handleFailedAttempt();

    let usedBackupCode = false;
    if (admin.totpEnabled) {
      if (!totpCode) {
        return res.status(401).json({ error: "TOTP required", requireTotp: true });
      }
      
      const isValid = speakeasy.totp.verify({ secret: admin.totpSecret, encoding: 'base32', token: totpCode, window: 1 });
      if (!isValid) {
        // Check backup codes
        const backupCodes = admin.backupCodes || [];
        const hashMatchIndex = await Promise.all(backupCodes.map((hash: string) => bcrypt.compare(totpCode, hash)));
        const matchIdx = hashMatchIndex.findIndex((m) => m);
        
        if (matchIdx === -1) {
          return handleFailedAttempt();
        } else {
          // Consume the backup code
          admin.backupCodes.splice(matchIdx, 1);
          await saveDb();
          usedBackupCode = true;
        }
      }
    }

    // Success, reset attempts
    loginAttempts[clientIp] = { attempts: 0, lockUntil: null };
    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, token, usedBackupCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/stats
app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
  const activeBins = memoryDb.bins.filter((b) => new Date(b.expiresAt).getTime() > Date.now());
  const allTimeBins = memoryDb.bins.length; // In a real system, we'd log history. Here we just show current.
  
  // Approximate storage size
  let storageSize = 0;
  memoryDb.bins.forEach(b => {
    storageSize += b.encryptedTextBlob.length;
    if (b.encryptedFileBlob) storageSize += b.encryptedFileBlob.length;
    if (b.encryptedFiles) {
      storageSize += b.encryptedFiles.reduce((acc: number, f: any) => acc + f.encryptedBlob.length, 0);
    }
  });

  res.json({
    totalBinsAllTime: allTimeBins, 
    activeBins: activeBins.length,
    storageSize: storageSize, // bytes estimated
    serverUptime: process.uptime(),
    securityLogs: memoryDb.securityLogs || [],
  });
});

// GET /api/admin/api-keys
app.get("/api/admin/api-keys", authenticateAdmin, async (req, res) => {
  res.json(memoryDb.apiKeys.map(k => ({
    id: k.id,
    label: k.label,
    rateLimitQuota: k.rateLimitQuota,
    isActive: k.isActive,
    createdAt: k.createdAt,
    requestCount: k.requestCount || 0
  })));
});

// POST /api/admin/api-keys
app.post("/api/admin/api-keys", authenticateAdmin, async (req, res) => {
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: "Label required" });

  const rawKey = "sec_" + crypto.randomBytes(32).toString('hex');
  const keyHash = await bcrypt.hash(rawKey, 10);

  const newKey = {
    id: crypto.randomUUID(),
    keyHash,
    label,
    rateLimitQuota: 1000,
    isActive: true,
    createdAt: new Date().toISOString(),
    requestCount: 0
  };

  memoryDb.apiKeys.push(newKey);
  await saveDb();

  res.json({ rawKey, ...newKey }); // Return the raw key just once
});

// DELETE /api/admin/api-keys/:id
app.delete("/api/admin/api-keys/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    memoryDb.apiKeys = memoryDb.apiKeys.filter((k) => k.id !== id);
    await saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/settings/password
app.post("/api/admin/settings/password", authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = memoryDb.admins.find(a => a.username === req.user.username);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });

    const passwordMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!passwordMatch) return res.status(400).json({ error: "Incorrect current password" });

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await saveDb();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/settings/totp/disable
app.post("/api/admin/settings/totp/disable", authenticateAdmin, async (req, res) => {
  try {
    const admin = memoryDb.admins.find(a => a.username === req.user.username);
    if (admin) {
      admin.totpEnabled = false;
      admin.totpSecret = null;
      admin.backupCodes = [];
      await saveDb();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/settings/totp/status
app.get("/api/admin/settings/totp/status", authenticateAdmin, async (req, res) => {
  const admin = memoryDb.admins.find(a => a.username === req.user.username);
  res.json({ enabled: admin ? admin.totpEnabled : false });
});

// POST /api/admin/settings/totp/generate
app.post("/api/admin/settings/totp/generate", authenticateAdmin, async (req, res) => {
  const secretData = speakeasy.generateSecret({ name: `Securely (${req.user.username})` });
  const secret = secretData.base32;
  const uri = secretData.otpauth_url || "";
  
  // Need 10 backup codes
  const rawCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
  
  res.json({ secret, uri, backupCodes: rawCodes });
});

// POST /api/admin/settings/totp/verify
app.post("/api/admin/settings/totp/verify", authenticateAdmin, async (req, res) => {
  const { totpCode, secret, backupCodes } = req.body;
  
  const isValid = speakeasy.totp.verify({ secret: secret, encoding: 'base32', token: totpCode, window: 1 });
  if (!isValid) return res.status(400).json({ error: "Invalid TOTP code" });

  const admin = memoryDb.admins.find(a => a.username === req.user.username);
  if (admin) {
    admin.totpEnabled = true;
    admin.totpSecret = secret;
    // Hash backup codes
    const hashedCodes = await Promise.all(backupCodes.map((code: string) => bcrypt.hash(code, 10)));
    admin.backupCodes = hashedCodes;
    await saveDb();
  }

  res.json({ success: true });
});

// ==========================================
// Start Server
// ==========================================
async function startServer() {
  await initDb();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Important: In Express 4, use app.get('*', ... ) 
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Securely server running on http://localhost:${PORT}`);
  });
}

startServer();
