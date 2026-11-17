"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { useUploadThing } from "@/lib/uploadthing";

export function useImageUpload(onUploaded: (url: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      setIsUploading(false);
      const url = res?.[0]?.ufsUrl;
      if (url) onUploaded(url);
      else toast.error("Upload finished but no file URL was returned.");
    },
    onUploadError: (error) => {
      setIsUploading(false);
      toast.error(error.message || "Upload failed.");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploading(true);
    startUpload([file]);
  }

  function triggerUpload() {
    inputRef.current?.click();
  }

  return { inputRef, isUploading, handleFileChange, triggerUpload };
}
