import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

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

// Proxy for video streams
app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("URL required");

  // List of common IPTV player User-Agents
  const userAgents = [
    'IPTVSmartersPlayer',
    'VLC/3.0.18 LibVLC/3.0.18',
    'AppleCoreMedia/1.0.0.19E241',
    'ExoPlayerLib/2.18.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];

  const tryFetch = async (ua: string, attempt: number = 0): Promise<any> => {
    try {
      const isM3U8Request = targetUrl.toLowerCase().includes('.m3u8');
      
      const response = await axios.get(targetUrl, {
        responseType: isM3U8Request ? 'arraybuffer' : 'stream',
        headers: {
          'User-Agent': ua,
          'Accept': '*/*',
          'Connection': 'keep-alive',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      return response;
    } catch (error) {
      if (attempt < 2) {
        const nextUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        return tryFetch(nextUA, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const response = await tryFetch(userAgents[Math.floor(Math.random() * userAgents.length)]);
    
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const isM3U8 = contentType.includes('mpegurl') || 
                   contentType.includes('x-mpegURL') || 
                   targetUrl.toLowerCase().includes('.m3u8');

    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'no-cache');

    if (isM3U8) {
      let dataBuffer: Buffer;
      if (response.data instanceof Buffer) {
        dataBuffer = response.data;
      } else {
        const chunks: any[] = [];
        for await (const chunk of response.data) {
          chunks.push(chunk);
        }
        dataBuffer = Buffer.concat(chunks);
      }

      let content = dataBuffer.toString();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      
      const lines = content.split('\n');
      const rewrittenLines = lines.map((line: string) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          try {
            const absoluteUrl = new URL(trimmed, baseUrl).href;
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
          } catch (e) {
            return line;
          }
        }
        return line;
      });
      
      res.send(rewrittenLines.join('\n'));
    } else {
      if (response.data.pipe) {
        response.data.pipe(res);
      } else {
        res.send(response.data);
      }
    }
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).send("Proxy Error");
  }
});

export default app;
