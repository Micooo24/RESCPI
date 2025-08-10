import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { 
  SystemUpdateAlt, 
  ArrowBack, 
  Landslide,
  Warning,
  CheckCircle,
  DirectionsCar,
  Wifi,
  WifiOff,
  Height,
  TrendingUp,
  Emergency,
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import BASE_URL from '../common/baseurl';
import toast from 'react-hot-toast';

// WebSocket URL
const WS_URL = 'ws://10.16.180.193:5000/landslide/ws/frontend';

// 🚨 LANDSLIDE DETECTION THRESHOLDS
const LANDSLIDE_DETECTION = {
  CRITICAL_DROP_THRESHOLD: 1.0,      // Auto-trigger at 1.0 ft drop
  SERVO_OFFLINE_THRESHOLD: 2,        // Both servos offline
  AUTO_RESCUE_DELAY: 2000,           // 2 second delay before auto-activation
  RESCUE_COOLDOWN: 30000,            // 30 seconds between auto-activations
};

// Custom theme with new colors
const landslideTheme = createTheme({
  palette: {
    primary: {
      main: '#cc4a02',
    },
    secondary: {
      main: '#66FF00',
    },
    background: {
      default: '#F5F5DD',
      paper: '#ffffff',
    },
    text: {
      primary: '#34623f',
      secondary: '#666666',
    },
    info: {
      main: '#1F51FF',
    },
  },
});

const LandslideDashboard = () => {
  const navigate = useNavigate();
  const [servo1, setServo1] = useState(1);
  const [servo2, setServo2] = useState(1);
  const [logs, setLogs] = useState([]);
  const [lastMessage, setLastMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  // 🔥 New state for feet data
  const [currentDropFt, setCurrentDropFt] = useState(0);
  const [maxDropFt, setMaxDropFt] = useState(0);
  const [sensorHeight, setSensorHeight] = useState(10.0);

  // 🚨 NEW: Auto-rescue states (ONE-TIME ONLY)
  const [autoRescueTriggered, setAutoRescueTriggered] = useState(false);
  const [lastAutoRescueTime, setLastAutoRescueTime] = useState(0);
  const [autoRescueCountdown, setAutoRescueCountdown] = useState(0);
  const [landslideDetected, setLandslideDetected] = useState(false);
  const [autoRescueCompleted, setAutoRescueCompleted] = useState(false); // 🚨 NEW: One-time flag

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const autoRescueTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasTriggeredAutoRescue = useRef(false); // 🚨 NEW: Ref to prevent multiple triggers

  // 🚨 AUTO RESCUE ACTIVATION FUNCTION (ONE-TIME ONLY)
  const triggerAutoRescue = async (reason) => {
    // 🚨 PREVENT MULTIPLE TRIGGERS
    if (hasTriggeredAutoRescue.current || autoRescueCompleted) {
      console.log('⏹️ Auto-rescue already triggered, ignoring duplicate');
      return;
    }

    const now = Date.now();
    
    // Check cooldown period
    if (now - lastAutoRescueTime < LANDSLIDE_DETECTION.RESCUE_COOLDOWN) {
      console.log('⏳ Auto-rescue in cooldown period');
      return;
    }

    console.log(`🚨 AUTO-TRIGGERING RESCUE (ONE-TIME): ${reason}`);
    
    // 🚨 SET FLAGS TO PREVENT DUPLICATES
    hasTriggeredAutoRescue.current = true;
    setAutoRescueCompleted(true);
    
    try {
      setRescueLoading(true);
      setAutoRescueTriggered(true);
      setLastAutoRescueTime(now);
      
      // Show immediate notification
      toast.dismiss();
      toast.error(`🚨 EMERGENCY: Auto-activating rescue vehicle! Reason: ${reason}`, {
        duration: 8000,
        style: {
          background: '#DC143C',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }
      });

      // Call the rescue API endpoint
      const response = await axios.post(`${BASE_URL}/rescue/landslide/on`);
      
      if (response.data.status === 'success') {
        setRescueActive(true);
        console.log('✅ Auto-rescue vehicle activated successfully (ONE-TIME)');
        
        toast.success('✅ Rescue vehicle automatically activated! (One-time trigger)', {
          duration: 6000,
          style: {
            background: '#66FF00',
            color: 'black',
            fontWeight: 'bold'
          }
        });
      } else {
        throw new Error('API returned non-success status');
      }
      
    } catch (error) {
      console.error('❌ Auto-rescue activation failed:', error);
      toast.error('❌ Failed to auto-activate rescue vehicle', {
        duration: 5000,
        style: {
          background: '#DC143C',
          color: 'white'
        }
      });
      // 🚨 Reset flags on failure
      hasTriggeredAutoRescue.current = false;
      setAutoRescueCompleted(false);
    } finally {
      setRescueLoading(false);
      setTimeout(() => setAutoRescueTriggered(false), 5000);
    }
  };

  // 🚨 LANDSLIDE DETECTION LOGIC (ONE-TIME TRIGGER)
  const detectLandslide = (s1, s2, dropFt = 0) => {
    const servo1Off = s1 === 0;
    const servo2Off = s2 === 0;
    const criticalDrop = dropFt >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD;
    const bothServosOff = servo1Off && servo2Off;
    
    // Determine if landslide is detected
    const isLandslideDetected = bothServosOff || criticalDrop;
    
    // 🚨 ONE-TIME TRIGGER LOGIC
    if (isLandslideDetected && !landslideDetected && !autoRescueCompleted) {
      // New landslide detected AND not already triggered
      setLandslideDetected(true);
      
      // Determine trigger reason
      let reason = '';
      if (bothServosOff && criticalDrop) {
        reason = `Both servos offline + ${dropFt.toFixed(2)} ft ground drop`;
      } else if (bothServosOff) {
        reason = 'Both servos offline - system failure detected';
      } else if (criticalDrop) {
        reason = `Critical ground movement: ${dropFt.toFixed(2)} ft drop`;
      }
      
      // Start countdown for auto-rescue
      setAutoRescueCountdown(LANDSLIDE_DETECTION.AUTO_RESCUE_DELAY / 1000);
      
      // Clear any existing timeout
      if (autoRescueTimeoutRef.current) {
        clearTimeout(autoRescueTimeoutRef.current);
      }
      
      // Start countdown display
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
      
      // Set timeout for auto-rescue activation (ONE-TIME)
      autoRescueTimeoutRef.current = setTimeout(() => {
        triggerAutoRescue(reason);
        setAutoRescueCountdown(0);
      }, LANDSLIDE_DETECTION.AUTO_RESCUE_DELAY);
      
      console.log(`🚨 LANDSLIDE DETECTED (ONE-TIME): ${reason} - Auto-rescue in ${LANDSLIDE_DETECTION.AUTO_RESCUE_DELAY/1000}s`);
      
    } else if (!isLandslideDetected && landslideDetected) {
      // Landslide cleared - only clear detection state, keep autoRescueCompleted
      setLandslideDetected(false);
      setAutoRescueCountdown(0);
      
      // Clear timeouts
      if (autoRescueTimeoutRef.current) {
        clearTimeout(autoRescueTimeoutRef.current);
        autoRescueTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      console.log('✅ Landslide conditions cleared (auto-rescue remains completed)');
    }
    
    return isLandslideDetected;
  };

  // 🚨 RESET FUNCTION (for manual reset if needed)
  const resetAutoRescueSystem = () => {
    hasTriggeredAutoRescue.current = false;
    setAutoRescueCompleted(false);
    setLandslideDetected(false);
    setAutoRescueCountdown(0);
    setAutoRescueTriggered(false);
    
    // Clear timeouts
    if (autoRescueTimeoutRef.current) {
      clearTimeout(autoRescueTimeoutRef.current);
      autoRescueTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    console.log('🔄 Auto-rescue system reset');
    toast.success('🔄 Auto-rescue system reset - monitoring resumed');
  };

  // WebSocket connection management
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('Connecting...');
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected to landslide monitoring');
        setWsConnected(true);
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received landslide data:', data);
          
          // Handle sensor data from ESP32
          if (data.type === 'sensor' || data.servo1 !== undefined) {
            // Update servo states
            if (data.servo1 !== undefined) setServo1(data.servo1);
            if (data.servo2 !== undefined) setServo2(data.servo2);
            
            // 🔥 Update feet data
            if (data.drop_ft !== undefined) {
              const dropValue = parseFloat(data.drop_ft) || 0;
              setCurrentDropFt(dropValue);
              setMaxDropFt(prev => Math.max(prev, dropValue));
            }
            if (data.sensor_height_ft !== undefined) {
              setSensorHeight(data.sensor_height_ft);
            }
            
            // Add to logs
            setLogs(prevLogs => [data, ...prevLogs.slice(0, 49)]);
            
            // 🚨 NEW: Check for landslide detection and auto-rescue (ONE-TIME)
            const isLandslide = detectLandslide(
              data.servo1 || servo1, 
              data.servo2 || servo2, 
              data.drop_ft || 0
            );
            
            // Check for alerts (existing function)
            checkForAlerts(data.servo1 || servo1, data.servo2 || servo2, data.drop_ft || 0);
            
            setLoading(false);
          }
          
          // Handle control responses
          if (data.type === 'control') {
            console.log('🎛️ Control response:', data);
            fetchLogs(); // Refresh data after control command
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
        setConnectionStatus('Connection Error');
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setWsConnected(false);
        setConnectionStatus('Disconnected');
        
        // Auto-reconnect logic
        if (reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          setConnectionStatus('Failed to Connect');
          // Fall back to REST API
          fetchLogs();
        }
      };

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setWsConnected(false);
      setConnectionStatus('Connection Failed');
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectAttempts.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    
    setConnectionStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear auto-rescue timeouts
    if (autoRescueTimeoutRef.current) {
      clearTimeout(autoRescueTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setWsConnected(false);
  };

  // 🔥 Enhanced alert checking with feet data (existing function)
  const checkForAlerts = (s1, s2, dropFt = 0) => {
    const servo1Off = s1 === 0;
    const servo2Off = s2 === 0;
    const significantDrop = dropFt > 0.5; // Alert threshold

    let newMessage = '';

    if (servo1Off && servo2Off) {
      newMessage = `🔴 CRITICAL: Both servos OFF! Landslide detected (${dropFt.toFixed(2)} ft drop)`;
    } else if (servo1Off || servo2Off) {
      newMessage = `🟠 WARNING: Servo offline, movement detected (${dropFt.toFixed(2)} ft drop)`;
    } else if (significantDrop) {
      newMessage = `🟡 ALERT: Significant ground movement detected (${dropFt.toFixed(2)} ft drop)`;
    }

    if (newMessage && newMessage !== lastMessage) {
      toast.dismiss();
      console.log('Toast Message:', newMessage);
      toast.success(newMessage, { duration: 6000 });
      setLastMessage(newMessage);
    } else if (!newMessage && lastMessage) {
      toast.dismiss();
      setLastMessage('');
    }
  };

  useEffect(() => {
    // Try WebSocket first, fallback to REST
    connectWebSocket();
    
    // Initial REST API call as backup
    setTimeout(() => {
      if (!wsConnected) {
        fetchLogs();
      }
    }, 5000);
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // Fallback REST API fetch
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/landslide/all`);
      const logList = response.data?.data || [];

      if (logList.length > 0) {
        setLogs(logList);
        
        const latest = logList[0];
        setServo1(latest.servo1 || 1);
        setServo2(latest.servo2 || 1);
        
        // 🔥 Update feet data from REST API
        if (latest.drop_ft !== undefined) {
          const dropValue = parseFloat(latest.drop_ft) || 0;
          setCurrentDropFt(dropValue);
          
          // Calculate max from all logs
          const maxDrop = Math.max(...logList.map(log => parseFloat(log.drop_ft) || 0));
          setMaxDropFt(maxDrop);
        }
        if (latest.sensor_height_ft !== undefined) {
          setSensorHeight(latest.sensor_height_ft);
        }
        
        // 🚨 Check for landslide detection from REST data (ONE-TIME)
        detectLandslide(latest.servo1 || 1, latest.servo2 || 1, latest.drop_ft || 0);
        checkForAlerts(latest.servo1 || 1, latest.servo2 || 1, latest.drop_ft || 0);
        setConnectionStatus('REST API');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setConnectionStatus('API Error');
    } finally {
      setLoading(false);
    }
  };

  const toggleServo = async (servoNumber, action) => {
    try {
      await axios.post(`${BASE_URL}/landslide/servo/${servoNumber}/${action}`);

      // Update local state immediately for better UX
      let nextServo1 = servo1;
      let nextServo2 = servo2;
      if (servoNumber === 1) nextServo1 = action === 'on' ? 1 : 0;
      if (servoNumber === 2) nextServo2 = action === 'on' ? 1 : 0;
      setServo1(nextServo1);
      setServo2(nextServo2);

      // Check for landslide detection after manual servo change (ONE-TIME)
      detectLandslide(nextServo1, nextServo2, currentDropFt);
      checkForAlerts(nextServo1, nextServo2, currentDropFt);

      // If WebSocket is not connected, fetch updated data via REST
      if (!wsConnected) {
        setTimeout(() => fetchLogs(), 500);
      }
    } catch (error) {
      console.error(`Failed to toggle Servo ${servoNumber}:`, error);
      toast.error('Failed to toggle servo.');
    }
  };

  // Manual Toggle Rescue Vehicle (existing function, now with improved logic)
  const toggleRescueVehicle = async () => {
    setRescueLoading(true);
    const actionUrl = rescueActive
      ? `${BASE_URL}/rescue/off`
      : `${BASE_URL}/rescue/landslide/on`;

    try {
      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        toast.success(`🚑 Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'} (Manual)`);
      } else {
        toast.error('⚠️ Failed to control rescue vehicle');
      }
    } catch (error) {
      console.error('❌ Error toggling rescue vehicle:', error);
      toast.error('Error controlling rescue vehicle');
    } finally {
      setRescueLoading(false);
    }
  };

  // 🔥 Enhanced status level calculation
  const getStatusLevel = () => {
    if (servo1 === 0 && servo2 === 0) return 'critical';
    if (servo1 === 0 || servo2 === 0) return 'warning';
    if (currentDropFt > 0.5) return 'alert';
    return 'normal';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#DC143C';
      case 'warning': return '#cc4a02';
      case 'alert': return '#FF8C00';
      case 'normal': return '#66FF00';
      default: return '#1F51FF';
    }
  };

  // 🔥 Get drop severity
  const getDropSeverity = (dropFt) => {
    if (dropFt > 2.0) return 'critical';
    if (dropFt > 1.0) return 'warning';
    if (dropFt > 0.5) return 'alert';
    return 'normal';
  };

  const showRescueButton = servo1 === 0 && servo2 === 0;

  return (
    <ThemeProvider theme={landslideTheme}>
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          overflow: 'auto',
          background: 'linear-gradient(135deg, #F5F5DD 0%, #f0f4f0 50%, #e8f2e8 100%)',
          py: 2,
        }}
      >
        <Container maxWidth="xl" sx={{ height: '100%' }}>
          {/* Header with Connection Status */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/')}
                sx={{ 
                  color: '#cc4a02', 
                  mr: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(204, 74, 2, 0.1)',
                  }
                }}
              >
                Back to Home
              </Button>
              <Landslide sx={{ fontSize: 40, mr: 2, color: '#cc4a02' }} />
              <Typography variant="h4" component="h1" sx={{ color: '#34623f', fontWeight: 600 }}>
                Landslide Emergency Dashboard
              </Typography>
            </Box>
            
            {/* Connection Status */}
            <Box display="flex" alignItems="center" gap={1}>
              {wsConnected ? (
                <Wifi sx={{ color: 'green' }} />
              ) : (
                <WifiOff sx={{ color: 'red' }} />
              )}
              <Typography variant="body2" color={wsConnected ? 'success.main' : 'error.main'}>
                {connectionStatus}
              </Typography>
            </Box>
          </Box>

          {/* 🚨 AUTO-RESCUE COUNTDOWN ALERT (ONE-TIME) */}
          {autoRescueCountdown > 0 && !autoRescueCompleted && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                backgroundColor: 'rgba(220, 20, 60, 0.9)',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                animation: 'pulse 1s infinite'
              }}
              icon={<Emergency sx={{ color: 'white' }} />}
            >
              🚨 LANDSLIDE DETECTED! Auto-activating rescue vehicle in {autoRescueCountdown}s... (ONE-TIME TRIGGER)
            </Alert>
          )}

          {/* 🚨 AUTO-RESCUE TRIGGERED NOTIFICATION */}
          {autoRescueTriggered && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 2,
                backgroundColor: 'rgba(255, 140, 0, 0.9)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
              icon={<DirectionsCar sx={{ color: 'white' }} />}
            >
              🚑 AUTO-RESCUE ACTIVATED! Emergency response initiated. (ONE-TIME ACTIVATION)
            </Alert>
          )}

          {/* 🚨 AUTO-RESCUE COMPLETED NOTIFICATION */}
          {autoRescueCompleted && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2,
                backgroundColor: 'rgba(31, 81, 255, 0.9)',
                color: 'white',
                fontSize: '1.0rem',
                fontWeight: 'bold'
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={resetAutoRescueSystem}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  RESET SYSTEM
                </Button>
              }
            >
              ✅ AUTO-RESCUE COMPLETED - System will not trigger again until reset
            </Alert>
          )}

          <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
            {/* Control Panel */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #cc4a02' }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  Landslide Control Panel
                  {/* 🚨 AUTO-RESCUE STATUS INDICATOR */}
                  {landslideDetected && !autoRescueCompleted && (
                    <Chip 
                      label="LANDSLIDE DETECTED" 
                      size="small" 
                      sx={{ 
                        ml: 2, 
                        backgroundColor: '#DC143C', 
                        color: 'white',
                        fontWeight: 'bold',
                        animation: 'pulse 2s infinite'
                      }}
                      icon={<Emergency sx={{ color: 'white !important' }} />}
                    />
                  )}
                  {/* 🚨 COMPLETED STATUS */}
                  {autoRescueCompleted && (
                    <Chip 
                      label="AUTO-RESCUE COMPLETED" 
                      size="small" 
                      sx={{ 
                        ml: 2, 
                        backgroundColor: '#1F51FF', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      icon={<CheckCircle sx={{ color: 'white !important' }} />}
                    />
                  )}
                </Typography>

                {/* 🔥 Enhanced Status Alert with Feet Data and Auto-Rescue Info */}
                <Box mb={3}>
                  {getStatusLevel() === 'critical' ? (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        backgroundColor: 'rgba(220, 20, 60, 0.1)',
                        border: '1px solid #DC143C',
                        color: '#34623f',
                      }}
                    >
                      🚨 CRITICAL: Both servos OFF! Landslide detected - Drop: {currentDropFt.toFixed(2)} ft
                      <br />
                      {landslideDetected && !autoRescueCompleted && <strong>🚑 Auto-rescue will activate (ONE-TIME)!</strong>}
                      {autoRescueCompleted && <strong>✅ Auto-rescue already completed</strong>}
                    </Alert>
                  ) : getStatusLevel() === 'warning' ? (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        backgroundColor: 'rgba(204, 74, 2, 0.1)',
                        border: '1px solid #cc4a02',
                        color: '#34623f',
                      }}
                    >
                      ⚠️ WARNING: Servo offline, movement detected - Drop: {currentDropFt.toFixed(2)} ft
                    </Alert>
                  ) : getStatusLevel() === 'alert' ? (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        backgroundColor: 'rgba(255, 140, 0, 0.1)',
                        border: '1px solid #FF8C00',
                        color: '#34623f',
                      }}
                    >
                      🟡 ALERT: Significant ground movement - Drop: {currentDropFt.toFixed(2)} ft
                    </Alert>
                  ) : (
                    <Alert 
                      severity="success"
                      sx={{ 
                        backgroundColor: 'rgba(102, 255, 0, 0.1)',
                        border: '1px solid #66FF00',
                        color: '#34623f',
                      }}
                    >
                      ✅ NORMAL: System stable - Drop: {currentDropFt.toFixed(2)} ft
                      <br />
                      🤖 Auto-rescue monitoring active - Threshold: {LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD} ft
                      {autoRescueCompleted && <span> | ⚠️ Auto-rescue completed</span>}
                    </Alert>
                  )}
                </Box>

                {/* 🚨 AUTO-RESCUE STATUS CARD */}
                <Card sx={{ mb: 3, backgroundColor: '#FFF8DC', border: '2px solid #FF6347' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600, mb: 2 }}>
                      🤖 Auto-Rescue System Status (ONE-TIME)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Detection Threshold:</b> {LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD} ft
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Auto-Activation:</b> {
                            autoRescueCompleted ? '✅ COMPLETED' :
                            landslideDetected ? '🔴 ARMED' : '🟢 MONITORING'
                          }
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Last Activation:</b> {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Status:</b> {autoRescueCompleted ? '✅ ONE-TIME COMPLETE' : '🟢 READY'}
                        </Typography>
                      </Grid>
                    </Grid>
                    {/* Reset Button */}
                    {autoRescueCompleted && (
                      <Box mt={2}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={resetAutoRescueSystem}
                          sx={{
                            borderColor: '#1F51FF',
                            color: '#1F51FF',
                            '&:hover': { backgroundColor: 'rgba(31, 81, 255, 0.1)' }
                          }}
                        >
                          🔄 Reset Auto-Rescue System
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* 🔥 Feet Data Display */}
                <Card sx={{ mb: 3, backgroundColor: '#F0F8FF', border: '1px solid #1F51FF' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600, mb: 2 }}>
                      📏 Ground Movement Analysis
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Height sx={{ color: '#1F51FF' }} />
                          <Typography variant="body2" sx={{ color: '#34623f' }}>
                            <b>Current Drop:</b> {currentDropFt.toFixed(2)} ft
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((currentDropFt / 5) * 100, 100)} 
                          sx={{ 
                            mt: 1, 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStatusColor(getDropSeverity(currentDropFt))
                            }
                          }} 
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TrendingUp sx={{ color: '#cc4a02' }} />
                          <Typography variant="body2" sx={{ color: '#34623f' }}>
                            <b>Max Drop:</b> {maxDropFt.toFixed(2)} ft
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#666666', mt: 1 }}>
                          Sensor Height: {sensorHeight.toFixed(1)} ft
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Servo Control Buttons */}
                <Typography variant="subtitle1" sx={{ mb: 2, color: '#34623f', fontWeight: 600 }}>
                  Servo Controls
                </Typography>
                <Grid container spacing={2} mb={3}>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: '#66FF00',
                        color: 'white',
                        '&:hover': { backgroundColor: '#52cc00' }
                      }}
                      startIcon={<SystemUpdateAlt />}
                      onClick={() => toggleServo(1, 'on')}
                    >
                      Servo 1 ON
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        borderColor: '#DC143C',
                        color: '#DC143C',
                        '&:hover': { backgroundColor: 'rgba(220, 20, 60, 0.1)' }
                      }}
                      startIcon={<SystemUpdateAlt />}
                      onClick={() => toggleServo(1, 'off')}
                    >
                      Servo 1 OFF
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: '#1F51FF',
                        color: 'white',
                        '&:hover': { backgroundColor: '#1a44d9' }
                      }}
                      startIcon={<SystemUpdateAlt />}
                      onClick={() => toggleServo(2, 'on')}
                    >
                      Servo 2 ON
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        borderColor: '#cc4a02',
                        color: '#cc4a02',
                        '&:hover': { backgroundColor: 'rgba(204, 74, 2, 0.1)' }
                      }}
                      startIcon={<SystemUpdateAlt />}
                      onClick={() => toggleServo(2, 'off')}
                    >
                      Servo 2 OFF
                    </Button>
                  </Grid>
                </Grid>

                {/* Manual Rescue Vehicle Button (only show when needed and not auto-triggered) */}
                {showRescueButton && !autoRescueTriggered && (
                  <Box textAlign="center" mb={3}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        backgroundColor: rescueActive ? '#DC143C' : '#cc4a02',
                        color: 'white',
                        px: 4,
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: rescueActive ? '#b91230' : '#a03902',
                        },
                      }}
                      startIcon={<DirectionsCar />}
                      onClick={toggleRescueVehicle}
                      disabled={rescueLoading}
                    >
                      {rescueLoading
                        ? "Processing..."
                        : rescueActive
                        ? "Deactivate Rescue Vehicle"
                        : "🚨 MANUAL RESCUE ACTIVATION"}
                    </Button>
                  </Box>
                )}

                {/* 🔥 Enhanced Current Status Display */}
                <Card 
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#F5F5DD',
                    border: '1px solid #34623f',
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600, mb: 2 }}>
                    Current System Status
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Servo 1:</b> {servo1 === 1 ? '✅ Active' : '❌ Inactive'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Servo 2:</b> {servo2 === 1 ? '✅ Active' : '❌ Inactive'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Ground Drop:</b> {currentDropFt.toFixed(2)} ft
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Alert Level:</b> {getStatusLevel().toUpperCase()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Auto-Rescue:</b> {
                          autoRescueCompleted ? '✅ COMPLETED' :
                          landslideDetected ? '🔴 ARMED' : '🟢 MONITORING'
                        }
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Connection:</b> {wsConnected ? 'Real-time' : 'Polling'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Paper>
            </Grid>

            {/* 🔥 Enhanced Logs Section */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #1F51FF' }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  Landslide Detection Logs
                  {wsConnected && (
                    <Chip 
                      label="Real-time" 
                      size="small" 
                      sx={{ ml: 2, backgroundColor: '#66FF00', color: 'white' }}
                    />
                  )}
                  {/* 🚨 Auto-rescue indicator */}
                  {landslideDetected && !autoRescueCompleted && (
                    <Chip 
                      label="AUTO-RESCUE ARMED" 
                      size="small" 
                      sx={{ 
                        ml: 1, 
                        backgroundColor: '#DC143C', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  {autoRescueCompleted && (
                    <Chip 
                      label="AUTO-RESCUE COMPLETED" 
                      size="small" 
                      sx={{ 
                        ml: 1, 
                        backgroundColor: '#1F51FF', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </Typography>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                    <CircularProgress sx={{ color: '#cc4a02' }} />
                  </Box>
                ) : (
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      maxHeight: '400px', 
                      overflow: 'auto',
                      backgroundColor: '#F5F5DD',
                    }}
                  >
                    <List>
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <ListItem 
                            key={index}
                            sx={{
                              borderBottom: '1px solid #e0e0e0',
                              '&:hover': { backgroundColor: 'rgba(204, 74, 2, 0.05)' }
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                  <Typography sx={{ color: '#34623f', fontWeight: 600 }}>
                                    Status: {log.status || 'normal'}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={`S1:${log.servo1 || 1} S2:${log.servo2 || 1}`}
                                    sx={{
                                      backgroundColor: (log.servo1 === 0 && log.servo2 === 0) ? '#DC143C' :
                                                     (log.servo1 === 0 || log.servo2 === 0) ? '#cc4a02' : '#66FF00',
                                      color: 'white',
                                      fontSize: '0.7rem'
                                    }}
                                  />
                                  {/* 🔥 Feet Data Chip with Auto-Rescue Indicator */}
                                  <Chip
                                    size="small"
                                    label={`${(log.drop_ft || 0).toFixed(2)} ft${(log.drop_ft || 0) >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD ? ' 🚨' : ''}`}
                                    sx={{
                                      backgroundColor: (log.drop_ft || 0) >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD ? '#DC143C' : getStatusColor(getDropSeverity(log.drop_ft || 0)),
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      fontWeight: 600
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" sx={{ color: '#34623f' }}>
                                    X: {(log.accel_x || 0).toFixed(2)} | Y: {(log.accel_y || 0).toFixed(2)} | Z: {(log.accel_z || 0).toFixed(2)}
                                  </Typography>
                                  {/* 🔥 Enhanced Feet Data Display with Auto-Rescue Info */}
                                  <Typography variant="body2" sx={{ color: '#cc4a02', fontWeight: 600 }}>
                                    📏 Drop: {(log.drop_ft || 0).toFixed(2)} ft | Height: {(log.sensor_height_ft || 10).toFixed(1)} ft
                                    {(log.drop_ft || 0) >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD && 
                                      <span style={{ color: '#DC143C' }}> | 🚨 AUTO-RESCUE TRIGGER (ONE-TIME)</span>
                                    }
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#666666' }}>
                                    {new Date(log.created_at || log.timestamp).toLocaleString()}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText 
                            primary={
                              <Typography sx={{ color: '#34623f', textAlign: 'center' }}>
                                No logs available. Waiting for data...
                              </Typography>
                            }
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 🚨 CSS for Pulse Animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </ThemeProvider>
  );
};

export default LandslideDashboard;