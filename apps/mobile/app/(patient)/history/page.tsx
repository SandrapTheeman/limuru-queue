import { View, StyleSheet, FlatList } from "react-native";
import { Card, Text, Chip, Divider } from "react-native-paper";
import { format } from "date-fns";

interface VisitHistoryItem {
  id: string;
  date: Date;
  service: string;
  doctor: string;
  status: "completed" | "cancelled" | "no-show";
  queueNumber: number;
  waitTime: string;
}

const mockHistory: VisitHistoryItem[] = [
  {
    id: "1",
    date: new Date("2026-03-15"),
    service: "General Consultation",
    doctor: "Dr. Amina Ochieng",
    status: "completed",
    queueNumber: 5,
    waitTime: "25 min",
  },
  {
    id: "2",
    date: new Date("2026-03-01"),
    service: "Laboratory Tests",
    doctor: "Dr. James Mwangi",
    status: "completed",
    queueNumber: 3,
    waitTime: "15 min",
  },
  {
    id: "3",
    date: new Date("2026-02-20"),
    service: "Pharmacy Refill",
    doctor: "Dr. Sarah Wanjiku",
    status: "cancelled",
    queueNumber: 8,
    waitTime: "-",
  },
  {
    id: "4",
    date: new Date("2026-02-05"),
    service: "Dental Checkup",
    doctor: "Dr. Peter Kimani",
    status: "completed",
    queueNumber: 2,
    waitTime: "10 min",
  },
];

export default function VisitHistory() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      case "no-show":
        return "#9E9E9E";
      default:
        return "#666";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "no-show":
        return "No Show";
      default:
        return status;
    }
  };

  const renderHistoryItem = ({ item }: { item: VisitHistoryItem }) => (
    <Card style={styles.historyCard}>
      <Card.Content>
        <View style={styles.headerRow}>
          <View>
            <Text variant="titleMedium" style={styles.service}>
              {item.service}
            </Text>
            <Text variant="bodySmall" style={styles.doctor}>
              {item.doctor}
            </Text>
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {getStatusLabel(item.status)}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text variant="bodySmall" style={styles.detailLabel}>
              Date
            </Text>
            <Text variant="bodyMedium">
              {format(item.date, "MMM d, yyyy")}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text variant="bodySmall" style={styles.detailLabel}>
              Queue #
            </Text>
            <Text variant="bodyMedium">{item.queueNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text variant="bodySmall" style={styles.detailLabel}>
              Wait Time
            </Text>
            <Text variant="bodyMedium">{item.waitTime}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mockHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Text variant="bodyMedium" style={styles.summary}>
            Showing {mockHistory.length} recent visits
          </Text>
        }
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
  listContainer: {
    paddingBottom: 16,
  },
  summary: {
    marginBottom: 12,
    color: "#666",
  },
  historyCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  service: {
    fontWeight: "bold",
  },
  doctor: {
    color: "#666",
    marginTop: 2,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
  },
  divider: {
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    color: "#666",
    marginBottom: 4,
  },
});
