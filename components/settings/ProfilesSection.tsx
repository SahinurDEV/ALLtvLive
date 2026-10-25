"use client";

import { useEffect, useState } from "react";
import { Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import {
  createProfile,
  deleteProfile,
  getActiveProfileId,
  loadProfiles,
  switchProfile,
  DEFAULT_PROFILE_ID,
  type Profile,
} from "@/lib/profiles";

/** Local profiles: each has its own favorites, history, hidden channels and settings. */
export function ProfilesSection() {
  const t = useT();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState(DEFAULT_PROFILE_ID);
  const [name, setName] = useState("");

  useEffect(() => {
    setProfiles(loadProfiles());
    setActive(getActiveProfileId());
  }, []);

  const add = (kids: boolean) => {
    const p = createProfile(name || (kids ? t("profiles.kidsName") : ""), kids);
    setName("");
    setProfiles(loadProfiles());
    switchProfile(p.id);
  };

  return (
    <section data-testid="profiles">
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-neon" />
        {t("profiles.title")}
      </h3>
      <div className="px-3 py-2.5 rounded-lg border border-border/50 space-y-2">
        <p className="text-xs text-muted-foreground">{t("profiles.hint")}</p>
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center">
              <button
                type="button"
                onClick={() => p.id !== active && switchProfile(p.id)}
                aria-pressed={p.id === active}
                className={`h-9 px-3 rounded-full border text-sm flex items-center gap-1.5 ${
                  p.id === active ? "bg-neon text-black border-neon font-semibold" : "border-border/50 hover:border-neon/50"
                }`}
              >
                <span aria-hidden>{p.emoji}</span>
                {p.id === DEFAULT_PROFILE_ID && p.name === "Me" ? t("profiles.me") : p.name}
              </button>
              {p.id !== DEFAULT_PROFILE_ID && p.id !== active && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t("profiles.delete", { name: p.name })}
                  onClick={() => {
                    deleteProfile(p.id);
                    setProfiles(loadProfiles());
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profiles.name")}
            aria-label={t("profiles.name")}
            maxLength={20}
            className="flex-1 min-w-0 basis-32"
          />
          <Button type="button" variant="outline" onClick={() => add(false)}>
            {t("profiles.add")}
          </Button>
          <Button type="button" variant="neon" onClick={() => add(true)} data-testid="add-kids-profile">
            🧸 {t("profiles.addKids")}
          </Button>
        </div>
      </div>
    </section>
  );
}
