import { useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { apiClient } from "../../../lib/api/client";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!phone) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { phone });
      Alert.alert(
        "Success",
        "Password reset instructions have been sent to your phone.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to send reset instructions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your phone number and we'll send you reset instructions.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Button
        title={loading ? "Sending..." : "Send Reset Link"}
        onPress={handleReset}
        disabled={loading}
      />

      <Button
        title="Back to Login"
        onPress={() => router.back()}
        color="#8E8E93"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    fontSize: 16,
  },
});
