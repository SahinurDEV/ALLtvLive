import { Tabs, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { theme } from "@/lib/theme";

function Icon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, color: focused ? theme.neon : theme.textMuted }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
        },
        tabBarActiveTintColor: theme.neon,
        tabBarInactiveTintColor: theme.textMuted,
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <Icon label="⌂" focused={focused} />,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/about")}
              hitSlop={12}
              style={{ paddingHorizontal: 16 }}
            >
              <Text style={{ color: theme.textMuted, fontSize: 20 }}>ⓘ</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ focused }) => <Icon label="♥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="custom"
        options={{
          title: "My Channels",
          tabBarIcon: ({ focused }) => <Icon label="⊕" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
