"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CreateVibeStoryInput, VibeStory, VibeStoryReaction } from "@/lib/vibe/types";

const STORY_COLUMNS =
  "id,alias,mood,location,caption,image_url,image_path,canvas_preset,created_at,expires_at,heart_count,warmth_count";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Không thể tải Khoảnh khắc. Vui lòng thử lại.";
}

export type VibeStoryQuestion = { id: string; story_id: string; question: string; created_at: string };
type StoryQuestionTable = {
  insert: (row: { story_id: string; sender_id: string; question: string }) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    eq: (column: "story_id", value: string) => {
      order: (column: "created_at", options: { ascending: boolean }) => Promise<{ data: VibeStoryQuestion[] | null; error: { message: string } | null }>;
    };
  };
};
type StoryQuestionClient = { from: (table: "vibe_story_questions") => StoryQuestionTable };

type StoryPollTable = {
  insert: (row: { story_id: string; voter_id: string; option_index: number }) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    eq: (column: "story_id", value: string) => Promise<{ data: Array<{ option_index: number }> | null; error: { message: string } | null }>;
  };
};
type StoryPollClient = { from: (table: "vibe_story_poll_votes") => StoryPollTable };


export function useVibeStories(enabled = true, limit = 60) {
  const [stories, setStories] = useState<VibeStory[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refreshStories = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("vibe_stories")
        .select(STORY_COLUMNS)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);
      if (queryError) throw queryError;

      const rows = (data ?? []) as Omit<VibeStory, "my_reaction">[];
      const reactionByStory = new Map<string, VibeStoryReaction>();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user && rows.length > 0) {
        const { data: reactions, error: reactionError } = await supabase
          .from("story_warmths")
          .select("story_id,reaction_type")
          .eq("user_id", user.id)
          .in("story_id", rows.map((story) => story.id));
        if (reactionError) throw reactionError;
        for (const reaction of reactions ?? []) {
          reactionByStory.set(reaction.story_id, reaction.reaction_type as VibeStoryReaction);
        }
      }

      setStories(rows.map((story) => ({
        ...story,
        image_url: story.image_path
          ? supabase.storage.from("vibenest-post-media").getPublicUrl(story.image_path).data.publicUrl
          : story.image_url,
        my_reaction: reactionByStory.get(story.id) ?? null,
      })));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [enabled, limit]);

  useEffect(() => {
    if (!enabled) return;

    const refreshTimer = window.setTimeout(() => {
      void refreshStories();
    }, 0);
    const supabase = createClient();
    const channel = supabase
      .channel("vibenest-stories-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_stories" }, () => {
        void refreshStories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "story_warmths" }, () => {
        void refreshStories();
      })
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, refreshStories]);

  // Remove stories locally at their exact expiry time even if no Realtime event arrives.
  useEffect(() => {
    if (!stories.length) return;
    const nextExpiry = Math.min(...stories.map((story) => new Date(story.expires_at).getTime()));
    const timeoutId = window.setTimeout(() => {
      setStories((current) =>
        current.filter((story) => new Date(story.expires_at).getTime() > Date.now()),
      );
      void refreshStories();
    }, Math.max(0, nextExpiry - Date.now() + 50));
    return () => window.clearTimeout(timeoutId);
  }, [stories, refreshStories]);

  const createStory = useCallback(async (input: CreateVibeStoryInput) => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Bạn cần có phiên VibeNest để đăng Khoảnh khắc.");

    const { data, error: insertError } = await supabase
      .from("vibe_stories")
      .insert({
        author_id: user.id,
        alias: input.alias.trim(),
        mood: input.mood.trim(),
        location: input.location?.trim() || null,
        caption: input.caption?.trim() || null,
        image_url: input.imageUrl?.trim() || null,
        image_path: input.imagePath?.trim() || null,
        canvas_preset: input.canvasPreset?.trim() || "rose-dusk",
      })
      .select(STORY_COLUMNS)
      .single();
    if (insertError) throw insertError;

    const row = data as Omit<VibeStory, "my_reaction">;
    const story = {
      ...row,
      image_url: row.image_path
        ? supabase.storage.from("vibenest-post-media").getPublicUrl(row.image_path).data.publicUrl
        : row.image_url,
      my_reaction: null,
    } satisfies VibeStory;
    setStories((current) =>
      [story, ...current.filter((item) => item.id !== story.id)].filter(
        (item) => new Date(item.expires_at).getTime() > Date.now(),
      ),
    );
    return story;
  }, []);

  const toggleWarmth = useCallback(async (storyId: string, reactionType: VibeStoryReaction) => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Bạn cần có phiên VibeNest để gửi hơi ấm.");

    const { data: existing, error: lookupError } = await supabase
      .from("story_warmths")
      .select("id,reaction_type")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing?.reaction_type === reactionType) {
      const { error: deleteError } = await supabase
        .from("story_warmths")
        .delete()
        .eq("id", existing.id);
      if (deleteError) throw deleteError;
    } else if (existing) {
      const { error: updateError } = await supabase
        .from("story_warmths")
        .update({ reaction_type: reactionType })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("story_warmths").insert({
        story_id: storyId,
        user_id: user.id,
        reaction_type: reactionType,
      });
      if (insertError) throw insertError;
    }
    await refreshStories();
  }, [refreshStories]);

  const deleteStory = useCallback(async (storyId: string) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("vibe_stories")
      .delete()
      .eq("id", storyId);
    if (deleteError) throw deleteError;
    setStories((current) => current.filter((story) => story.id !== storyId));
  }, []);

  const submitAnonymousQuestion = useCallback(async (storyId: string, question: string) => {
    const text = question.trim();
    if (!text || text.length > 500) throw new Error("Câu hỏi cần từ 1 đến 500 ký tự.");
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Hãy kết nối phiên VibeNest để gửi câu hỏi ẩn danh.");
    const table = (supabase as unknown as StoryQuestionClient).from("vibe_story_questions");
    const { error: insertError } = await table.insert({ story_id: storyId, sender_id: user.id, question: text });
    if (insertError) throw new Error(insertError.message);
  }, []);

  const submitStoryPollVote = useCallback(async (storyId: string, optionIndex: number) => {
    if (optionIndex !== 0 && optionIndex !== 1) throw new Error("Lựa chọn bình chọn không hợp lệ.");
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Hãy kết nối phiên VibeNest để bình chọn.");
    const table = (supabase as unknown as StoryPollClient).from("vibe_story_poll_votes");
    const { error: insertError } = await table.insert({ story_id: storyId, voter_id: user.id, option_index: optionIndex });
    if (insertError) throw new Error(insertError.message);
  }, []);

  const loadStoryPollResults = useCallback(async (storyId: string) => {
    const supabase = createClient();
    const table = (supabase as unknown as StoryPollClient).from("vibe_story_poll_votes");
    const { data, error: queryError } = await table.select("option_index").eq("story_id", storyId);
    if (queryError) throw new Error(queryError.message);
    return (data ?? []).reduce((counts, vote) => {
      counts[vote.option_index] = (counts[vote.option_index] ?? 0) + 1;
      return counts;
    }, [0, 0] as [number, number]);
  }, []);

  const loadAnonymousQuestions = useCallback(async (storyId: string) => {
    const supabase = createClient();
    const table = (supabase as unknown as StoryQuestionClient).from("vibe_story_questions");
    const { data, error: queryError } = await table.select("id,story_id,question,created_at")
      .eq("story_id", storyId).order("created_at", { ascending: false });
    if (queryError) throw new Error(queryError.message);
    return data ?? [];
  }, []);

  return {
    stories: enabled ? stories : [],
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refreshStories,
    createStory,
    toggleWarmth,
    deleteStory,
    submitAnonymousQuestion,
    loadAnonymousQuestions,
    submitStoryPollVote,
    loadStoryPollResults,
  };
}
