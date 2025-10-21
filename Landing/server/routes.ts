import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import bcrypt from "bcryptjs";
import { insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const { username, password } = result.data;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });
      // @ts-ignore - session typing not extended here
      req.session.userId = user.id;
      res.status(201).json({ message: "User created successfully", user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      // @ts-ignore
      req.session.userId = user.id;
      res.json({ message: "Login successful", user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // @ts-ignore
    req.session.destroy((err: unknown) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    // @ts-ignore
    const userId = req.session.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user: { id: user.id, username: user.username } });
  });

  app.get("/api/geocode", async (req, res) => {
    try {
      const q = req.query.q as string | undefined;
      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }
      // First try to match a local POI (simple substring/keyword match)
      try {
        const pois: Array<{ id: string; name: string; lat: number; lon: number; keywords?: string[] }> = require("./data/navotas_pois.json");
        const qLower = q.toLowerCase().trim();
        // Exact name substring match
        let match = pois.find(p => p.name.toLowerCase().includes(qLower));
        if (!match) {
          // Keyword match
          match = pois.find(p => (p.keywords || []).some(k => k.toLowerCase().includes(qLower) || qLower.includes(k.toLowerCase())));
        }
        if (match) {
          return res.json({ lat: match.lat, lon: match.lon, displayName: match.name, source: "local" });
        }
      } catch (err) {
        console.warn("Local POIs load failed:", err);
        // continue to external geocode fallback
      }

      const searchQuery = `${q}, Philippines`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { "User-Agent": "iReady-App/1.0" },
      });
      if (!response.ok) {
        return res.status(response.status).json({ message: "Geocoding service error" });
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({ message: "Location not found" });
      }
      const { lat, lon, display_name } = data[0];
      res.json({ lat: parseFloat(lat), lon: parseFloat(lon), displayName: display_name, source: "nominatim" });
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Simple POI search endpoint for client-side suggestions
  app.get("/api/pois", async (req, res) => {
    try {
      const q = (req.query.q as string | undefined) || "";
      const qLower = q.toLowerCase().trim();
      const pois: Array<{ id: string; name: string; lat: number; lon: number; keywords?: string[] }> = require("./data/navotas_pois.json");
      if (!qLower) {
        return res.json({ results: pois.slice(0, 20) });
      }
      const results = pois.filter(p => {
        if (p.name.toLowerCase().includes(qLower)) return true;
        if ((p.keywords || []).some(k => k.toLowerCase().includes(qLower) || qLower.includes(k.toLowerCase()))) return true;
        return false;
      }).slice(0, 20);
      res.json({ results });
    } catch (err) {
      console.error("POI search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search adm4 entries from Data/ToReceive.json
  app.get("/api/adm4", async (req, res) => {
    try {
      const q = (req.query.q as string | undefined) || "";
      const qLower = q.toLowerCase().trim();
      // Load the ToReceive data from repository root
      const path = require("path");
      const toReceivePath = path.join(__dirname, "..", "..", "Data", "ToReceive.json");
      const entries: Array<any> = require(toReceivePath);

      if (!qLower) {
        return res.json({ results: entries.slice(0, 20) });
      }

      // Exact adm4_pcode match
      const exact = entries.find(e => (e.adm4_pcode || "").toLowerCase() === qLower);
      if (exact) {
        return res.json({ results: [exact] });
      }

      // Partial match (adm4_pcode contains query) or start-with
      const results = entries.filter(e => (e.adm4_pcode || "").toLowerCase().includes(qLower)).slice(0, 20);
      res.json({ results });
    } catch (err) {
      console.error("ADM4 search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
