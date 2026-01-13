# Learnly

A video conferencing application built for modern classrooms. Host classes, study groups, and 1:1 sessions with simple, secure video powered by Cloudflare RealtimeKit.

## Features

- **Create Meetings** - Start a new video meeting with a custom name
- **Join Meetings** - Join existing meetings using a meeting ID
- **Video Backgrounds** - Blur your background or use virtual backgrounds
- **Participant Presets** - Support for different participant roles (host, participant)

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, React Router
- **Backend**: Cloudflare Workers
- **Video**: Cloudflare RealtimeKit
- **Build**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- A Cloudflare account with RealtimeKit enabled
- Wrangler CLI

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd learnly
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.dev.vars` file in the root directory with the following:

```
CF_API_TOKEN=your_cloudflare_api_token
APP_ID=your_realtimekit_app_id
```

The `ACCOUNT_ID` is already configured in `wrangler.jsonc`.

### Development

Start the development server:

```bash
npm run dev
```

This will start the Vite dev server with hot module replacement.

### Build

Build the application for production:

```bash
npm run build
```

### Deploy

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Project Structure

```
learnly/
├── src/
│   ├── pages/
│   │   ├── Home.tsx       # Landing page with create/join meeting UI
│   │   └── Meeting.tsx    # Video meeting room component
│   ├── App.tsx            # Main app with routing
│   └── main.tsx           # Entry point
├── worker/
│   └── index.ts           # Cloudflare Worker API endpoints
├── public/
│   └── learnly.svg        # App logo
└── wrangler.jsonc         # Cloudflare Workers configuration
```

## API Endpoints

The Cloudflare Worker provides three API endpoints:

- `POST /api/meetings` - Create a new meeting
- `POST /api/tokens` - Issue an auth token for a participant
- `GET /api/presets` - List available participant presets

## License

MIT
