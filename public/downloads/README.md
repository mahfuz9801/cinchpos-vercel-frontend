# CinchPOS Installer Files

The real production downloads are hosted on Vercel Blob:

- Windows: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS-Setup.exe?v=2026-06-11-50feab30`
- macOS: `https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS.dmg`

The local files in this folder are kept for development and backup. They are
ignored during direct Vercel CLI deploys by `.vercelignore` because each file is
larger than 100 MB.

To override the hosted URLs later, set:

- `VITE_WINDOWS_DOWNLOAD_URL`
- `VITE_MAC_DOWNLOAD_URL`

Keep the public button labels unchanged for customers.
