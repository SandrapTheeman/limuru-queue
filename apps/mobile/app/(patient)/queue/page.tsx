import { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Card, Text, Chip, Button, FAB } from "react-native-paper";
import { format } from "date-fns";

interface QueueItem {
  id: string;
  position: number;
  name: string;
  service: string;
  estimatedTime: string;
  status: "waiting" | "called" | "served";
}

const mockQueue: QueueItem[] = [
  {
    id: "1",
    position: 1,
    name: "John Doe",
    service: "General Consultation",
    estimatedTime: "9:15 AM",
    status: "called",
  },
  {
    id: "2",
    position: 2,
    name: "Jane Smith",
    service: "Laboratory",
    estimatedTime: "9:30 AM",
    status: "waiting",
  },
  {
    id: "3",
    position: 3,
    name: "Bob Wilson",
    service: "Pharmacy",
    estimatedTime: "9:45 AM",
    status: "waiting",
  },
];

export default function PatientQueueView() {
  const [myPosition] = useState(2);
  const [estimatedTime] = useState("9:30 AM");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "called":
        return "#FFC107";
      case "served":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "called":
        return "Now Serving";
      case "served":
        return "Served";
      default:
        return "Waiting";
    }
  };

  const renderQueueItem = ({ item }: { item: QueueItem }) => (
    <Card style={styles.queueCard}>
      <Card.Content style={styles.queueContent}>
        <View style={styles.queueLeft}>
          <Text variant="titleLarge" style={styles.position}>
            #{item.position}
          </Text>
          <Text variant="bodyMedium">{item.name}</Text>
          <Text variant="bodySmall" style={styles.service}>
            {item.service}
          </Text>
        </View>
        <View style={styles.queueRight}>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {getStatusLabel(item.status)}
          </Chip>
          <Text variant="bodySmall" style={styles.time}>
            Est. {item.estimatedTime}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.myPositionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Your Position
          </Text>
          <View style={styles.positionRow}>
            <Text variant="displayLarge" style={styles.positionNumber}>
              {myPosition}
            </Text>
            <View style={styles.positionInfo}>
              <Text variant="bodyLarge">Estimated Time</Text>
              <Text variant="titleLarge" style={styles.estimatedTime}>
                {estimatedTime}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Queue List
      </Text>

      <FlatList
        data={mockQueue}
        renderItem={renderQueueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <FAB
        icon="bell-ring"
        label="Remind Me"
        style={styles.fab}
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
  myPositionCard: {
    marginBottom: 16,
    backgroundColor: "#E8F5E9",
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  positionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  positionNumber: {
    fontWeight: "bold",
    color: "#2E7D32",
  },
  positionInfo: {
    marginLeft: 24,
  },
  estimatedTime: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: "bold",
  },
  listContainer: {
    paddingBottom: 80,
  },
  queueCard: {
    marginBottom: 8,
  },
  queueContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  queueLeft: {
    flex: 1,
  },
  position: {
    fontWeight: "bold",
    color: "#4CAF50",
  },
  service: {
    color: "#666",
    marginTop: 4,
  },
  queueRight: {
    alignItems: "flex-end",
  },
  statusChip: {
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
  },
  time: {
    color: "#666",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#4CAF50",
  },
});
