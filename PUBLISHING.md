# Publishing Guide (Chrome Web Store + Microsoft Edge Add-ons)

This guide covers publishing the Network Request & Response Copier extension to:

- Chrome Web Store
- Microsoft Edge Add-ons

It includes both manual submission steps and automated GitHub Actions publishing.

## Table of Contents

- [Publishing Guide (Chrome Web Store + Microsoft Edge Add-ons)](#publishing-guide-chrome-web-store--microsoft-edge-add-ons)
  - [Table of Contents](#table-of-contents)
  - [Common Prerequisites](#common-prerequisites)
  - [Package the Extension](#package-the-extension)
  - [Chrome Web Store (Manual)](#chrome-web-store-manual)
    - [Step 1: Upload the ZIP](#step-1-upload-the-zip)
    - [Step 2: Complete Listing and Privacy](#step-2-complete-listing-and-privacy)
    - [Step 3: Add Store Assets](#step-3-add-store-assets)
    - [Step 4: Submit for Review](#step-4-submit-for-review)
    - [Updating an Existing Chrome Listing](#updating-an-existing-chrome-listing)
  - [Microsoft Edge Add-ons (Manual)](#microsoft-edge-add-ons-manual)
    - [Step 1: Edge Compatibility Checklist](#step-1-edge-compatibility-checklist)
    - [Step 2: Create the Add-on in Partner Center](#step-2-create-the-add-on-in-partner-center)
    - [Step 3: Upload the ZIP Package](#step-3-upload-the-zip-package)
    - [Step 4: Complete Store Listing, Privacy, and Availability](#step-4-complete-store-listing-privacy-and-availability)
    - [Step 5: Submit for Certification](#step-5-submit-for-certification)
    - [Updating an Existing Edge Listing](#updating-an-existing-edge-listing)
  - [Automated Publishing (GitHub Actions)](#automated-publishing-github-actions)
    - [What the Workflow Does](#what-the-workflow-does)
    - [Chrome API Setup](#chrome-api-setup)
    - [Edge API Setup](#edge-api-setup)
    - [Required GitHub Secrets](#required-github-secrets)
    - [Triggering a Release](#triggering-a-release)
  - [Best Practices (Both Stores)](#best-practices-both-stores)
  - [Troubleshooting](#troubleshooting)
  - [Quick Release Checklist](#quick-release-checklist)

---

## Common Prerequisites

1. **Extension source folder**: `network-request-response-copier/`
2. **Manifest V3**: required for new submissions (already in use)
3. **Developer accounts**:
   - Chrome Web Store Developer Dashboard: [https://chromewebstore.google.com/](https://chromewebstore.google.com/)
   - Microsoft Partner Center (Edge Add-ons): [https://partner.microsoft.com/dashboard/microsoftedge/overview](https://partner.microsoft.com/dashboard/microsoftedge/overview)
4. **Privacy policy URL/text** (already available in this repo as `PRIVACY_POLICY.md`)

---

## Package the Extension

Create a clean ZIP containing only extension runtime files:

```bash
cd network-request-response-copier
zip -r ../extension.zip . -x "*.DS_Store" -x "*.git*" -x "*.md"
```

Expected ZIP content:

```
extension.zip
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

---

## Chrome Web Store (Manual)

### Step 1: Upload the ZIP

1. Open Chrome Web Store Developer Dashboard
2. Create a new item (or open existing item)
3. Upload `extension.zip`

### Step 2: Complete Listing and Privacy

Suggested values:

| Field | Value |
|------|-------|
| Name | Network Request & Response Copier |
| Summary | DevTools panel to copy network requests with OData batch parsing and WebSocket support |
| Category | Developer Tools |
| Language | English |

Single-purpose summary:
> Copy and format network request data from DevTools for debugging and development.

Data disclosure:
- No personal data collection
- No external transmission
- All processing is local in the browser

### Step 3: Add Store Assets

Recommended:

- 128x128 icon (already included)
- At least two screenshots that reflect real UI and flow
- Optional promotional tile

### Step 4: Submit for Review

1. Verify listing and policy disclosures
2. Submit for review
3. Publish immediately or defer publish

### Updating an Existing Chrome Listing

1. Increment `version` in `network-request-response-copier/manifest.json`
2. Upload new ZIP package
3. Submit the update

---

## Microsoft Edge Add-ons (Manual)

### Step 1: Edge Compatibility Checklist

Before the first Edge submission:

- Keep Manifest V3
- Keep permissions minimal
- Ensure no hardcoded Chrome Web Store update URL in `manifest.json`
- Ensure listing title/description are not Chrome-branded for Edge listing text
- Test in Edge via `edge://extensions` with **Load unpacked**

### Step 2: Create the Add-on in Partner Center

1. Go to Microsoft Partner Center Edge Add-ons dashboard
2. Select **Create a new add-on**
3. Enter base metadata (product name/category)

### Step 3: Upload the ZIP Package

1. Open your add-on entry
2. Upload `extension.zip` as the package
3. Wait for validation to complete

### Step 4: Complete Store Listing, Privacy, and Availability

Complete all required sections in Partner Center:

- Properties (category, visibility, metadata)
- Store listings (description/screenshots/locales)
- Privacy and compliance declarations
- Availability and markets

Asset requirements for Edge listing include:

- Store logo
- Small promotional tile
- At least one real product screenshot

### Step 5: Submit for Certification

1. Submit the draft submission
2. Certification can take up to several business days (Microsoft states up to seven)
3. Publish after approval (or auto-publish if selected)

### Updating an Existing Edge Listing

1. Increment `version` in `network-request-response-copier/manifest.json`
2. Upload new ZIP package in the existing add-on submission
3. Submit for certification again

---

## Automated Publishing (GitHub Actions)

The repo uses a single workflow `.github/workflows/release.yml` that handles everything:

- Version bumping from conventional commits (`feat:` -> minor, `fix:` -> patch)
- `CHANGELOG.md` generation
- Release commit and tag creation
- GitHub Release artifact creation
- Chrome Web Store publishing
- Edge Add-ons publishing

### What the Workflow Does

When manually triggered via **Actions > Release Browser Extension > Run workflow**:

1. Scans commits since last tag for `feat:` and `fix:` messages
2. Bumps version in `manifest.json` (minor for feat, patch for fix)
3. Updates `CHANGELOG.md` with a dated release section
4. Commits `chore: release version X.X.X` and creates tag `vX.X.X`
5. Pushes commit and tag to `main`
6. Builds `network-request-response-copier-vX.X.X.zip`
7. Creates a GitHub Release and uploads the ZIP
8. Publishes to Chrome Web Store
9. Publishes update to Edge Add-ons

### Chrome API Setup

1. Enable Chrome Web Store API in Google Cloud
2. Create OAuth client credentials
3. Generate refresh token with `chrome-webstore-upload-cli`
4. Get your Chrome extension ID from the dashboard

### Edge API Setup

Use the Microsoft Edge Add-ons Publish API credentials (API key + client ID):

1. In Partner Center, open your add-on
2. Open **Publish API** and create API credentials
3. Save:
   - `Client ID`
   - `API Key`
   - Existing `Product ID` for the add-on

Important API scope note:
- Edge API publishing updates an existing Partner Center product
- Initial add-on creation and first full store listing still require manual setup in Partner Center

### Required GitHub Secrets

Chrome secrets:

| Secret | Description |
|--------|-------------|
| `CHROME_EXTENSION_ID` | Chrome item ID |
| `CHROME_CLIENT_ID` | Google OAuth Client ID |
| `CHROME_CLIENT_SECRET` | Google OAuth Client Secret |
| `CHROME_REFRESH_TOKEN` | Refresh token for publish API |

Edge secrets:

| Secret | Description |
|--------|-------------|
| `EDGE_PRODUCT_ID` | Partner Center product ID |
| `EDGE_CLIENT_ID` | Edge Publish API client ID |
| `EDGE_API_KEY` | Edge Publish API key |

### Triggering a Release

1. Push your changes to `main` using conventional commits (`feat:` / `fix:`)
2. Go to **GitHub Actions** > **Release Browser Extension**
3. Click **Run workflow**

The workflow handles version bumping, changelog, tagging, and publishing automatically.

---

## Best Practices (Both Stores)

- Keep permissions minimal and justified
- Keep description accurate and specific
- Avoid remote code loading and obfuscated code
- Ensure screenshots match real, current UI
- Keep privacy disclosures aligned with actual behavior
- Test the extension in both Chrome and Edge before submission

---

## Troubleshooting

**Submission rejected**

1. Read rejection reason in store dashboard/email
2. Fix metadata/policy/functionality issue
3. Resubmit

**Chrome publish API fails**

1. Verify Chrome secrets
2. Regenerate refresh token if expired
3. Confirm extension ID matches dashboard item

**Edge publish API fails**

1. Verify `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY`
2. Confirm API credentials belong to the same Partner Center publisher/account
3. Check upload/publish operation status returned by API

**No feat/fix commits found**

The workflow will fail if there are no `feat:` or `fix:` commits since the last tag. Make sure your commit messages follow conventional commit format.

---

## Quick Release Checklist

- [ ] Commit changes with `feat:` or `fix:` prefixed messages
- [ ] Push to `main`
- [ ] Test extension locally in Chrome and Edge
- [ ] Run **Release Browser Extension** workflow manually in GitHub Actions
- [ ] Verify GitHub Release artifact was created
- [ ] Verify Chrome publish step succeeded
- [ ] Verify Edge publish step succeeded (if Edge secrets are configured)
- [ ] Confirm store submission/review status in dashboards
