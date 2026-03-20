import { Stack } from "expo-router";
import { AuthProvider } from "../../lib/stores/auth";

export default function AuthLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(login)" />
        <Stack.Screen name="(reset-password)" />
      </Stack>
    </AuthProvider>
  );
}
