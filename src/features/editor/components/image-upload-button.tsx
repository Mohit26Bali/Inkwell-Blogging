"use client";

import { ImageIcon, Loader2 } from "lucide-react";

import { useImageUpload } from "@/features/editor/hooks/use-image-upload";
import { Button } from "@/components/ui/button";

export function ImageUploadButton({
  onUploaded,
  label = "Upload image",
  variant = "outline",
  size = "sm",
}: {
  onUploaded: (url: string) => void;
  label?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
}) {
  const { inputRef, isUploading, handleFileChange, triggerUpload } = useImageUpload(onUploaded);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={isUploading}
        onClick={triggerUpload}
      >
        {isUploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageIcon className="size-4" />
        )}
        {isUploading ? "Uploading…" : label}
      </Button>
    </>
  );
}
