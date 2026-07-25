/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS?: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const CACHE_EPOCH = "2026-07-25-12";
const CACHE_COOKIE = `midnight_ledger_cache_${CACHE_EPOCH}=1`;
const DOCUMENT_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
};
const LEGACY_ASSET_ALIASES = [
  [/^\/assets\/index-[^/]+\.css$/, "/assets/ledger-current.css"],
  [/^\/assets\/index-[^/]+\.js$/, "/assets/ledger-index.js"],
  [/^\/assets\/chronicle-dashboard-[^/]+\.js$/, "/assets/ledger-dashboard.js"],
  [/^\/assets\/layout-segment-context-[^/]+\.js$/, "/assets/ledger-layout-context.js"],
  [/^\/assets\/framework-[^/]+\.js$/, "/assets/ledger-framework.js"],
  [/^\/assets\/rolldown-runtime-[^/]+\.js$/, "/assets/ledger-runtime.js"],
] as const;

const withHeaders = (
  response: Response,
  values: Record<string, string>
): Response => {
  const headers = new Headers(response.headers);
  Object.entries(values).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => {
          if (!env.ASSETS) throw new Error("Static asset binding unavailable.");
          return env.ASSETS.fetch(new Request(new URL(path, request.url)));
        },
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    let response = await handler.fetch(request, env, ctx);

    if (request.method === "GET" && response.status === 404) {
      const recovery = LEGACY_ASSET_ALIASES.find(([pattern]) =>
        pattern.test(url.pathname)
      );
      if (recovery && env.ASSETS) {
        const recovered = await env.ASSETS.fetch(
          new Request(new URL(recovery[1], request.url), request)
        );
        if (recovered.ok) {
          response = withHeaders(recovered, {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "X-Ledger-Asset-Recovery": recovery[1],
          });
        }
      }
    }

    if (response.headers.get("content-type")?.includes("text/html")) {
      response = withHeaders(response, DOCUMENT_CACHE_HEADERS);
      const cookie = request.headers.get("cookie") ?? "";
      if (!cookie.includes(CACHE_COOKIE)) {
        const headers = new Headers(response.headers);
        headers.set("Clear-Site-Data", "\"cache\"");
        headers.append(
          "Set-Cookie",
          `${CACHE_COOKIE}; Path=/; Max-Age=31536000; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`
        );
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    }

    return response;
  },
};

export default worker;
