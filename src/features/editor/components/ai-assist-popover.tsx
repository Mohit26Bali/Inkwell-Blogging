"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Check } from "lucide-react";

import {
  suggestTitlesAction,
  generateExcerptAction,
  suggestTagsAction,
} from "@/features/editor/actions/ai-assist.action";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function AiAssistPopover({
  title,
  getContentHtml,
  onApplyTitle,
  onApplyExcerpt,
  onApplyTags,
}: {
  title: string;
  getContentHtml: () => string;
  onApplyTitle: (title: string) => void;
  onApplyExcerpt: (excerpt: string) => void;
  onApplyTags: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[] | null>(null);
  const [excerptSuggestion, setExcerptSuggestion] = useState<string | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[] | null>(null);
  const [isTitlesPending, startTitles] = useTransition();
  const [isExcerptPending, startExcerpt] = useTransition();
  const [isTagsPending, startTags] = useTransition();

  function handleGenerateTitles() {
    startTitles(async () => {
      try {
        const { titles } = await suggestTitlesAction({ contentHtml: getContentHtml() });
        setTitleSuggestions(titles);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to generate titles.");
      }
    });
  }

  function handleGenerateExcerpt() {
    startExcerpt(async () => {
      try {
        const { excerpt } = await generateExcerptAction({
          title,
          contentHtml: getContentHtml(),
        });
        setExcerptSuggestion(excerpt);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to generate an excerpt.");
      }
    });
  }

  function handleGenerateTags() {
    startTags(async () => {
      try {
        const { tags } = await suggestTagsAction({ title, contentHtml: getContentHtml() });
        setTagSuggestions(tags);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to generate tags.");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="size-4" />
          AI Assist
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Title ideas</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateTitles}
              disabled={isTitlesPending}
            >
              {isTitlesPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          </div>
          {titleSuggestions && (
            <ul className="mt-2 space-y-1">
              {titleSuggestions.map((suggestion, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyTitle(suggestion);
                      setOpen(false);
                    }}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Excerpt / meta description</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateExcerpt}
              disabled={isExcerptPending}
            >
              {isExcerptPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          </div>
          {excerptSuggestion && (
            <div className="mt-2 space-y-2 rounded-md border border-border/60 p-2.5">
              <p className="text-sm text-muted-foreground">{excerptSuggestion}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApplyExcerpt(excerptSuggestion);
                  setOpen(false);
                }}
              >
                <Check className="size-3.5" />
                Use this
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tag ideas</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateTags}
              disabled={isTagsPending}
            >
              {isTagsPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          </div>
          {tagSuggestions && (
            <div className="mt-2 space-y-2 rounded-md border border-border/60 p-2.5">
              <p className="text-sm text-muted-foreground">{tagSuggestions.join(", ")}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApplyTags(tagSuggestions);
                  setOpen(false);
                }}
              >
                <Check className="size-3.5" />
                Use these
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
