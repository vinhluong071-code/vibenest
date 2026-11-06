export type Mood = "Đêm muộn" | "Chênh vênh" | "Chữa lành" | "Thầm thương" | "Khác";
export type InteractionType = "empathy" | "save";

export type VibeReply = {
  id: string;
  post_id: string;
  author_alias: string;
  content: string;
  created_at: string;
};

export type VibePost = {
  id: string;
  alias: string;
  mood: Mood;
  content: string;
  location: string | null;
  created_at: string;
  empathy_count: number;
  replies: VibeReply[];
  empathized: boolean;
  saved: boolean;
};

export type VibeStoryReaction = "heart" | "warmth";

export type VibeStory = {
  id: string;
  alias: string;
  mood: string;
  location: string | null;
  caption: string | null;
  image_url: string | null;
  canvas_preset: string;
  created_at: string;
  expires_at: string;
  heart_count: number;
  warmth_count: number;
};

export type CreateVibeStoryInput = {
  alias: string;
  mood: string;
  location?: string | null;
  caption?: string | null;
  imageUrl?: string | null;
  canvasPreset?: string;
};
