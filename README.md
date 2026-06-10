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

Production defaults use Vercel Blob because the installers are larger than the
normal Vercel and GitHub file upload limits:

- Windows: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS-Setup.exe`
- macOS: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS.dmg`

To override those URLs later, add these Vercel environment variables:

- `VITE_WINDOWS_DOWNLOAD_URL`
- `VITE_MAC_DOWNLOAD_URL`
