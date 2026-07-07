import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { customToChannelWithMeta, useStore } from "@/lib/store";
import { pickBestStream } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { ChannelWithMeta } from "@/lib/types";

export default function ChannelPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const channels = useStore((s) => s.channels);
  const customChannels = useStore((s) => s.customChannels);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const markBroken = useStore((s) => s.markBroken);
  const unmarkBroken = useStore((s) => s.unmarkBroken);

  const [failed, setFailed] = useState(false);

  const channel = useMemo<ChannelWithMeta | null>(() => {
    if (!id) return null;
    const merged = [
      ...customChannels.map(customToChannelWithMeta),
      ...channels,
    ];
    return merged.find((c) => c.id === decodeURIComponent(id)) ?? null;
  }, [id, channels, customChannels]);

  const streamUrl = useMemo(
    () => (channel ? pickBestStream(channel.streams) : null),
    [channel]
  );

  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") {
        setFailed(true);
        if (channel) markBroken(channel.id);
      }
      if (status === "readyToPlay" && channel) {
        setFailed(false);
        unmarkBroken(channel.id);
      }
      if (error) {
        console.warn("video error", error);
      }
    });
    return () => sub.remove();
  }, [player, channel, markBroken, unmarkBroken]);

  if (!channel) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.text}>Channel not found</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!streamUrl) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.text}>No stream available</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isFav = favorites.includes(channel.id);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen options={{ title: channel.name }} />

      <View style={styles.videoWrap}>
        {failed ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Stream failed</Text>
            <Text style={styles.errorSub}>
              This channel appears to be offline right now.
            </Text>
            <Pressable
              onPress={() => {
                setFailed(false);
                player.replace(streamUrl);
                player.play();
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          </View>
        ) : streamUrl ? (
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
          />
        ) : (
          <ActivityIndicator color={theme.neon} size="large" />
        )}
      </View>

      <ScrollView style={styles.info} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.headerRow}>
          <Text style={styles.channelName} numberOfLines={2}>
            {channel.name}
          </Text>
          <Pressable
            onPress={() =>
              toggleFavorite(channel.id).catch(() =>
                Alert.alert("Error", "Couldn't update favorite")
              )
            }
            style={[styles.favBtn, isFav && styles.favBtnActive]}
          >
            <Text style={[styles.favBtnText, isFav && { color: "#000" }]}>
              {isFav ? "♥ Saved" : "♡ Save"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaItem}>Country: {channel.country}</Text>
          {channel.categories.length > 0 && (
            <Text style={styles.metaItem}>
              Categories: {channel.categories.join(", ")}
            </Text>
          )}
          {channel.languages.length > 0 && (
            <Text style={styles.metaItem}>
              Languages: {channel.languages.join(", ").toUpperCase()}
            </Text>
          )}
          {channel.network && (
            <Text style={styles.metaItem}>Network: {channel.network}</Text>
          )}
          <Text style={styles.metaItem}>
            {channel.streams.length} stream
            {channel.streams.length === 1 ? "" : "s"} available
          </Text>
        </View>
      </ScrollView>
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
  },
  text: { color: theme.text, marginBottom: 12 },
  videoWrap: {
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  video: { width: "100%", height: "100%" },
  errorOverlay: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: { color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  errorSub: { color: theme.textMuted, textAlign: "center", marginBottom: 12 },
  info: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  channelName: {
    flex: 1,
    color: theme.text,
    fontSize: 20,
    fontWeight: "700",
  },
  favBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  favBtnActive: { backgroundColor: theme.neon, borderColor: theme.neon },
  favBtnText: { color: theme.text, fontSize: 12, fontWeight: "600" },
  meta: { gap: 6 },
  metaItem: { color: theme.textMuted, fontSize: 13 },
  button: {
    backgroundColor: theme.neon,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: "#000", fontWeight: "700" },
});
