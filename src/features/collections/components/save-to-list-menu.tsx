"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ListPlus, Plus } from "lucide-react";

import { toggleCollectionItemAction } from "@/features/collections/actions/collection.action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ListMembership = { id: string; name: string; hasPost: boolean };

export function SaveToListMenu({
  postId,
  lists,
  isAuthenticated,
}: {
  postId: string;
  lists: ListMembership[];
  isAuthenticated: boolean;
}) {
  const [state, setState] = useState(lists);
  const [, startTransition] = useTransition();

  if (!isAuthenticated) return null;

  function handleToggle(listId: string) {
    setState((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, hasPost: !l.hasPost } : l))
    );
    startTransition(async () => {
      try {
        await toggleCollectionItemAction(listId, postId);
      } catch (error) {
        setState((prev) =>
          prev.map((l) => (l.id === listId ? { ...l, hasPost: !l.hasPost } : l))
        );
        toast.error(error instanceof Error ? error.message : "Failed to update list.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ListPlus className="size-4" />
          Save to list
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {state.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No lists yet.</p>
        ) : (
          state.map((list) => (
            <DropdownMenuItem
              key={list.id}
              onSelect={(e) => {
                e.preventDefault();
                handleToggle(list.id);
              }}
            >
              <span className="flex-1">{list.name}</span>
              {list.hasPost && <Check className="size-4" />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/lists">
            <Plus className="size-4" />
            Manage lists
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
