import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { theme } from "@/lib/theme";

const PRIVACY_URL = "https://livetv.sahinur.dev/privacy";
const DMCA_EMAIL = "dmca@livetv.sahinur.dev";
const SUPPORT_EMAIL = "support@livetv.sahinur.dev";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: "About",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />

      <Text style={styles.appName}>ALLtvLive</Text>
      <Text style={styles.tagline}>Live TV, everywhere.</Text>

      <Section title="What this app is">
        <Text style={styles.p}>
          ALLtvLive is a directory that lets you browse and watch publicly
          available live‑TV streams aggregated from the open‑source iptv‑org
          project.
        </Text>
      </Section>

      <Section title="Content & copyright">
        <Text style={styles.p}>
          ALLtvLive does not host, upload, cache, or redistribute any video
          content. All streams are delivered directly by their original
          broadcasters. Channel names and logos are the property of their
          respective owners and are used only for identification.
        </Text>
        <Text style={styles.p}>
          If you believe a stream infringes your rights, email us and we will
          remove it promptly.
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL(
              `mailto:${DMCA_EMAIL}?subject=ALLtvLive%20copyright%2Fremoval%20request`
            )
          }
          style={styles.linkBtn}
        >
          <Text style={styles.linkBtnText}>Report copyrighted content</Text>
        </Pressable>
      </Section>

      <Section title="Privacy">
        <Text style={styles.p}>
          No account, no ads, no analytics, no trackers. Your favourites,
          history and settings stay on your device and are never sent to us.
        </Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>Read the full privacy policy</Text>
        </Pressable>
      </Section>

      <Section title="Support">
        <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </Section>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 40 },
  back: { color: theme.neon, fontSize: 16, fontWeight: "600" },
  appName: { color: theme.text, fontSize: 28, fontWeight: "800" },
  tagline: { color: theme.neon, fontSize: 14, marginTop: 2, marginBottom: 8 },
  section: { marginTop: 22 },
  h2: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  p: { color: theme.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  link: { color: theme.neon, fontSize: 14, fontWeight: "600" },
  linkBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    backgroundColor: theme.card,
  },
  linkBtnText: { color: theme.neon, fontSize: 13, fontWeight: "600" },
  version: { color: theme.textMuted, fontSize: 12, marginTop: 28, textAlign: "center" },
});
