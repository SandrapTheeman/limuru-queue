import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Animated } from "react-native";
import { Card, Text, Chip, Button, FAB, ActivityIndicator, Divider } from "react-native-paper";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { TicketDisplay } from "../../components/TicketDisplay";

interface QueueItem {
  id: string;
  position: number;
  name: string;
  service: string;
  estimatedTime: string;
  status: "waiting" | "called" | "served";
}

interface MyQueueData {
  ticketNumber: string;
  position: number;
  estimatedWait: number;
  department: string;
  status: "waiting" | "called" | "serving" | "completed";
  createdAt: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const myQueueData: MyQueueData = {
    ticketNumber: "A012",
    position: 2,
    estimatedWait: 15,
    department: "General Medicine",
    status: "waiting",
    createdAt: new Date().toISOString(),
  };

  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (myQueueData.status === 'called') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return () => pulse.stop();
    }
  }, [myQueueData.status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

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
    <Card 
      style={styles.queueCard}
      accessibilityRole="none"
    >
      <Card.Content style={styles.queueContent}>
        <View style={styles.queueLeft}>
          <Text 
            variant="titleLarge" 
            style={styles.position}
            accessibilityRole="text"
            accessibilityLabel={`Position ${item.position}`}
          >
            #{item.position}
          </Text>
          <Text 
            variant="bodyMedium"
            accessibilityLabel={`Patient: ${item.name}`}
          >
            {item.name}
          </Text>
          <Text 
            variant="bodySmall" 
            style={styles.service}
            accessibilityLabel={`Service: ${item.service}`}
          >
            {item.service}
          </Text>
        </View>
        <View style={styles.queueRight}>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
            accessibilityRole="text"
            accessibilityLabel={`Status: ${getStatusLabel(item.status)}`}
          >
            {getStatusLabel(item.status)}
          </Chip>
          <Text 
            variant="bodySmall" 
            style={styles.time}
            accessibilityLabel={`Estimated time: ${item.estimatedTime}`}
          >
            Est. {item.estimatedTime}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <TicketDisplay ticketData={myQueueData} />

      <Divider style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text 
          variant="titleMedium" 
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Queue List
        </Text>
        <Text style={styles.queueCount}>
          {mockQueue.length} patients ahead
        </Text>
      </View>

      <FlatList
        data={mockQueue}
        renderItem={renderQueueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1E40AF"]}
            tintColor="#1E40AF"
          />
        }
        accessibilityLabel="Queue list"
        accessibilityHint="Pull to refresh the queue"
      />

      <FAB
        icon="bell-ring"
        label="Remind Me"
        onPress={async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        style={styles.fab}
        accessibilityLabel="Set reminder notification"
        accessibilityHint="Get notified when your turn is near"
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
  divider: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: '#333',
  },
  queueCount: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 80,
  },
  queueCard: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
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
