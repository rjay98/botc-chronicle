import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const clientAssets = path.join(root, "dist", "client", "assets");
const serverAssets = path.join(root, "dist", "server", "assets");
const publicAssets = path.join(root, "public", "assets");
const manifestPath = path.join(root, "dist", "client", ".vite", "manifest.json");

await mkdir(publicAssets, { recursive: true });

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const aliases = new Map();

const aliasFromManifest = (key, alias) => {
  const file = manifest[key]?.file;
  if (typeof file === "string") aliases.set(path.basename(file), alias);
};

aliasFromManifest("virtual:vinext-app-browser-entry", "ledger-index.js");
aliasFromManifest("app/chronicle-dashboard.tsx", "ledger-dashboard.js");
aliasFromManifest(
  "node_modules/vinext/dist/shims/layout-segment-context.js",
  "ledger-layout-context.js"
);
aliasFromManifest(
  Object.keys(manifest).find((key) => manifest[key]?.name === "framework"),
  "ledger-framework.js"
);
aliasFromManifest(
  Object.keys(manifest).find((key) => manifest[key]?.name === "rolldown-runtime"),
  "ledger-runtime.js"
);

const currentCss = (await readdir(serverAssets)).find(
  (file) => file.startsWith("index-") && file.endsWith(".css")
);
if (!currentCss) throw new Error("Unable to locate the generated ledger stylesheet.");
aliases.set(currentCss, "ledger-current.css");

for (const [sourceName, aliasName] of aliases) {
  const source = path.join(clientAssets, sourceName);
  await copyFile(source, path.join(clientAssets, aliasName));
  await copyFile(source, path.join(publicAssets, sourceName));
  await copyFile(source, path.join(publicAssets, aliasName));
}

console.log(`Preserved ${aliases.size} versioned assets and stable recovery aliases.`);
