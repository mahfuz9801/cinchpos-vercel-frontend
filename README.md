# CinchPOS Vercel Frontend

Modern Node + Tailwind landing page for CinchPOS Desktop downloads.

This is the folder Vercel deploys. Desktop-app code changes made in
`/Users/mahfuz/Desktop/cinchpos/cinchpos desktop/frontend` will not appear on
the website until the matching website/download content is updated here and this
repo is pushed or redeployed.

## Current Deployment Marker

- Build label: `release-1.0.2`
- Public marker after deployment: `/deployment.json`
- Visible website update: current desktop build panel in the Download tab
- Desktop build messaging: shop update prompts, billing-screen alignment fixes,
  inventory and dashboard layout fixes, invoice status/delete support, receipt
  improvements, and Mac/Windows installers

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Download URLs

Production defaults use Vercel Blob because the installers are larger than the
normal Vercel and GitHub file upload limits:

- Windows: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS-Setup.exe?v=1.0.2`
- macOS: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS.dmg?v=1.0.2`

## Desktop Auto Updates

The desktop app checks the generic update feed hosted on Vercel Blob:

- Windows: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/updates/latest.yml`
- macOS: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/updates/latest-mac.yml`

To upload a new release after building desktop installers:

```bash
npm run release:upload -- --version <version>
```

To override those URLs later, add these Vercel environment variables:

- `VITE_WINDOWS_DOWNLOAD_URL`
- `VITE_MAC_DOWNLOAD_URL`
