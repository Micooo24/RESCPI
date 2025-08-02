import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import baseURL from '../assets/common/baseURL';

const { width } = Dimensions.get('window');

const LandslideScreen = ({ navigation }) => {
  const [servo1, setServo1] = useState(1);
  const [servo2, setServo2] = useState(1);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState('');

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${baseURL}/landslide/all`);
      const logList = response.data?.data || [];

      if (logList.length > 0) {
        setLogs(logList);

        const latest = logList[0];
        const servo1Off = latest.servo1 === 0;
        const servo2Off = latest.servo2 === 0;

        let newMessage = '';

        if (servo1Off && servo2Off) {
          newMessage = '🔴 Both OFF → 🚨 Alert: Landslide Detected, Rescue is on the way!';
        } else if (servo1Off || servo2Off) {
          newMessage = '🟠 One OFF → ⚠️ Warning: Landslide Movement Detected';
        }

        if (newMessage && newMessage !== lastMessage) {
          console.log('Alert Message:', newMessage);
          Alert.alert('Landslide Alert', newMessage);
          setLastMessage(newMessage);
        } else if (!newMessage && lastMessage) {
          setLastMessage('');
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      Alert.alert('Error', 'Failed to fetch landslide data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const toggleServo = async (servoNumber, action) => {
    setButtonLoading(true);
    try {
      await axios.post(`${baseURL}/landslide/servo/${servoNumber}/${action}`);

      // Update local state immediately
      let nextServo1 = servo1;
      let nextServo2 = servo2;
      if (servoNumber === 1) nextServo1 = action === 'on' ? 1 : 0;
      if (servoNumber === 2) nextServo2 = action === 'on' ? 1 : 0;
      setServo1(nextServo1);
      setServo2(nextServo2);

      // Show appropriate alert
      if (nextServo1 === 0 && nextServo2 === 0) {
        Alert.alert('🚨 ALERT', '🔴 Both OFF → Landslide Detected, Rescue is on the way!');
      } else if (nextServo1 === 0 || nextServo2 === 0) {
        Alert.alert('⚠️ WARNING', '🟠 One OFF → Landslide Movement Detected');
      }

      // Fetch updated logs
      fetchLogs();
    } catch (error) {
      console.error(`Failed to toggle Servo ${servoNumber}:`, error);
      Alert.alert('Error', 'Failed to toggle servo.');
    } finally {
      setButtonLoading(false);
    }
  };

  const ServoButton = ({ servoNumber, action, title, colors, iconName, disabled }) => (
    <TouchableOpacity
      style={[
        styles.servoButton,
        disabled && styles.disabledButton
      ]}
      onPress={() => toggleServo(servoNumber, action)}
      disabled={disabled || buttonLoading}
    >
      <LinearGradient
        colors={disabled ? ['#ccc', '#aaa'] : colors}
        style={styles.servoButtonGradient}
      >
        {buttonLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Ionicons name={iconName} size={20} color="white" />
        )}
        <Text style={styles.servoButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const StatusCard = ({ servo1Status, servo2Status }) => {
    let statusColor = '#4caf50';
    let statusText = 'All Systems Normal';
    let statusIcon = 'checkmark-circle';

    if (servo1Status === 0 && servo2Status === 0) {
      statusColor = '#f44336';
      statusText = '🚨 ALERT: Landslide Detected!';
      statusIcon = 'warning';
    } else if (servo1Status === 0 || servo2Status === 0) {
      statusColor = '#ff9800';
      statusText = '⚠️ WARNING: Movement Detected';
      statusIcon = 'alert-circle';
    }

    return (
      <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
        <View style={styles.statusCardContent}>
          <Ionicons name={statusIcon} size={24} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>
    );
  };

  const LogItem = ({ item, index }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logStatus}>Status: {item.status}</Text>
        <Text style={styles.logTime}>
          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.logData}>
        <Text style={styles.logText}>X: {item.accel_x}</Text>
        <Text style={styles.logText}>Y: {item.accel_y}</Text>
        <Text style={styles.logText}>Z: {item.accel_z}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#795548" />
          <Text style={styles.loadingText}>Loading Landslide Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#795548" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="triangle" size={32} color="#795548" />
          <Text style={styles.headerTitle}>Landslide Dashboard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Card */}
        <View style={styles.statusContainer}>
          <StatusCard servo1Status={servo1} servo2Status={servo2} />
        </View>

        {/* Servo Status Cards */}
        <View style={styles.servoStatusContainer}>
          <View style={[styles.servoStatusCard, { borderLeftColor: servo1 === 1 ? '#4caf50' : '#f44336' }]}>
            <View style={styles.servoStatusContent}>
              <Ionicons 
                name={servo1 === 1 ? 'checkmark-circle' : 'close-circle'} 
                size={24} 
                color={servo1 === 1 ? '#4caf50' : '#f44336'} 
              />
              <View style={styles.servoStatusText}>
                <Text style={styles.servoStatusTitle}>Servo 1</Text>
                <Text style={[styles.servoStatusValue, { color: servo1 === 1 ? '#4caf50' : '#f44336' }]}>
                  {servo1 === 1 ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.servoStatusCard, { borderLeftColor: servo2 === 1 ? '#4caf50' : '#f44336' }]}>
            <View style={styles.servoStatusContent}>
              <Ionicons 
                name={servo2 === 1 ? 'checkmark-circle' : 'close-circle'} 
                size={24} 
                color={servo2 === 1 ? '#4caf50' : '#f44336'} 
              />
              <View style={styles.servoStatusText}>
                <Text style={styles.servoStatusTitle}>Servo 2</Text>
                <Text style={[styles.servoStatusValue, { color: servo2 === 1 ? '#4caf50' : '#f44336' }]}>
                  {servo2 === 1 ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Servo Control Buttons */}
        <View style={styles.buttonsContainer}>
          <Text style={styles.sectionTitle}>Servo Controls</Text>
          
          <View style={styles.buttonRow}>
            <ServoButton
              servoNumber={1}
              action="on"
              title="Turn ON Servo 1"
              colors={['#4caf50', '#388e3c']}
              iconName="play-circle"
              disabled={buttonLoading}
            />
            <ServoButton
              servoNumber={1}
              action="off"
              title="Turn OFF Servo 1"
              colors={['#f44336', '#d32f2f']}
              iconName="stop-circle"
              disabled={buttonLoading}
            />
          </View>

          <View style={styles.buttonRow}>
            <ServoButton
              servoNumber={2}
              action="on"
              title="Turn ON Servo 2"
              colors={['#2196f3', '#1976d2']}
              iconName="play-circle"
              disabled={buttonLoading}
            />
            <ServoButton
              servoNumber={2}
              action="off"
              title="Turn OFF Servo 2"
              colors={['#9c27b0', '#7b1fa2']}
              iconName="stop-circle"
              disabled={buttonLoading}
            />
          </View>
        </View>

        {/* Logs Section */}
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Ionicons name="list" size={24} color="#795548" />
            <Text style={styles.logsTitle}>Activity Logs</Text>
          </View>
          
          {logs.length > 0 ? (
            <FlatList
              data={logs.slice(0, 10)} // Show latest 10 logs
              keyExtractor={(item, index) => `${item._id || index}`}
              renderItem={({ item, index }) => <LogItem item={item} index={index} />}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noLogsContainer}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.noLogsText}>No logs available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  servoStatusContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  servoStatusCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  servoStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servoStatusText: {
    marginLeft: 12,
  },
  servoStatusTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  servoStatusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  servoButton: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  servoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  servoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  logsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  logItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  logTime: {
    fontSize: 10,
    color: '#666',
  },
  logData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logText: {
    fontSize: 12,
    color: '#333',
  },
  noLogsContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noLogsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default LandslideScreen;