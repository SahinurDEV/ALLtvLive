import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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

// Turn a 2-letter ISO country code into its flag emoji; fall back to a globe
// for non-standard values (e.g. "INT" for international broadcast channels).
function codeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[a-zA-Z]{2}$/.test(code)) return "🌐";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function ChannelPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const channels = useStore((s) => s.channels);
  const customChannels = useStore((s) => s.customChannels);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const markBroken = useStore((s) => s.markBroken);
  const unmarkBroken = useStore((s) => s.unmarkBroken);

  const videoRef = useRef<VideoView>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const volWidthRef = useRef(1);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Fade for the whole control overlay (LIVE badge + play/pause + bottom bar).
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Pulsing dot for the LIVE badge.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const merged = useMemo<ChannelWithMeta[]>(
    () => [...customChannels.map(customToChannelWithMeta), ...channels],
    [channels, customChannels]
  );

  const index = useMemo(
    () => (id ? merged.findIndex((c) => c.id === decodeURIComponent(id)) : -1),
    [merged, id]
  );

  const channel = index >= 0 ? merged[index] : null;

  const streamUrl = useMemo(
    () => (channel ? pickBestStream(channel.streams) : null),
    [channel]
  );

  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    // Start with sound on at full volume. `doNotMix` puts the iOS audio
    // session in the `playback` category so audio is audible even when the
    // device is in silent mode (default `auto` can stay silent).
    p.muted = false;
    p.volume = 1.0;
    p.audioMixingMode = "doNotMix";
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") {
        setFailed(true);
        setReady(false);
        if (channel) markBroken(channel.id);
      }
      if (status === "readyToPlay" && channel) {
        setFailed(false);
        setReady(true);
        unmarkBroken(channel.id);
      }
      if (error) {
        console.warn("video error", error);
      }
    });
    return () => sub.remove();
  }, [player, channel, markBroken, unmarkBroken]);

  // Keep the local muted flag in sync with the player (native controls can
  // toggle it too), so our custom sound button always shows the right state.
  useEffect(() => {
    if (!player) return;
    setMuted(player.muted);
    const sub = player.addListener("mutedChange", ({ muted }) => setMuted(muted));
    return () => sub.remove();
  }, [player]);

  // Track play/pause so we can keep the controls up whenever it's paused.
  useEffect(() => {
    if (!player) return;
    setPlaying(player.playing);
    const sub = player.addListener("playingChange", ({ isPlaying }) =>
      setPlaying(isPlaying)
    );
    return () => sub.remove();
  }, [player]);

  // Auto-hide the controls a few seconds after playback starts; keep them
  // visible while paused. Tapping the video toggles them (see the tap layer).
  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      return;
    }
    if (controlsVisible) {
      const t = setTimeout(() => setControlsVisible(false), 2800);
      return () => clearTimeout(t);
    }
  }, [playing, controlsVisible]);

  // Fade the overlay in/out to match `controlsVisible`.
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsOpacity]);

  // Keep the local volume in sync with the player.
  useEffect(() => {
    if (!player) return;
    setVolume(player.volume);
    const sub = player.addListener("volumeChange", ({ volume }) =>
      setVolume(volume)
    );
    return () => sub.remove();
  }, [player]);

  const togglePlay = () => {
    if (!player) return;
    if (playing) player.pause();
    else player.play();
  };

  const applyVolume = (fraction: number) => {
    if (!player) return;
    const v = Math.max(0, Math.min(1, fraction));
    player.volume = v;
    player.muted = v === 0;
    setVolume(v);
  };

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
  const flag = codeToFlag(channel.country);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: channel.name,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.headerClose}
            >
              <Text style={styles.headerCloseText}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.videoWrap}>
        {failed ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorEmoji}>📡</Text>
            <Text style={styles.errorTitle}>Stream offline</Text>
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
              <Text style={styles.buttonText}>↻ Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <VideoView
              ref={videoRef}
              player={player}
              style={styles.video}
              allowsFullscreen
              allowsPictureInPicture
              contentFit="contain"
            />

            {/* Tap anywhere on the video to toggle the controls. Sits below the
                overlay so the overlay's own buttons still get their taps. */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setControlsVisible((v) => !v)}
            />

            {/* Fading control overlay — hidden while playing, shown on tap/pause */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
              pointerEvents={controlsVisible ? "box-none" : "none"}
            >
              {/* Dim scrim so controls stay legible over any frame */}
              <View style={styles.scrim} pointerEvents="none" />

              {/* LIVE badge (top-left) with pinging dot */}
              <View style={styles.liveBadge}>
                <View style={styles.liveDotWrap}>
                  <Animated.View style={[styles.livePing, { opacity: pulse }]} />
                  <View style={styles.liveDot} />
                </View>
                <Text style={styles.liveText}>{ready ? "LIVE" : "•••"}</Text>
              </View>

              {/* Center neon play button — only while paused (web behaviour) */}
              {!playing && (
                <View style={styles.centerWrap} pointerEvents="box-none">
                  <Pressable onPress={togglePlay} hitSlop={16} style={styles.centerPlay}>
                    <Text style={styles.centerPlayIcon}>▶</Text>
                  </Pressable>
                </View>
              )}

              {/* Bottom control bar with gradient scrim */}
              <View style={styles.controlBar}>
                <View style={styles.controlRow}>
                  <Pressable onPress={togglePlay} hitSlop={8} style={styles.iconBtn}>
                    <Text style={styles.icon}>{playing ? "❚❚" : "▶"}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (player.muted || player.volume === 0) {
                        applyVolume(player.volume === 0 ? 1 : player.volume);
                      } else {
                        player.muted = true;
                      }
                    }}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Text style={styles.icon}>
                      {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊"}
                    </Text>
                  </Pressable>

                  {/* Volume slider (drag or tap) */}
                  <View
                    style={styles.volTrack}
                    onLayout={(e) =>
                      (volWidthRef.current = e.nativeEvent.layout.width || 1)
                    }
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(e) =>
                      applyVolume(e.nativeEvent.locationX / volWidthRef.current)
                    }
                    onResponderMove={(e) =>
                      applyVolume(e.nativeEvent.locationX / volWidthRef.current)
                    }
                  >
                    <View style={styles.volBg} />
                    <View
                      style={[
                        styles.volFill,
                        { width: `${(muted ? 0 : volume) * 100}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.volKnob,
                        { left: `${(muted ? 0 : volume) * 100}%` },
                      ]}
                    />
                  </View>

                  <Pressable
                    onPress={() => videoRef.current?.enterFullscreen()}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Text style={styles.icon}>⤢</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </>
        )}
      </View>

      <ScrollView style={styles.info} contentContainerStyle={styles.infoContent}>
        <View style={styles.headerRow}>
          {channel.logo ? (
            <Image
              source={{ uri: channel.logo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoFallbackText}>
                {channel.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.titleCol}>
            <Text style={styles.channelName} numberOfLines={2}>
              {channel.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {flag} {channel.network || channel.country}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              toggleFavorite(channel.id).catch(() =>
                Alert.alert("Error", "Couldn't update favorite")
              )
            }
            hitSlop={8}
            style={[styles.favBtn, isFav && styles.favBtnActive]}
          >
            <Text style={[styles.favBtnText, isFav && { color: "#000" }]}>
              {isFav ? "♥" : "♡"}
            </Text>
          </Pressable>
        </View>

        {/* Metadata chips */}
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {flag} {channel.country}
            </Text>
          </View>
          {channel.categories?.map((cat) => (
            <View key={cat} style={styles.chip}>
              <Text style={styles.chipText}>{cat}</Text>
            </View>
          ))}
          {channel.languages?.map((lang) => (
            <View key={lang} style={styles.chip}>
              <Text style={styles.chipText}>{lang.toUpperCase()}</Text>
            </View>
          ))}
          <View style={[styles.chip, styles.chipAccent]}>
            <Text style={[styles.chipText, styles.chipAccentText]}>
              ◉ {channel.streams?.length ?? 0} stream
              {(channel.streams?.length ?? 0) === 1 ? "" : "s"}
            </Text>
          </View>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.neonSoft,
  },
  video: { width: "100%", height: "100%" },

  headerClose: { paddingHorizontal: 4, paddingVertical: 4 },
  headerCloseText: { color: theme.neon, fontSize: 16, fontWeight: "600" },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPlay: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,255,157,0.9)",
    shadowColor: theme.neon,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  centerPlayIcon: { color: "#000", fontSize: 24, fontWeight: "900", marginLeft: 3 },

  liveBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  liveDotWrap: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  livePing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: theme.live,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.live },
  liveText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  controlBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  icon: { color: "#fff", fontSize: 15, fontWeight: "700" },

  volTrack: {
    flex: 1,
    height: 30,
    marginHorizontal: 6,
    justifyContent: "center",
  },
  volBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  volFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.neon,
  },
  volKnob: {
    position: "absolute",
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    shadowColor: theme.neon,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },

  errorOverlay: { padding: 24, alignItems: "center", justifyContent: "center" },
  errorEmoji: { fontSize: 34, marginBottom: 8 },
  errorTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  errorSub: { color: theme.textMuted, textAlign: "center", marginBottom: 14 },

  info: { flex: 1 },
  infoContent: { padding: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoFallbackText: { color: theme.neon, fontSize: 18, fontWeight: "800" },
  titleCol: { flex: 1 },
  channelName: { color: theme.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: theme.textMuted, fontSize: 13, marginTop: 2 },

  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.cardBorder,
    backgroundColor: theme.card,
  },
  favBtnActive: {
    backgroundColor: theme.neon,
    borderColor: theme.neon,
    shadowColor: theme.neon,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  favBtnText: { color: theme.text, fontSize: 20, fontWeight: "700" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: { color: theme.textMuted, fontSize: 12, fontWeight: "600" },
  chipAccent: {
    backgroundColor: theme.neonSoft,
    borderColor: "rgba(0,255,157,0.35)",
  },
  chipAccentText: { color: theme.neon },

  button: {
    backgroundColor: theme.neon,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: { color: "#000", fontWeight: "700" },
});
