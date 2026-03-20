import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../../../lib/stores/auth";
import { apiClient } from "../../../lib/api/client";

interface QueueItem {
  id: string;
  patientName: string;
  status: "waiting" | "called" | "completed";
  waitTime: number;
}

export default function StaffDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = async () => {
    try {
      const data = await apiClient.get("/queue");
      setQueue(data);
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQueue();
    setRefreshing(false);
  };

  const callNext = async (id: string) => {
    try {
      await apiClient.post(`/queue/${id}/call`);
      fetchQueue();
    } catch (error) {
      Alert.alert("Error", "Failed to call patient");
    }
  };

  const completePatient = async (id: string) => {
    try {
      await apiClient.post(`/queue/${id}/complete`);
      fetchQueue();
    } catch (error) {
      Alert.alert("Error", "Failed to complete");
    }
  };

  const renderQueueItem = ({ item }: { item: QueueItem }) => (
    <View style={styles.queueItem}>
      <View style={styles.queueInfo}>
        <Text style={styles.patientName}>{item.patientName}</Text>
        <Text style={styles.waitTime}>Wait: {item.waitTime} min</Text>
      </View>
      <View style={styles.queueActions}>
        {item.status === "waiting" && (
          <Button title="Call" onPress={() => callNext(item.id)} />
        )}
        {item.status === "called" && (
          <Button
            title="Complete"
            onPress={() => completePatient(item.id)}
            color="#34C759"
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Dashboard</Text>
        <Text style={styles.welcome}>Welcome, {user?.name}</Text>
      </View>

      <View style={styles.quickActions}>
        <Button
          title="Refresh Queue"
          onPress={fetchQueue}
        />
        <Button
          title="Logout"
          onPress={() => {
            logout();
            router.replace("/");
          }}
          color="#FF3B30"
        />
      </View>

      <Text style={styles.sectionTitle}>Current Queue</Text>
      <FlatList
        data={queue}
        renderItem={renderQueueItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No patients in queue</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  welcome: {
    fontSize: 16,
    color: "#666",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  queueInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
  },
  waitTime: {
    fontSize: 14,
    color: "#666",
  },
  queueActions: {
    flexDirection: "row",
    gap: 8,
  },
  empty: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
  },
});
