import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatViewerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function getPlaceholderLogo(name: string): string {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="20" fill="#1a1a2e"/>
      <text x="100" y="110" font-family="Inter,system-ui,sans-serif" font-size="64" font-weight="700" fill="#00ff9d" text-anchor="middle">${initials}</text>
    </svg>`
  )}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    animation: "Clapperboard",
    auto: "Car",
    business: "Briefcase",
    classic: "Film",
    comedy: "Laugh",
    cooking: "ChefHat",
    culture: "Palette",
    documentary: "BookOpen",
    education: "GraduationCap",
    entertainment: "Sparkles",
    family: "Users",
    general: "Tv",
    kids: "Baby",
    legislative: "Landmark",
    lifestyle: "Heart",
    movies: "Film",
    music: "Music",
    news: "Newspaper",
    outdoor: "TreePine",
    relax: "Coffee",
    religious: "Church",
    science: "Microscope",
    series: "MonitorPlay",
    shop: "ShoppingCart",
    sports: "Trophy",
    travel: "Plane",
    weather: "CloudSun",
    xxx: "Ban",
  };
  return icons[category] || "Tv";
}
