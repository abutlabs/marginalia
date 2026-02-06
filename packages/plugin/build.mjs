import { build } from "esbuild";

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["scripts/entry.ts"],
  outfile: "scripts/marginalia.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: false,
  minify: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: [],
};

if (watch) {
  const ctx = await build({ ...config, plugins: [] });
  console.log("Watching for changes...");
} else {
  await build(config);
  console.log("Built scripts/marginalia.mjs");
}
