import { Tabs } from "expo-router";
import { Text } from "react-native";
import { theme } from "@/lib/theme";

function Icon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, color: focused ? theme.neon : theme.textMuted }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
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
