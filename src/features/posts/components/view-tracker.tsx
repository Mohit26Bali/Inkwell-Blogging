"use client";

import { useEffect } from "react";

import { recordViewAction } from "@/features/posts/actions/record-view.action";

/** Records one view per browser session. Renders nothing; failures are ignored on purpose. */
export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `viewed:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: fall through, the server-side limit still prevents inflation
    }
    void recordViewAction(postId).catch(() => {});
  }, [postId]);

  return null;
}
