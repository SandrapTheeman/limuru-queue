import { useState, useEffect } from 'react';
import { View, StyleSheet, Share, Alert, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button, ActivityIndicator, TextInput, Divider } from 'react-native-paper';

interface TicketData {
  ticketNumber: string;
  position: number;
  department: string;
  status: 'waiting' | 'called' | 'serving' | 'completed';
  estimatedWait: number;
  patientName: string;
  createdAt: string;
}

interface TicketDisplayProps {
  ticketData: TicketData;
  compact?: boolean;
}

export function TicketDisplay({ ticketData, compact = false }: TicketDisplayProps) {
  const [copying, setCopying] = useState(false);

  const getStatusColor = () => {
    switch (ticketData.status) {
      case 'waiting':
        return '#FFA726';
      case 'called':
        return '#42A5F5';
      case 'serving':
        return '#66BB6A';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = () => {
    switch (ticketData.status) {
      case 'waiting':
        return 'In Queue';
      case 'called':
        return 'Your Turn!';
      case 'serving':
        return 'Being Served';
      case 'completed':
        return 'Completed';
      default:
        return ticketData.status;
    }
  };

  const handleCopyNumber = async () => {
    setCopying(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await SecureStore.setItemAsync('current_ticket', JSON.stringify(ticketData));
      Alert.alert('Copied', 'Ticket number copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    } finally {
      setCopying(false);
    }
  };

  const handleShareTicket = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const message = `My Limuru Hospital Queue Ticket\n\nTicket: ${ticketData.ticketNumber}\nPosition: #${ticketData.position}\nDepartment: ${ticketData.department}\nEstimated Wait: ${ticketData.estimatedWait} minutes\n\nShared from Limuru Queue App`;
    
    try {
      const result = await Share.share({
        message,
        title: 'My Queue Ticket',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleShareToWhatsApp = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const message = `My Limuru Hospital Queue Ticket\n\nTicket: ${ticketData.ticketNumber}\nPosition: #${ticketData.position}\nDepartment: ${ticketData.department}\nEstimated Wait: ${ticketData.estimatedWait} minutes`;
    const encodedMessage = encodeURIComponent(message);
    
    const whatsappUrl = Platform.OS === 'ios'
      ? `whatsapp://send?text=${encodedMessage}`
      : `whatsapp://send?text=${encodedMessage}`;
    
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to share your ticket.');
    }
  };

  const handleShareToSMS = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const message = `My Limuru Hospital Queue Ticket - Ticket: ${ticketData.ticketNumber}, Position: #${ticketData.position}, Dept: ${ticketData.department}`;
    const smsUrl = Platform.OS === 'ios'
      ? `sms:&body=${encodeURIComponent(message)}`
      : `sms:?body=${encodeURIComponent(message)}`;
    
    await Linking.openURL(smsUrl);
  };

  if (compact) {
    return (
      <Card style={styles.compactCard}>
        <Card.Content style={styles.compactContent}>
          <View style={styles.compactLeft}>
            <Text style={styles.compactTicketNumber}>{ticketData.ticketNumber}</Text>
            <Text style={styles.compactDepartment}>{ticketData.department}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Ticket</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
        </View>

        <View style={styles.ticketContainer}>
          <Text style={styles.ticketNumber}>{ticketData.ticketNumber}</Text>
          <Text style={styles.ticketLabel}>Ticket Number</Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Position</Text>
            <Text style={styles.detailValue}>#{ticketData.position}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Est. Wait</Text>
            <Text style={styles.detailValue}>{ticketData.estimatedWait} min</Text>
          </View>
        </View>

        <View style={styles.departmentContainer}>
          <Text style={styles.departmentLabel}>Department</Text>
          <Text style={styles.departmentValue}>{ticketData.department}</Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            icon="content-copy"
            onPress={handleCopyNumber}
            loading={copying}
            style={styles.actionButton}
          >
            Save Ticket
          </Button>
          
          <Button
            mode="contained"
            icon="share"
            onPress={handleShareTicket}
            style={[styles.actionButton, styles.shareButton]}
          >
            Share
          </Button>
        </View>

        <View style={styles.shareOptions}>
          <Text style={styles.shareOptionsLabel}>Share via:</Text>
          <View style={styles.shareButtons}>
            <Button
              mode="outlined"
              icon="whatsapp"
              onPress={handleShareToWhatsApp}
              style={styles.whatsappButton}
              labelStyle={styles.whatsappLabel}
            >
              WhatsApp
            </Button>
            <Button
              mode="outlined"
              icon="message-text"
              onPress={handleShareToSMS}
              style={styles.smsButton}
              labelStyle={styles.smsLabel}
            >
              SMS
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
  },
  ticketNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E40AF',
    letterSpacing: 4,
  },
  ticketLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  departmentContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  departmentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  departmentValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  shareOptions: {
    alignItems: 'center',
  },
  shareOptionsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  whatsappButton: {
    borderColor: '#25D366',
    minWidth: 120,
  },
  whatsappLabel: {
    color: '#25D366',
  },
  smsButton: {
    borderColor: '#1E40AF',
    minWidth: 80,
  },
  smsLabel: {
    color: '#1E40AF',
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeft: {
    flex: 1,
  },
  compactTicketNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  compactDepartment: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
