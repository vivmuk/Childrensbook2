# Deployment Guide for Railway

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. A Venice API key
3. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step-by-Step Deployment

### 1. Connect Repository to Railway

1. Log in to Railway
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or your Git provider)
4. Select your repository

### 2. Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```
VENICE_API_KEY=your_venice_api_key_here
NODE_ENV=production
```

Variables are injected at **run time** only. The image is built from the
`Dockerfile` in this repo, which never declares them as `ARG`/`ENV`, so no
credential is baked into an image layer.

### 3. Configure Build Settings

The build is defined by `Dockerfile` and selected in `railway.json` /
`railway.toml`:

- **Builder**: `DOCKERFILE`
- **Dockerfile Path**: `Dockerfile`
- **Start Command**: `npm start`
- **Root Directory**: `/` (default)

If the service was created before the Dockerfile was added, switch the builder
from Nixpacks to Dockerfile in Settings → Build.

### 4. Deploy

Railway builds the image, which:
1. Installs dependencies (`npm ci`)
2. Builds the application (`npm run build`)
3. Prunes dev dependencies and copies the build into a slim runtime image
   containing Chromium (used for PDF export)
4. Starts the server (`npm start`)

### 5. Get Your URL

Once deployed, Railway will provide a public URL like:
`https://your-app-name.up.railway.app`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VENICE_API_KEY` | Your Venice.ai API key | Yes |
| `NODE_ENV` | Set to `production` | Recommended |

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json`
- Verify Node.js version (should be 18+)
- Check build logs in Railway dashboard

### Runtime Errors

- Verify `VENICE_API_KEY` is set correctly
- Check application logs in Railway dashboard
- Ensure API key has sufficient credits

### API Errors

- Verify Venice API key is valid
- Check API rate limits
- Review Venice API documentation

## Notes

- Books are stored in-memory and will be lost on server restart
- For production, consider adding a database (PostgreSQL, MongoDB)
- Railway provides free tier with limitations
- Consider setting up a custom domain in Railway settings

