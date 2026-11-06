"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CreateVibeStoryInput, VibeStory, VibeStoryReaction } from "@/lib/vibe/types";

const STORY_COLUMNS =
  "id,alias,mood,location,caption,image_url,canvas_preset,created_at,expires_at,heart_count,warmth_count";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Không thể tải Khoảnh khắc. Vui lòng thử lại.";
}

export function useVibeStories(enabled = true, limit = 60) {
  const [stories, setStories] = useState<VibeStory[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refreshStories = useCallback(async () => {
    if (!enabled) {
      setStories([]);
      setLoading(false);
      return;
    }
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
      setStories((data ?? []) as VibeStory[]);
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [enabled, limit]);

  useEffect(() => {
    if (!enabled) {
      setStories([]);
      setLoading(false);
      return;
    }
    void refreshStories();
    const supabase = createClient();
    const channel = supabase
      .channel("vibenest-stories-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_stories" }, () => {
        void refreshStories();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, refreshStories]);

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
        canvas_preset: input.canvasPreset?.trim() || "rose-dusk",
      })
      .select(STORY_COLUMNS)
      .single();
    if (insertError) throw insertError;

    const story = data as VibeStory;
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
      const { error: deleteError } = await supabase.from("story_warmths").delete().eq("id", existing.id);
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
    const { error: deleteError } = await supabase.from("vibe_stories").delete().eq("id", storyId);
    if (deleteError) throw deleteError;
    setStories((current) => current.filter((story) => story.id !== storyId));
  }, []);

  return { stories, loading, error, refreshStories, createStory, toggleWarmth, deleteStory };
}
