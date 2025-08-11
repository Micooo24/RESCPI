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

const FireScreen = ({ navigation }) => {
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [latestData, setLatestData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [autoFireRescueTriggered, setAutoFireRescueTriggered] = useState(false);
  const [fireDetected, setFireDetected] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState('OFF');
  
  const wsRef = useRef(null);
  const hasTriggeredFireRescue = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket URL
  const WS_URL = 'ws://10.16.180.193:5000/gasfire/ws/frontend';

  // Auto fire rescue function
  const triggerAutoFireRescue = async (reason) => {
    if (hasTriggeredFireRescue.current) return;
    hasTriggeredFireRescue.current = true;
    setAutoFireRescueTriggered(true);
    
    try {
      const response = await axios.post(`${baseURL}/rescue/vehicle/on`);
      if (response.data.status === 'success') {
        setRescueActive(true);
        setVehicleStatus('ON');
        Alert.alert('🚨 AUTO RESCUE ACTIVATED', `Fire detected! Rescue vehicle deployed automatically.\nReason: ${reason}`);
      }
    } catch (error) {
      console.error('Auto rescue failed:', error);
      Alert.alert('Error', 'Auto rescue activation failed');
    }
  };

  // Emergency stop rescue
  const emergencyStopRescue = async () => {
    try {
      const response = await axios.post(`${baseURL}/rescue/vehicle/off`);
      if (response.data.status === 'success') {
        setRescueActive(false);
        setVehicleStatus('OFF');
        setAutoFireRescueTriggered(false);
        hasTriggeredFireRescue.current = false;
        Alert.alert('Success', '🛑 Emergency stop activated. Rescue vehicle deactivated.');
      }
    } catch (error) {
      console.error('Emergency stop failed:', error);
      Alert.alert('Error', 'Emergency stop failed');
    }
  };

  // Fire detection logic
  const detectFire = (flameDetected, data) => {
    const currentFireDetected = flameDetected || (data.mq2_ppm > 300 && data.mq7_ppm > 150);
    
    if (currentFireDetected && !fireDetected) {
      setFireDetected(true);
      if (flameDetected) {
        triggerAutoFireRescue('Flame sensor activated');
      } else {
        triggerAutoFireRescue(`Critical gas levels: MQ2=${data.mq2_ppm}ppm, MQ7=${data.mq7_ppm}ppm`);
      }
    } else if (!currentFireDetected && fireDetected) {
      setFireDetected(false);
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        setWsConnected(true);
        reconnectAttempts.current = 0;
        console.log('WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            wsRef.current.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'sensor' || data.mq2_ppm !== undefined) {
            setLatestData(data);
            setFireData(prev => [data, ...prev.slice(0, 49)]);
            detectFire(data.flame, data);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setWsConnected(false);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, 3000);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // Fetch data via REST API
  const fetchAllData = async () => {
    try {
      const response = await axios.get(`${baseURL}/gasfire/all`);
      if (response.data.status === 'success') {
        setFireData(response.data.data);
        if (response.data.data.length > 0) {
          setLatestData(response.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching fire data:', error);
      Alert.alert('Error', 'Failed to fetch fire data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Manual rescue control
  const handleRescueClick = async () => {
    setRescueLoading(true);
    try {
      const endpoint = rescueActive ? '/rescue/vehicle/off' : '/rescue/vehicle/on';
      const response = await axios.post(`${baseURL}${endpoint}`);
      
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        setVehicleStatus(rescueActive ? 'OFF' : 'ON');
        Alert.alert('Success', rescueActive ? '🛑 Rescue Vehicle Deactivated' : '🚨 Rescue Vehicle Activated');
      }
    } catch (error) {
      console.error('Error controlling rescue vehicle:', error);
      Alert.alert('Error', 'Could not control rescue vehicle');
    } finally {
      setRescueLoading(false);
    }
  };

  // Get gas level severity
  const getGasLevelSeverity = (mq2, mq7) => {
    if (mq2 > 300 || mq7 > 150) return 'CRITICAL';
    if (mq2 > 200 || mq7 > 100) return 'HIGH';
    if (mq2 > 100 || mq7 > 50) return 'MODERATE';
    return 'NORMAL';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#d32f2f';
      case 'HIGH': return '#ff9800';
      case 'MODERATE': return '#ffc107';
      default: return '#4caf50';
    }
  };

  const showRescueButton = latestData && (latestData.flame || 
    (latestData.mq2_ppm > 200 && latestData.mq7_ppm > 100));

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
          <ActivityIndicator size="large" color="#FF7A30" />
          <Text style={styles.loadingText}>Loading Fire Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FF7A30" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="flame" size={28} color="#FF7A30" />
          <Text style={styles.headerTitle}>Fire Dashboard</Text>
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
            🔗 {wsConnected ? 'Connected' : 'Disconnected'} | 🚗 Vehicle: {vehicleStatus}
          </Text>
        </View>

        {/* Latest Data Card */}
        {latestData && (
          <View style={styles.latestDataCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current Status</Text>
              <View style={[styles.severityBadge, { 
                backgroundColor: getSeverityColor(getGasLevelSeverity(latestData.mq2_ppm, latestData.mq7_ppm)) 
              }]}>
                <Text style={styles.severityText}>
                  {getGasLevelSeverity(latestData.mq2_ppm, latestData.mq7_ppm)}
                </Text>
              </View>
            </View>
            
            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>MQ2 Gas</Text>
                <Text style={styles.dataValue}>{latestData.mq2_ppm?.toFixed(1)} ppm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>MQ7 CO</Text>
                <Text style={styles.dataValue}>{latestData.mq7_ppm?.toFixed(1)} ppm</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Flame</Text>
                <Text style={[styles.dataValue, { color: latestData.flame ? '#f44336' : '#4caf50' }]}>
                  {latestData.flame ? '🔥 FIRE' : '✅ SAFE'}
                </Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Status</Text>
                <Text style={styles.dataValue}>{latestData.status || 'normal'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Fire Alert & Controls */}
        {fireDetected && (
          <View style={styles.fireAlert}>
            <Ionicons name="warning" size={32} color="#fff" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>🚨 FIRE DETECTED!</Text>
              <Text style={styles.alertText}>Emergency protocols activated</Text>
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {showRescueButton && (
            <TouchableOpacity
              style={[styles.rescueButton, { 
                backgroundColor: rescueActive ? '#f44336' : '#FF7A30' 
              }]}
              onPress={handleRescueClick}
              disabled={rescueLoading}
            >
              {rescueLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name={rescueActive ? "stop" : "rocket"} size={20} color="white" />
                  <Text style={styles.buttonText}>
                    {rescueActive ? 'Stop Rescue' : 'Deploy Rescue'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {autoFireRescueTriggered && (
            <TouchableOpacity
              style={[styles.rescueButton, { backgroundColor: '#d32f2f' }]}
              onPress={emergencyStopRescue}
            >
              <Ionicons name="hand-left" size={20} color="white" />
              <Text style={styles.buttonText}>Emergency Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Fire Incidents"
            value={fireData.filter(item => item.flame).length}
            colors={['#f44336', '#d32f2f']}
            icon="flame"
          />
          <StatCard
            title="Gas Alerts"
            value={fireData.filter(item => item.mq2_ppm > 200).length}
            colors={['#ff9800', '#f57c00']}
            icon="warning"
          />
          <StatCard
            title="Total Readings"
            value={fireData.length}
            colors={['#4caf50', '#388e3c']}
            icon="analytics"
          />
        </View>

        {/* Recent Logs (Minimal) */}
        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>Recent Activity</Text>
          {fireData.slice(0, 5).map((item, index) => (
            <View key={item._id || index} style={styles.logItem}>
              <Text style={styles.logTime}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
              <View style={styles.logData}>
                <Text style={styles.logText}>
                  MQ2: {item.mq2_ppm?.toFixed(1)} | MQ7: {item.mq7_ppm?.toFixed(1)}
                </Text>
                <View style={[styles.flameBadge, { 
                  backgroundColor: item.flame ? '#f44336' : '#4caf50' 
                }]}>
                  <Text style={styles.flameBadgeText}>
                    {item.flame ? '🔥' : '✅'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
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
  fireAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
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
  controlsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  rescueButton: {
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  logsContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  logItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logTime: {
    fontSize: 12,
    color: '#465C88',
    marginBottom: 4,
  },
  logData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logText: {
    fontSize: 12,
    color: '#000',
    flex: 1,
  },
  flameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  flameBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FireScreen;