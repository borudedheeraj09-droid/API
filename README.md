# APIVORA 🛡️ AI-Driven Security Gateway & Sandbox

APIVORA is an advanced, full-stack, real-time API Security Gateway and Simulation Sandbox. It implements a zero-trust inspection pipeline that evaluates incoming API requests against multi-dimensional behavioral weights, threat intelligence databases, rate limits, and custom policy rules.

Equipped with a live forensics logger and integrated with **Google's Gemini API**, APIVORA can dynamically analyze intercepted security incidents to provide deep forensic reports, explaining exactly why a request was blocked/throttled and recommending remediation actions.

---

## ✨ Features

- **📊 Real-Time Security Dashboard**
  - Live throughput and anomaly tracking.
  - Active threat level meter and dynamic request classification chart.
  - Interactive status panel showing active traffic channels.

- **🧪 Multi-Dimensional Interceptor & Simulator**
  - Inject custom request parameters: HTTP methods, payloads (including custom SQL/script bodies), headers, geographic IPs, and authentication tokens.
  - Observe real-time gateway decision verdicts: `ALLOW`, `BLOCK`, `THROTTLE`, or `CHALLENGE`.
  - Live inspection details showing exactly which safety rules were violated.

- **🎛️ Active Security Policy Calibrator**
  - Fully dynamic and responsive risk metric calibrator (scaled to exactly **100%**).
  - Tune individual parameter weights: User Behavior, Authentication, Request Patterns, Payload Content, IP/Location, Device Context, and Threat Intelligence.
  - Modify system action thresholds and adaptive sliding-window rate limits.

- **🔍 Forensic & Audit Logging with AI Diagnostics**
  - Live chronological security log capturing every incoming payload, client token, and headers dictionary.
  - **AI Log Forensics**: Powered by the Gemini API, get instant deep-dive incident reports explaining the security context, identifying potential OWASP Top 10 vulnerabilities, and offering immediate remediation paths.

---

## 🛠️ Technical Stack

- **Frontend**: React 18, Vite, Tailwind CSS (with responsive grid optimization), Lucide Icons for high-fidelity visual representations.
- **Backend**: Node.js, Express, TSX, Esbuild (hybrid Vite dev-server middleware model).
- **AI Engine**: Google `@google/genai` TypeScript SDK (utilizing Gemini models for robust log diagnostics).
- **Performance**: Standardized sliding-window token bucket algorithm for adaptive rate limiting, client state sync with the inspection daemon.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **NPM** or **Yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/apivora.git
   cd apivora
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` or `.env.local` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Add your Google Gemini API Key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

### Running the Application

To run APIVORA in local development mode with hot-reloading:

```bash
npm run dev
```

The application will start and be accessible at: **`http://localhost:3000`**

---

## 📦 Production Build & Deployment

To compile the application and bundle the Express server into a self-contained production file:

1. **Build the client and server:**
   ```bash
   npm run build
   ```
   This compiles the React SPA assets to `dist/` and compiles the backend TS entry point (`server.ts`) into a standalone CommonJS bundle at `dist/server.cjs` using esbuild.

2. **Start the production server:**
   ```bash
   npm start
   ```

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.
