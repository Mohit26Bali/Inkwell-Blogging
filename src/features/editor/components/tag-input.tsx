"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const MAX_TAGS = 10;

export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value || tags.length >= MAX_TAGS || tags.includes(value)) return;
    onChange([...tags, value]);
    setDraft("");
  }

  function removeTag(value: string) {
    onChange(tags.filter((tag) => tag !== value));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="h-6 gap-1 px-2">
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="rounded-full hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {tags.length < MAX_TAGS && (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="h-6 w-28 border-none px-1 text-xs shadow-none focus-visible:ring-0"
        />
      )}
    </div>
  );
}
