import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore, customToChannelWithMeta } from "@/lib/store";
import { theme } from "@/lib/theme";
import { ChannelCard } from "@/components/ChannelCard";

export default function FavoritesScreen() {
  const favorites = useStore((s) => s.favorites);
  const channels = useStore((s) => s.channels);
  const customChannels = useStore((s) => s.customChannels);

  const list = useMemo(() => {
    const all = [...customChannels.map(customToChannelWithMeta), ...channels];
    return all.filter((c) => favorites.includes(c.id));
  }, [channels, customChannels, favorites]);

  if (list.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>♥</Text>
        <Text style={styles.emptyTitle}>No Favorites Yet</Text>
        <Text style={styles.emptyText}>
          Tap the heart on a channel to save it here.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ChannelCard channel={item} />}
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
  },
  emptyIcon: { fontSize: 44, color: theme.textMuted, marginBottom: 8 },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: theme.textMuted, textAlign: "center", maxWidth: 260 },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },
  row: { justifyContent: "space-between" },
});
