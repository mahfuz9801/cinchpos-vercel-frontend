# CinchPOS Vercel Frontend

Modern Node + Tailwind landing page for CinchPOS Desktop downloads.

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

Defaults:

- Windows: `/downloads/CinchPOS-Setup.exe`
- macOS: `/downloads/CinchPOS.dmg`

For Vercel production, add environment variables if your installer files are hosted externally:

- `VITE_WINDOWS_DOWNLOAD_URL`
- `VITE_MAC_DOWNLOAD_URL`
