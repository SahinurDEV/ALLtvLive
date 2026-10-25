"use client";

import { useMemo, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Heart, GripVertical, ChevronUp, ChevronDown, Plus, Trash2, Check, ListOrdered } from "lucide-react";
import { ChannelGrid } from "./ChannelGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { moveItem, type FavoriteGroup } from "@/lib/favoriteGroups";
import { getPlaceholderLogo } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { ChannelWithMeta } from "@/lib/types";

interface FavoritesViewProps {
  allChannels: ChannelWithMeta[];
}

export function FavoritesView({ allChannels }: FavoritesViewProps) {
  const t = useT();
  const favorites = useAppStore((s) => s.favorites);
  const reorderFavorites = useAppStore((s) => s.reorderFavorites);
  const groups = useAppStore((s) => s.favoriteGroups);
  const setGroups = useAppStore((s) => s.setFavoriteGroups);
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [arranging, setArranging] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const byId = useMemo(() => new Map(allChannels.map((c) => [c.id, c])), [allChannels]);
  // Favorites in the user's own order (only channels that still exist).
  const ordered = useMemo(
    () => favorites.map((id) => byId.get(id)).filter((c): c is ChannelWithMeta => !!c),
    [favorites, byId]
  );
  const group = groups.find((g) => g.id === activeGroup) ?? null;
  const visible = group ? ordered.filter((c) => group.channelIds.includes(c.id)) : ordered;

  const addGroup = () => {
    const name = newGroup.trim().slice(0, 30);
    if (!name) return;
    const g: FavoriteGroup = { id: `g-${Date.now().toString(36)}`, name, channelIds: [] };
    setGroups([...groups, g]);
    setNewGroup("");
    setActiveGroup(g.id);
  };
  const deleteGroup = (id: string) => {
    setGroups(groups.filter((g) => g.id !== id));
    setActiveGroup("all");
  };
  const toggleInGroup = (groupId: string, channelId: string) => {
    setGroups(
      groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              channelIds: g.channelIds.includes(channelId)
                ? g.channelIds.filter((x) => x !== channelId)
                : [...g.channelIds, channelId],
            }
      )
    );
  };
  const move = (id: string, dir: -1 | 1) => {
    const ids = ordered.map((c) => c.id);
    const i = ids.indexOf(id);
    reorderFavorites(moveItem(ids, i, i + dir));
  };

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("fav.emptyTitle")}</h2>
        <p className="text-muted-foreground max-w-sm">{t("fav.emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="favorites-view">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label={t("fav.groups")}>
        {[{ id: "all", name: t("fav.all") }, ...groups].map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={activeGroup === g.id}
            onClick={() => setActiveGroup(g.id)}
            className={`shrink-0 px-3 h-8 rounded-full text-xs border transition-colors ${
              activeGroup === g.id
                ? "bg-neon text-black border-neon font-semibold"
                : "border-border/50 hover:border-neon/50"
            }`}
          >
            {g.name}
          </button>
        ))}
        <form
          className="flex items-center gap-1 shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            addGroup();
          }}
        >
          <Input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder={t("fav.newGroup")}
            aria-label={t("fav.newGroup")}
            className="h-8 w-32 text-xs"
            maxLength={30}
          />
          <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" aria-label={t("fav.addGroup")}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={arranging ? "neon" : "outline"}
          onClick={() => setArranging((v) => !v)}
          className="gap-1 h-8 rounded-full text-xs"
          data-testid="fav-arrange"
        >
          {arranging ? <Check className="h-3.5 w-3.5" /> : <ListOrdered className="h-3.5 w-3.5" />}
          {arranging ? t("fav.done") : t("fav.arrange")}
        </Button>
        {group && (
          <Button size="sm" variant="ghost" onClick={() => deleteGroup(group.id)} className="gap-1 h-8 rounded-full text-xs text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
            {t("fav.deleteGroup")}
          </Button>
        )}
        {arranging && <p className="text-[11px] text-muted-foreground w-full sm:w-auto">{t("fav.arrangeHint")}</p>}
      </div>

      {arranging ? (
        <Reorder.Group
          axis="y"
          values={ordered.map((c) => c.id)}
          onReorder={reorderFavorites}
          className="space-y-2"
        >
          {ordered.map((c, i) => (
            <ArrangeRow
              key={c.id}
              channel={c}
              first={i === 0}
              last={i === ordered.length - 1}
              groups={groups}
              onMove={(d) => move(c.id, d)}
              onToggleGroup={(gid) => toggleInGroup(gid, c.id)}
            />
          ))}
        </Reorder.Group>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">{t("fav.groupEmpty")}</p>
      ) : (
        <ChannelGrid channels={visible} title={group ? group.name : t("fav.title")} showLoadMore={false} />
      )}
    </div>
  );
}

function ArrangeRow({
  channel,
  first,
  last,
  groups,
  onMove,
  onToggleGroup,
}: {
  channel: ChannelWithMeta;
  first: boolean;
  last: boolean;
  groups: FavoriteGroup[];
  onMove: (dir: -1 | 1) => void;
  onToggleGroup: (groupId: string) => void;
}) {
  const t = useT();
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={channel.id}
      dragListener={false}
      dragControls={controls}
      className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border/40 bg-card"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="h-9 w-7 flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
        aria-label={t("fav.drag")}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={channel.logo || getPlaceholderLogo(channel.name)}
        alt=""
        className="w-9 h-9 rounded bg-secondary object-contain p-0.5"
      />
      <span className="flex-1 min-w-0 truncate text-sm font-medium">{channel.name}</span>
      <div className="flex items-center">
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={first} onClick={() => onMove(-1)} aria-label={t("fav.moveUp")}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={last} onClick={() => onMove(1)} aria-label={t("fav.moveDown")}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      {groups.length > 0 && (
        <div className="w-full flex flex-wrap gap-1 pl-9">
          {groups.map((g) => {
            const on = g.channelIds.includes(channel.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onToggleGroup(g.id)}
                aria-pressed={on}
                className={`px-2 h-6 rounded-full text-[10px] border ${
                  on ? "bg-neon/20 border-neon/60 text-neon" : "border-border/50 text-muted-foreground"
                }`}
              >
                {on ? "✓ " : "+ "}
                {g.name}
              </button>
            );
          })}
        </div>
      )}
    </Reorder.Item>
  );
}
