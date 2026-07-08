export interface Channel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  subdivision: string | null;
  city: string | null;
  broadcast_area: string[];
  languages: string[];
  categories: string[];
  is_nsfw: boolean;
  launched: string | null;
  closed: string | null;
  replaced_by: string | null;
  website: string | null;
  logo: string | null;
}

export interface Logo {
  channel: string;
  feed: string | null;
  tags: string[];
  width: number;
  height: number;
  format: string;
  url: string;
}

export interface Stream {
  channel: string | null;
  feed: string | null;
  title: string | null;
  url: string;
  quality: string | null;
  user_agent: string | null;
  referrer: string | null;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  languages: string[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface ChannelWithMeta extends Channel {
  streams: Stream[];
  countryInfo?: Country;
  viewerCount: number;
  isLive: boolean;
}

export interface FilterState {
  search: string;
  countries: string[];
  categories: string[];
  languages: string[];
}

export interface PlayerState {
  currentChannel: ChannelWithMeta | null;
  isOpen: boolean;
  isPlaying: boolean;
  volume: number;
  quality: string;
}

export interface CustomChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  category: string | null;
  addedAt: number;
}

export interface BroadcastChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  category: string | null;
  country: string | null;
  description: string | null;
  addedAt: number;
}
