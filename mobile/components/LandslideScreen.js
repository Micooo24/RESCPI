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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import baseURL from '../assets/common/baseURL';

const { width } = Dimensions.get('window');

// Landslide detection thresholds
const LANDSLIDE_DETECTION = {
  CRITICAL_DROP_THRESHOLD: 1.0,
  SERVO_OFFLINE_THRESHOLD: 2,
  AUTO_RESCUE_DELAY: 2000,
  RESCUE_COOLDOWN: 30000,
};

const LandslideScreen = ({ navigation }) => {
  const [servo1, setServo1] = useState(1);
  const [servo2, setServo2] = useState(1);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Auto-rescue states
  const [autoRescueTriggered, setAutoRescueTriggered] = useState(false);
  const [autoRescueCompleted, setAutoRescueCompleted] = useState(false);
  const [landslideDetected, setLandslideDetected] = useState(false);
  const [lastAutoRescueTime, setLastAutoRescueTime] = useState(0);
  const [autoRescueCountdown, setAutoRescueCountdown] = useState(0);
  const [currentDropFt, setCurrentDropFt] = useState(0);
  const [maxDropFt, setMaxDropFt] = useState(0);
  const [sensorHeight, setSensorHeight] = useState(10.0);
  const [lastMessage, setLastMessage] = useState('');

  const wsRef = useRef(null);
  const hasTriggeredAutoRescue = useRef(false);
  const autoRescueTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket URL
  const WS_URL = 'ws://10.16.180.193:5000/landslide/ws/frontend';

  // Auto rescue activation function (ONE-TIME ONLY)
  const triggerAutoRescue = async (reason) => {
    if (hasTriggeredAutoRescue.current || autoRescueCompleted) {
      console.log('Auto-rescue already triggered - ONE-TIME ONLY');
      return;
    }

    const now = Date.now();
    if (now - lastAutoRescueTime < LANDSLIDE_DETECTION.RESCUE_COOLDOWN) {
      console.log('Auto-rescue in cooldown period');
      return;
    }

    console.log(`🚨 AUTO-TRIGGERING LANDSLIDE RESCUE: ${reason}`);
    
    hasTriggeredAutoRescue.current = true;
    setAutoRescueCompleted(true);
    
    try {
      setRescueLoading(true);
      setAutoRescueTriggered(true);
      setLastAutoRescueTime(now);
      
      Alert.alert(
        '🚨 LANDSLIDE EMERGENCY',
        `Auto-activating rescue vehicle!\nReason: ${reason}`,
        [{ text: 'OK' }]
      );

      const response = await axios.post(`${baseURL}/rescue/landslide/on`);
      
      if (response.data.status === 'success') {
        setRescueActive(true);
        console.log('✅ Auto-rescue vehicle activated successfully (ONE-TIME)');
        
        Alert.alert(
          'Success',
          '✅ Landslide rescue vehicle automatically activated! (One-time trigger)',
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

  // Landslide detection logic (ONE-TIME TRIGGER)
  const detectLandslide = (s1, s2, dropFt = 0) => {
    const servo1Off = s1 === 0;
    const servo2Off = s2 === 0;
    const criticalDrop = dropFt >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD;
    const bothServosOff = servo1Off && servo2Off;
    
    const isLandslideDetected = bothServosOff || criticalDrop;
    
    if (isLandslideDetected && !landslideDetected && !autoRescueCompleted) {
      setLandslideDetected(true);
      
      let reason = '';
      if (bothServosOff && criticalDrop) {
        reason = `Both servos offline + ${dropFt.toFixed(2)} ft ground drop`;
      } else if (bothServosOff) {
        reason = 'Both servos offline - system failure detected';
      } else if (criticalDrop) {
        reason = `Critical ground movement: ${dropFt.toFixed(2)} ft drop`;
      }
      
      setAutoRescueCountdown(LANDSLIDE_DETECTION.AUTO_RESCUE_DELAY / 1000);
      
      if (autoRescueTimeoutRef.current) {
        clearTimeout(autoRescueTimeoutRef.current);
      }
      
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      countdownIntervalRef.current = setInterval(() => {
        setAutoRescueCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      autoRescueTimeoutRef.current = setTimeout(() => {
        triggerAutoRescue(reason);
        setAutoRescueCountdown(0);
      }, LANDSLIDE_DETECTION.AUTO_RESCUE_DELAY);
      
      console.log(`🚨 LANDSLIDE DETECTED: ${reason} - Auto-rescue in ${LANDSLIDE_DETECTION.AUTO_RESCUE_DELAY/1000}s`);
      
    } else if (!isLandslideDetected && landslideDetected) {
      setLandslideDetected(false);
      setAutoRescueCountdown(0);
      
      if (autoRescueTimeoutRef.current) {
        clearTimeout(autoRescueTimeoutRef.current);
        autoRescueTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      console.log('✅ Landslide conditions cleared');
    }
    
    return isLandslideDetected;
  };

  // Reset auto-rescue system
  const resetAutoRescueSystem = () => {
    hasTriggeredAutoRescue.current = false;
    setAutoRescueCompleted(false);
    setLandslideDetected(false);
    setAutoRescueCountdown(0);
    setAutoRescueTriggered(false);
    
    if (autoRescueTimeoutRef.current) {
      clearTimeout(autoRescueTimeoutRef.current);
      autoRescueTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    console.log('🔄 Auto-rescue system reset');
    Alert.alert('Success', '🔄 Auto-rescue system reset - monitoring resumed');
  };

  // WebSocket connection
  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected to landslide monitoring');
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
          
          if (data.type === 'sensor' || data.servo1 !== undefined) {
            if (data.servo1 !== undefined) setServo1(data.servo1);
            if (data.servo2 !== undefined) setServo2(data.servo2);
            
            if (data.drop_ft !== undefined) {
              const dropValue = parseFloat(data.drop_ft) || 0;
              setCurrentDropFt(dropValue);
              setMaxDropFt(prev => Math.max(prev, dropValue));
            }
            if (data.sensor_height_ft !== undefined) {
              setSensorHeight(data.sensor_height_ft);
            }
            
            setLogs(prevLogs => [data, ...prevLogs.slice(0, 49)]);
            
            detectLandslide(
              data.servo1 || servo1, 
              data.servo2 || servo2, 
              data.drop_ft || 0
            );
            
            checkForAlerts(data.servo1 || servo1, data.servo2 || servo2, data.drop_ft || 0);
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
          fetchLogs();
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

  // Check for alerts
  const checkForAlerts = (s1, s2, dropFt = 0) => {
    const servo1Off = s1 === 0;
    const servo2Off = s2 === 0;
    const significantDrop = dropFt > 0.5;

    let newMessage = '';

    if (servo1Off && servo2Off) {
      newMessage = `🔴 CRITICAL: Both servos OFF! Landslide detected (${dropFt.toFixed(2)} ft drop)`;
    } else if (servo1Off || servo2Off) {
      newMessage = `🟠 WARNING: Servo offline, movement detected (${dropFt.toFixed(2)} ft drop)`;
    } else if (significantDrop) {
      newMessage = `🟡 ALERT: Significant ground movement detected (${dropFt.toFixed(2)} ft drop)`;
    }

    if (newMessage && newMessage !== lastMessage) {
      console.log('Alert Message:', newMessage);
      setLastMessage(newMessage);
    } else if (!newMessage && lastMessage) {
      setLastMessage('');
    }
  };

  // Fallback REST API fetch
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/landslide/all`);
      const logList = response.data?.data || [];

      if (logList.length > 0) {
        setLogs(logList);
        
        const latest = logList[0];
        setServo1(latest.servo1 || 1);
        setServo2(latest.servo2 || 1);
        
        if (latest.drop_ft !== undefined) {
          const dropValue = parseFloat(latest.drop_ft) || 0;
          setCurrentDropFt(dropValue);
          
          const maxDrop = Math.max(...logList.map(log => parseFloat(log.drop_ft) || 0));
          setMaxDropFt(maxDrop);
        }
        if (latest.sensor_height_ft !== undefined) {
          setSensorHeight(latest.sensor_height_ft);
        }
        
        detectLandslide(latest.servo1 || 1, latest.servo2 || 1, latest.drop_ft || 0);
        checkForAlerts(latest.servo1 || 1, latest.servo2 || 1, latest.drop_ft || 0);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      Alert.alert('Error', 'Failed to fetch landslide data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    connectWebSocket();
    
    setTimeout(() => {
      if (!wsConnected) {
        fetchLogs();
      }
    }, 5000);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (autoRescueTimeoutRef.current) {
        clearTimeout(autoRescueTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (wsConnected) {
      wsRef.current.close();
      setTimeout(() => connectWebSocket(), 1000);
    } else {
      fetchLogs();
    }
  };

  const toggleServo = async (servoNumber, action) => {
    setButtonLoading(true);
    try {
      await axios.post(`${baseURL}/landslide/servo/${servoNumber}/${action}`);

      let nextServo1 = servo1;
      let nextServo2 = servo2;
      if (servoNumber === 1) nextServo1 = action === 'on' ? 1 : 0;
      if (servoNumber === 2) nextServo2 = action === 'on' ? 1 : 0;
      setServo1(nextServo1);
      setServo2(nextServo2);

      detectLandslide(nextServo1, nextServo2, currentDropFt);
      checkForAlerts(nextServo1, nextServo2, currentDropFt);

      if (!wsConnected) {
        setTimeout(() => fetchLogs(), 500);
      }
    } catch (error) {
      console.error(`Failed to toggle Servo ${servoNumber}:`, error);
      Alert.alert('Error', 'Failed to toggle servo.');
    } finally {
      setButtonLoading(false);
    }
  };

  // Manual rescue control
  const handleRescueClick = async () => {
    setRescueLoading(true);
    const actionUrl = rescueActive ? `${baseURL}/rescue/off` : `${baseURL}/rescue/landslide/on`;

    try {
      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        Alert.alert('Success', `🚑 Landslide Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'} (Manual Override)`);
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

  // Get status level
  const getStatusLevel = () => {
    if (servo1 === 0 && servo2 === 0) return 'critical';
    if (servo1 === 0 || servo2 === 0) return 'warning';
    if (currentDropFt > 0.5) return 'alert';
    return 'normal';
  };

  const getSeverityColor = (status) => {
    switch (status) {
      case 'critical': return '#DC143C';
      case 'warning': return '#ff9800';
      case 'alert': return '#FF8C00';
      default: return '#4caf50';
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#795548" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="triangle" size={28} color="#795548" />
          <Text style={styles.headerTitle}>Landslide Dashboard</Text>
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

        {/* Auto-rescue countdown alert */}
        {autoRescueCountdown > 0 && !autoRescueCompleted && (
          <View style={styles.countdownAlert}>
            <Ionicons name="warning" size={32} color="#fff" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>🚨 LANDSLIDE DETECTED!</Text>
              <Text style={styles.alertText}>Auto-rescue in {autoRescueCountdown}s...</Text>
            </View>
          </View>
        )}

        {/* Auto-rescue triggered */}
        {autoRescueTriggered && (
          <View style={styles.triggeredAlert}>
            <Ionicons name="car" size={32} color="#fff" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>🚑 AUTO-RESCUE ACTIVATED!</Text>
              <Text style={styles.alertText}>Emergency response initiated</Text>
            </View>
          </View>
        )}

        {/* Auto-rescue completed */}
        {autoRescueCompleted && !autoRescueTriggered && (
          <View style={styles.completedAlert}>
            <Ionicons name="checkmark-circle" size={32} color="#fff" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>✅ AUTO-RESCUE COMPLETED</Text>
              <Text style={styles.alertText}>System will not trigger again until reset</Text>
              <TouchableOpacity onPress={resetAutoRescueSystem} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>RESET SYSTEM</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Current Status Card */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusCard, { borderLeftColor: getSeverityColor(getStatusLevel()) }]}>
            <View style={styles.statusCardContent}>
              <Ionicons 
                name={getStatusLevel() === 'critical' ? 'warning' : 
                      getStatusLevel() === 'warning' ? 'alert-circle' : 'checkmark-circle'} 
                size={24} 
                color={getSeverityColor(getStatusLevel())} 
              />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusText, { color: getSeverityColor(getStatusLevel()) }]}>
                  {getStatusLevel() === 'critical' ? '🚨 LANDSLIDE DETECTED' :
                   getStatusLevel() === 'warning' ? '⚠️ MOVEMENT DETECTED' :
                   getStatusLevel() === 'alert' ? '🟡 GROUND MOVEMENT' : '✅ SYSTEM NORMAL'}
                </Text>
                <Text style={styles.statusSubText}>
                  Drop: {currentDropFt.toFixed(2)} ft | Max: {maxDropFt.toFixed(2)} ft
                </Text>
              </View>
            </View>
          </View>
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

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Trigger Level"
            value={`≥${LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD}ft`}
            colors={['#DC143C', '#b91230']}
            icon="alert"
          />
          <StatCard
            title="Auto-Rescue"
            value={autoRescueCompleted ? 'DONE' : 'READY'}
            colors={autoRescueCompleted ? ['#4caf50', '#388e3c'] : ['#795548', '#5d4037']}
            icon={autoRescueCompleted ? "checkmark-circle" : "rocket"}
          />
          <StatCard
            title="Ground Drop"
            value={`${currentDropFt.toFixed(1)}ft`}
            colors={['#ff9800', '#f57c00']}
            icon="trending-down"
          />
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {/* Servo Controls */}
          <Text style={styles.sectionTitle}>Servo Controls</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
              onPress={() => toggleServo(1, 'on')}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Servo 1 ON</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f44336' }]}
              onPress={() => toggleServo(1, 'off')}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="stop-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Servo 1 OFF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
              onPress={() => toggleServo(2, 'on')}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Servo 2 ON</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#9c27b0' }]}
              onPress={() => toggleServo(2, 'off')}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="stop-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Servo 2 OFF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Manual Rescue Control */}
          {servo1 === 0 && servo2 === 0 && !autoRescueTriggered && (
            <TouchableOpacity
              style={[styles.actionButton, { 
                backgroundColor: rescueActive ? '#DC143C' : '#795548',
                marginTop: 16
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
                    {rescueActive ? 'Stop Manual Rescue' : '🚨 MANUAL RESCUE'}
                  </Text>
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
                 landslideDetected ? '🔴 ARMED' : '🟢 MONITORING'}
              </Text>
            </View>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Trigger:</Text>
              <Text style={styles.statusInfoValue}>≥{LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD}ft / Both OFF</Text>
            </View>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Current Drop:</Text>
              <Text style={styles.statusInfoValue}>{currentDropFt.toFixed(2)}ft</Text>
            </View>
            <View style={styles.statusInfoItem}>
              <Text style={styles.statusInfoLabel}>Last Trigger:</Text>
              <Text style={styles.statusInfoValue}>
                {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Logs (Minimal) */}
        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>Recent Activity</Text>
          {logs.slice(0, 5).map((item, index) => (
            <View key={item._id || index} style={styles.logItem}>
              <Text style={styles.logTime}>
                {new Date(item.created_at).toLocaleTimeString()}
              </Text>
              <View style={styles.logData}>
                <Text style={styles.logText}>
                  S1:{item.servo1 || 1} S2:{item.servo2 || 1} | Drop: {(item.drop_ft || 0).toFixed(1)}ft
                </Text>
                <View style={[styles.severityBadge, { 
                  backgroundColor: (item.servo1 === 0 && item.servo2 === 0) ? '#DC143C' :
                                   (item.servo1 === 0 || item.servo2 === 0) ? '#ff9800' : '#4caf50'
                }]}>
                  <Text style={styles.severityBadgeText}>
                    {(item.servo1 === 0 && item.servo2 === 0) ? '🚨' :
                     (item.servo1 === 0 || item.servo2 === 0) ? '⚠️' : '✅'}
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
  countdownAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC143C',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
  },
  triggeredAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
  },
  completedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#795548',
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
  statusContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    textAlign: 'center',
  },
  statusInfoCard: {
    margin: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#795548',
  },
  statusInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#795548',
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
    color: '#795548',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
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
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default LandslideScreen;