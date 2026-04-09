import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  FileCode, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Shield, 
  Clock,
  ArrowRight,
  FileArchive,
  AlertCircle,
  Loader2,
  X,
  Settings,
  Download
} from "lucide-react";
import { cn } from "@/src/lib/utils";

// --- Components ---

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  }, [onUpload]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn(
        "relative group border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-300 h-full",
        dragActive ? "border-orange-500 bg-orange-500/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".zip,.html"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-orange-500" />
        )}
      </div>
      <h3 className="text-xl font-bold mb-2">Drop your project</h3>
      <p className="text-gray-500 text-center mb-6 text-sm max-w-[240px]">
        Drag and drop your project as a <b>.zip</b> archive or a single <b>.html</b> file.
      </p>
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="bg-white text-black px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        Select Files <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

interface PasteZoneProps {
  onUpload: (html: string) => void;
  isUploading: boolean;
}

function PasteZone({ onUpload, isUploading }: PasteZoneProps) {
  const [htmlContent, setHtmlContent] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="border border-white/10 bg-white/[0.02] rounded-3xl p-8 flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
          <FileCode className="w-5 h-5 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold">Paste HTML</h3>
      </div>
      <textarea
        value={htmlContent}
        onChange={(e) => setHtmlContent(e.target.value)}
        placeholder="<!DOCTYPE html>..."
        className="flex-1 min-h-[200px] bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-orange-500/50 transition-colors resize-none mb-6"
      />
      <button 
        onClick={() => onUpload(htmlContent)}
        disabled={!htmlContent.trim() || isUploading}
        className="w-full bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deploying...
          </>
        ) : "Deploy Now"}
      </button>
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleCopy = useCallback(() => {
    if (liveUrl) {
      navigator.clipboard.writeText(window.location.origin + liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [liveUrl]);

  const handleHtmlUpload = async (html: string) => {
    if (!html.trim()) return;
    setIsUploading(true);
    setError(null);
    setLiveUrl(null);
    try {
      const response = await fetch("/api/upload-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        setLiveUrl(data.url);
      } else {
        setError(data.error || "Failed to upload HTML content.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    // Client-side validation
    const isZip = file.name.toLowerCase().endsWith(".zip");
    const isHtml = file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm");
    
    if (!isZip && !isHtml) {
      setError("Unsupported file type. Please upload a .zip or .html file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setLiveUrl(null);

    try {
      let response;
      if (isHtml) {
        const text = await file.text();
        response = await fetch("/api/upload-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: text }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch("/api/upload-zip", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();
      if (response.ok && data.url) {
        setLiveUrl(data.url);
      } else {
        setError(data.error || "Failed to process your file. Ensure it's a valid ZIP with an index.html.");
      }
    } catch (err) {
      setError("Upload failed. The server might be busy or the file is too large.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-orange-500/30">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <nav className="relative z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight">WOD Drop</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Features</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button className="bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Settings</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Portable Version</h4>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    Download a single-file version of WOD Drop that you can run locally or host anywhere.
                  </p>
                  <a 
                    href="/standalone.html" 
                    download="wod-drop-portable.html"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download standalone.html
                  </a>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">About</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    WOD Drop v1.0.0<br />
                    A free static hosting solution for developers.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
              Free Static Hosting <br /> for Your Projects
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Drop your index.html or ZIP file and get a live URL in seconds. 
              No configuration, no servers, just pure static speed.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-500" />
              <span>Secure Hosting</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Instant Deploy</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          <UploadZone onUpload={handleFileUpload} isUploading={isUploading} />
          <PasteZone onUpload={handleHtmlUpload} isUploading={isUploading} />
        </div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {(liveUrl || error) && (
            <motion.div
              key={liveUrl ? "success" : "error"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12"
            >
              {error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">Deployment Failed</h4>
                    <p className="text-sm opacity-80">{error}</p>
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 relative overflow-hidden">
                  {/* Decorative Glow */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                        <Globe className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Your site is live!</h3>
                        <p className="text-gray-400 text-sm">Deployment successful and assets hosted.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95"
                        title="Copy URL"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        <span className="text-sm font-medium">{copied ? "Copied" : "Copy URL"}</span>
                      </button>
                      <a 
                        href={liveUrl!} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                      >
                        <span className="text-sm font-medium">Open Site</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
                    <code className="text-orange-400 font-mono text-sm truncate mr-4">
                      {window.location.origin}{liveUrl}
                    </code>
                    <button 
                      onClick={handleCopy}
                      className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Grid */}
        <div className="mt-32 grid md:grid-cols-3 gap-12">
          <div>
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <h4 className="text-lg font-bold mb-3">Blazing Fast</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Our edge network ensures your static content is served with minimal latency to users worldwide.
            </p>
          </div>
          <div>
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
              <FileArchive className="w-6 h-6 text-orange-500" />
            </div>
            <h4 className="text-lg font-bold mb-3">ZIP Support</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Upload complex projects with multiple files, images, and folders. We'll handle the extraction.
            </p>
          </div>
          <div>
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="w-6 h-6 text-orange-500" />
            </div>
            <h4 className="text-lg font-bold mb-3">Custom URLs</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Every deployment gets a unique, permanent URL that you can share instantly with anyone.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Zap className="w-4 h-4" />
            <span className="font-bold text-sm">WOD Drop</span>
          </div>
          <p className="text-gray-600 text-sm">
            © 2026 WOD Drop. Built for the modern web.
          </p>
          <div className="flex gap-6 text-gray-600 text-sm">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
