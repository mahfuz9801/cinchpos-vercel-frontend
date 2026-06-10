# CinchPOS Installer Files

The frontend buttons use these default paths:

- `/downloads/CinchPOS-Setup.exe`
- `/downloads/CinchPOS.dmg`

For Vercel, very large installer files may exceed upload or Git hosting limits. If that happens, host the installers on GitHub Releases, S3, Cloudflare R2, or another file host, then set:

- `VITE_WINDOWS_DOWNLOAD_URL`
- `VITE_MAC_DOWNLOAD_URL`

Keep the public button labels unchanged for customers.
