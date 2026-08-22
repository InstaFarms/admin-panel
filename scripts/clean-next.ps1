# Run this script AFTER stopping the Next.js dev server (Ctrl+C).
# Cleans .next to fix MODULE_NOT_FOUND and ENOENT errors.
$nextPath = Join-Path $PSScriptRoot ".." ".next"
if (Test-Path $nextPath) {
  Remove-Item -Recurse -Force $nextPath -ErrorAction SilentlyContinue
  Write-Host "Removed .next folder at: $nextPath"
} else {
  Write-Host ".next folder not found (already clean?)."
}
Write-Host "Now run: npm run dev (from apps/admin)"
