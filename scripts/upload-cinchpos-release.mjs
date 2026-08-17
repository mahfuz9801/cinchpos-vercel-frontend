import { put } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const defaultDesktopDist = path.resolve(projectRoot, "..", "cinchpos desktop", "frontend", "dist");
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
  return process.env.CINCHPOS_RELEASE_VERSION || "1.0.11";
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
  const windowsUpdateSetup = `CinchPOS-Setup-${version}.exe`;
  const windowsUpdateSetupBlockmap = `${windowsUpdateSetup}.blockmap`;
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
    `  - url: ${blobBaseUrl}/updates/${windowsUpdateSetup}`,
    `    sha512: ${windowsInfo.sha512}`,
    `    size: ${windowsInfo.size}`,
    `path: ${blobBaseUrl}/updates/${windowsUpdateSetup}`,
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
    { ...requiredFile(distDir, windowsSetup), fileName: windowsUpdateSetup, pathname: `updates/${windowsUpdateSetup}`, contentType: "application/vnd.microsoft.portable-executable" },
    { ...requiredFile(distDir, windowsSetupBlockmap), fileName: windowsUpdateSetupBlockmap, pathname: `updates/${windowsUpdateSetupBlockmap}`, contentType: "application/octet-stream" },
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
      "Inventory stock now decreases automatically when products are sold through POS or a standard invoice.",
      "Products without barcodes can be saved when item name, MRP, and selling price are provided.",
      "Long thermal receipts use measured continuous height and remain readable instead of being compressed.",
      "Supplier purchases, GST, payment status, notes, and optional bill attachments now use one consolidated workflow.",
      "Previously saved Purchase Bills are migrated into Purchase Records without removing their attachments.",
      "CinchPOS bill tabs now always display open bills as Bill 1, Bill 2, Bill 3 even after older bills are deleted.",
      "Sales Report now downloads customised reports by date range, payment status, content level, and CSV or JSON format.",
      "Login remains active after the computer restarts until the user manually logs out or the saved session expires.",
      "Software Update now guides users through Download Update and Restart & Update for native updates.",
      "Thermal receipts now print at native 58mm, 76mm, or 80mm width instead of shrinking into a tiny center column.",
      "Long shop bills use measured continuous receipt height so text stays readable instead of being compressed.",
      "POS item dumps are no longer printed as receipt Notes on older or newly generated bills.",
      "Print Settings include a shop-printer checklist for roll size, margins, and shrink-to-fit troubleshooting.",
      "App Info now clearly shows the desktop version and Software Update controls.",
      "Owners can recover previous local customers, invoices, and payments into their new account workspace after a database backup.",
      "Save & Print now uses collision-safe backend invoice numbering.",
      "Employee role access can be controlled from Manage Employee.",
      "Login stays active between app restarts with persistent account sessions.",
      "Create Account and Login are simplified to business name, email or phone, and password or OTP.",
      "Online store publishing now syncs reliably to cinchpos.in with bundled certificate support.",
      "The Sell Online URL only opens after the website catalog has synced successfully."
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
