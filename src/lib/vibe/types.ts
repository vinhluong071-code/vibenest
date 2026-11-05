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