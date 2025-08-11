import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import baseURL from '../assets/common/baseURL';

const { width } = Dimensions.get('window');

// Flood detection thresholds (IMMEDIATE RESCUE)
const FLOOD_DETECTION = {
  WARNING_LITERS_THRESHOLD: 1,
  CRITICAL_LITERS_THRESHOLD: 2,
  RESCUE_COOLDOWN: 30000,
};

const FloodScreen = ({ navigation }) => {
  const [floodData, setFloodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Auto-rescue states
  const [autoRescueTriggered, setAutoRescueTriggered] = useState(false);
  const [autoRescueCompleted, setAutoRescueCompleted] = useState(false);
  const [criticalFloodDetected, setCriticalFloodDetected] = useState(false);
  const [lastAutoRescueTime, setLastAutoRescueTime] = useState(0);
  
  const wsRef = useRef(null);
  const hasTriggeredAutoRescue = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket URL
  const WS_URL = 'ws://10.16.180.193:5000/flood/ws/frontend';

  // Auto rescue activation function (ONE-TIME ONLY)
  const triggerAutoRescue = async (reason) => {
    if (hasTriggeredAutoRescue.current || autoRescueCompleted) {
      console.log('Auto-rescue already triggered - ONE-TIME ONLY');
      return;
    }

    const now = Date.now();
    if (now - lastAutoRescueTime < FLOOD_DETECTION.RESCUE_COOLDOWN) {
      console.log('Auto-rescue in cooldown period');
      return;
    }

    console.log(`🚨 AUTO-TRIGGERING FLOOD RESCUE IMMEDIATELY: ${reason}`);
    
    hasTriggeredAutoRescue.current = true;
    setAutoRescueCompleted(true);
    
    try {
      setRescueLoading(true);
      setAutoRescueTriggered(true);
      setLastAutoRescueTime(now);
      
      Alert.alert(
        '🚨 FLOOD EMERGENCY',
        `Auto-activating rescue vehicle IMMEDIATELY!\nReason: ${reason}`,
        [{ text: 'OK' }]
      );

      const response = await axios.post(`${baseURL}/rescue/flood/on`);
      
      if (response.data.status === 'success') {
        setRescueActive(true);
        console.log('✅ Auto-rescue vehicle activated successfully');
        
        Alert.alert(
          'Success',
          '✅ Flood rescue vehicle automatically activated IMMEDIATELY! (One-time trigger)',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('API returned non-success status');
      }
      
    } catch (error) {
      console.error('❌ Auto-rescue activation failed:', error);
      Alert.alert('Error', '❌ Failed to auto-activate rescue vehicle');
      hasTriggeredAutoRescue.current = false;
      setAutoRescueCompleted(false);
    } finally {
      setRescueLoading(false);
      setTimeout(() => setAutoRescueTriggered(false), 5000);
    }
  };

  // Critical flood detection logic (IMMEDIATE TRIGGER)
  const detectCriticalFlood = (liters) => {
    const isCritical = liters !== null && liters !== undefined && liters >= FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD;
    
    if (isCritical && !criticalFloodDetected && !autoRescueCompleted) {
      setCriticalFloodDetected(true);
      const reason = `Critical flood level: ${liters}L water volume (≥${FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L)`;
      console.log(`🚨 CRITICAL FLOOD DETECTED - TRIGGERING IMMEDIATE RESCUE: ${reason}`);
      triggerAutoRescue(reason);
    } else if (!isCritical && criticalFloodDetected && !autoRescueCompleted) {
      setCriticalFloodDetected(false);
      console.log('✅ Critical flood conditions cleared before auto-rescue trigger');
    }
    
    if (isCritical && autoRescueCompleted) {
      setCriticalFloodDetected(true);
      console.log('🚨 Critical flood continues - auto-rescue already completed');
    }
    
    return isCritical;
  };

  // Reset auto-rescue system
  const resetAutoRescueSystem = () => {
    hasTriggeredAutoRescue.current = false;
    setAutoRescueCompleted(false);
    setCriticalFloodDetected(false);
    setAutoRescueTriggered(false);
    
    console.log('🔄 Flood auto-rescue system reset');
    Alert.alert('Success', '🔄 Flood auto-rescue system reset - IMMEDIATE trigger re-enabled');
  };

  // Emergency stop rescue
  const emergencyStopRescue = async () => {
    setRescueLoading(true);
    
    try {
      const response = await axios.post(`${baseURL}/rescue/off`);
      
      if (response.data.status === 'success') {
        setRescueActive(false);
        Alert.alert('Success', '🛑 Emergency Stop: Rescue vehicle deactivated!');
        console.log('✅ Emergency stop: Rescue vehicle deactivated');
      } else {
        Alert.alert('Error', '⚠️ Failed to emergency stop rescue vehicle');
      }
    } catch (error) {
      console.error('❌ Error emergency stopping rescue vehicle:', error);
      Alert.alert('Error', '❌ Emergency stop failed');
    } finally {
      setRescueLoading(false);
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected to flood monitoring');
        setWsConnected(true);
        reconnectAttempts.current = 0;
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            wsRef.current.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'sensor' || data.distance !== undefined || data.liters !== undefined) {
            const newFloodData = {
              ...data,
              timestamp: data.timestamp || new Date().toISOString()
            };
            setFloodData(newFloodData);
            
            // Check for critical flood detection using LITERS
            if (data.liters !== undefined) {
              detectCriticalFlood(data.liters);
            }
            
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setWsConnected(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, 3000);
        } else {
          fetchFloodDataREST();
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setWsConnected(false);
    }
  };

  // Fallback REST API fetch
  const fetchFloodDataREST = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/flood/latest`);
      if (response.data.status === 'success') {
        const newFloodData = response.data.data;
        setFloodData(newFloodData);
        
        if (newFloodData.liters !== undefined) {
          detectCriticalFlood(newFloodData.liters);
        }
      } else {
        setFloodData(null);
      }
    } catch (error) {
      console.error('Error fetching flood data via REST:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    connectWebSocket();
    
    setTimeout(() => {
      if (!wsConnected && !floodData) {
        fetchFloodDataREST();
      }
    }, 5000);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (wsConnected) {
      wsRef.current.close();
      setTimeout(() => connectWebSocket(), 1000);
    } else {
      fetchFloodDataREST();
    }
  };

  // Toggle pump
  const togglePump = async () => {
    if (!floodData) return;
    setButtonLoading(true);
    const isPumpOn = floodData.pump === 'ON';
    const url = isPumpOn ? `${baseURL}/flood/control/off` : `${baseURL}/flood/control/on`;

    try {
      const response = await axios.post(url);
      if (response.data.status === 'success') {
        Alert.alert('Success', `Pump turned ${isPumpOn ? 'OFF' : 'ON'}`);
        
        if (!wsConnected) {
          setTimeout(() => fetchFloodDataREST(), 500);
        }
      } else {
        Alert.alert('Error', 'Failed to toggle pump');
      }
    } catch (error) {
      Alert.alert('Error', 'Error toggling pump');
      console.error(error);
    } finally {
      setButtonLoading(false);
    }
  };

  // Manual rescue control
  const handleRescueClick = async () => {
    setRescueLoading(true);
    const actionUrl = rescueActive ? `${baseURL}/rescue/off` : `${baseURL}/rescue/flood/on`;

    try {
      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        Alert.alert('Success', `🚑 Flood Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'} (Manual Override)`);
      } else {
        Alert.alert('Error', '⚠️ Failed to control rescue vehicle');
      }
    } catch (error) {
      console.error('❌ Error toggling rescue vehicle:', error);
      Alert.alert('Error', 'Error controlling rescue vehicle');
    } finally {
      setRescueLoading(false);
    }
  };

  // Get alert status based on LITERS
  const getAlertStatus = (liters) => {
    if (liters === null || liters === undefined) return 'unknown';
    if (liters >= FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD) return 'critical';
    if (liters >= FLOOD_DETECTION.WARNING_LITERS_THRESHOLD) return 'warning';
    return 'normal';
  };

  const getSeverityColor = (status) => {
    switch (status) {
      case 'critical': return '#DC143C';
      case 'warning': return '#ff9800';
      case 'normal': return '#4caf50';
      default: return '#999999';
    }
  };

  const StatCard = ({ title, value, colors, icon }) => (
    <View style={styles.statCardContainer}>
      <LinearGradient colors={colors} style={styles.statCard}>
        <Ionicons name={icon} size={24} color="white" style={styles.statIcon} />
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>Loading Flood Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2196f3" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="water" size={28} color="#2196f3" />
          <Text style={styles.headerTitle}>Flood Dashboard</Text>
        </View>
        <View style={[styles.connectionDot, { backgroundColor: wsConnected ? '#4caf50' : '#f44336' }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            🔗 {wsConnected ? 'Connected' : 'Disconnected'} | 🚗 Rescue: {rescueActive ? 'ACTIVE' : 'STANDBY'}
          </Text>
        </View>

        {/* Auto-rescue alerts */}
        {autoRescueTriggered && (
          <View style={styles.criticalAlert}>
            <Ionicons name="warning" size={32} color="#fff" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>🚨 CRITICAL FLOOD!</Text>
              <Text style={styles.alertText}>Rescue vehicle activated IMMEDIATELY!</Text>
            </View>
          </View>
        )}

        {autoRescueCompleted && !autoRescueTriggered && (
          <View style={styles.completedAlert}>
            <Ionicons name="checkmark-circle" size={32} color="#fff" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>✅ AUTO-RESCUE COMPLETED</Text>
              <Text style={styles.alertText}>Vehicle activated, remains active during critical conditions</Text>
              <TouchableOpacity onPress={resetAutoRescueSystem} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>RESET SYSTEM</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Latest Data Card */}
        {floodData && (
          <View style={styles.latestDataCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current Status</Text>
              <View style={[styles.severityBadge, { 
                backgroundColor: getSeverityColor(getAlertStatus(floodData.liters)) 
              }]}>
                <Text style={styles.severityText}>
                  {getAlertStatus(floodData.liters).toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Water Volume</Text>
                <Text style={styles.dataValue}>{floodData.liters ?? 0} L</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Distance</Text>
                <Text style={styles.dataValue}>{floodData.distance} cm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Pump Status</Text>
                <Text style={[styles.dataValue, { color: floodData.pump === 'ON' ? '#4caf50' : '#f44336' }]}>
                  {floodData.pump || 'OFF'}
                </Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Mode</Text>
                <Text style={styles.dataValue}>{floodData.mode || 'AUTO'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Warning Level"
            value={`≥${FLOOD_DETECTION.WARNING_LITERS_THRESHOLD}L`}
            colors={['#ff9800', '#f57c00']}
            icon="warning"
          />
          <StatCard
            title="Critical Level"
            value={`≥${FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L`}
            colors={['#f44336', '#d32f2f']}
            icon="alert"
          />
          <StatCard
            title="Auto-Rescue"
            value={autoRescueCompleted ? 'DONE' : 'READY'}
            colors={autoRescueCompleted ? ['#4caf50', '#388e3c'] : ['#2196f3', '#1976d2']}
            icon={autoRescueCompleted ? "checkmark-circle" : "rocket"}
          />
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {/* Pump Control */}
          <TouchableOpacity
            style={[styles.actionButton, { 
              backgroundColor: floodData?.pump === 'ON' ? '#f44336' : '#4caf50' 
            }]}
            onPress={togglePump}
            disabled={buttonLoading}
          >
            {buttonLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name={floodData?.pump === 'ON' ? "stop" : "play"} size={20} color="white" />
                <Text style={styles.buttonText}>
                  {floodData?.pump === 'ON' ? 'Turn Pump OFF' : 'Turn Pump ON'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Rescue Control - Show when critical */}
          {getAlertStatus(floodData?.liters) === 'critical' && (
            <TouchableOpacity
              style={[styles.actionButton, { 
                backgroundColor: rescueActive ? '#f44336' : '#2196f3' 
              }]}
              onPress={handleRescueClick}
              disabled={rescueLoading}
            >
              {rescueLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name={rescueActive ? "stop" : "car"} size={20} color="white" />
                  <Text style={styles.buttonText}>
                    {rescueActive ? 'Stop Rescue' : 'Deploy Rescue'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Emergency Stop - Always show when rescue active */}
          {rescueActive && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#DC143C' }]}
              onPress={emergencyStopRescue}
              disabled={rescueLoading}
            >
              {rescueLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="hand-left" size={20} color="white" />
                  <Text style={styles.buttonText}>Emergency Stop</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Auto-Rescue Status Info */}
        <View style={styles.statusInfoCard}>
          <Text style={styles.statusInfoTitle}>🤖 Auto-Rescue System</Text>
          <View style={styles.statusInfoGrid}>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Status:</Text>
              <Text style={styles.statusInfoValue}>
                {autoRescueCompleted ? '✅ COMPLETED' : 
                 criticalFloodDetected ? '🔴 ARMED' : '🟢 MONITORING'}
              </Text>
            </View>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Trigger:</Text>
              <Text style={styles.statusInfoValue}>≥{FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L (IMMEDIATE)</Text>
            </View>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Current:</Text>
              <Text style={styles.statusInfoValue}>{floodData?.liters || 0}L</Text>
            </View>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Last Trigger:</Text>
              <Text style={styles.statusInfoValue}>
                {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9E3DF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#465C88',
    fontFamily: 'Poppins',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusBar: {
    backgroundColor: '#465C88',
    padding: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC143C',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
  },
  completedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196f3',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertText: {
    color: '#fff',
    fontSize: 14,
  },
  resetButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  latestDataCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataItem: {
    width: '48%',
    marginBottom: 12,
  },
  dataLabel: {
    fontSize: 12,
    color: '#465C88',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  statCardContainer: {
    flex: 1,
  },
  statCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  statIcon: {
    marginBottom: 4,
  },
  statTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusInfoCard: {
    margin: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  statusInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 12,
  },
  statusInfoGrid: {
    gap: 8,
  },
  statusInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusInfoLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  statusInfoValue: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
});

export default FloodScreen;