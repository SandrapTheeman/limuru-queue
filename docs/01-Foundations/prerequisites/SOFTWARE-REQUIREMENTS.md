# Software Requirements

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete list of required and optional software for the Limuru Queue System

---

## Table of Contents

1. [Required Software](#required-software)
2. [Optional Software](#optional-software)
3. [System Requirements](#system-requirements)
4. [Platform-Specific Setup](#platform-specific-setup)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Required Software

### Core Runtime

#### Node.js 20+ LTS

**Purpose:** JavaScript runtime for all development tasks

**Installation:**

| Platform | Command |
|----------|---------|
| macOS | `brew install node@20` |
| Linux | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| Windows | Download from [nodejs.org](https://nodejs.org) |

**Verification:**
```bash
node --version
# Should output: v20.x.x or higher
```

#### pnpm 8+

**Purpose:** Fast, disk space efficient package manager

**Installation:**
```bash
npm install -g pnpm
```

**Verification:**
```bash
pnpm --version
# Should output: 8.x.x or higher
```

### Container Runtime

#### Docker Desktop 24+

**Purpose:** Local containerized development environment

**Installation:**
- **macOS/Windows:** Download from [docker.com](https://docker.com)
- **Linux:** 
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  ```

**Verification:**
```bash
docker --version
docker compose version
```

#### Docker Compose 2.20+

**Purpose:** Multi-container orchestration

**Note:** Docker Desktop includes Docker Compose. For Linux, verify separately:
```bash
docker compose version
# Should output: v2.20.0 or higher
```

### Cloudflare CLI

#### Wrangler 3+

**Purpose:** Deploy and manage Cloudflare Workers

**Installation:**
```bash
pnpm add -g wrangler
# or
npm install -g wrangler
```

**Verification:**
```bash
wrangler --version
# Should output: 3.x.x or higher
```

### Version Control

#### Git 2.40+

**Purpose:** Source code version control

**Installation:**

| Platform | Command |
|----------|---------|
| macOS | `brew install git` |
| Linux | `sudo apt install git` |
| Windows | Download from [git-scm.com](https://git-scm.com) |

**Verification:**
```bash
git --version
# Should output: git version 2.40.0 or higher
```

### Mobile Development (Optional)

#### Expo CLI

**Purpose:** React Native development for iOS/Android

**Installation:**
```bash
npm install -g expo-cli
# or with pnpm
pnpm add -g expo-cli
```

**Note:** For full iOS development, also need Xcode (macOS only). For Android, Android Studio.

**Verification:**
```bash
expo --version
```

---

## Optional Software

### Development Tools

#### Visual Studio Code

**Recommended IDE for this project**

**Extensions to install:**
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- Cloudflare Workers extension

**Installation:** [code.visualstudio.com](https://code.visualstudio.com)

#### TablePlus

**Purpose:** GUI for SQLite/D1 database browsing

**Installation:** [tableplus.com](https://tableplus.com)

**Alternative:** Use `wrangler d1 execute` CLI

#### Postman

**Purpose:** API testing and exploration

**Installation:** [postman.com](https://postman.com)

**Collection:** Import from `docs/postman/Limuru-Queue-API.json`

#### Insomnia

**Alternative API client**

**Installation:** [insomnia.rest](https://insomnia.rest)

### Database Tools

#### SQLite Browser

**Purpose:** View SQLite database files locally

**Installation:** [sqlitebrowser.org](https://sqlitebrowser.org)

#### D1 Studio

**Purpose:** Cloudflare D1 web-based database editor

**Access:** Available in Cloudflare Dashboard

---

## System Requirements

### Minimum Requirements

| Resource | Minimum | Notes |
|----------|---------|-------|
| RAM | 4 GB | 8 GB recommended for Docker |
| Disk Space | 10 GB | For Docker images and node_modules |
| CPU | 2 cores | Apple M1/M2 or Intel i5+ |
| OS | macOS 12+, Ubuntu 20.04+, Windows 10+ | |

### Recommended Requirements

| Resource | Recommended | Notes |
|----------|-------------|-------|
| RAM | 8-16 GB | For running multiple containers |
| Disk Space | 20+ GB | SSD preferred |
| CPU | 4+ cores | For faster builds |
| Network | 10 Mbps | For pulling Docker images |

### Docker Desktop Resource Allocation

When running Docker Desktop, configure resources:

```
Docker Desktop → Settings → Resources
- Memory: 4 GB minimum, 8 GB recommended
- CPUs: 2 minimum, 4 recommended
- Disk space: 50 GB minimum
```

---

## Platform-Specific Setup

### macOS

#### Using Homebrew

```bash
# Install all core tools
brew install node@20 git

# Install pnpm
npm install -g pnpm

# Install Docker Desktop
brew install --cask docker

# Install Wrangler
pnpm add -g wrangler

# Install Expo CLI
pnpm add -g expo-cli
```

#### Apple Silicon (M1/M2/M3)

- Docker Desktop for Apple Silicon works natively
- Some npm packages may need rebuilding: `npm rebuild`
- Rosetta 2 recommended for compatibility: `softwareupdate --install-rosetta`

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials (for native modules)
sudo apt install -y build-essential

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose

# Install pnpm
npm install -g pnpm

# Install Wrangler
pnpm add -g wrangler
```

### Windows (WSL2 Recommended)

#### Option 1: WSL2 (Recommended)

```powershell
# Enable WSL2
wsl --install

# Open Ubuntu and follow Linux instructions above
```

#### Option 2: Native Windows

```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install tools
choco install nodejs-lts git docker-desktop
refreshenv
npm install -g pnpm wrangler expo-cli
```

---

## Verification

### Verify All Required Software

Run this script to verify all installations:

```bash
#!/bin/bash
echo "=== Verifying Required Software ==="
echo ""

# Node.js
echo -n "Node.js: "
node --version || echo "NOT INSTALLED"

# pnpm
echo -n "pnpm: "
pnpm --version || echo "NOT INSTALLED"

# Docker
echo -n "Docker: "
docker --version || echo "NOT INSTALLED"

# Docker Compose
echo -n "Docker Compose: "
docker compose version || echo "NOT INSTALLED"

# Wrangler
echo -n "Wrangler: "
wrangler --version || echo "NOT INSTALLED"

# Git
echo -n "Git: "
git --version || echo "NOT INSTALLED"

echo ""
echo "=== Optional Software ==="

# Expo
echo -n "Expo CLI: "
expo --version || echo "NOT INSTALLED"
```

### Docker Daemon Check

```bash
# Check Docker is running
docker info | head -5

# If you see "Cannot connect to Docker daemon", start Docker Desktop
```

---

## Troubleshooting

### "Command not found" Errors

**Solution:** Add to PATH or restart terminal

```bash
# For npm global packages (macOS/Linux)
echo 'export PATH="$PATH:$(npm bin -g)"' >> ~/.bashrc
source ~/.bashrc
```

### Permission Denied (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Docker Desktop Not Starting

**macOS:**
- System Preferences → Security & Privacy → Allow Docker
- Restart Docker Desktop

**Windows:**
- WSL2 backend required: `wsl --install`
- Hyper-V must be enabled

### Node Version Issues

```bash
# Check current version
node --version

# Use nvm to switch versions (optional)
nvm install 20
nvm use 20
```

### pnpm Installation Issues

```bash
# Clear cache
pnpm store prune

# Reinstall pnpm
npm install -g pnpm --force
```

---

## Next Steps

| Step | Document |
|------|----------|
| Quick Start | [../quick-start/5-MINUTE-START.md](../quick-start/5-MINUTE-START.md) |
| Local Setup | [../installation/LOCAL-SETUP.md](../installation/LOCAL-SETUP.md) |
| Project Structure | [../project-structure/PROJECT-TREE.md](../project-structure/PROJECT-TREE.md) |

---

*Last updated: March 20, 2026*
