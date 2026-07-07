import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { customToChannelWithMeta, useStore } from "@/lib/store";
import { theme } from "@/lib/theme";
import { ChannelCard } from "@/components/ChannelCard";

interface Preset {
  name: string;
  url: string;
  logo: string;
  category: string;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    name: "FIFA World",
    url: "https://www.youtube.com/@FIFA/live",
    logo: "https://digitalhub.fifa.com/transform/f95c8d33-45e0-464a-b31f-fda3f9a55e2c/FIFA-Plus-Logo",
    category: "Sports",
    hint: "FIFA official YouTube",
  },
  {
    name: "Al Jazeera English",
    url: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Aljazeera_eng.png",
    category: "News",
    hint: "24/7 English news",
  },
  {
    name: "DW English",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/Deutsche_Welle_symbol_2012.svg",
    category: "News",
    hint: "Deutsche Welle",
  },
  {
    name: "NASA TV Public",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    category: "Science",
    hint: "NASA public channel",
  },
];

export default function CustomScreen() {
  const customChannels = useStore((s) => s.customChannels);
  const addCustom = useStore((s) => s.addCustom);
  const removeCustom = useStore((s) => s.removeCustom);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [category, setCategory] = useState("");

  const enriched = useMemo(
    () => customChannels.map(customToChannelWithMeta),
    [customChannels]
  );

  const reset = () => {
    setName("");
    setUrl("");
    setLogo("");
    setCategory("");
  };

  const submit = async () => {
    if (!name.trim() || !url.trim()) {
      Alert.alert("Missing fields", "Name and stream URL are required.");
      return;
    }
    await addCustom({ name, url, logo: logo || null, category: category || null });
    reset();
    setOpen(false);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Channels</Text>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {enriched.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>No Custom Channels</Text>
          <Text style={styles.emptyText}>
            Add your own IPTV stream URLs (HLS, MP4, YouTube live).
          </Text>
        </View>
      ) : (
        <FlatList
          data={enriched}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={{ width: "48%" }}>
              <ChannelCard channel={item} />
              <Pressable
                onPress={() =>
                  Alert.alert("Delete", `Remove ${item.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => removeCustom(item.id),
                    },
                  ])
                }
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Custom Channel</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.presetSection}>
            <Text style={styles.label}>Popular presets</Text>
            <View style={styles.presetGrid}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p.name}
                  onPress={() => {
                    setName(p.name);
                    setUrl(p.url);
                    setLogo(p.logo);
                    setCategory(p.category);
                  }}
                  style={({ pressed }) => [
                    styles.preset,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.presetName}>{p.name}</Text>
                  <Text style={styles.presetHint}>{p.hint}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ padding: 16, gap: 10 }}>
            <View>
              <Text style={styles.label}>Channel name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="My favorite channel"
                placeholderTextColor={theme.textMuted}
                style={styles.input}
              />
            </View>
            <View>
              <Text style={styles.label}>Stream URL *</Text>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com/stream.m3u8"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
              <Text style={styles.hint}>HLS (.m3u8), MP4, or YouTube live URL</Text>
            </View>
            <View>
              <Text style={styles.label}>Logo URL (optional)</Text>
              <TextInput
                value={logo}
                onChangeText={setLogo}
                placeholder="https://…"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
            <View>
              <Text style={styles.label}>Category (optional)</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Sports, News..."
                placeholderTextColor={theme.textMuted}
                style={styles.input}
              />
            </View>

            <Pressable
              onPress={submit}
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.submitText}>Add Channel</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  title: { color: theme.text, fontSize: 18, fontWeight: "700" },
  addBtn: {
    backgroundColor: theme.neon,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: theme.textMuted, textAlign: "center", maxWidth: 260 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
  removeBtn: {
    marginTop: -6,
    marginBottom: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeText: { color: theme.danger, fontSize: 10, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: theme.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
  },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: "700" },
  modalClose: { color: theme.text, fontSize: 24 },
  presetSection: { padding: 16 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    flexBasis: "48%",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    backgroundColor: theme.card,
  },
  presetName: { color: theme.text, fontSize: 12, fontWeight: "600" },
  presetHint: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  label: { color: theme.textMuted, fontSize: 11, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 14,
  },
  hint: { color: theme.textMuted, fontSize: 10, marginTop: 4 },
  submitBtn: {
    backgroundColor: theme.neon,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#000", fontWeight: "700", fontSize: 14 },
});
