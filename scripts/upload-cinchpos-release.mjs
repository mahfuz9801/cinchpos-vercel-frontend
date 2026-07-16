import { put } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const defaultDesktopDist = path.resolve(projectRoot, "..", "cinchpos", "cinchpos desktop", "frontend", "dist");
const defaultBlobBaseUrl = "https://7aakdg0aolddhlmb.public.blob.vercel-storage.com";

function loadEnvFile(filePath) {
  return fs.readFile(filePath, "utf8")
    .then((content) => {
      content.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) {
          return;
        }
        const rawValue = match[2].replace(/^['"]|['"]$/g, "");
        process.env[match[1]] = rawValue;
      });
    })
    .catch(() => {});
}

function parseVersion(argv) {
  const flagIndex = argv.findIndex((value) => value === "--version" || value === "-v");
  if (flagIndex >= 0 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1];
  }
  return process.env.CINCHPOS_RELEASE_VERSION || "1.0.3";
}

function requiredFile(distDir, fileName) {
  return {
    fileName,
    source: path.join(distDir, fileName)
  };
}

async function optionalFile(distDir, fileName) {
  const source = path.join(distDir, fileName);
  try {
    await statFile(source);
    return { fileName, source };
  } catch {
    return null;
  }
}

async function statFile(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error(`${filePath} is not a file.`);
  }
  return stat;
}

async function fileInfo(filePath) {
  const body = await fs.readFile(filePath);
  return {
    sha512: crypto.createHash("sha512").update(body).digest("base64"),
    size: body.length
  };
}

async function uploadFile({ source, pathname, contentType, token }) {
  await statFile(source);
  const body = await fs.readFile(source);
  const blob = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token
  });
  console.log(`uploaded ${pathname}`);
  return blob;
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function writeJSON(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  await loadEnvFile(path.join(projectRoot, ".env.local"));
  await loadEnvFile(path.join(projectRoot, ".env"));

  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN or VERCEL_BLOB_READ_WRITE_TOKEN.");
  }

  const version = parseVersion(process.argv.slice(2));
  const distDir = path.resolve(process.env.CINCHPOS_DESKTOP_DIST || defaultDesktopDist);
  const blobBaseUrl = (process.env.CINCHPOS_BLOB_BASE_URL || defaultBlobBaseUrl).replace(/\/+$/, "");
  const releaseDate = new Date().toISOString();
  const windowsSetup = `CinchPOS Setup ${version}.exe`;
  const windowsSetupBlockmap = `${windowsSetup}.blockmap`;
  const macArmZip = `CinchPOS-${version}-arm64-mac.zip`;
  const macArmZipBlockmap = `${macArmZip}.blockmap`;
  const macArmDmg = `CinchPOS-${version}-arm64.dmg`;
  const windowsSetupPath = path.join(distDir, windowsSetup);
  const macArmZipPath = path.join(distDir, macArmZip);
  const windowsInfo = await fileInfo(windowsSetupPath);
  const macArmInfo = await fileInfo(macArmZipPath);
  const latestYmlPath = path.join(projectRoot, "public", "updates", "latest.yml");
  const latestMacYmlPath = path.join(projectRoot, "public", "updates", "latest-mac.yml");

  await writeText(latestYmlPath, [
    `version: ${version}`,
    "files:",
    `  - url: ${blobBaseUrl}/downloads/CinchPOS-Setup.exe`,
    `    sha512: ${windowsInfo.sha512}`,
    `    size: ${windowsInfo.size}`,
    `path: ${blobBaseUrl}/downloads/CinchPOS-Setup.exe`,
    `sha512: ${windowsInfo.sha512}`,
    `releaseDate: '${releaseDate}'`,
    ""
  ].join("\n"));

  await writeText(latestMacYmlPath, [
    `version: ${version}`,
    "files:",
    `  - url: ${macArmZip}`,
    `    sha512: ${macArmInfo.sha512}`,
    `    size: ${macArmInfo.size}`,
    `path: ${macArmZip}`,
    `sha512: ${macArmInfo.sha512}`,
    `releaseDate: '${releaseDate}'`,
    ""
  ].join("\n"));

  const directDownloads = [
    {
      ...requiredFile(distDir, windowsSetup),
      pathname: "downloads/CinchPOS-Setup.exe",
      contentType: "application/vnd.microsoft.portable-executable"
    },
    {
      ...requiredFile(distDir, windowsSetupBlockmap),
      pathname: "downloads/CinchPOS-Setup.exe.blockmap",
      contentType: "application/octet-stream"
    },
    {
      ...requiredFile(distDir, macArmDmg),
      pathname: "downloads/CinchPOS.dmg",
      contentType: "application/x-apple-diskimage"
    }
  ];

  const updateAssets = [
    { source: latestYmlPath, fileName: "latest.yml", pathname: "updates/latest.yml", contentType: "application/x-yaml" },
    { source: latestMacYmlPath, fileName: "latest-mac.yml", pathname: "updates/latest-mac.yml", contentType: "application/x-yaml" },
    { ...requiredFile(distDir, macArmZip), pathname: `updates/${macArmZip}`, contentType: "application/zip" }
  ];
  const macArmBlockmapAsset = await optionalFile(distDir, macArmZipBlockmap);
  if (macArmBlockmapAsset) {
    updateAssets.push({ ...macArmBlockmapAsset, pathname: `updates/${macArmZipBlockmap}`, contentType: "application/octet-stream" });
  }

  const uploaded = {};
  for (const asset of [...directDownloads, ...updateAssets]) {
    uploaded[asset.pathname] = await uploadFile({ ...asset, token });
  }

  const releaseManifest = {
    app: "CinchPOS",
    version,
    channel: "stable",
    releaseDate,
    notes: [
      "Shop installations now get an optional update prompt when a newer desktop build is available.",
      "Sales Report now includes download support and corrected daily, weekly, monthly, and custom trend calculations.",
      "Account privacy, login lockout, and API no-store protections are included.",
      "Long thermal bills now print at readable receipt width instead of shrinking."
    ],
    downloads: {
      windows: {
        fileName: "CinchPOS-Setup.exe",
        url: uploaded["downloads/CinchPOS-Setup.exe"].url,
        sourceFile: windowsSetup
      },
      mac: {
        fileName: "CinchPOS.dmg",
        url: uploaded["downloads/CinchPOS.dmg"].url,
        sourceFile: macArmDmg
      }
    },
    updateFeed: {
      windows: uploaded["updates/latest.yml"].url,
      mac: uploaded["updates/latest-mac.yml"].url
    }
  };

  const manifestPath = path.join(projectRoot, "public", "updates", "release.json");
  await writeJSON(manifestPath, releaseManifest);
  await uploadFile({
    source: manifestPath,
    pathname: "updates/release.json",
    contentType: "application/json",
    token
  });

  await writeJSON(path.join(projectRoot, "public", "deployment.json"), {
    app: "CinchPOS",
    deploymentVersion: `release-${version}`,
    updatedAt: releaseDate,
    downloadLinks: releaseManifest.downloads,
    updateFeed: releaseManifest.updateFeed,
    notes: releaseManifest.notes
  });

  console.log(`CinchPOS ${version} release uploaded.`);
  console.log(`Windows: ${releaseManifest.downloads.windows.url}`);
  console.log(`macOS: ${releaseManifest.downloads.mac.url}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
