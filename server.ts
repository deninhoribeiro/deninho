import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";

async function startServer() {
  const app = express();
  app.use(cors());
  const PORT = 3000;

  // API Route to fetch M3U content (bypasses CORS)
  app.get("/api/m3u", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });
      res.send(response.data);
    } catch (error) {
      console.error("Error fetching M3U:", error);
      res.status(500).send("Error fetching M3U list");
    }
  });

  // DNS-over-HTTPS Resolver (Cloudflare)
  const resolveDns = async (hostname: string) => {
    try {
      const response = await axios.get(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
        headers: { 'Accept': 'application/dns-json' }
      });
      if (response.data.Answer && response.data.Answer.length > 0) {
        return response.data.Answer[0].data;
      }
    } catch (e) {
      console.error("DNS Resolution Error:", e);
    }
    return hostname; // Fallback to original hostname
  };

  // Proxy for video streams
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL required");

    // List of common IPTV player User-Agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'VLC/3.0.20 LibVLC/3.0.20',
      'IPTVSmartersPlayer/1.0',
      'ExoPlayerLib/2.19.1',
      'AppleCoreMedia/1.0.0.20G81 (Apple TV; U; CPU OS 16_6 like Mac OS X; en_us)',
      'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Safari/537.36 SmartTV/8.3.0 (NetCast)',
      'Mozilla/5.0 (Linux; Tizen 7.0; SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/6.4 Chrome/94.0.4606.81 TV Safari/537.36'
    ];

    const tryFetch = async (ua: string, attempt: number = 0): Promise<any> => {
      try {
        const headers: any = {
          'User-Agent': ua,
          'Accept': '*/*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'keep-alive',
          'Referer': targetUrl,
          'Origin': new URL(targetUrl).origin,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        };

        if (req.headers.range) {
          headers['Range'] = req.headers.range;
        }

        const protocol = new URL(targetUrl).protocol.toUpperCase();
        console.log(`[Proxy] Fetching (${req.method}) [${protocol}]: ${targetUrl} (Attempt ${attempt + 1}) | UA: ${ua.substring(0, 30)}...`);

        // Use axios to fetch the stream
        const response = await axios({
          method: req.method as any,
          url: targetUrl,
          responseType: 'stream',
          headers,
          timeout: 30000,
          maxRedirects: 15,
          validateStatus: (status) => status < 500,
        });

        const contentType = (response.headers['content-type'] || '').toLowerCase();
        const isTS = targetUrl.toLowerCase().includes('.ts') || contentType.includes('video/mp2t');
        const isManifest = !isTS && (contentType.includes('mpegurl') || 
                          contentType.includes('x-mpegurl') || 
                          contentType.includes('application/vnd.apple.mpegurl') ||
                          targetUrl.toLowerCase().includes('.m3u8') ||
                          targetUrl.toLowerCase().includes('.m3u'));

        // If it's a manifest, we need the full data to rewrite it
        if (isManifest && req.method === 'GET') {
            const chunks: any[] = [];
            for await (const chunk of response.data) {
                chunks.push(chunk);
            }
            response.data = Buffer.concat(chunks);
        }

        if (contentType.includes('text/html') && !targetUrl.toLowerCase().includes('.html') && attempt < 3) {
          console.log(`[Proxy] Got HTML instead of stream, retrying with different UA...`);
          const nextUA = userAgents[Math.floor(Math.random() * userAgents.length)];
          await new Promise(resolve => setTimeout(resolve, 1500));
          return tryFetch(nextUA, attempt + 1);
        }

        return { response, isManifest };
      } catch (error: any) {
        if (attempt < 3) {
          console.log(`[Proxy] Error: ${error.message}, retrying...`);
          const nextUA = userAgents[Math.floor(Math.random() * userAgents.length)];
          await new Promise(resolve => setTimeout(resolve, 1500));
          return tryFetch(nextUA, attempt + 1);
        }
        throw error;
      }
    };

    try {
      const { response, isManifest } = await tryFetch(userAgents[Math.floor(Math.random() * userAgents.length)]);
      
      let contentType = (response.headers['content-type'] || 'application/octet-stream').toLowerCase();
      
      // Force correct content type for TS files if needed
      if (targetUrl.toLowerCase().includes('.ts') && contentType === 'application/octet-stream') {
        contentType = 'video/mp2t';
      }

      res.set('Content-Type', contentType);
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Allow-Headers', '*');
      res.set('Cache-Control', 'no-cache');

      if (response.headers['content-length']) {
        res.set('Content-Length', response.headers['content-length']);
      }

      if (isManifest && req.method === 'GET') {
        let content = response.data.toString();
        
        if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
           console.error("[Proxy] Manifest is actually HTML");
           return res.status(502).send("O link retornou uma página da web em vez do vídeo.");
        }

        const baseUrl = new URL('.', targetUrl).href;
        
        const lines = content.split(/\r?\n/);
        const rewrittenLines = lines.map((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          if (!trimmed.startsWith('#')) {
            try {
              const absoluteUrl = new URL(trimmed, baseUrl).href;
              return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            } catch (e) {
              return line;
            }
          }

          if (trimmed.includes('URI=')) {
            return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
              try {
                const absoluteUrl = new URL(uri, baseUrl).href;
                return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
              } catch (e) {
                return match;
              }
            });
          }

          return line;
        });
        
        res.send(rewrittenLines.join('\n'));
      } else {
        if (req.method === 'HEAD') {
          res.end();
        } else if (response.data.pipe) {
          response.data.pipe(res);
        } else {
          res.send(response.data);
        }
      }
    } catch (error: any) {
      console.error("Proxy Error for URL:", targetUrl, error.message);
      res.status(500).send(`Erro ao conectar com o canal: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
