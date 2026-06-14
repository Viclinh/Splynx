# Splynx — Splunk AI Query Copilot

> Turn plain English into powerful Splunk queries using AI instantly.

Splynx is a GitHub Copilot-style AI assistant for Splunk. Security analysts and developers can type natural language and instantly receive production-ready SPL (Search Processing Language) queries — powered by Splunk AI and Amazon Bedrock (Claude).

![Demo Mode](https://img.shields.io/badge/Demo%20Mode-No%20credentials%20needed-65c637?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Docker Setup](#docker-setup)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Demo Scenarios](#demo-scenarios)
- [Project Structure](#project-structure)

---

## Features

| Mode | What it does | Example prompt |
|------|-------------|----------------|
| **Generate** | Natural language → SPL query | `Find failed logins in the last 24 hours` |
| **Explain** | Break down every command in a query | Paste any SPL query |
| **Optimize** | Identify performance issues + fix them | Paste `index=* error` |
| **Debug** | Diagnose SPL errors and provide fixes | Describe your error |
| **Security** | Generate threat investigation queries | `Detect brute force attacks` |

**Additional highlights:**
- MITRE ATT&CK tactic mapping on security queries
- Confidence score on every generated query
- Live SPL editor with syntax highlighting
- Conversation history with session context
- AI Insights panel (recommendations, severity, performance tips)
- Runs fully in **Demo Mode** — no Splunk or AWS credentials required

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (port 3000)                 │
│                                                      │
│   ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│   │  Conversation│  │ AI Chat +  │  │ AI Insights│  │
│   │   History    │  │ SPL Editor │  │   Panel    │  │
│   └──────────────┘  └────────────┘  └────────────┘  │
│          React 18 + TypeScript + Tailwind CSS        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (axios)
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (port 8000)              │
│                                                      │
│   POST /api/query   POST /api/search                 │
│   GET  /api/indexes GET  /api/health                 │
│   POST /api/validate                                 │
└──────────┬───────────────────────┬───────────────────┘
           │                       │
┌──────────▼──────────┐  ┌─────────▼──────────────────┐
│   Splunk Platform   │  │     Amazon Bedrock          │
│                     │  │                             │
│  • REST API         │  │  • Claude 3 Sonnet          │
│  • Search API       │  │  • Natural language → SPL   │
│  • SPL Validator    │  │  • Query explanation        │
│  • Index listing    │  │  • Optimization reasoning   │
└─────────────────────┘  └─────────────────────────────┘
           │
    (fallback if no credentials)
┌──────────▼──────────┐
│  Smart Template     │
│  Engine             │
│  • Pattern matching │
│  • SPL templates    │
│  • Security rules   │
└─────────────────────┘
```

---

## Prerequisites

### Required
| Dependency | Version | Install |
|---|---|---|
| Python | 3.9+ | [python.org](https://python.org) |
| Node.js | 16+ | [nodejs.org](https://nodejs.org) |
| npm | 8+ | Included with Node.js |

### Optional (for full functionality)
| Service | Purpose | Free tier available |
|---|---|---|
| Splunk Enterprise / Cloud | Live SPL execution | ✅ 60-day trial |
| AWS Account + Amazon Bedrock | Claude AI responses | ✅ Pay-per-use |

> **No credentials? No problem.** The app runs in Demo Mode with smart template-based AI responses out of the box.

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/splynx.git
cd splynx

# 2. Run everything
./start.sh
```

Open http://localhost:3000 — the app is ready.

---

## Manual Setup

### Backend

```bash
cd backend

# 1. Create environment file
cp .env.example .env

# 2. Install dependencies
pip3 install -r requirements.txt

# 3. Start the API server
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API running at: http://localhost:8000  
Interactive API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the dev server
REACT_APP_API_URL=http://localhost:8000 npm start
```

Frontend running at: http://localhost:3000

---

## Docker Setup

```bash
# 1. Configure credentials (optional)
cp backend/.env.example backend/.env
# edit backend/.env with your Splunk / AWS credentials

# 2. Build and start
docker-compose up --build

# 3. Stop
docker-compose down
```

Open http://localhost:3000

---

## Configuration

All configuration lives in `backend/.env`. Copy the example to get started:

```bash
cp backend/.env.example backend/.env
```

### Full configuration reference

```env
# ── Splunk Connection ──────────────────────────────────────────
# Option A: Username + Password
SPLUNK_HOST=your-splunk-host        # e.g. splunk.company.com or localhost
SPLUNK_PORT=8089                    # Splunk management port (default: 8089)
SPLUNK_USERNAME=admin
SPLUNK_PASSWORD=your-password

# Option B: Token (recommended over password)
SPLUNK_TOKEN=eyJr...                # Splunk auth token

# ── Amazon Bedrock (optional) ──────────────────────────────────
# Enables Claude 3 Sonnet for full AI-powered SPL generation
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# ── App Settings ───────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000  # Comma-separated allowed origins
```

### Configuration modes

| Scenario | Splunk credentials | AWS credentials | Capability |
|---|---|---|---|
| Demo Mode | ❌ | ❌ | Template AI + no live search |
| AI only | ❌ | ✅ | Claude AI + no live search |
| Splunk only | ✅ | ❌ | Template AI + live search |
| Full | ✅ | ✅ | Claude AI + live search |

---

## API Reference

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `GET` | `/api/health` | Health check + Splunk connectivity | — |
| `GET` | `/api/indexes` | List available Splunk indexes | — |
| `POST` | `/api/query` | AI query processing | See below |
| `POST` | `/api/search` | Execute SPL on Splunk | See below |
| `POST` | `/api/validate` | Validate SPL syntax | `{ "spl": "..." }` |

### POST `/api/query`

```json
{
  "message": "Find failed login attempts in the last 24 hours",
  "mode": "generate",
  "spl": null,
  "error_message": null,
  "conversation_history": []
}
```

`mode` options: `generate` | `explain` | `optimize` | `debug` | `security`

### POST `/api/search`

```json
{
  "spl": "index=security action=failure | stats count by src_ip | sort -count | head 10",
  "earliest_time": "-24h",
  "latest_time": "now",
  "max_results": 100
}
```

Full interactive docs at http://localhost:8000/docs

---

## Demo Scenarios

Use these prompts in order for the best hackathon demo flow:

### 1. Generate SPL (Generate mode)
```
Find failed login attempts in the last 24 hours
```
```
Find the top 10 IP addresses with failed authentication attempts
```
```
Show HTTP 500 errors grouped by endpoint
```

### 2. Explain a query (Explain mode)
```
index=web status>=500 | stats count by uri
```
```
index=security | stats count by src_ip | sort -count | head 10
```

### 3. Optimize a slow query (Optimize mode)
```
index=* error
```
Expected: AI warns about `index=*` and provides a scoped replacement.

### 4. Debug an error (Debug mode)
```
stats command missing aggregation field
```
```
rex: invalid regex pattern
```

### 5. Security investigation (Security mode) — best demo moment
```
Investigate suspicious login activity from external IP addresses
```
```
Detect brute force attacks
```
```
Find privilege escalation events
```

Each security query returns:
- Detection SPL
- MITRE ATT&CK tactic
- Threat severity (HIGH / MEDIUM)
- 5 recommended response actions

---

## Project Structure

```
splynx/
├── backend/
│   ├── app/
│   │   ├── config.py           # Settings + credential management
│   │   ├── models.py           # Pydantic request/response schemas
│   │   ├── main.py             # FastAPI app + CORS
│   │   ├── routers/
│   │   │   └── copilot.py      # API route handlers
│   │   └── services/
│   │       ├── ai_service.py   # AI engine (Bedrock + template fallback)
│   │       └── splunk_service.py # Splunk REST + Search API client
│   ├── main.py                 # Entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Configuration template
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main layout + welcome screen
│   │   ├── hooks/
│   │   │   └── useChat.ts      # Chat state management
│   │   ├── services/
│   │   │   └── api.ts          # Typed API client
│   │   └── components/
│   │       ├── Header.tsx          # Branding + connection status
│   │       ├── ConversationHistory.tsx
│   │       ├── ChatInput.tsx       # Mode tabs + input
│   │       ├── ChatMessage.tsx     # SPL blocks + results + threat card
│   │       ├── SPLEditor.tsx       # Editable syntax-highlighted editor
│   │       └── AIInsightsPanel.tsx # Confidence, MITRE, recommendations
│   ├── public/index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
├── start.sh                    # One-command local startup
├── LICENSE
└── README.md
```

---

## Dependencies

### Backend (`backend/requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| fastapi | 0.111.0 | REST API framework |
| uvicorn | 0.29.0 | ASGI server |
| pydantic | 2.7.1 | Data validation |
| pydantic-settings | 2.2.1 | Settings from .env |
| httpx | 0.27.0 | Async HTTP client for Splunk API |
| boto3 | 1.34.110 | AWS SDK for Amazon Bedrock |
| python-dotenv | 1.0.1 | .env file loading |
| python-multipart | 0.0.9 | Form data support |

### Frontend (`frontend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| react | 18.3.0 | UI framework |
| typescript | 4.9.5 | Type safety |
| tailwindcss | 3.4.0 | Utility-first CSS |
| axios | 1.7.0 | HTTP client |
| lucide-react | 0.400.0 | Icons |
| react-syntax-highlighter | 15.5.0 | SPL code highlighting |
| react-scripts | 5.0.1 | CRA build tooling |

---

## License

MIT — see [LICENSE](./LICENSE)
