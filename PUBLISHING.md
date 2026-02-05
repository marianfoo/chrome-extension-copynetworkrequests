# Publishing Guide for Chrome Web Store

This guide covers how to publish the Network Request & Response Copier extension to the Chrome Web Store, both manually and via automated CI/CD.

## Table of Contents

- [Publishing Guide for Chrome Web Store](#publishing-guide-for-chrome-web-store)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Manual Publishing](#manual-publishing)
    - [Step 1: Prepare the Package](#step-1-prepare-the-package)
    - [Step 2: Upload in Developer Dashboard](#step-2-upload-in-developer-dashboard)
    - [Step 3: Complete Listing, Privacy, and Distribution](#step-3-complete-listing-privacy-and-distribution)
    - [Step 4: Add Store Assets](#step-4-add-store-assets)
    - [Step 5: Submit for Review](#step-5-submit-for-review)
    - [Updating an Existing Item](#updating-an-existing-item)
  - [Automated Publishing (GitHub Actions)](#automated-publishing-github-actions)
    - [Setting Up Chrome Web Store API](#setting-up-chrome-web-store-api)
    - [Configuring GitHub Secrets](#configuring-github-secrets)
    - [Creating a Release](#creating-a-release)
  - [Chrome Web Store Best Practices](#chrome-web-store-best-practices)
    - [Manifest Requirements](#manifest-requirements)
    - [Code Quality](#code-quality)
    - [Privacy \& Security](#privacy--security)
    - [Store Listing](#store-listing)
    - [Common Rejection Reasons](#common-rejection-reasons)
  - [Troubleshooting](#troubleshooting)
    - [Extension Not Approved](#extension-not-approved)
    - [API Upload Fails](#api-upload-fails)
    - [Version Mismatch](#version-mismatch)
  - [Quick Reference: Release Checklist](#quick-reference-release-checklist)

---

## Prerequisites

1. **Google Developer Account** - Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. **One-time fee** - $5 USD registration fee
3. **Extension package** - ZIP file of the extension (created automatically by CI or manually)
4. **Account limit** - Each developer account can publish up to 20 items (remove unused items if you hit the limit)

---

## Manual Publishing

### Step 1: Prepare the Package

Create a ZIP file containing all extension files:

```bash
cd network-request-response-copier
zip -r ../network-copier-v1.0.0.zip . -x "*.DS_Store" -x "*.git*" -x "*.md"
```

**Required files in ZIP:**

```
network-request-response-copier.zip
├── manifest.json
├── devtools.html
├── devtools.js
├── panel.html
├── panel.css
├── panel.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Step 2: Upload in Developer Dashboard

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click **"New item"**
3. Upload your ZIP file (must be under 2 GB)

### Step 3: Complete Listing, Privacy, and Distribution

Fill out the required tabs in the dashboard:

| Field | Suggested Value |
|-------|-----------------|
| **Name** | Network Request & Response Copier |
| **Summary** | DevTools panel to copy network requests with OData batch parsing and WebSocket support |
| **Category** | Developer Tools |
| **Language** | English |

**Single purpose description:**
> Copy and format network request data from Chrome DevTools for debugging and development purposes.

**Permissions justification:**
- No additional permissions are required

**Data usage disclosure:**
- This extension does **not** collect any user data
- This extension does **not** transmit data to external servers
- All data processing happens locally in the browser

**Distribution:**
- Choose **Public** (for the Web Store) or **Unlisted** (for direct links)
- Provide test instructions if any feature needs special setup

### Step 4: Add Store Assets

You'll need:

| Asset | Size | Purpose |
|-------|------|---------|
| **Icon** | 128x128 px | Store listing icon (already included) |
| **Screenshot 1** | 1280x800 or 640x400 | Main UI screenshot |
| **Screenshot 2** | 1280x800 or 640x400 | Feature highlight |
| **Promotional tile** | 440x280 (optional) | Featured display |

**Screenshot suggestions:**

1. Extension panel showing requests list with various HTTP methods
2. Split view with payload and response panels
3. OData batch parsing example showing parsed operations
4. Filtering and sorting in action

### Step 5: Submit for Review

1. Review all information for accuracy
2. Click **"Submit for Review"**
3. Wait for approval (typically 1-3 business days)
4. If you choose **"Defer publish"**, you can publish later from the dashboard once review is complete

**After Publishing:**

- **Updates**: Upload new ZIP with incremented version in `manifest.json`
- **Reviews**: Monitor and respond to user feedback
- **Analytics**: Track installs and usage in the dashboard

### Updating an Existing Item

1. Increment `manifest.json` version
2. In the Developer Dashboard, open your item
3. Go to the **Package** tab and click **"Upload new package"**
4. Submit for review and publish after approval

**Verified uploads (optional):**
- If you opt in to Verified CRX uploads, future updates must be signed with your private key and uploaded as a CRX (keep the private key secure)

---

## Automated Publishing (GitHub Actions)

The repository includes a GitHub Actions workflow (`.github/workflows/release.yml`) that automates the release process.

### Setting Up Chrome Web Store API

To enable automatic publishing to Chrome Web Store, you need API credentials:

**API prerequisites:**
- 2-step verification must be enabled on the Google account
- The Store Listing and Privacy tabs must be completed before publishing via API

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the **Chrome Web Store API**

2. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Desktop app**
   - Note the **Client ID** and **Client Secret**

3. **Get Refresh Token**
   
   Use the `chrome-webstore-upload` CLI to generate a refresh token:
   
   ```bash
   npm install -g chrome-webstore-upload-cli
   chrome-webstore-upload auth
   ```
   
   Follow the prompts and save the refresh token.

4. **Get Extension ID**
   - After first manual upload, find the Extension ID in the Developer Dashboard
   - It's a 32-character string like `abcdefghijklmnopqrstuvwxyzabcdef`

### Configuring GitHub Secrets

Add these secrets to your repository (**Settings > Secrets and variables > Actions**):

| Secret Name | Description |
|------------|-------------|
| `CHROME_EXTENSION_ID` | Your extension's 32-character ID |
| `CHROME_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud |
| `CHROME_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `CHROME_REFRESH_TOKEN` | Refresh token from `chrome-webstore-upload auth` |

### Creating a Release

**Option 1: Tag-based release (recommended)**

```bash
# Update version in manifest.json first!
git tag v1.0.1
git push origin v1.0.1
```

The workflow will automatically:
1. Create a ZIP of the extension
2. Create a GitHub Release with the ZIP attached
3. (If configured) Upload and publish to Chrome Web Store

**Option 2: Manual dispatch**

1. Go to **Actions > Release Chrome Extension**
2. Click **Run workflow**
3. Enter the version (e.g., `v1.0.1`)

---

## Chrome Web Store Best Practices

Follow these guidelines to ensure your extension gets approved:

### Manifest Requirements

- [x] Review Chrome Web Store policies and best practices
- [x] Use Manifest V3 (required for new extensions)
- [x] Request minimal permissions (only what's needed)
- [x] Include all required icon sizes (16, 32, 48, 128)
- [x] Clear, accurate name and description
- [x] Specify `minimum_chrome_version`

### Code Quality

- [x] No minified or obfuscated code
- [x] No remote code execution or external code loading
- [x] Escape user-generated content to prevent XSS
- [x] Use Content Security Policy best practices
- [x] No unused permissions

### Privacy & Security

- [x] Justify all permissions in the store listing
- [x] Accurate privacy disclosures
- [x] No data collection without disclosure
- [x] Clear single-purpose description

### Store Listing

- [x] High-quality screenshots showing actual functionality
- [x] Accurate description of features
- [x] Proper categorization (Developer Tools)
- [x] Contact information for support
- [x] Screenshots and descriptions match actual functionality

### Common Rejection Reasons

1. **Vague description** - Be specific about what the extension does
2. **Excessive permissions** - Only request what you need
3. **Missing privacy policy** - Required if collecting any user data
4. **Broken functionality** - Test thoroughly before submission
5. **Misleading metadata** - Screenshots and description must match actual features

---

## Troubleshooting

### Extension Not Approved

1. Check email for specific rejection reason
2. Review the [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
3. Make required changes and resubmit

### API Upload Fails

1. Verify all secrets are correctly set
2. Check that refresh token hasn't expired (regenerate if needed)
3. Ensure extension ID matches the one in Developer Dashboard
4. Verify Chrome Web Store API is enabled in Google Cloud

### Version Mismatch

The workflow warns if `manifest.json` version doesn't match the git tag:

```bash
# Fix by updating manifest.json before tagging
# Edit manifest.json version to "1.0.1"
git add manifest.json
git commit -m "Bump version to 1.0.1"
git tag v1.0.1
git push origin main v1.0.1
```

---

## Quick Reference: Release Checklist

Before each release:

- [ ] Update version in `manifest.json`
- [ ] Test extension functionality locally
- [ ] Update README.md changelog if needed
- [ ] Commit all changes
- [ ] Create and push git tag
- [ ] Verify GitHub Actions workflow completes
- [ ] (Manual only) Download ZIP from release and upload to Chrome Web Store
- [ ] Verify store listing after approval
