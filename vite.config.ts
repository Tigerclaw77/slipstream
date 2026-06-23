import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { compareCompetitorSources } from "./server/competitorProviders.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "slipstream-competitor-source-api",
      configureServer(server) {
        server.middlewares.use("/api/source-comparison", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "", "http://127.0.0.1");
            const address = requestUrl.searchParams.get("address") ?? "";
            const radiusMiles = Number(requestUrl.searchParams.get("radiusMiles") ?? "3");

            if (!address.trim()) {
              response.statusCode = 400;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: "Address is required." }));
              return;
            }

            const result = await compareCompetitorSources({
              address,
              radiusMiles: Number.isFinite(radiusMiles) ? radiusMiles : 3,
            });

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(result));
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Source comparison failed.",
              }),
            );
          }
        });
      },
    },
  ],
  server: {
    proxy: {
      "/api/nominatim": {
        target: "https://nominatim.openstreetmap.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ""),
      },
      "/api/overpass-de": {
        target: "https://overpass-api.de",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-de/, ""),
      },
      "/api/overpass-kumi": {
        target: "https://overpass.kumi.systems",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass-kumi/, ""),
      },
    },
  },
});
