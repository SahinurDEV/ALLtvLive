import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadCatalog } from "@/lib/api";
import { customToChannelWithMeta, useStore } from "@/lib/store";
import { theme } from "@/lib/theme";
import { ChannelCard } from "@/components/ChannelCard";
import type { ChannelWithMeta } from "@/lib/types";

export default function HomeScreen() {
  const setChannels = useStore((s) => s.setChannels);
  const channels = useStore((s) => s.channels);
  const brokenIds = useStore((s) => s.brokenIds);
  const customChannels = useStore((s) => s.customChannels);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setError(null);
    try {
      const data = await loadCatalog();
      setChannels(data.channels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const brokenSet = useMemo(() => new Set(brokenIds), [brokenIds]);

  const merged = useMemo<ChannelWithMeta[]>(() => {
    const customs = customChannels.map(customToChannelWithMeta);
    return [...customs, ...channels];
  }, [customChannels, channels]);

  const filtered = useMemo(() => {
    let list = merged.filter((c) => !brokenSet.has(c.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 500);
  }, [merged, brokenSet, search]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.neon} size="large" />
        <Text style={styles.loadingText}>Loading channels...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
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
          <View style={styles.header}>
            <TextInput
              placeholder="Search channels..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              style={styles.search}
            />
            <Text style={styles.count}>
              {filtered.length.toLocaleString()} channels
            </Text>
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
  loadingText: { color: theme.textMuted, marginTop: 12 },
  errorText: { color: theme.danger, textAlign: "center" },
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
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
  count: { color: theme.textMuted, fontSize: 11, marginTop: 6 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
});
