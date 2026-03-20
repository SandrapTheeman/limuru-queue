import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  SegmentedControlIOSComponent,
} from "react-native";
import { useAuth } from "../../../lib/stores/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [loginType, setLoginType] = useState<"patient" | "staff">("patient");
  const [patientId, setPatientId] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (loginType === "patient") {
        await login({ patientId: patientId || phone, type: "patient" });
      } else {
        await login({ staffId, password, type: "staff" });
      }
      router.replace("/(staff)");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <View style={styles.toggle}>
        <Button
          title="Patient"
          onPress={() => setLoginType("patient")}
          color={loginType === "patient" ? "#007AFF" : "#8E8E93"}
        />
        <Button
          title="Staff"
          onPress={() => setLoginType("staff")}
          color={loginType === "staff" ? "#007AFF" : "#8E8E93"}
        />
      </View>

      {loginType === "patient" ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Patient ID"
            value={patientId}
            onChangeText={setPatientId}
          />
          <Text style={styles.or}>OR</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Staff ID"
            value={staffId}
            onChangeText={setStaffId}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      )}

      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />

      <Button
        title="Forgot Password?"
        onPress={() => router.push("/(auth)/(reset-password)")}
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
    marginBottom: 24,
  },
  toggle: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  or: {
    textAlign: "center",
    color: "#666",
    marginBottom: 12,
  },
});
