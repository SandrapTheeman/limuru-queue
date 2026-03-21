import { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Animated, Pressable } from "react-native";
import { Card, Text, Button, FAB, Searchbar, SegmentedButtons, IconButton, Badge, ActivityIndicator } from "react-native-paper";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
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
  const [calling, setCalling] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critical":
        return "CRITICAL";
      case "urgent":
        return "URGENT";
      default:
        return "NORMAL";
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

  const handleCallPatient = async (entry: QueueEntry) => {
    setCalling(entry.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentCall({
        callId: `call-${entry.id}`,
        callerId: 'staff-user',
        callerName: 'Staff',
        calleeId: entry.patientId,
        calleeName: entry.patientName,
        status: 'active',
        startedAt: new Date().toISOString(),
        priority: entry.priority,
      });
      router.push("/(staff)/calls/active");
    } catch (error) {
      console.error("Failed to call patient:", error);
    } finally {
      setCalling(null);
    }
  };

  const handleAction = (entry: QueueEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

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
    const isCallingThis = calling === item.id;

    return (
      <Card 
        style={styles.queueCard}
        accessibilityRole="none"
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.queueNumber}>
              <Text 
                variant="titleLarge" 
                style={styles.queueNumText}
                accessibilityLabel={`Queue number ${item.queueNumber}`}
              >
                #{item.queueNumber}
              </Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item.priority) },
                ]}
                accessibilityRole="text"
                accessibilityLabel={`Priority: ${getPriorityLabel(item.priority)}`}
              >
                <Text style={styles.priorityText}>
                  {getPriorityLabel(item.priority)}
                </Text>
              </View>
            </View>
            <View 
              style={styles.statusBadge}
              accessibilityRole="text"
              accessibilityLabel={`Status: ${item.status}`}
            >
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
            <Text 
              variant="titleMedium"
              accessibilityLabel={`Patient name: ${item.patientName}`}
            >
              {item.patientName}
            </Text>
            <Text 
              variant="bodySmall" 
              style={styles.patientId}
              accessibilityLabel={`Patient ID: ${item.patientId}`}
            >
              {item.patientId}
            </Text>
          </View>

          <View style={styles.serviceRow}>
            <Text 
              variant="bodyMedium"
              accessibilityLabel={`Service: ${item.service}`}
            >
              {item.service}
            </Text>
            <Text 
              variant="bodySmall" 
              style={styles.time}
              accessibilityLabel={`Arrived: ${format(item.arrivalTime, "h:mm a")}`}
            >
              Arrived: {format(item.arrivalTime, "h:mm a")}
            </Text>
          </View>

          {item.status !== "completed" && (
            <View style={styles.actionsRow}>
              {item.status === "waiting" && (
                <Pressable
                  onPress={() => handleCallPatient(item)}
                  disabled={isCallingThis}
                  style={({ pressed }) => [
                    styles.callButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Call patient ${item.patientName}`}
                  accessibilityHint="Initiate voice call to patient"
                >
                  {isCallingThis ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <IconButton
                      icon="phone"
                      iconColor="#FFFFFF"
                      size={20}
                    />
                  )}
                  <Text style={styles.callButtonText}>
                    {isCallingThis ? "Calling..." : "Call"}
                  </Text>
                </Pressable>
              )}
              
              <Button
                mode="contained"
                icon={action.icon}
                onPress={() => handleAction(item)}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                labelStyle={styles.actionLabel}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                {action.label}
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View 
          style={[styles.statBox, styles.waitingBox]}
          accessibilityRole="text"
          accessibilityLabel={`${waitingCount} waiting`}
        >
          <Text variant="titleLarge" style={styles.statNumber}>
            {waitingCount}
          </Text>
          <Text variant="bodySmall">Waiting</Text>
        </View>
        <View 
          style={[styles.statBox, styles.servingBox]}
          accessibilityRole="text"
          accessibilityLabel={`${servingCount} serving`}
        >
          <Text variant="titleLarge" style={styles.statNumber}>
            {servingCount}
          </Text>
          <Text variant="bodySmall">Serving</Text>
        </View>
        <View 
          style={[styles.statBox, styles.completedBox]}
          accessibilityRole="text"
          accessibilityLabel={`${completedCount} completed`}
        >
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
        accessibilityLabel="Search patients"
        accessibilityHint="Enter patient name or ID to search"
      />

      <SegmentedButtons
        value={statusFilter}
        onValueChange={(value) => {
          setStatusFilter(value);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
            tintColor="#4CAF50"
          />
        }
        accessibilityLabel="Queue list"
        accessibilityHint="Pull to refresh the queue"
      />

      <FAB
        icon="phone"
        label="Call Staff"
        style={styles.callFab}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/(staff)/calls");
        }}
        accessibilityLabel="Contact staff"
        accessibilityHint="Open staff call screen"
      />

      <FAB
        icon="qrcode-scan"
        style={styles.scanFab}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        accessibilityLabel="Scan QR code"
        accessibilityHint="Open QR code scanner"
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
    minHeight: 72,
    justifyContent: "center",
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
    backgroundColor: '#FFFFFF',
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
  actionsRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 48,
    minWidth: 48,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
  },
  actionLabel: {
    color: "#fff",
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
