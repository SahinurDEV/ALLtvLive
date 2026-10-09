"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  useInView,
  animate,
} from "framer-motion";
import {
  Play,
  Globe2,
  Zap,
  Heart,
  Shield,
  Sparkles,
  Radio,
  ChevronDown,
  Newspaper,
  Trophy,
  Music,
  Film,
  Baby,
  Landmark,
  TrendingUp,
  Wifi,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Globe2,
    title: "10,000+ Channels",
    body: "Every country, every language — the entire iptv-org catalog at your fingertips.",
    color: "from-emerald-400 to-teal-400",
  },
  {
    icon: Zap,
    title: "Instant Playback",
    body: "Zero signup, zero delay. Click and watch — HLS streams delivered direct from broadcasters.",
    color: "from-yellow-400 to-orange-400",
  },
  {
    icon: Sparkles,
    title: "Curated Picks",
    body: "A hand-selected featured lineup so the best live TV auto-plays the moment you arrive.",
    color: "from-fuchsia-400 to-pink-400",
  },
  {
    icon: Heart,
    title: "Save Favorites",
    body: "Bookmark channels and add your own custom IPTV streams. It all stays in your browser.",
    color: "from-rose-400 to-red-400",
  },
  {
    icon: Radio,
    title: "Multi-Source",
    body: "Every channel checks multiple mirrors — if one drops, we hop to the next automatically.",
    color: "from-sky-400 to-blue-500",
  },
  {
    icon: Shield,
    title: "Private & Free",
    body: "No account, no tracking beyond anonymous analytics. Open-source under MIT.",
    color: "from-violet-400 to-purple-500",
  },
] as const;

const STATS = [
  { value: 10000, suffix: "+", label: "Live Channels" },
  { value: 220, suffix: "+", label: "Countries" },
  { value: 60, suffix: "+", label: "Languages" },
  { value: 100, suffix: "%", label: "Free Forever" },
] as const;

const CATEGORIES = [
  { icon: Newspaper, label: "News", href: "/watch" },
  { icon: Trophy, label: "Sports", href: "/watch" },
  { icon: Film, label: "Movies", href: "/watch" },
  { icon: Music, label: "Music", href: "/watch" },
  { icon: Baby, label: "Kids", href: "/watch" },
  { icon: Landmark, label: "Culture", href: "/watch" },
] as const;

const FLAGS = [
  "🇺🇸","🇬🇧","🇩🇪","🇫🇷","🇯🇵","🇰🇷","🇮🇳","🇧🇷","🇨🇳","🇷🇺","🇮🇹",
  "🇪🇸","🇲🇽","🇦🇺","🇨🇦","🇹🇷","🇸🇦","🇦🇪","🇪🇬","🇿🇦","🇳🇬","🇦🇷",
  "🇳🇱","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇵🇱","🇨🇭","🇦🇹","🇧🇪","🇮🇩","🇹🇭",
  "🇵🇭","🇻🇳","🇲🇾","🇵🇰","🇧🇩","🇮🇷","🇮🇱","🇬🇷","🇵🇹","🇮🇪","🇺🇦",
];

const CHANNEL_MOCKS = [
  { name: "AL JAZEERA", tag: "LIVE NEWS", grad: "from-yellow-600 via-orange-500 to-red-500" },
  { name: "BBC NEWS", tag: "WORLD", grad: "from-red-700 via-red-600 to-red-500" },
  { name: "NASA TV", tag: "SPACE", grad: "from-blue-800 via-blue-600 to-indigo-500" },
  { name: "DW ENGLISH", tag: "EUROPE", grad: "from-blue-700 via-cyan-600 to-teal-500" },
  { name: "SPORTS 24", tag: "LIVE MATCH", grad: "from-green-700 via-emerald-500 to-lime-400" },
  { name: "BLOOMBERG", tag: "MARKETS", grad: "from-slate-900 via-blue-900 to-blue-700" },
  { name: "FRANCE 24", tag: "GLOBAL", grad: "from-red-600 via-blue-700 to-blue-500" },
  { name: "CINEMAX", tag: "NOW SHOWING", grad: "from-purple-800 via-fuchsia-600 to-pink-500" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  const formatted =
    to >= 1000 ? Math.floor(value).toLocaleString() : Math.floor(value).toString();

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

function CursorSpotlight() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 100, damping: 20 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const handler = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, [x, y, reduce]);

  const bg = useTransform(
    [smoothX, smoothY],
    ([mx, my]) =>
      `radial-gradient(600px circle at ${mx}px ${my}px, rgba(0,255,157,0.10), transparent 40%)`
  );

  if (reduce) return null;
  return (
    <motion.div
      style={{ background: bg }}
      className="fixed inset-0 -z-10 pointer-events-none hidden md:block"
    />
  );
}

function TVMockup() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % CHANNEL_MOCKS.length);
    }, 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const current = CHANNEL_MOCKS[index];

  return (
    <div className="relative w-full max-w-[520px] mx-auto">
      {/* Glow */}
      <div className="absolute -inset-8 bg-gradient-to-br from-neon/20 via-transparent to-purple-500/20 blur-3xl -z-10" />

      {/* TV Frame */}
      <div className="relative rounded-[2rem] p-3 sm:p-4 bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/10 shadow-2xl">
        <div className="rounded-2xl overflow-hidden aspect-video relative bg-black">
          {/* Channel graphic */}
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 bg-gradient-to-br ${current.grad}`}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            />
            {/* Scanlines */}
            <div
              className="absolute inset-0 opacity-15 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)",
              }}
            />
            {/* Vignette */}
            <div className="absolute inset-0 bg-radial-gradient" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-widest">
                  <span className="relative flex h-2 w-2">
                    {!reduce && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  LIVE
                </div>
                <div className="text-[10px] sm:text-xs font-mono opacity-80">
                  CH {(index + 1).toString().padStart(2, "0")}
                </div>
              </div>

              <div className="text-center drop-shadow-lg">
                <motion.h3
                  key={`title-${index}`}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-2xl sm:text-4xl font-black tracking-tighter"
                >
                  {current.name}
                </motion.h3>
                <motion.p
                  key={`tag-${index}`}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-[10px] sm:text-xs font-semibold tracking-widest mt-1 opacity-90"
                >
                  {current.tag}
                </motion.p>
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono">
                <span className="opacity-80">HD · 1080p</span>
                <span className="opacity-80 flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  strong
                </span>
              </div>
            </div>

            {/* Corner shine */}
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-12" />
          </motion.div>
        </div>

        {/* TV base bar */}
        <div className="flex items-center justify-between mt-3 px-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon shadow-[0_0_6px_theme(colors.neon)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <div className="text-[10px] font-mono text-white/40 tracking-widest">
            ALLtvLive
          </div>
        </div>
      </div>

      {/* Channel dots below */}
      <div className="flex justify-center gap-1.5 mt-4">
        {CHANNEL_MOCKS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-neon" : "w-1.5 bg-white/20"
            }`}
            aria-label={`Show channel ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function FlagsMarquee() {
  const reduce = useReducedMotion();
  const doubled = [...FLAGS, ...FLAGS];
  return (
    <div className="relative w-full overflow-hidden py-4 border-y border-border/40 bg-card/30 backdrop-blur">
      <div className="absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      <motion.div
        className="flex gap-6 text-3xl whitespace-nowrap"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduce
            ? undefined
            : { duration: 40, repeat: Infinity, ease: "linear" }
        }
      >
        {doubled.map((f, i) => (
          <span key={i} className="grayscale hover:grayscale-0 transition-all">
            {f}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} />;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -40, 0], x: [0, 30, 0] }}
      transition={{ duration: 14, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function AnimatedChannelDots() {
  // Faux "channels around the world" constellation
  const reduce = useReducedMotion();
  const dots = Array.from({ length: 40 }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((i) => {
        const top = (i * 37) % 100;
        const left = (i * 53) % 100;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-neon"
            style={{ top: `${top}%`, left: `${left}%` }}
            animate={
              reduce
                ? undefined
                : {
                    opacity: [0.15, 0.9, 0.15],
                    scale: [1, 1.6, 1],
                  }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: 3 + (i % 5),
                    repeat: Infinity,
                    delay: (i % 10) * 0.3,
                  }
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Cursor spotlight */}
      <CursorSpotlight />

      {/* Background gradient blobs */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <FloatingOrb className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-neon/10 blur-[120px]" />
        <FloatingOrb
          className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-fuchsia-500/10 blur-[140px]"
          delay={3}
        />
        <FloatingOrb
          className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]"
          delay={6}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 -z-20 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Constellation */}
      <AnimatedChannelDots />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 rounded-lg bg-neon/10 flex items-center justify-center border border-neon/30">
            <Radio className="h-5 w-5 text-neon" />
            {mounted && !reduce && (
              <motion.div
                className="absolute inset-0 rounded-lg border border-neon"
                animate={{ opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className="font-bold text-lg tracking-tight">
            ALL<span className="text-neon">tv</span>Live
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5 text-sm">
          <Link
            href="/about"
            className="text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            About
          </Link>
          <a
            href="https://github.com/SahinurDEV/ALLtvLive"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            GitHub
          </a>
          <Link
            href="/watch"
            className="px-4 py-1.5 rounded-full bg-neon text-black font-semibold text-sm hover:bg-neon/90 transition-colors"
          >
            Watch Now
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 pt-8 sm:pt-14 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left column */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon/10 border border-neon/30 text-xs font-medium text-neon mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon" />
              </span>
              Streaming worldwide · right now
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.02]"
            >
              The world&apos;s
              <br />
              TV, live.
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-neon via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  One click.
                </span>
                {mounted && !reduce && (
                  <motion.span
                    className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-neon to-cyan-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                  />
                )}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Watch <span className="text-foreground font-semibold">10,000+ live channels</span>{" "}
              from over 220 countries — news, sports, movies, music. No signup, no
              subscription, no catch.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <Link href="/watch" aria-label="Start watching">
                <div className="relative group">
                  {mounted && !reduce && (
                    <>
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-neon"
                        animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-neon"
                        animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0.7,
                          ease: "easeOut",
                        }}
                      />
                    </>
                  )}
                  <motion.button
                    whileHover={reduce ? undefined : { scale: 1.05 }}
                    whileTap={reduce ? undefined : { scale: 0.95 }}
                    className="relative inline-flex items-center gap-3 pl-5 pr-7 py-4 rounded-full bg-gradient-to-r from-neon to-emerald-400 text-black font-bold shadow-[0_0_40px_rgba(0,255,157,0.35)] hover:shadow-[0_0_60px_rgba(0,255,157,0.5)] transition-shadow"
                  >
                    <span className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
                      <Play className="h-5 w-5 fill-black ml-0.5" strokeWidth={0} />
                    </span>
                    Start Watching Free
                  </motion.button>
                </div>
              </Link>

              <Link
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                How it works →
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center gap-3 justify-center lg:justify-start text-[11px] text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60">
                <Shield className="h-3 w-3 text-neon" />
                No signup
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60">
                <TrendingUp className="h-3 w-3 text-neon" />
                MIT open source
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60">
                <Radio className="h-3 w-3 text-neon" />
                Powered by iptv-org
              </span>
            </motion.div>
          </div>

          {/* Right column — TV Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <TVMockup />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs uppercase tracking-widest">Explore</span>
          {mounted && !reduce ? (
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </motion.div>
      </section>

      {/* Flags marquee */}
      <FlagsMarquee />

      {/* Stats */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-16 sm:py-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-5xl font-black bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-2xl sm:text-3xl font-bold mb-6"
          >
            What do you want to watch?
          </motion.h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={c.href}
                  className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 bg-card/30 hover:bg-card hover:border-neon/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-neon/15 transition-all">
                    <c.icon className="h-5 w-5 text-neon" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{c.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-16 sm:py-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Built for <span className="text-neon">real</span> viewers.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Everything you need to enjoy live TV, nothing you don&apos;t.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={reduce ? undefined : { y: -6 }}
              className="group relative p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm hover:border-neon/50 transition-colors overflow-hidden"
            >
              {/* Hover gradient */}
              <div
                className={`absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity`}
              />
              <div
                className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} p-[1px] mb-4`}
              >
                <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-neon" />
                </div>
              </div>
              <h3 className="relative font-bold text-lg mb-2">{f.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Big CTA */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center relative"
        >
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-neon/10 via-fuchsia-500/10 to-cyan-500/10 blur-3xl" />
          </div>

          <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
            Turn on the world.
            <br />
            <span className="bg-gradient-to-r from-neon via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Right now.
            </span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            Thousands of live streams are one click away. We&apos;ll even pick a
            good one to start.
          </p>
          <Link
            href="/watch"
            className="group inline-flex items-center gap-2 mt-10 px-8 py-4 rounded-full bg-neon text-black font-bold text-base hover:bg-neon/90 transition-colors shadow-[0_0_40px_rgba(0,255,157,0.35)]"
          >
            <Play
              className="h-5 w-5 fill-black group-hover:translate-x-0.5 transition-transform"
              strokeWidth={0}
            />
            Start Watching Free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-neon" />
            <span className="font-semibold text-foreground">ALLtvLive</span>
            <span className="mx-1">·</span>
            <span>MIT licensed · powered by iptv-org</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/watch" className="hover:text-foreground transition-colors">
              Watch
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <a
              href="https://github.com/SahinurDEV/ALLtvLive"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
