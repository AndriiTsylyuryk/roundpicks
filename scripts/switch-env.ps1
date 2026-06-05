$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "test") {
    if (Test-Path ".env.test.local") {
        Copy-Item ".env.test.local" ".env.local" -Force
        Write-Host "→ Switched to TEST database (branch: $branch)"
    } else {
        Write-Host "⚠  .env.test.local not found, skipping"
    }
} else {
    if (Test-Path ".env.local.dev") {
        Copy-Item ".env.local.dev" ".env.local" -Force
        Write-Host "→ Switched to DEV database (branch: $branch)"
    } else {
        Write-Host "⚠  .env.local.dev not found, skipping"
    }
}
