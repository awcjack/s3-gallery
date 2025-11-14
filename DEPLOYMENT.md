# Deployment Guide

This guide explains how to deploy the S3 Gallery to GitHub Pages or Cloudflare Pages.

## GitHub Pages Deployment

### Automatic Deployment (Recommended)

The repository is configured with GitHub Actions for automatic deployment.

1. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "GitHub Actions"

2. **Push to main branch:**
   ```bash
   git push origin main
   ```

3. **Wait for deployment:**
   - The GitHub Actions workflow will automatically build and deploy your site
   - Check the "Actions" tab to monitor the deployment
   - Once complete, your site will be available at: `https://[username].github.io/s3-gallery/`

### Manual Deployment

If you prefer manual deployment:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# The built files will be in the `dist` directory
# Upload these files to your GitHub Pages branch
```

## Cloudflare Pages Deployment

### Using Cloudflare Dashboard

1. **Log in to Cloudflare Dashboard:**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)

2. **Create a new project:**
   - Click "Create a project"
   - Connect your GitHub repository

3. **Configure build settings:**
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:**
     - `NODE_VERSION`: `18`

4. **Deploy:**
   - Click "Save and Deploy"
   - Cloudflare will build and deploy your site
   - Your site will be available at: `https://[project-name].pages.dev`

### Using Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=s3-gallery
```

## Configuration for Custom Domain

### GitHub Pages

1. Go to repository settings → Pages
2. Add your custom domain
3. Configure DNS records:
   ```
   CNAME: www.yourdomain.com → [username].github.io
   ```

### Cloudflare Pages

1. Go to your project in Cloudflare Dashboard
2. Navigate to "Custom domains"
3. Add your domain
4. Cloudflare will automatically configure DNS if your domain is on Cloudflare

## Environment Variables

For production deployments, you may want to configure:

- **Base URL:** Already configured in `vite.config.ts`
- **S3 Endpoints:** Users will configure these via the UI

## Troubleshooting

### GitHub Pages 404 Error

If you encounter a 404 error:
- Ensure the `base` path in `vite.config.ts` matches your repository name
- Check that GitHub Pages is enabled in repository settings
- Verify the deployment branch is correct

### Cloudflare Pages Build Failure

If the build fails:
- Check that Node version is set to 18 or higher
- Verify build command is `npm run build`
- Ensure build output directory is `dist`

## Production Checklist

- [ ] Test the application locally with `npm run build && npm run preview`
- [ ] Verify all assets load correctly
- [ ] Test S3 connectivity with different providers
- [ ] Check responsive design on mobile devices
- [ ] Verify GitHub Actions workflow is enabled
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/analytics (optional)
