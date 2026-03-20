# GitHub Actions Workflows

This directory contains CI/CD workflows for the Hospital Queue V2 application.

## Workflows

### CI (`ci.yml`)

Continuous Integration workflow that runs on every push and pull request.

**Triggers:**
- Push to any branch
- Pull requests to `main` or `develop`

**Jobs:**
- `lint` - Runs ESLint on all packages
- `type-check` - Runs TypeScript type checking
- `test` - Runs unit and integration tests
- `build` - Builds all packages (requires lint, type-check, test to pass)

### Deploy (`deploy.yml`)

Production deployment workflow that runs when changes are pushed to `main`.

**Triggers:**
- Push to `main` branch

**Jobs:**
- `test` - Runs type check and tests
- `build` - Builds all packages
- `deploy-docker` - Builds and pushes Docker image to GHCR
- `deploy-cloudflare` - Deploys web apps to Cloudflare Pages

## Required Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

## Environment Variables

Configure these as repository variables:

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_PROJECT_NAME` | Cloudflare Pages project name for web app |
| `CLOUDFLARE_MOBILE_PROJECT_NAME` | Cloudflare Pages project name for mobile app |

## Local Development

To run workflows locally, install [act](https://github.com/nektos/act):

```bash
# Run CI workflow
act -W .github/workflows/ci.yml

# Run deploy workflow (requires secrets)
act -W .github/workflows/deploy.yml -s CLOUDFLARE_API_TOKEN=xxx -s CLOUDFLARE_ACCOUNT_ID=xxx
```
