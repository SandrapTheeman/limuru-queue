import { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Card, Text, Button, FAB, Searchbar, SegmentedButtons, IconButton } from "react-native-paper";
import { format } from "date-fns";
import { router } from "expo-router";
import { useVoiceCallStore } from "../../lib/stores/voice";
import { initiateCall } from "../../lib/api/voice";

interface QueueEntry {
  id: string;
  patientName: string;
  patientId: string;
  service: string;
  arrivalTime: Date;
  queueNumber: number;
  priority: "normal" | "urgent" | "critical";
  status: "waiting" | "serving" | "completed" | "no-show";
}

const mockQueue: QueueEntry[] = [
  {
    id: "1",
    patientName: "John Kamau",
    patientId: "PT-001234",
    service: "General Consultation",
    arrivalTime: new Date("2026-03-18T08:30:00"),
    queueNumber: 1,
    priority: "normal",
    status: "serving",
  },
  {
    id: "2",
    patientName: "Mary Wanjiku",
    patientId: "PT-001235",
    service: "Laboratory Tests",
    arrivalTime: new Date("2026-03-18T08:45:00"),
    queueNumber: 2,
    priority: "urgent",
    status: "waiting",
  },
  {
    id: "3",
    patientName: "David Ochieng",
    patientId: "PT-001236",
    service: "Pharmacy Refill",
    arrivalTime: new Date("2026-03-18T09:00:00"),
    queueNumber: 3,
    priority: "normal",
    status: "waiting",
  },
  {
    id: "4",
    patientName: "Grace Muthoni",
    patientId: "PT-001237",
    service: "Dental Checkup",
    arrivalTime: new Date("2026-03-18T09:15:00"),
    queueNumber: 4,
    priority: "critical",
    status: "waiting",
  },
];

export default function StaffQueueView() {
  const [queue, setQueue] = useState(mockQueue);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [calling, setCalling] = useState(false);
  const { setCurrentCall } = useVoiceCallStore();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#F44336";
      case "urgent":
        return "#FF9800";
      default:
        return "#4CAF50";
    }
  };

  const getStatusAction = (status: string) => {
    switch (status) {
      case "waiting":
        return { label: "Call", icon: "bell-ring", color: "#1976D2" };
      case "serving":
        return { label: "Complete", icon: "check", color: "#4CAF50" };
      default:
        return { label: "Done", icon: "check-all", color: "#9E9E9E" };
    }
  };

  const handleAction = (entry: QueueEntry) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              status: item.status === "waiting" ? "serving" : "completed",
            }
          : item
      )
    );
  };

  // Handle voice call to staff/reception
  const handleVoiceCall = async () => {
    setCalling(true);
    try {
      // Navigate to staff calls page to make a call
      router.push("/(staff)/calls");
    } catch (error) {
      console.error("Failed to initiate call:", error);
    } finally {
      setCalling(false);
    }
  };

  const filteredQueue = queue.filter((entry) => {
    const matchesSearch =
      entry.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const waitingCount = queue.filter((e) => e.status === "waiting").length;
  const servingCount = queue.filter((e) => e.status === "serving").length;
  const completedCount = queue.filter((e) => e.status === "completed").length;

  const renderQueueEntry = ({ item }: { item: QueueEntry }) => {
    const action = getStatusAction(item.status);
    return (
      <Card style={styles.queueCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.queueNumber}>
              <Text variant="titleLarge" style={styles.queueNumText}>
                #{item.queueNumber}
              </Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item.priority) },
                ]}
              >
                <Text style={styles.priorityText}>
                  {item.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text
                variant="bodySmall"
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === "serving"
                        ? "#1976D2"
                        : item.status === "completed"
                        ? "#4CAF50"
                        : "#666",
                  },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.patientInfo}>
            <Text variant="titleMedium">{item.patientName}</Text>
            <Text variant="bodySmall" style={styles.patientId}>
              {item.patientId}
            </Text>
          </View>

          <View style={styles.serviceRow}>
            <Text variant="bodyMedium">{item.service}</Text>
            <Text variant="bodySmall" style={styles.time}>
              Arrived: {format(item.arrivalTime, "h:mm a")}
            </Text>
          </View>

          {item.status !== "completed" && (
            <Button
              mode="contained"
              icon={action.icon}
              onPress={() => handleAction(item)}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              labelStyle={styles.actionLabel}
            >
              {action.label}
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, styles.waitingBox]}>
          <Text variant="titleLarge" style={styles.statNumber}>
            {waitingCount}
          </Text>
          <Text variant="bodySmall">Waiting</Text>
        </View>
        <View style={[styles.statBox, styles.servingBox]}>
          <Text variant="titleLarge" style={styles.statNumber}>
            {servingCount}
          </Text>
          <Text variant="bodySmall">Serving</Text>
        </View>
        <View style={[styles.statBox, styles.completedBox]}>
          <Text variant="titleLarge" style={styles.statNumber}>
            {completedCount}
          </Text>
          <Text variant="bodySmall">Done</Text>
        </View>
      </View>

      <Searchbar
        placeholder="Search patient..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={[
          { value: "all", label: "All" },
          { value: "waiting", label: "Waiting" },
          { value: "serving", label: "Serving" },
          { value: "completed", label: "Done" },
        ]}
        style={styles.segmentedButtons}
      />

      <FlatList
        data={filteredQueue}
        renderItem={renderQueueEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      {/* Voice Call FAB - Primary action */}
      <FAB
        icon="phone"
        label="Call Staff"
        style={styles.callFab}
        onPress={handleVoiceCall}
        loading={calling}
      />

      {/* Scan Patient FAB - Secondary action */}
      <FAB
        icon="qrcode-scan"
        style={styles.scanFab}
        onPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  waitingBox: {
    backgroundColor: "#E3F2FD",
  },
  servingBox: {
    backgroundColor: "#FFF3E0",
  },
  completedBox: {
    backgroundColor: "#E8F5E9",
  },
  statNumber: {
    fontWeight: "bold",
  },
  searchBar: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  listContainer: {
    paddingBottom: 80,
  },
  queueCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  queueNumber: {
    flexDirection: "row",
    alignItems: "center",
  },
  queueNumText: {
    fontWeight: "bold",
    color: "#1976D2",
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  statusText: {
    fontWeight: "bold",
  },
  patientInfo: {
    marginBottom: 8,
  },
  patientId: {
    color: "#666",
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    color: "#666",
  },
  actionButton: {
    marginTop: 12,
  },
  actionLabel: {
    color: "#fff",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#1976D2",
  },
  callFab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#4CAF50",
  },
  scanFab: {
    position: "absolute",
    right: 16,
    bottom: 80,
    backgroundColor: "#1976D2",
  },
});
