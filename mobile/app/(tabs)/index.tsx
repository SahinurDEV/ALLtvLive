import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  broadcastToChannelWithMeta,
  loadBroadcastChannels,
  loadCatalog,
  loadFeatured,
} from "@/lib/api";
import { useStore } from "@/lib/store";
import { theme } from "@/lib/theme";
import { ChannelCard } from "@/components/ChannelCard";
import type { ChannelWithMeta } from "@/lib/types";

export default function HomeScreen() {
  const router = useRouter();
  const setChannels = useStore((s) => s.setChannels);
  const channels = useStore((s) => s.channels);
  const brokenIds = useStore((s) => s.brokenIds);
  const featuredIds = useStore((s) => s.featuredIds);
  const primaryId = useStore((s) => s.primaryId);
  const setFeatured = useStore((s) => s.setFeatured);
  const autoPlayed = useStore((s) => s.autoPlayed);
  const markAutoPlayed = useStore((s) => s.markAutoPlayed);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const catalogReadyRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [catalog, featured, broadcast] = await Promise.all([
        loadCatalog(),
        loadFeatured(),
        loadBroadcastChannels(),
      ]);
      const broadcastEnriched = broadcast.map(broadcastToChannelWithMeta);
      // Broadcast channels shown first so admins can highlight custom ones
      setChannels([...broadcastEnriched, ...catalog.channels]);
      setFeatured(featured);
      catalogReadyRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setChannels, setFeatured]);

  useEffect(() => {
    load();
  }, [load]);

  const brokenSet = useMemo(() => new Set(brokenIds), [brokenIds]);

  // Only featured channels are shown/playable on the home screen
  const featuredChannels = useMemo<ChannelWithMeta[]>(() => {
    if (featuredIds.length === 0) return [];
    const featuredSet = new Set(featuredIds);
    const byId = new Map<string, ChannelWithMeta>();
    for (const ch of channels) {
      if (featuredSet.has(ch.id)) byId.set(ch.id, ch);
    }
    // Preserve the admin-configured order, primary first if set
    const ordered: ChannelWithMeta[] = [];
    if (primaryId) {
      const p = byId.get(primaryId);
      if (p) ordered.push(p);
    }
    for (const id of featuredIds) {
      if (id === primaryId) continue;
      const ch = byId.get(id);
      if (ch && !brokenSet.has(ch.id)) ordered.push(ch);
    }
    return ordered;
  }, [featuredIds, primaryId, channels, brokenSet]);

  // Auto-play primary (or random featured) on first launch / refresh
  useEffect(() => {
    if (autoPlayed) return;
    if (!catalogReadyRef.current) return;
    if (featuredChannels.length === 0) return;

    const target =
      (primaryId &&
        featuredChannels.find((c) => c.id === primaryId)) ||
      featuredChannels[Math.floor(Math.random() * featuredChannels.length)];

    if (target) {
      markAutoPlayed();
      // Small delay so first paint happens before navigation
      setTimeout(() => {
        router.push(`/channel/${encodeURIComponent(target.id)}`);
      }, 350);
    }
  }, [autoPlayed, featuredChannels, primaryId, router, markAutoPlayed]);

  const primaryChannel = useMemo(
    () =>
      primaryId
        ? featuredChannels.find((c) => c.id === primaryId) ?? null
        : null,
    [primaryId, featuredChannels]
  );

  const filtered = useMemo(() => {
    let list = featuredChannels;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }
    return list;
  }, [featuredChannels, search]);

  const playRandom = useCallback(() => {
    if (featuredChannels.length === 0) return;
    const pick =
      featuredChannels[Math.floor(Math.random() * featuredChannels.length)];
    router.push(`/channel/${encodeURIComponent(pick.id)}`);
  }, [featuredChannels, router]);

  const playPrimary = useCallback(() => {
    if (!primaryChannel) return;
    router.push(`/channel/${encodeURIComponent(primaryChannel.id)}`);
  }, [primaryChannel, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.neon} size="large" />
        <Text style={styles.loadingText}>Loading featured channels…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.buttonPrimary} onPress={load}>
          <Text style={styles.buttonPrimaryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.livePill}>
                  <View style={styles.livePillDot} />
                  <Text style={styles.livePillText}>FEATURED · LIVE</Text>
                </View>
                <Text style={styles.heroCount}>
                  {featuredChannels.length} channels
                </Text>
              </View>

              {primaryChannel ? (
                <Pressable
                  onPress={playPrimary}
                  style={({ pressed }) => [
                    styles.primaryCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.primaryLogoWrap}>
                    {primaryChannel.logo ? (
                      <Image
                        source={{ uri: primaryChannel.logo }}
                        style={styles.primaryLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.primaryLogoFallback}>
                        {primaryChannel.name.slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primaryLabel}>PLAYS FIRST · PINNED</Text>
                    <Text style={styles.primaryName} numberOfLines={2}>
                      {primaryChannel.name}
                    </Text>
                    <Text style={styles.primaryMeta} numberOfLines={1}>
                      Tap to play now
                    </Text>
                  </View>
                  <View style={styles.playChip}>
                    <Text style={styles.playChipText}>▶</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.hintCard}>
                  <Text style={styles.hintTitle}>
                    No primary channel set
                  </Text>
                  <Text style={styles.hintBody}>
                    A random featured channel plays on launch. Pin one from{" "}
                    <Text style={{ color: theme.neon }}>/admin</Text> so it
                    always starts first.
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <Pressable
                  onPress={playRandom}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnPrimary,
                    pressed && styles.pressed,
                  ]}
                  disabled={featuredChannels.length === 0}
                >
                  <Text style={styles.actionBtnPrimaryText}>
                    ⚡ Random featured
                  </Text>
                </Pressable>
                {primaryChannel && (
                  <Pressable
                    onPress={playPrimary}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.actionBtnGhost,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.actionBtnGhostText}>
                      ★ Play primary
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <TextInput
              placeholder="Search featured channels…"
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.search}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No featured channels yet</Text>
            <Text style={styles.emptyBody}>
              An admin needs to add channels to the featured list at{" "}
              <Text style={{ color: theme.neon }}>/admin</Text> before they show
              up here.
            </Text>
            <Pressable style={styles.buttonPrimary} onPress={load}>
              <Text style={styles.buttonPrimaryText}>Refresh</Text>
            </Pressable>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.neon}
          />
        }
        renderItem={({ item }) => (
          <ChannelCard channel={item} primary={item.id === primaryId} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
    padding: 24,
    gap: 14,
  },
  loadingText: { color: theme.textMuted, marginTop: 12 },
  errorText: { color: theme.danger, textAlign: "center" },

  headerWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },

  heroCard: {
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.neon + "55",
    backgroundColor: theme.neon + "18",
  },
  livePillDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.neon,
  },
  livePillText: {
    color: theme.neon,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroCount: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#241f10",
    borderWidth: 1,
    borderColor: "#facc1544",
  },
  primaryLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryLogo: { width: "80%", height: "80%" },
  primaryLogoFallback: {
    color: "#facc15",
    fontWeight: "800",
    fontSize: 18,
  },
  primaryLabel: {
    color: "#facc15",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  primaryName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryMeta: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  playChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.neon,
    alignItems: "center",
    justifyContent: "center",
  },
  playChipText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },

  hintCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  hintTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  hintBody: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionBtnPrimary: {
    backgroundColor: theme.neon,
    borderColor: theme.neon,
  },
  actionBtnPrimaryText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  actionBtnGhost: {
    backgroundColor: "transparent",
    borderColor: "#facc1555",
  },
  actionBtnGhostText: {
    color: "#facc15",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  pressed: { opacity: 0.75 },

  search: {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 14,
  },

  emptyBox: {
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyBody: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  buttonPrimary: {
    backgroundColor: theme.neon,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonPrimaryText: { color: "#000", fontWeight: "700" },

  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
});
