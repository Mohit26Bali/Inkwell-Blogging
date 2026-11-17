"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import readingTime from "reading-time";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { EditorToolbar } from "@/features/editor/components/editor-toolbar";
import { ImageUploadButton } from "@/features/editor/components/image-upload-button";
import { AiAssistPopover } from "@/features/editor/components/ai-assist-popover";
import { TagInput } from "@/features/editor/components/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { savePostDraftAction } from "@/features/posts/actions/save-draft.action";
import { publishPostAction } from "@/features/posts/actions/publish-post.action";

const lowlight = createLowlight(common);

const AUTOSAVE_INTERVAL_MS = 8000;

export function PostEditor({
  postId,
  initialTitle = "",
  initialSubtitle = "",
  initialCoverImage = "",
  initialExcerpt = "",
  initialTags = [],
  initialContent,
}: {
  postId?: string;
  initialTitle?: string;
  initialSubtitle?: string;
  initialCoverImage?: string;
  initialExcerpt?: string;
  initialTags?: string[];
  /** JSON for posts authored in this editor; falls back to raw HTML for older/seeded posts with no saved JSON. */
  initialContent?: JSONContent | string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [showExcerptField, setShowExcerptField] = useState(Boolean(initialExcerpt));
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(postId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Tell your story…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none dark:prose-invert prose-headings:font-serif prose-p:font-serif prose-p:text-[1.0625rem] prose-p:leading-[1.8] focus:outline-none min-h-[60vh]",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(readingTime(text).words);
    },
  });

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPostIdRef = useRef(currentPostId);
  currentPostIdRef.current = currentPostId;

  useEffect(() => {
    if (!editor || !initialContent) return;
    setWordCount(readingTime(editor.getText()).words);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  async function persistDraft() {
    if (!editor || !title.trim()) return null;
    const result = await savePostDraftAction({
      postId: currentPostIdRef.current,
      title,
      subtitle,
      contentJson: editor.getJSON(),
      contentHtml: editor.getHTML(),
      coverImage,
      excerpt,
      tags,
    });
    if (!currentPostIdRef.current) {
      currentPostIdRef.current = result.id;
      setCurrentPostId(result.id);
    }
    return result;
  }

  useEffect(() => {
    if (!editor) return;

    function scheduleSave() {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(handleAutosave, AUTOSAVE_INTERVAL_MS);
    }

    async function handleAutosave() {
      setIsSaving(true);
      try {
        await persistDraft();
        setLastSavedAt(new Date());
      } catch {
        toast.error("Autosave failed — your changes are still in the editor.");
      } finally {
        setIsSaving(false);
      }
    }

    editor.on("update", scheduleSave);
    return () => {
      editor.off("update", scheduleSave);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, title, subtitle, coverImage, excerpt, tags]);

  async function handlePublish() {
    if (!title.trim()) {
      toast.error("Add a title before publishing.");
      return;
    }

    setIsPublishing(true);
    try {
      const saved = await persistDraft();
      if (!saved) {
        toast.error("Add a title before publishing.");
        return;
      }
      const { slug } = await publishPostAction({ postId: saved.id });
      toast.success("Published!");
      router.push(`/articles/${slug}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6">
        {coverImage ? (
          <div className="mb-6 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded/external URL, not worth Next/Image config for the editor preview */}
            <img
              src={coverImage}
              alt="Cover preview"
              className="h-40 w-full rounded-xl object-cover"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCoverImage("")}
            >
              <X className="size-4" />
              Remove cover image
            </Button>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2">
            <ImageUploadButton onUploaded={setCoverImage} label="Add cover image" />
            {showCoverUrlInput ? (
              <Input
                autoFocus
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                onBlur={() => !coverImage && setShowCoverUrlInput(false)}
                placeholder="https://images.example.com/cover.jpg"
                className="max-w-xs"
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCoverUrlInput(true)}
              >
                or paste a URL
              </Button>
            )}
          </div>
        )}

        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          rows={1}
          className="resize-none border-none px-0 font-serif text-4xl font-medium tracking-tight shadow-none focus-visible:ring-0 md:text-5xl"
        />

        <Textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Add a subtitle…"
          rows={1}
          maxLength={200}
          className="resize-none border-none px-0 font-serif text-xl text-muted-foreground shadow-none focus-visible:ring-0"
        />

        {showExcerptField ? (
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Excerpt — shown in previews and search results (optional)"
            rows={2}
            maxLength={300}
            className="mt-2 resize-none border-none px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowExcerptField(true)}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground"
          >
            + Add an excerpt
          </button>
        )}

        <div className="mt-4">
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div className="mt-4">
          <AiAssistPopover
            title={title}
            getContentHtml={() => editor?.getHTML() ?? ""}
            onApplyTitle={setTitle}
            onApplyExcerpt={(value) => {
              setExcerpt(value);
              setShowExcerptField(true);
            }}
            onApplyTags={setTags}
          />
        </div>
      </div>

      {editor && <EditorToolbar editor={editor} />}

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <EditorContent editor={editor} />
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString()} words</span>
          <span>·</span>
          <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
          {isSaving && (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </span>
          )}
          {!isSaving && lastSavedAt && (
            <span>Saved {lastSavedAt.toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing && <Loader2 className="size-4 animate-spin" />}
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
