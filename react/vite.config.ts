import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Serve static HTML pages from public/ for specific routes,
// before Vite's SPA fallback kicks in.
function staticPages(): Plugin {
  return {
    name: "static-pages",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const staticRoutes = ["/nao/", "/conteudo_adulto/"];
        if (req.url && staticRoutes.some((r) => req.url!.startsWith(r))) {
          const htmlPath = path.join(
            process.cwd(),
            "public",
            req.url,
            "index.html"
          );
          if (fs.existsSync(htmlPath)) {
            _res.setHeader("Content-Type", "text/html");
            _res.end(fs.readFileSync(htmlPath, "utf-8"));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [staticPages(), react()],
  server: {
    proxy: {
      "/v1/verify": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
