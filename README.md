<div align="center">

# 📺 ALLtvLive

### Free Live TV Channels — Anytime, Anywhere

Watch **10,000+** free live TV channels from around the world in one place.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)
[![GitHub](https://img.shields.io/github/stars/devSahinur/ALLtvLive?style=social)](https://github.com/devSahinur/ALLtvLive)
[![Live Demo](https://img.shields.io/badge/Live-alltvlive.vercel.app-00ff9d?logo=vercel)](https://alltvlive.vercel.app)

**[🔴 Live Demo → alltvlive.vercel.app](https://alltvlive.vercel.app)**

---

</div>

## ✨ Features

| Feature | Description |
|---|---|
| **Live Streaming** | HLS video player with play/pause, volume, PiP, and fullscreen |
| **10,000+ Channels** | Aggregates public IPTV streams from [iptv-org](https://github.com/iptv-org/iptv) |
| **Country Detection** | Auto-detects your country and shows local channels first |
| **Auto-Play** | Randomly plays a channel from your country on page load |
| **Smart Search** | Fuzzy search powered by Fuse.js across all channels |
| **Browse & Filter** | Filter by country, category, and language |
| **Favorites** | Save channels to your favorites (persisted in localStorage) |
| **Responsive** | Fully responsive — mobile, tablet, and desktop |
| **Dark/Light Theme** | Neon dark theme by default with light mode toggle |
| **Rich Channel Info** | Network, owner, languages, launch date, website, stream quality |

## 🖼️ Screenshots

> Visit the live app to see ALLtvLive in action.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15.5](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching:** [SWR](https://swr.vercel.app/)
- **Video:** [HLS.js](https://github.com/video-dev/hls.js/)
- **Search:** [Fuse.js](https://www.fusejs.io/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Deployment:** [Vercel](https://vercel.com/)

## 📁 Project Structure

```
alltvlive/
├── app/
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Homepage — player + channel grid
│   ├── [channel]/page.tsx  # Dynamic channel route
│   └── globals.css         # Theme variables & global styles
├── components/
│   ├── InlinePlayer.tsx    # Video player with HLS + controls
│   ├── ChannelCard.tsx     # Channel card component
│   ├── ChannelGrid.tsx     # Grid with load-more pagination
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── Navbar.tsx          # Top bar with search
│   ├── MobileNav.tsx       # Bottom nav for mobile
│   ├── FavoritesView.tsx   # Favorites page
│   └── ui/                 # shadcn/ui components
├── hooks/
│   └── useChannels.ts      # Main data hook (SWR + Fuse.js)
├── lib/
│   ├── api.ts              # API fetching functions
│   ├── store.ts            # Zustand global state
│   ├── types.ts            # TypeScript interfaces
│   └── utils.ts            # Utility functions
└── public/
    └── manifest.json       # PWA manifest
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/devSahinur/ALLtvLive.git
cd ALLtvLive

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 🌐 Deploy to Vercel

The easiest way to deploy ALLtvLive:

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Click **Deploy**

No environment variables needed — the app uses public APIs.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/devSahinur/ALLtvLive)

## 📡 Data Source

ALLtvLive uses the public APIs provided by [iptv-org](https://github.com/iptv-org/iptv):

| API Endpoint | Description |
|---|---|
| `channels.json` | Channel metadata (name, country, categories) |
| `streams.json` | Stream URLs (HLS, MPEG-TS) |
| `logos.json` | Channel logos |
| `countries.json` | Country list with flags |
| `categories.json` | Channel categories |
| `languages.json` | Language list |

All data is fetched client-side and cached for 10 minutes via SWR.

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `↑` / `↓` | Volume Up / Down |
| `Ctrl+K` | Focus Search |

## 🌐 Similar Projects

- [Global Free TV](https://www.globalfreetv.com/) - 7000+ free live TV channels from 150+ countries
- [Squid TV](https://squidtv.net/) - Global TV directory

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

ALLtvLive does not host or provide any video content. It aggregates publicly available IPTV streams indexed by the [iptv-org](https://github.com/iptv-org/iptv) project. All streams are provided by third parties and may be subject to their respective terms of service.

---

<div align="center">

**Built with ❤️ by [devSahinur](https://github.com/devSahinur)**

[GitHub](https://github.com/devSahinur/ALLtvLive) · [Live Demo](https://alltvlive.vercel.app) · [Report Bug](https://github.com/devSahinur/ALLtvLive/issues)

</div>
