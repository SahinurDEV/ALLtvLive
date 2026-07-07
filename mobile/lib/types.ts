export interface Channel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  languages: string[];
  categories: string[];
  is_nsfw: boolean;
  logo: string | null;
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
}

export interface ChannelWithMeta extends Channel {
  streams: Stream[];
}

export interface CustomChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  category: string | null;
  addedAt: number;
}
