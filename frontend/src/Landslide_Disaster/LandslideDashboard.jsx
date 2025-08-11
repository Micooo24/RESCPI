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

// Modern theme with RESCPI color scheme (E9E3DF, FF7A30, 465C88, 000000) and Poppins font
const landslideTheme = createTheme({
  typography: {
    fontFamily: [
      'Poppins',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 700, color: '#000000' },
    h2: { fontWeight: 600, color: '#000000' },
    h3: { fontWeight: 600, color: '#000000' },
    h4: { fontWeight: 600, color: '#000000' },
    h5: { fontWeight: 500, color: '#000000' },
    h6: { fontWeight: 500, color: '#000000' },
    body1: { fontWeight: 400, color: '#000000' },
    body2: { fontWeight: 400, color: '#465C88' },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  palette: {
    primary: {
      main: '#FF7A30',
    },
    secondary: {
      main: '#465C88',
    },
    background: {
      default: '#E9E3DF',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#465C88',
    },
    error: {
      main: '#DC143C',
    },
    warning: {
      main: '#FF7A30',
    },
    info: {
      main: '#465C88',
    },
    success: {
      main: '#4caf50',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 122, 48, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
        contained: {
          boxShadow: '0 4px 16px rgba(255, 122, 48, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(255, 122, 48, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(255, 122, 48, 0.1)',
        },
      },
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
      {/* Import Poppins Font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
      />
      <Container 
        maxWidth={false} 
        disableGutters
        sx={{ 
          width: '100%', 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #E9E3DF 0%, #F5F0EC 50%, #F0EBE7 100%)',
          py: 4,
          px: 4,
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(255, 122, 48, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(70, 92, 136, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.02) 0%, transparent 50%)
            `,
            zIndex: -1,
          },
        }}
      >
          {/* Header with Connection Status */}
          <Box display="flex" alignItems="center" justifyContent="center" mb={4} sx={{ width: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/')}
                sx={{ 
                  color: '#FF7A30', 
                  fontSize: '1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 122, 48, 0.1)',
                    transform: 'translateX(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Back to Home
              </Button>
              
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(255, 122, 48, 0.1) 0%, rgba(70, 92, 136, 0.1) 100%)',
                  borderRadius: 3,
                  px: 4,
                  py: 2,
                  border: '2px solid rgba(255, 122, 48, 0.2)',
                  mx: 4,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <Landslide sx={{ fontSize: 48, mr: 2, color: '#FF7A30' }} />
                <Typography variant="h4" component="h1" sx={{ color: '#000000', fontWeight: 700 }}>
                  Landslide Emergency Dashboard
                </Typography>
              </Box>
            
              {/* Connection Status */}
              <Box 
                display="flex" 
                alignItems="center" 
                gap={2}
                sx={{
                  background: wsConnected 
                    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(220, 20, 60, 0.1) 0%, rgba(220, 20, 60, 0.2) 100%)',
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  border: `2px solid ${wsConnected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(220, 20, 60, 0.3)'}`,
                }}
              >
                {wsConnected ? (
                  <Wifi sx={{ color: '#4caf50', fontSize: 28 }} />
                ) : (
                  <WifiOff sx={{ color: '#DC143C', fontSize: 28 }} />
                )}
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: wsConnected ? '#4caf50' : '#DC143C',
                    fontWeight: 600,
                  }}
                >
                  {connectionStatus}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 🚨 AUTO-RESCUE COUNTDOWN ALERT (ONE-TIME) */}
          {autoRescueCountdown > 0 && !autoRescueCompleted && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                width: '100%',
                background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.9) 0%, rgba(185, 18, 48, 0.9) 100%)',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)',
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
                mb: 3,
                width: '100%',
                background: 'linear-gradient(135deg, rgba(255, 122, 48, 0.9) 0%, rgba(230, 90, 0, 0.9) 100%)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)',
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
                mb: 3,
                width: '100%',
                background: 'linear-gradient(135deg, rgba(70, 92, 136, 0.9) 0%, rgba(54, 70, 112, 0.9) 100%)',
                color: 'white',
                fontSize: '1.0rem',
                fontWeight: 'bold',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)',
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

          <Box sx={{ width: '100%', maxWidth: '2200px', mx: 'auto' }}>
            <Grid container spacing={3} justifyContent="center" alignItems="flex-start" sx={{ width: '100%' }}>
              {/* Control Panel */}
              <Grid item xs={12} md={6} lg={5} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Paper 
                  sx={{ 
                    p: 4, 
                    backgroundColor: '#ffffff',
                    border: '2px solid #FF7A30',
                    borderRadius: 3,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                    minHeight: '500px',
                    height: 'fit-content',
                    width: '100%',
                    maxWidth: '600px',
                  }}
                >
                <Typography variant="h5" sx={{ mb: 4, color: '#000000', fontWeight: 600, textAlign: 'center' }}>
                  Landslide Control Panel
                  {/* 🚨 AUTO-RESCUE STATUS INDICATOR */}
                  {landslideDetected && !autoRescueCompleted && (
                    <Chip 
                      label="LANDSLIDE DETECTED" 
                      size="medium" 
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
                      size="medium" 
                      sx={{ 
                        ml: 2, 
                        backgroundColor: '#465C88', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      icon={<CheckCircle sx={{ color: 'white !important' }} />}
                    />
                  )}
                </Typography>

                {/* 🔥 Enhanced Status Alert with Feet Data and Auto-Rescue Info */}
                <Box mb={4}>
                  {getStatusLevel() === 'critical' ? (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        backgroundColor: 'rgba(220, 20, 60, 0.1)',
                        border: '2px solid #DC143C',
                        borderRadius: 2,
                        fontSize: '1rem',
                        py: 2,
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
                        backgroundColor: 'rgba(255, 122, 48, 0.1)',
                        border: '2px solid #FF7A30',
                        borderRadius: 2,
                        fontSize: '1rem',
                        py: 2,
                      }}
                    >
                      ⚠️ WARNING: Servo offline, movement detected - Drop: {currentDropFt.toFixed(2)} ft
                    </Alert>
                  ) : getStatusLevel() === 'alert' ? (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        backgroundColor: 'rgba(255, 140, 0, 0.1)',
                        border: '2px solid #FF8C00',
                        borderRadius: 2,
                        fontSize: '1rem',
                        py: 2,
                      }}
                    >
                      🟡 ALERT: Significant ground movement - Drop: {currentDropFt.toFixed(2)} ft
                    </Alert>
                  ) : (
                    <Alert 
                      severity="success"
                      sx={{ 
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        border: '2px solid #4caf50',
                        borderRadius: 2,
                        fontSize: '1rem',
                        alignItems: 'center',
                        py: 2,
                        textAlign: 'center',
                      }}
                    >
                      ✅ NORMAL: System stable - Drop: {currentDropFt.toFixed(2)} ft
                      <br />
                       Auto-rescue monitoring active - Threshold: {LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD} ft
                      {autoRescueCompleted && <span> | ⚠️ Auto-rescue completed</span>}
                    </Alert>
                  )}
                </Box>

                {/* 🚨 AUTO-RESCUE STATUS CARD */}
                <Card sx={{ mb: 4, backgroundColor: '#fff3e0', border: '2px solid #FF7A30', borderRadius: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: '#FF7A30', fontWeight: 600, mb: 3, textAlign: 'center' }}>
                       Auto-Rescue System Status (ONE-TIME)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body1" sx={{ color: '#000000', mb: 2 }}>
                          <b>Detection Threshold:</b> {LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD} ft
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#000000' }}>
                          <b>Auto-Activation:</b> {
                            autoRescueCompleted ? '✅ COMPLETED' :
                            landslideDetected ? '🔴 ARMED' : '🟢 MONITORING'
                          }
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body1" sx={{ color: '#000000', mb: 2 }}>
                          <b>Last Activation:</b> {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#000000' }}>
                          <b>Status:</b> {autoRescueCompleted ? '✅ ONE-TIME COMPLETE' : '🟢 READY'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box mt={3} p={3} sx={{ backgroundColor: '#ffebcc', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: '#FF7A30', fontWeight: 600, mb: 2 }}>
                        🚨 Auto-Rescue Info:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#000000', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        • Automatically triggers when landslide is detected<br />
                        • Posts to /rescue/landslide/on endpoint<br />
                        • One-time activation per landslide incident<br />
                        • Manual reset available after activation
                      </Typography>
                    </Box>

                    {/* Reset Button */}
                    {autoRescueCompleted && (
                      <Box mt={3} textAlign="center">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={resetAutoRescueSystem}
                          sx={{
                            borderColor: '#465C88',
                            color: '#465C88',
                            px: 3,
                            py: 1.5,
                            fontSize: '1rem',
                            '&:hover': { backgroundColor: 'rgba(70, 92, 136, 0.1)' }
                          }}
                        >
                          🔄 Reset Auto-Rescue System
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* 🔥 Feet Data Display */}
                <Card sx={{ mb: 4, backgroundColor: '#f0f8ff', border: '2px solid #465C88', borderRadius: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600, mb: 3, textAlign: 'center' }}>
                       Ground Movement Analysis
                    </Typography>
                    <Grid container spacing={4}>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <Height sx={{ color: '#465C88', fontSize: 28 }} />
                          <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500 }}>
                            <b>Current Drop:</b> {currentDropFt.toFixed(2)} ft
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((currentDropFt / 5) * 100, 100)} 
                          sx={{ 
                            height: 12, 
                            borderRadius: 6,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStatusColor(getDropSeverity(currentDropFt)),
                              borderRadius: 6,
                            }
                          }} 
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <TrendingUp sx={{ color: '#FF7A30', fontSize: 28 }} />
                          <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500 }}>
                            <b>Max Drop:</b> {maxDropFt.toFixed(2)} ft
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ color: '#465C88', fontWeight: 500, mt: 1 }}>
                          Sensor Height: {sensorHeight.toFixed(1)} ft
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box mt={3} p={2} sx={{ backgroundColor: 'rgba(70, 92, 136, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: '#465C88', fontWeight: 500 }}>
                        Detection Threshold: {LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD} ft | Current Status: {getStatusLevel().toUpperCase()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* Servo Control Buttons */}
                <Typography variant="h6" sx={{ mb: 3, color: '#000000', fontWeight: 600, textAlign: 'center' }}>
                  Servo Controls
                </Typography>
                <Grid container spacing={3} mb={4} justifyContent="center">
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: '#4caf50',
                        color: 'white',
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        '&:hover': { 
                          backgroundColor: '#45a049',
                        },
                        transition: 'all 0.3s ease',
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
                        borderColor: '#E43636',
                        backgroundColor: '#E43636',
                        color: 'white',
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        '&:hover': { 
                          backgroundColor: '#c72f2fff',
                          borderColor: '#c72f2fff',
                        },
                        transition: 'all 0.3s ease',
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
                        backgroundColor: '#386641',
                        borderColor: '#386641',
                        color: 'white',
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        '&:hover': { 
                          backgroundColor: '#2c5033ff',
                        },
                        transition: 'all 0.3s ease',
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
                        borderColor: '#901E3E',
                        backgroundColor: '#901E3E',
                        color: 'white',
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        '&:hover': { 
                          backgroundColor: '#7a1834ff',
                          borderColor: '#611329ff',
                        },
                        transition: 'all 0.3s ease',
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
                  <Box textAlign="center" mb={4}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        backgroundColor: rescueActive ? '#DC143C' : '#FF7A30',
                        color: 'white',
                        px: 5,
                        py: 2.5,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        borderRadius: 3,
                        '&:hover': {
                          backgroundColor: rescueActive ? '#b91230' : '#E65A00',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 16px rgba(255, 122, 48, 0.3)',
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
                    p: 4, 
                    background: 'linear-gradient(135deg, rgba(233, 227, 223, 0.8) 0%, rgba(245, 240, 236, 0.8) 100%)',
                    border: '2px solid rgba(255, 122, 48, 0.3)',
                    borderRadius: 3,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 700, mb: 3, textAlign: 'center' }}>
                    Current System Status
                  </Typography>
                  <Grid container spacing={4}>
                    <Grid item xs={6}>
                      <Typography variant="body1" sx={{ color: '#000000', mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Servo 1:</b> {servo1 === 1 ? '✅ Active' : '❌ Inactive'}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#000000', mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Servo 2:</b> {servo2 === 1 ? '✅ Active' : '❌ Inactive'}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Ground Drop:</b> {currentDropFt.toFixed(2)} ft
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body1" sx={{ color: '#000000', mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Alert Level:</b> {getStatusLevel().toUpperCase()}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#000000', mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Auto-Rescue:</b> {
                          autoRescueCompleted ? '✅ COMPLETED' :
                          landslideDetected ? '🔴 ARMED' : '🟢 MONITORING'
                        }
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Connection:</b> {wsConnected ? 'Real-time' : 'Polling'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Paper>
            </Grid>

            {/* 🔥 Enhanced Logs Section */}
            <Grid item xs={12} md={6} lg={7} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Paper 
                sx={{ 
                  p: 4, 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(70, 92, 136, 0.3)',
                  borderRadius: 3,
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                  minHeight: '700px',
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  maxWidth: '800px',
                }}
              >
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  mb={4}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(70, 92, 136, 0.1) 0%, rgba(70, 92, 136, 0.15) 100%)',
                    borderRadius: 3,
                    px: 3,
                    py: 2,
                    border: '2px solid rgba(70, 92, 136, 0.2)',
                  }}
                >
                  <Typography variant="h5" sx={{ color: '#000000', fontWeight: 700, textAlign: 'center' }}>
                    Landslide Detection Logs
                    {wsConnected && (
                      <Chip 
                        label="Real-time" 
                        size="medium" 
                        sx={{ 
                          ml: 2, 
                          backgroundColor: '#4caf50', 
                          color: 'white',
                          fontWeight: 600,
                          px: 2,
                        }}
                      />
                    )}
                    {/* 🚨 Auto-rescue indicator */}
                    {landslideDetected && !autoRescueCompleted && (
                      <Chip 
                        label="AUTO-RESCUE ARMED" 
                        size="medium" 
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
                        size="medium" 
                        sx={{ 
                          ml: 1, 
                          backgroundColor: '#465C88', 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </Typography>
                </Box>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" flex={1} minHeight="400px">
                    <CircularProgress sx={{ color: '#FF7A30', size: 60 }} />
                  </Box>
                ) : (
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      flex: 1,
                      maxHeight: '500px', 
                      overflow: 'auto',
                      backgroundColor: '#F5F5DD',
                      borderRadius: 2,
                      border: '1px solid rgba(70, 92, 136, 0.2)',
                    }}
                  >
                    <List sx={{ p: 0 }}>
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <ListItem 
                            key={index}
                            sx={{
                              borderBottom: '1px solid #e0e0e0',
                              py: 2,
                              px: 3,
                              '&:hover': { backgroundColor: 'rgba(255, 122, 48, 0.05)' },
                              '&:last-child': { borderBottom: 'none' }
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
                                  <Typography sx={{ color: '#34623f', fontWeight: 600, fontSize: '1rem' }}>
                                    Status: {log.status || 'normal'}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={`S1:${log.servo1 || 1} S2:${log.servo2 || 1}`}
                                    sx={{
                                      backgroundColor: (log.servo1 === 0 && log.servo2 === 0) ? '#DC143C' :
                                                     (log.servo1 === 0 || log.servo2 === 0) ? '#FF7A30' : '#4caf50',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                    }}
                                  />
                                  {/* 🔥 Feet Data Chip with Auto-Rescue Indicator */}
                                  <Chip
                                    size="small"
                                    label={`${(log.drop_ft || 0).toFixed(2)} ft${(log.drop_ft || 0) >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD ? ' 🚨' : ''}`}
                                    sx={{
                                      backgroundColor: (log.drop_ft || 0) >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD ? '#DC143C' : getStatusColor(getDropSeverity(log.drop_ft || 0)),
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      fontWeight: 600
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" sx={{ color: '#34623f', mb: 1, fontWeight: 500 }}>
                                    X: {(log.accel_x || 0).toFixed(2)} | Y: {(log.accel_y || 0).toFixed(2)} | Z: {(log.accel_z || 0).toFixed(2)}
                                  </Typography>
                                  {/* 🔥 Enhanced Feet Data Display with Auto-Rescue Info */}
                                  <Typography variant="body2" sx={{ color: '#FF7A30', fontWeight: 600 }}>
                                    📏 Drop: {(log.drop_ft || 0).toFixed(2)} ft | Height: {(log.sensor_height_ft || 10).toFixed(1)} ft
                                    {(log.drop_ft || 0) >= LANDSLIDE_DETECTION.CRITICAL_DROP_THRESHOLD && 
                                      <span style={{ color: '#DC143C' }}> | 🚨 AUTO-RESCUE TRIGGER (ONE-TIME)</span>
                                    }
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#666666', fontSize: '0.9rem' }}>
                                    {new Date(log.created_at || log.timestamp).toLocaleString()}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem sx={{ py: 6 }}>
                          <ListItemText 
                            primary={
                              <Box textAlign="center">
                                <Typography sx={{ color: '#34623f', fontSize: '1.1rem', fontWeight: 500 }}>
                                  No logs available. Waiting for data...
                                </Typography>
                                <CircularProgress sx={{ mt: 2, color: '#FF7A30' }} size={24} />
                              </Box>
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
          </Box>
        

        {/* 🚨 CSS for Pulse Animation */}
        <style jsx global>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
        `}</style>
      </Container>
    </ThemeProvider>
  );
};

export default LandslideDashboard;