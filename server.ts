// /server.ts
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import crypto from "crypto";

const app = express();
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

interface DBState {
  bins: any[];
  admins: any[];
  apiKeys: any[];
}
let memoryDb: DBState = { bins: [], admins: [], apiKeys: [] };

async function initDb() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    memoryDb = JSON.parse(data);
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
    const {
      binId,
      encryptedTextBlob,
      encryptedFileBlob,
      ivText,
      ivFile,
      isPasswordProtected,
      expiresAt,
    } = req.body;

    if (!binId || !encryptedTextBlob || !ivText || !expiresAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newBin = {
      binId,
      encryptedTextBlob,
      encryptedFileBlob: encryptedFileBlob || null,
      ivText,
      ivFile: ivFile || null,
      isPasswordProtected: Boolean(isPasswordProtected),
      expiresAt,
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
      ivText: bin.ivText,
      ivFile: bin.ivFile,
      isPasswordProtected: bin.isPasswordProtected,
      expiresAt: bin.expiresAt,
      createdAt: bin.createdAt,
    });
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
    const { username, password, totpCode } = req.body;
    const admin = memoryDb.admins.find((a) => a.username === username);

    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch) return res.status(401).json({ error: "Invalid credentials" });

    if (admin.totpEnabled) {
      if (!totpCode) {
        return res.status(401).json({ error: "TOTP required", requireTotp: true });
      }
      
      const isValid = authenticator.check(totpCode, admin.totpSecret);
      if (!isValid) {
        // Check backup codes
        const hashMatchIndex = await Promise.all(admin.backupCodes.map((hash: string) => bcrypt.compare(totpCode, hash)));
        const matchIdx = hashMatchIndex.findIndex((m) => m);
        
        if (matchIdx === -1) {
          return res.status(401).json({ error: "Invalid TOTP code" });
        } else {
          // Consume the backup code
          admin.backupCodes.splice(matchIdx, 1);
          await saveDb();
        }
      }
    }

    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, token });
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
  });

  res.json({
    totalBinsAllTime: allTimeBins, 
    activeBins: activeBins.length,
    storageSize: storageSize, // bytes estimated
    serverUptime: process.uptime(),
  });
});

// GET /api/admin/api-keys
app.get("/api/admin/api-keys", authenticateAdmin, async (req, res) => {
  res.json(memoryDb.apiKeys.map(k => ({
    id: k.id,
    label: k.label,
    rateLimitQuota: k.rateLimitQuota,
    isActive: k.isActive,
    createdAt: k.createdAt
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
    createdAt: new Date().toISOString()
  };

  memoryDb.apiKeys.push(newKey);
  await saveDb();

  res.json({ rawKey, ...newKey }); // Return the raw key just once
});


// POST /api/admin/settings/totp/generate
app.post("/api/admin/settings/totp/generate", authenticateAdmin, async (req, res) => {
  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(req.user.username, "Securely", secret);
  
  // Need 10 backup codes
  const rawCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
  
  res.json({ secret, uri, backupCodes: rawCodes });
});

// POST /api/admin/settings/totp/verify
app.post("/api/admin/settings/totp/verify", authenticateAdmin, async (req, res) => {
  const { totpCode, secret, backupCodes } = req.body;
  
  const isValid = authenticator.check(totpCode, secret);
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
