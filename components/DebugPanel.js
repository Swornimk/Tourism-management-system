import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../config/socketService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DebugPanel = ({ visible, onClose }) => {
  const [socketStatus, setSocketStatus] = useState('Unknown');
  const [deviceId, setDeviceId] = useState('Unknown');
  const [userId, setUserId] = useState('Unknown');
  const [pushToken, setPushToken] = useState('Unknown');
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (!visible) return;
    
    // Load data when component becomes visible
    const loadData = async () => {
      try {
        // Get device ID
        const savedDeviceId = await AsyncStorage.getItem('deviceId');
        setDeviceId(savedDeviceId || 'Not set');
        
        // Get user ID
        const savedUserId = await AsyncStorage.getItem('userId');
        setUserId(savedUserId || 'Not set');
        
        // Get push token
        const token = await AsyncStorage.getItem('expoPushToken');
        setPushToken(token || 'Not set');
        
        // Check socket status
        const socket = socketService.socket;
        setSocketStatus(socket ? (socket.connected ? 'Connected' : 'Disconnected') : 'Not initialized');
        
        // Setup event monitoring
        if (socket) {
          // Clear existing event handlers
          socket.off('tripApproved.debug');
          socket.off('tripRejected.debug');
          socket.off('globalTripStatusUpdate.debug');
          socket.off('connect.debug');
          socket.off('disconnect.debug');
          
          // Add debug event handlers
          socket.on('tripApproved', (data) => {
            addEvent('tripApproved', data);
          });
          
          socket.on('tripRejected', (data) => {
            addEvent('tripRejected', data);
          });
          
          socket.on('globalTripStatusUpdate', (data) => {
            addEvent('globalTripStatusUpdate', data);
          });
          
          socket.on('connect', () => {
            setSocketStatus('Connected');
            addEvent('connect', { socketId: socket.id });
          });
          
          socket.on('disconnect', () => {
            setSocketStatus('Disconnected');
            addEvent('disconnect', { reason: 'Socket disconnected' });
          });
        }
      } catch (error) {
        console.error('Error in DebugPanel:', error);
      }
    };
    
    loadData();
    
    // Return cleanup function
    return () => {
      if (socketService.socket) {
        socketService.socket.off('tripApproved.debug');
        socketService.socket.off('tripRejected.debug');
        socketService.socket.off('globalTripStatusUpdate.debug');
        socketService.socket.off('connect.debug');
        socketService.socket.off('disconnect.debug');
      }
    };
  }, [visible]);
  
  const addEvent = (type, data) => {
    const newEvent = {
      id: Date.now(),
      type,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString()
    };
    
    setEvents(prev => [newEvent, ...prev].slice(0, 10)); // Keep last 10 events
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Connected': return '#2ecc71';
      case 'Disconnected': return '#e74c3c';
      default: return '#f1c40f';
    }
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Socket Information</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, { color: getStatusColor(socketStatus) }]}>
                {socketStatus}
              </Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Information</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Device ID:</Text>
              <Text style={styles.infoValue}>{deviceId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>User ID:</Text>
              <Text style={styles.infoValue}>{userId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Push Token:</Text>
              <Text style={styles.infoValue}>{pushToken}</Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Socket Events</Text>
            {events.length === 0 ? (
              <Text style={styles.noEvents}>No events yet</Text>
            ) : (
              events.map(event => (
                <View key={event.id} style={styles.event}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventType}>{event.type}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.eventData}>{event.data}</Text>
                </View>
              ))
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.reconnectButton]}
                onPress={async () => {
                  await socketService.initSocket();
                  setSocketStatus(socketService.socket?.connected ? 'Connected' : 'Disconnected');
                  addEvent('manual', { action: 'Socket reconnect attempted' });
                }}
              >
                <Text style={styles.buttonText}>Reconnect Socket</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.clearButton]}
                onPress={() => {
                  setEvents([]);
                }}
              >
                <Text style={styles.buttonText}>Clear Events</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 16,
    paddingTop: 50,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#aaa',
    width: 90,
  },
  infoValue: {
    color: '#fff',
    flex: 1,
  },
  event: {
    backgroundColor: '#444',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventType: {
    color: '#61dafb',
    fontWeight: 'bold',
  },
  eventTime: {
    color: '#aaa',
    fontSize: 12,
  },
  eventData: {
    color: '#eee',
    fontSize: 12,
  },
  noEvents: {
    color: '#aaa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 12,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  reconnectButton: {
    backgroundColor: '#3498db',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default DebugPanel; 