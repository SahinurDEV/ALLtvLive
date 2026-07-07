import { Image, Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { ChannelWithMeta } from "@/lib/types";
import { theme } from "@/lib/theme";

interface Props {
  channel: ChannelWithMeta;
  broken?: boolean;
}

export function ChannelCard({ channel, broken }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/channel/${encodeURIComponent(channel.id)}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.logoWrap}>
        {channel.logo ? (
          <Image source={{ uri: channel.logo }} style={styles.logo} resizeMode="contain" />
        ) : (
          <Text style={styles.placeholder}>{channel.name.slice(0, 2).toUpperCase()}</Text>
        )}
        {broken && (
          <View style={styles.brokenBadge}>
            <Text style={styles.brokenText}>OFFLINE</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {channel.name}
      </Text>
      <Text style={styles.country} numberOfLines={1}>
        {channel.country}
        {channel.categories.length > 0 ? ` · ${channel.categories[0]}` : ""}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  logoWrap: {
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
  },
  logo: {
    width: "80%",
    height: "80%",
  },
  placeholder: {
    color: theme.neon,
    fontWeight: "700",
    fontSize: 20,
  },
  brokenBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: theme.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brokenText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
  name: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
  },
  country: {
    color: theme.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
