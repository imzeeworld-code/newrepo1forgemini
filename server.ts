import express from "express";
import type { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { nanoid } from "nanoid";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITES_DIR = path.join(__dirname, "sites");

// Ensure sites directory exists
if (!fs.existsSync(SITES_DIR)) {
  fs.mkdirSync(SITES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "temp_uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${nanoid()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API: Upload HTML content
  app.post("/api/upload-html", (req: Request, res: Response) => {
    try {
      const { html } = req.body;
      if (!html) {
        return res.status(400).json({ error: "No HTML content provided" });
      }

      const siteId = nanoid(10);
      const sitePath = path.join(SITES_DIR, siteId);
      fs.mkdirSync(sitePath, { recursive: true });
      fs.writeFileSync(path.join(sitePath, "index.html"), html);

      res.json({ siteId, url: `/s/${siteId}/` });
    } catch (error) {
      console.error("Upload HTML error:", error);
      res.status(500).json({ error: "Failed to save site" });
    }
  });

  // API: Upload ZIP file
  app.post("/api/upload-zip", upload.single("file"), (req: Request, res: Response) => {
    let tempFilePath: string | undefined;
    try {
      const multerReq = req as Request & { file?: Express.Multer.File };
      if (!multerReq.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      tempFilePath = multerReq.file.path;

      // Validate file extension
      if (!multerReq.file.originalname.toLowerCase().endsWith(".zip")) {
        return res.status(400).json({ error: "Only .zip files are allowed" });
      }

      const zip = new AdmZip(multerReq.file.path);
      const zipEntries = zip.getEntries();

      // Check if ZIP is empty
      if (zipEntries.length === 0) {
        return res.status(400).json({ error: "The ZIP file is empty" });
      }

      // Check for index.html
      const hasIndexHtml = zipEntries.some(entry => 
        entry.entryName.toLowerCase() === "index.html" || 
        entry.entryName.toLowerCase().endsWith("/index.html")
      );

      if (!hasIndexHtml) {
        return res.status(400).json({ error: "ZIP must contain an index.html file" });
      }

      const siteId = nanoid(10);
      const sitePath = path.join(SITES_DIR, siteId);
      fs.mkdirSync(sitePath, { recursive: true });

      zip.extractAllTo(sitePath, true);

      // Handle "single folder" ZIPs and ignore junk files like __MACOSX
      const cleanupJunk = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item === "__MACOSX" || item === ".DS_Store") {
            const itemPath = path.join(dir, item);
            if (fs.statSync(itemPath).isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
          }
        }
      };

      cleanupJunk(sitePath);

      const filesAfterCleanup = fs.readdirSync(sitePath);
      if (filesAfterCleanup.length === 1 && fs.statSync(path.join(sitePath, filesAfterCleanup[0])).isDirectory()) {
        const subfolder = path.join(sitePath, filesAfterCleanup[0]);
        const subFiles = fs.readdirSync(subfolder);
        for (const file of subFiles) {
          fs.renameSync(path.join(subfolder, file), path.join(sitePath, file));
        }
        fs.rmSync(subfolder, { recursive: true, force: true });
      }

      res.json({ siteId, url: `/s/${siteId}/` });
    } catch (error) {
      console.error("Upload ZIP error:", error);
      res.status(500).json({ error: "Failed to process ZIP file. It might be corrupted." });
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  // Serve hosted sites
  app.use("/s", express.static(SITES_DIR));

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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
