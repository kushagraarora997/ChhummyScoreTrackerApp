---
description: Deploy Chhummy Tracker to Vercel via git push
---

Vercel is linked to GitHub. Deployment = push to main.

1. Check what's being committed:
```bash
git status
git diff
```

2. Stage and commit:
```bash
git add <specific files>
git commit -m "your message"
```

3. Push — Vercel auto-deploys:
```bash
git push origin main
```

4. Check Vercel dashboard or run:
```bash
gh run list --limit 5
```

**Never `git add .` blindly — check for .env files or secrets first.**
