import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Badge, FAB } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  receiverName: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'normal' | 'urgent';
}

interface Staff {
  id: string;
  name: string;
  role: string;
  department?: string;
}

const TOKEN_KEY = 'auth_token';

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Staff | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    fetchMessages();
    fetchStaff();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStaff(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedRecipient || !subject || !content) {
      return;
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedRecipient.id,
          subject,
          content,
          priority: 'normal',
        }),
      });

      if (response.ok) {
        setShowCompose(false);
        setSelectedRecipient(null);
        setSubject('');
        setContent('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      await fetch(`${API_URL}/api/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const filteredMessages = filter === 'unread' 
    ? messages.filter((m) => !m.isRead)
    : messages;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return '#2196F3';
      case 'nurse':
        return '#9C27B0';
      case 'receptionist':
        return '#FF9800';
      case 'admin':
        return '#607D8B';
      default:
        return '#9E9E9E';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity onPress={() => !item.isRead && markAsRead(item.id)}>
      <Card style={[styles.messageCard, !item.isRead && styles.unreadCard]}>
        <Card.Content>
          <View style={styles.messageHeader}>
            <View style={styles.senderInfo}>
              <View style={[styles.avatar, { backgroundColor: getRoleColor(item.senderRole) }]}>
                <Text style={styles.avatarText}>
                  {item.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.senderText}>
                <Text style={[styles.senderName, !item.isRead && styles.unreadText]}>
                  {item.senderName}
                </Text>
                <Text style={styles.senderRole}>{item.senderRole}</Text>
              </View>
            </View>
            <View style={styles.messageMeta}>
              {item.priority === 'urgent' && (
                <Badge style={styles.urgentBadge}>Urgent</Badge>
              )}
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          </View>
          
          <Text style={[styles.subject, !item.isRead && styles.unreadText]} numberOfLines={1}>
            {item.subject}
          </Text>
          <Text style={styles.content} numberOfLines={2}>
            {item.content}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderComposeModal = () => (
    <View style={styles.composeContainer}>
      <View style={styles.composeHeader}>
        <Text style={styles.composeTitle}>New Message</Text>
        <TouchableOpacity onPress={() => setShowCompose(false)}>
          <Text style={styles.closeButton}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.composeForm}>
        <Text style={styles.inputLabel}>To:</Text>
        <FlatList
          horizontal
          data={staff}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.recipientChip,
                selectedRecipient?.id === item.id && styles.recipientChipSelected,
              ]}
              onPress={() => setSelectedRecipient(item)}
            >
              <Text
                style={[
                  styles.recipientChipText,
                  selectedRecipient?.id === item.id && styles.recipientChipTextSelected,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.recipientList}
        />

        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />

        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="Message"
          value={content}
          onChangeText={setContent}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedRecipient || !subject || !content) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!selectedRecipient || !subject || !content}
        >
          <Text style={styles.sendButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Badge style={styles.unreadBadge}>{unreadCount}</Badge>
        </View>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showCompose && renderComposeModal()}

      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchMessages}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Messages from other staff members will appear here
              </Text>
            </Card.Content>
          </Card>
        }
      />

      {!showCompose && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowCompose(true)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1E40AF',
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#EF5350',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterTabActive: {
    backgroundColor: 'white',
  },
  filterTabText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#1E40AF',
  },
  listContent: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 12,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  senderText: {
    marginLeft: 12,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  senderRole: {
    fontSize: 12,
    color: '#666',
  },
  unreadText: {
    fontWeight: '700',
  },
  messageMeta: {
    alignItems: 'flex-end',
  },
  urgentBadge: {
    backgroundColor: '#EF5350',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  subject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyContent: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1E40AF',
  },
  composeContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    elevation: 4,
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  composeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    color: '#1E40AF',
    fontSize: 16,
  },
  composeForm: {},
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recipientList: {
    marginBottom: 16,
  },
  recipientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  recipientChipSelected: {
    backgroundColor: '#1E40AF',
  },
  recipientChipText: {
    fontSize: 14,
    color: '#666',
  },
  recipientChipTextSelected: {
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  contentInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#1E40AF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
