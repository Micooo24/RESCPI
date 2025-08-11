import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import BASE_URL from '../common/baseurl';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Grid,
  Paper,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { 
  Water, 
  Dashboard, 
  Warning, 
  CheckCircle, 
  Refresh, 
  WifiOff, 
  Wifi,
  DirectionsCar,
  Emergency,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const WS_URL = 'ws://10.16.180.193:5000/flood/ws/frontend';

// RESCPI Modern Theme with Poppins font
const rescpiTheme = createTheme({
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
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  },
  palette: {
    background: {
      default: "#E9E3DF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#000000",
      secondary: "#465C88",
    },
    primary: {
      main: "#FF7A30",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#465C88",
      contrastText: "#FFFFFF",
    },
    error: {
      main: "#DC143C",
    },
    warning: {
      main: "#FF7A30",
    },
    success: {
      main: "#465C88",
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 2px 8px rgba(0, 0, 0, 0.05)',
    '0 4px 16px rgba(0, 0, 0, 0.08)',
    '0 8px 24px rgba(0, 0, 0, 0.12)',
    '0 12px 32px rgba(0, 0, 0, 0.15)',
    '0 16px 40px rgba(0, 0, 0, 0.18)',
    '0 20px 48px rgba(0, 0, 0, 0.2)',
    ...Array(18).fill('0 24px 56px rgba(0, 0, 0, 0.25)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          padding: '12px 32px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
  },
});

// 🚨 FLOOD DETECTION THRESHOLDS (UPDATED FOR IMMEDIATE RESCUE)
const FLOOD_DETECTION = {
  WARNING_LITERS_THRESHOLD: 1,       // Warning at 1 liter and up
  CRITICAL_LITERS_THRESHOLD: 2,      // Critical at 2 liters and up - IMMEDIATE RESCUE
  RESCUE_COOLDOWN: 30000,            // 30 seconds between auto-activations
};

const FloodDashboard = () => {
  const navigate = useNavigate();
  const [floodData, setFloodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  // 🚨 NEW: Auto-rescue states (ONE-TIME ONLY)
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [autoRescueTriggered, setAutoRescueTriggered] = useState(false);
  const [lastAutoRescueTime, setLastAutoRescueTime] = useState(0);
  const [criticalFloodDetected, setCriticalFloodDetected] = useState(false);
  const [autoRescueCompleted, setAutoRescueCompleted] = useState(false); // 🚨 NEW: One-time flag
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const hasTriggeredAutoRescue = useRef(false); // 🚨 NEW: Ref to prevent multiple triggers

  // 🚨 AUTO RESCUE ACTIVATION FUNCTION (ONE-TIME ONLY - IMMEDIATE)
  const triggerAutoRescue = async (reason) => {
    // 🚨 PREVENT MULTIPLE TRIGGERS - ABSOLUTE ONE-TIME ONLY
    if (hasTriggeredAutoRescue.current || autoRescueCompleted) {
      console.log('⏹️ Auto-rescue already triggered, ignoring duplicate - ONE-TIME ONLY');
      return;
    }

    const now = Date.now();
    
    // Check cooldown period
    if (now - lastAutoRescueTime < FLOOD_DETECTION.RESCUE_COOLDOWN) {
      console.log('⏳ Auto-rescue in cooldown period');
      return;
    }

    console.log(`🚨 AUTO-TRIGGERING FLOOD RESCUE IMMEDIATELY (ONE-TIME ONLY): ${reason}`);
    
    // 🚨 SET FLAGS TO PREVENT ANY DUPLICATES - PERMANENT UNTIL RESET
    hasTriggeredAutoRescue.current = true;
    setAutoRescueCompleted(true);
    
    try {
      setRescueLoading(true);
      setAutoRescueTriggered(true);
      setLastAutoRescueTime(now);
      
      // Show immediate notification
      toast.dismiss();
      toast.error(`🚨 FLOOD EMERGENCY: Auto-activating rescue vehicle IMMEDIATELY! Reason: ${reason}`, {
        duration: 8000,
        style: {
          background: '#DC143C',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }
      });

      // Call the rescue API endpoint
      const response = await axios.post(`${BASE_URL}/rescue/flood/on`);
      
      if (response.data.status === 'success') {
        setRescueActive(true);
        console.log('✅ Auto-rescue vehicle activated successfully for flood (IMMEDIATE - ONE-TIME ONLY)');
        
        toast.success('✅ Flood rescue vehicle automatically activated IMMEDIATELY! (One-time trigger - permanent until reset)', {
          duration: 8000,
          style: {
            background: '#0077b6',
            color: 'white',
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
      // 🚨 Reset flags on failure only
      hasTriggeredAutoRescue.current = false;
      setAutoRescueCompleted(false);
    } finally {
      setRescueLoading(false);
      setTimeout(() => setAutoRescueTriggered(false), 5000);
    }
  };

  // 🚨 CRITICAL FLOOD DETECTION LOGIC (ONE-TIME TRIGGER ONLY) - IMMEDIATE RESCUE
  const detectCriticalFlood = (liters) => {
    const isCritical = liters !== null && liters !== undefined && liters >= FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD;
    
    // 🚨 ONE-TIME TRIGGER LOGIC - IMMEDIATE ACTIVATION
    if (isCritical && !criticalFloodDetected && !autoRescueCompleted) {
      // New critical flood detected AND not already triggered - IMMEDIATE RESCUE
      setCriticalFloodDetected(true);
      
      const reason = `Critical flood level: ${liters}L water volume (≥${FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L)`;
      
      console.log(`🚨 CRITICAL FLOOD DETECTED - TRIGGERING IMMEDIATE RESCUE (ONE-TIME ONLY): ${reason}`);
      
      // 🚨 IMMEDIATE RESCUE ACTIVATION - NO DELAY
      triggerAutoRescue(reason);
      
    } else if (!isCritical && criticalFloodDetected && !autoRescueCompleted) {
      // 🚨 Flood level improved BUT auto-rescue not completed yet
      setCriticalFloodDetected(false);
      console.log('✅ Critical flood conditions cleared before auto-rescue trigger');
    }
    
    // 🚨 If auto-rescue is completed, maintain the detection state
    if (isCritical && autoRescueCompleted) {
      setCriticalFloodDetected(true);
      console.log('🚨 Critical flood continues - auto-rescue already completed (ONE-TIME)');
    }
    
    return isCritical;
  };

  // 🚨 RESET FUNCTION (for manual reset if needed)
  const resetAutoRescueSystem = () => {
    hasTriggeredAutoRescue.current = false;
    setAutoRescueCompleted(false);
    setCriticalFloodDetected(false);
    setAutoRescueTriggered(false);
    
    console.log('🔄 Flood auto-rescue system reset - monitoring resumed');
    toast.success('🔄 Flood auto-rescue system reset - IMMEDIATE trigger re-enabled');
  };

  // Manual Toggle Rescue Vehicle
  const toggleRescueVehicle = async () => {
    setRescueLoading(true);
    const actionUrl = rescueActive
      ? `${BASE_URL}/rescue/off`
      : `${BASE_URL}/rescue/flood/on`;

    try {
      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        toast.success(`🚑 Flood Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'} (Manual Override)`);
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

  // 🚨 NEW: Emergency Stop Rescue Function
  const emergencyStopRescue = async () => {
    setRescueLoading(true);
    
    try {
      const response = await axios.post(`${BASE_URL}/rescue/off`);
      
      if (response.data.status === 'success') {
        setRescueActive(false);
        toast.success('🛑 Emergency Stop: Rescue vehicle deactivated!', {
          duration: 5000,
          style: {
            background: '#DC143C',
            color: 'white',
            fontWeight: 'bold'
          }
        });
        console.log('✅ Emergency stop: Rescue vehicle deactivated');
      } else {
        toast.error('⚠️ Failed to emergency stop rescue vehicle');
      }
    } catch (error) {
      console.error('❌ Error emergency stopping rescue vehicle:', error);
      toast.error('❌ Emergency stop failed');
    } finally {
      setRescueLoading(false);
    }
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
        console.log('✅ WebSocket connected to flood monitoring');
        setWsConnected(true);
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
        
        // Send a keep-alive message to maintain connection
        const keepAlive = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(keepAlive);
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received flood data:', data);
          
          // Handle sensor data from ESP32
          if (data.type === 'sensor' || data.distance !== undefined || data.liters !== undefined) {
            const newFloodData = {
              ...data,
              timestamp: data.timestamp || new Date().toISOString()
            };
            setFloodData(newFloodData);
            
            // 🚨 NEW: Check for critical flood detection using LITERS (IMMEDIATE RESCUE)
            if (data.liters !== undefined) {
              detectCriticalFlood(data.liters);
            }
            
            setLoading(false);
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
          fetchFloodDataREST();
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

  // Fallback REST API fetch
  const fetchFloodDataREST = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(`${BASE_URL}/flood/latest`);
      if (response.data.status === 'success') {
        const newFloodData = response.data.data;
        setFloodData(newFloodData);
        
        // 🚨 Check for critical flood detection from REST data using LITERS (IMMEDIATE RESCUE)
        if (newFloodData.liters !== undefined) {
          detectCriticalFlood(newFloodData.liters);
        }
        
        setConnectionStatus('REST API');
      } else {
        setFloodData(null);
        setConnectionStatus('No Data');
      }
    } catch (error) {
      console.error('Error fetching flood data via REST:', error);
      setConnectionStatus('API Error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Close WebSocket connection
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setWsConnected(false);
  };

  useEffect(() => {
    // Try WebSocket first, fallback to REST
    connectWebSocket();
    
    // Initial REST API call as backup
    setTimeout(() => {
      if (!wsConnected && !floodData) {
        fetchFloodDataREST();
      }
    }, 5000);
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // Toggle pump ON/OFF
  const togglePump = async () => {
    if (!floodData) return;
    setButtonLoading(true);
    const isPumpOn = floodData.pump === 'ON';
    const url = isPumpOn ? `${BASE_URL}/flood/control/off` : `${BASE_URL}/flood/control/on`;

    try {
      const response = await axios.post(url);
      if (response.data.status === 'success') {
        toast.success(`Pump turned ${isPumpOn ? 'OFF' : 'ON'}`);
        
        // If WebSocket is not connected, fetch updated data via REST
        if (!wsConnected) {
          setTimeout(() => fetchFloodDataREST(false), 500);
        }
      } else {
        toast.error('Failed to toggle pump');
      }
    } catch (error) {
      toast.error('Error toggling pump');
      console.error(error);
    } finally {
      setButtonLoading(false);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    if (wsConnected) {
      // Reconnect WebSocket to get fresh data
      disconnectWebSocket();
      setTimeout(() => connectWebSocket(), 1000);
    } else {
      fetchFloodDataREST(true);
    }
  };

  // 🚨 UPDATED: Determine alert status based on LITERS instead of distance
  const getAlertStatus = (liters) => {
    if (liters === null || liters === undefined) return 'unknown';
    if (liters >= FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD) return 'critical';  // ≥2L = Critical
    if (liters >= FLOOD_DETECTION.WARNING_LITERS_THRESHOLD) return 'warning';    // ≥1L = Warning
    return 'normal';  // <1L = Normal
  };

  const alertColors = {
    critical: '#DC143C',
    warning: '#cc4a02',
    normal: '#66FF00',
    unknown: '#999999',
  };

  const showRescueButton = floodData && getAlertStatus(floodData.liters) === 'critical' && !autoRescueCompleted;

  return (
    <ThemeProvider theme={rescpiTheme}>
      {/* Import Poppins Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #E9E3DF 0%, #F5F0EC 100%)",
          py: 4,
          position: "relative",
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #FF7A30 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, #465C88 0%, transparent 50%)
            `,
            zIndex: 0,
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          {/* Header with Navigation and Connection Status */}
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            mb={4}
            sx={{
              background: "linear-gradient(135deg, #FFFFFF 0%, #F8F8F8 100%)",
              p: 3,
              borderRadius: 4,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Box display="flex" alignItems="center">
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/')}
                sx={{ 
                  color: '#465C88', 
                  mr: 3,
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  border: '2px solid #465C88',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(70, 92, 136, 0.1)',
                    transform: 'scale(1.02)',
                  }
                }}
              >
                Back to Home
              </Button>
              <Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    background: "linear-gradient(135deg, #FF7A30 0%, #465C88 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  Flood Emergency Dashboard
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ 
                    color: "#465C88",
                    fontWeight: 500,
                    mt: 0.5,
                  }}
                >
                  Real-time Flood Monitoring & Response System
                </Typography>
              </Box>
            </Box>
            <Box 
              display="flex" 
              alignItems="center" 
              gap={2}
              sx={{
                background: wsConnected ? "rgba(70, 92, 136, 0.1)" : "rgba(220, 20, 60, 0.1)",
                px: 3,
                py: 1.5,
                borderRadius: 3,
                border: `2px solid ${wsConnected ? '#465C88' : '#DC143C'}`,
              }}
            >
              {wsConnected ? (
                <Wifi sx={{ color: '#465C88', fontSize: 28 }} />
              ) : (
                <WifiOff sx={{ color: '#DC143C', fontSize: 28 }} />
              )}
              <Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: wsConnected ? '#465C88' : '#DC143C',
                    fontWeight: 600,
                  }}
                >
                  {connectionStatus}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: wsConnected ? '#465C88' : '#DC143C',
                    opacity: 0.8,
                  }}
                >
                  {wsConnected ? 'Real-time Connected' : 'Connection Lost'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 🚨 AUTO-RESCUE TRIGGERED NOTIFICATION (IMMEDIATE) */}
          {autoRescueTriggered && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(220, 20, 60, 0.9)',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 700,
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(220, 20, 60, 0.3)',
                animation: 'pulse 1s infinite',
                border: '2px solid #DC143C',
              }}
              icon={<Emergency sx={{ color: 'white', fontSize: 32 }} />}
            >
              🚨 CRITICAL FLOOD DETECTED! RESCUE VEHICLE ACTIVATED IMMEDIATELY! (ONE-TIME ACTIVATION)
            </Alert>
          )}

          {/* 🚨 AUTO-RESCUE COMPLETED NOTIFICATION */}
          {autoRescueCompleted && !autoRescueTriggered && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(255, 122, 48, 0.9)',
                color: 'white',
                fontSize: '1.0rem',
                fontWeight: 600,
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(255, 122, 48, 0.3)',
                border: '2px solid #FF7A30',
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={resetAutoRescueSystem}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  RESET SYSTEM
                </Button>
              }
            >
              ✅ FLOOD AUTO-RESCUE COMPLETED - Vehicle activated IMMEDIATELY, remains active during critical conditions
            </Alert>
          )}

          {/* 🚨 CRITICAL FLOOD PERSISTENT ALERT */}
          {criticalFloodDetected && autoRescueCompleted && !autoRescueTriggered && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(139, 0, 0, 0.9)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(139, 0, 0, 0.3)',
                border: '2px solid #8B0000',
              }}
              icon={<Warning sx={{ color: 'white', fontSize: 28 }} />}
            >
              🚨 CRITICAL FLOOD CONDITIONS PERSIST - Rescue vehicle remains active (IMMEDIATE rescue completed)
            </Alert>
          )}

          {loading ? (
            <Box 
              display="flex" 
              flexDirection="column"
              justifyContent="center" 
              alignItems="center"
              sx={{ 
                mt: 10,
                p: 6,
                borderRadius: 4,
                background: "linear-gradient(135deg, #FFFFFF 0%, #F8F8F8 100%)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              }}
            >
              <CircularProgress 
                size={60}
                sx={{ 
                  color: '#FF7A30',
                  mb: 3,
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  }
                }} 
              />
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#465C88',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Loading Flood Data...
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#465C88',
                  opacity: 0.7,
                }}
              >
                Connecting to monitoring systems
              </Typography>
            </Box>
          ) : floodData ? (
            <Grid container spacing={4}>
              {/* Main Monitoring Cards */}
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={3} mb={4}>
                  <Card 
                    sx={{ 
                      flex: 1, 
                      textAlign: 'center',
                      background: "linear-gradient(135deg, #FFFFFF 0%, #F8FFFE 100%)",
                      border: '2px solid rgba(79, 195, 247, 0.3)',
                      position: "relative",
                      overflow: "hidden",
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, #4FC3F7, #03A9F4)',
                      },
                    }}
                  >
                    <CardContent sx={{ pt: 4 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #4FC3F7, #03A9F4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                          mb: 2,
                          boxShadow: "0 4px 16px rgba(79, 195, 247, 0.3)",
                        }}
                      >
                        <Water sx={{ fontSize: 32, color: '#FFFFFF' }} />
                      </Box>
                      <Typography variant="h6" sx={{ color: '#465C88', fontWeight: 600, mb: 1 }}>
                        Water Volume
                      </Typography>
                      <Typography 
                        variant="h2" 
                        sx={{ 
                          color: '#4FC3F7',
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        {floodData.liters ?? 0} L
                      </Typography>
                      {floodData.distance && (
                        <Typography variant="body2" sx={{ color: '#465C88', opacity: 0.8 }}>
                          {floodData.distance} cm depth
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  <Card 
                    sx={{ 
                      flex: 1, 
                      textAlign: 'center',
                      background: "linear-gradient(135deg, #FFFFFF 0%, #F8FFF8 100%)",
                      border: '2px solid rgba(70, 92, 136, 0.3)',
                      position: "relative",
                      overflow: "hidden",
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, #465C88, #3f5175)',
                      },
                    }}
                  >
                    <CardContent sx={{ pt: 4 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #465C88, #3f5175)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                          mb: 2,
                          boxShadow: "0 4px 16px rgba(70, 92, 136, 0.3)",
                        }}
                      >
                        <Dashboard sx={{ fontSize: 32, color: '#FFFFFF' }} />
                      </Box>
                      <Typography variant="h6" sx={{ color: '#465C88', fontWeight: 600, mb: 2 }}>
                        Pump Status
                      </Typography>
                      <Chip
                        label={floodData.pump || 'OFF'}
                        color={floodData.pump === 'ON' ? 'success' : 'error'}
                        sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.1rem',
                          px: 2,
                          py: 1,
                          height: 'auto',
                          borderRadius: 3,
                        }}
                      />
                      {floodData.mode && (
                        <Typography variant="body2" sx={{ color: '#465C88', opacity: 0.8, mt: 2 }}>
                          Mode: {floodData.mode}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  <Card 
                    sx={{ 
                      flex: 1, 
                      textAlign: 'center',
                      background: `linear-gradient(135deg, #FFFFFF 0%, ${alertColors[getAlertStatus(floodData.liters)]}08 100%)`,
                      border: `2px solid ${alertColors[getAlertStatus(floodData.liters)]}40`,
                      position: "relative",
                      overflow: "hidden",
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: alertColors[getAlertStatus(floodData.liters)],
                      },
                    }}
                  >
                    <CardContent sx={{ pt: 4 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          background: alertColors[getAlertStatus(floodData.liters)],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                          mb: 2,
                          boxShadow: `0 4px 16px ${alertColors[getAlertStatus(floodData.liters)]}40`,
                        }}
                      >
                        {getAlertStatus(floodData.liters) === 'critical' ? (
                          <Warning sx={{ fontSize: 32, color: '#FFFFFF' }} />
                        ) : getAlertStatus(floodData.liters) === 'warning' ? (
                          <Warning sx={{ fontSize: 32, color: '#FFFFFF' }} />
                        ) : (
                          <CheckCircle sx={{ fontSize: 32, color: '#FFFFFF' }} />
                        )}
                      </Box>
                      <Typography variant="h6" sx={{ color: '#465C88', fontWeight: 600, mb: 1 }}>
                        Alert Status
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          textTransform: 'uppercase', 
                          color: alertColors[getAlertStatus(floodData.liters)],
                          fontWeight: 700,
                          mb: 2,
                        }}
                      >
                        {getAlertStatus(floodData.liters)}
                      </Typography>
                      {/* 🚨 Auto-rescue status indicator */}
                      {criticalFloodDetected && !autoRescueCompleted && (
                        <Chip 
                          label="RESCUE ARMED" 
                          size="small" 
                          sx={{ 
                            backgroundColor: '#DC143C', 
                            color: 'white',
                            fontWeight: 700,
                            borderRadius: 2,
                            animation: 'pulse 2s infinite'
                          }}
                        />
                      )}
                      {autoRescueCompleted && (
                        <Chip 
                          label="RESCUE ACTIVE" 
                          size="small" 
                          sx={{ 
                            backgroundColor: '#FF7A30', 
                            color: 'white',
                            fontWeight: 700,
                            borderRadius: 2,
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>

              {/* 🚨 AUTO-RESCUE STATUS CARD - UPDATED FOR IMMEDIATE RESCUE */}
              <Grid item xs={12} md={6}>
                <Paper 
                  sx={{ 
                    p: 4, 
                    background: "linear-gradient(135deg, #FFFFFF 0%, #F0F8FF 100%)",
                    border: '3px solid #FF7A30',
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: 'linear-gradient(90deg, #FF7A30, #465C88)',
                    },
                  }}
                >
                  <Box display="flex" alignItems="center" mb={3}>
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #FF7A30, #465C88)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                        boxShadow: "0 4px 16px rgba(255, 122, 48, 0.3)",
                      }}
                    >
                      <Typography sx={{ fontSize: '1.5rem' }}>🤖</Typography>
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#465C88', 
                        fontWeight: 700,
                      }}
                    >
                      Flood Auto-Rescue System (IMMEDIATE ACTIVATION)
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Warning Threshold:</b> ≥{FLOOD_DETECTION.WARNING_LITERS_THRESHOLD}L
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Critical Threshold:</b> ≥{FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Current Volume:</b> {floodData.liters}L
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Auto-Activation:</b> {
                          autoRescueCompleted ? '✅ COMPLETED (ACTIVE)' :
                          criticalFloodDetected ? '🔴 ARMED' : '🟢 MONITORING'
                        }
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Last Activation:</b> {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Rescue Vehicle:</b> {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', mb: 1, fontWeight: 500 }}>
                        <b>Status:</b> {autoRescueCompleted ? '✅ IMMEDIATE COMPLETE' : '🟢 READY'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {/* Status Description */}
                  <Box 
                    mt={3} 
                    p={3} 
                    sx={{ 
                      background: "linear-gradient(135deg, #E8F4F8 0%, #F0F8FF 100%)",
                      borderRadius: 3,
                      border: '1px solid rgba(255, 122, 48, 0.2)',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#FF7A30', fontWeight: 700, mb: 1 }}>
                      🔍 How it works:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#465C88', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      • <b>Warning:</b> ≥{FLOOD_DETECTION.WARNING_LITERS_THRESHOLD}L water volume<br />
                      • <b>Critical:</b> ≥{FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L - triggers <b>IMMEDIATE</b> rescue (no delay)<br />
                      • Vehicle activates instantly and remains active<br />
                      • Manual reset required to re-enable auto-trigger<br />
                      • Manual override always available
                    </Typography>
                  </Box>

                  {/* Reset Button */}
                  {autoRescueCompleted && (
                    <Box mt={3}>
                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={resetAutoRescueSystem}
                        sx={{
                          borderColor: '#FF7A30',
                          color: '#FF7A30',
                          fontWeight: 600,
                          borderRadius: 3,
                          px: 3,
                          py: 1.5,
                          '&:hover': { 
                            backgroundColor: 'rgba(255, 122, 48, 0.1)',
                            borderColor: '#465C88',
                            color: '#465C88',
                          }
                        }}
                      >
                        🔄 Reset Auto-Rescue System
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid>

          {/* Control Panel */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', border: '2px solid #2d6a4f' }}>
              <Typography variant="h6" sx={{ color: '#2d6a4f', fontWeight: 600, mb: 2 }}>
                Flood Control Panel
              </Typography>
              
              <Box textAlign="center" mb={3}>
                <Button
                  variant="contained"
                  color={floodData.pump === 'ON' ? 'error' : 'success'}
                  onClick={togglePump}
                  disabled={buttonLoading}
                  sx={{ mr: 2, mb: 2 }}
                >
                  {buttonLoading ? 'Processing...' : floodData.pump === 'ON' ? 'Turn Pump OFF' : 'Turn Pump ON'}
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<Refresh />} 
                  onClick={handleRefresh} 
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  Refresh Data
                </Button>

                {/* 🚨 NEW: Emergency Stop Rescue Button - Always visible when rescue is active */}
                {rescueActive && (
                  <Box mt={2} mb={2}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        backgroundColor: '#DC143C',
                        color: 'white',
                        px: 4,
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        mr: 2,
                        '&:hover': {
                          backgroundColor: '#b91230',
                        },
                      }}
                      startIcon={<Emergency />}
                      onClick={emergencyStopRescue}
                      disabled={rescueLoading}
                    >
                      {rescueLoading ? "Stopping..." : "🛑 EMERGENCY STOP RESCUE"}
                    </Button>
                  </Box>
                )}

                {/* Manual Rescue Vehicle Button - Always show when critical */}
                {getAlertStatus(floodData.liters) === 'critical' && (
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        backgroundColor: rescueActive ? '#DC143C' : '#0077b6',
                        color: 'white',
                        px: 4,
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: rescueActive ? '#b91230' : '#005f8a',
                        },
                      }}
                      startIcon={<DirectionsCar />}
                      onClick={toggleRescueVehicle}
                      disabled={rescueLoading}
                    >
                      {rescueLoading
                        ? "Processing..."
                        : rescueActive
                        ? "🛑 Deactivate Flood Rescue"
                        : autoRescueCompleted 
                        ? "🚨 REACTIVATE RESCUE (Manual)"
                        : "🚨 MANUAL FLOOD RESCUE"}
                    </Button>
                    
                    {autoRescueCompleted && (
                      <Typography variant="body2" sx={{ color: '#666', mt: 1, fontStyle: 'italic' }}>
                        Immediate auto-rescue completed - Manual control available
                      </Typography>
                    )}
                  </Box>
                )}

                {/* 🚨 NEW: Alternative Emergency Stop Button in Control Panel */}
                <Box mt={3}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={emergencyStopRescue}
                    disabled={rescueLoading || !rescueActive}
                    sx={{ 
                      borderColor: '#DC143C',
                      color: '#DC143C',
                      '&:hover': {
                        backgroundColor: 'rgba(220, 20, 60, 0.1)',
                        borderColor: '#b91230'
                      }
                    }}
                  >
                    {rescueLoading ? 'Stopping...' : '🛑 Turn Off Rescue Vehicle'}
                  </Button>
                </Box>
              </Box>

              {/* Current Status */}
              <Card sx={{ p: 2, backgroundColor: '#F5F5DD' }}>
                <Typography variant="h6" sx={{ color: '#2d6a4f', fontWeight: 600, mb: 1 }}>
                  Current Status
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  <b>Water Volume:</b> {floodData.liters}L | <b>Alert:</b> {getAlertStatus(floodData.liters).toUpperCase()}
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  <b>Thresholds:</b> Warning ≥{FLOOD_DETECTION.WARNING_LITERS_THRESHOLD}L | Critical ≥{FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L (IMMEDIATE)
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  <b>Auto-Rescue:</b> {
                    autoRescueCompleted ? '✅ IMMEDIATE COMPLETE' :
                    criticalFloodDetected ? '🔴 ARMED' : '🟢 MONITORING'
                  }
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  <b>Rescue Vehicle:</b> {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  <b>Connection:</b> {wsConnected ? 'Real-time' : 'Polling'}
                </Typography>
              </Card>
            </Paper>
          </Grid>

          {/* Last Update Info */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Last update: {new Date(floodData.timestamp).toLocaleString()}
              {wsConnected && ' • Real-time via WebSocket'}
              {autoRescueCompleted && ' • 🚨 Auto-rescue system: IMMEDIATE activation completed'}
            </Typography>
          </Grid>
        </Grid>
      ) : (
        <Alert 
          severity="warning"
          sx={{
            borderRadius: 3,
            fontSize: '1.1rem',
            fontWeight: 500,
          }}
        >
          No flood data available. ESP32 may not be connected.
        </Alert>
      )}

      {/* 🚨 CSS for Pulse Animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FloodDashboard;