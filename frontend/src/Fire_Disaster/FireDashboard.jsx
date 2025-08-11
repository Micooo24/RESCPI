import React, { useState, useEffect, useRef } from 'react';
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
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  CircularProgress,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack,
  LocalFireDepartment,
  WarningAmber,
  Assessment,
  Wifi,
  WifiOff,
  DirectionsCar,
  Refresh,
  TrendingUp,
  Speed,
  Emergency,
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import BASE_URL from '../common/baseurl';
import toast from 'react-hot-toast';

// WebSocket URL
const WS_URL = 'ws://10.16.180.193:5000/gasfire/ws/frontend';

// Modern theme with RESCPI color scheme (E9E3DF, FF7A30, 465C88, 000000) and Poppins font
const fireTheme = createTheme({
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

const FireDashboard = () => {
  const navigate = useNavigate();
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [latestData, setLatestData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [vehicleStatus, setVehicleStatus] = useState('OFF');
  
  // 🔥 NEW: Auto fire rescue states
  const [autoFireRescueTriggered, setAutoFireRescueTriggered] = useState(false);
  const [fireDetected, setFireDetected] = useState(false);
  const [lastAutoRescueTime, setLastAutoRescueTime] = useState(0);
  const hasTriggeredFireRescue = useRef(false);
  
  // Enhanced state for gas metrics
  const [maxMQ2, setMaxMQ2] = useState(0);
  const [maxMQ7, setMaxMQ7] = useState(0);
  const [avgMQ2, setAvgMQ2] = useState(0);
  const [avgMQ7, setAvgMQ7] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // 🔥 AUTO FIRE RESCUE ACTIVATION FUNCTION
  const triggerAutoFireRescue = async (reason) => {
    // Prevent multiple triggers
    if (hasTriggeredFireRescue.current) {
      console.log('⏹️ Auto fire rescue already triggered, ignoring duplicate');
      return;
    }

    const now = Date.now();
    
    // Check cooldown period (30 seconds)
    if (now - lastAutoRescueTime < 30000) {
      console.log('⏳ Auto fire rescue in cooldown period');
      return;
    }

    console.log(`🔥 AUTO-TRIGGERING FIRE RESCUE: ${reason}`);
    
    hasTriggeredFireRescue.current = true;
    
    try {
      setRescueLoading(true);
      setAutoFireRescueTriggered(true);
      setLastAutoRescueTime(now);
      
      // Show immediate notification
      toast.dismiss();
      toast.error(`🔥 FIRE EMERGENCY: Auto-activating rescue vehicle! Reason: ${reason}`, {
        duration: 8000,
        style: {
          background: '#DC143C',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }
      });

      // Call the fire rescue API endpoint
      const response = await axios.post(`${BASE_URL}/rescue/fire/on`);
      
      if (response.data.status === 'success') {
        setRescueActive(true);
        console.log('✅ Auto fire rescue vehicle activated successfully');
        
        toast.success('🚑 Fire rescue vehicle automatically activated!', {
          duration: 8000,
          style: {
            background: '#cc4a02',
            color: 'white',
            fontWeight: 'bold'
          }
        });
      } else {
        throw new Error('API returned non-success status');
      }
      
    } catch (error) {
      console.error('❌ Auto fire rescue activation failed:', error);
      toast.error('❌ Failed to auto-activate fire rescue vehicle', {
        duration: 5000,
        style: {
          background: '#DC143C',
          color: 'white'
        }
      });
      // Reset flag on failure
      hasTriggeredFireRescue.current = false;
    } finally {
      setRescueLoading(false);
      setTimeout(() => setAutoFireRescueTriggered(false), 5000);
    }
  };

  // 🔥 RESET AUTO RESCUE SYSTEM
  const resetAutoFireRescueSystem = () => {
    hasTriggeredFireRescue.current = false;
    setAutoFireRescueTriggered(false);
    setFireDetected(false);
    
    console.log('🔄 Fire auto-rescue system reset');
    toast.success('🔄 Fire auto-rescue system reset - monitoring resumed');
  };

  // 🔥 NEW: Emergency Stop Rescue Function
  const emergencyStopRescue = async () => {
    setRescueLoading(true);
    
    try {
      const response = await axios.post(`${BASE_URL}/rescue/off`);
      
      if (response.data.status === 'success') {
        setRescueActive(false);
        toast.success('🛑 Emergency Stop: Fire rescue vehicle deactivated!', {
          duration: 5000,
          style: {
            background: '#DC143C',
            color: 'white',
            fontWeight: 'bold'
          }
        });
        console.log('✅ Emergency stop: Fire rescue vehicle deactivated');
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
        console.log('✅ WebSocket connected to gas/fire monitoring');
        setWsConnected(true);
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received gas/fire data:', data);
          
          // Handle sensor data from ESP32
          if (data.type === 'sensor' || data.mq2_ppm !== undefined) {
            const enhancedData = {
              ...data,
              timestamp: data.timestamp || new Date().toISOString(),
              _id: data._id || Date.now().toString()
            };
            
            setLatestData(enhancedData);
            
            // Update metrics
            if (data.mq2_ppm !== undefined) {
              setMaxMQ2(prev => Math.max(prev, data.mq2_ppm));
            }
            if (data.mq7_ppm !== undefined) {
              setMaxMQ7(prev => Math.max(prev, data.mq7_ppm));
            }
            
            // Add to logs (prepend to show latest first)
            setFireData(prevData => [enhancedData, ...prevData.slice(0, 49)]);
            
            // 🔥 Check for fire detection and auto-rescue
            if (data.flame !== undefined) {
              detectFire(data.flame, data);
            }
            
            // Check for alerts
            checkForAlerts(data);
            
            setLoading(false);
          }
          
          // Handle vehicle status updates
          if (data.type === 'vehicle_status') {
            console.log('🚗 Vehicle status update:', data);
            setVehicleStatus(data.status || 'OFF');
            toast.success(`🚑 Vehicle ${data.status || 'updated'}`);
          }
          
          // Handle control responses
          if (data.type === 'control' || data.type === 'vehicle_control') {
            console.log('🎛️ Control response:', data);
            toast.success(`Vehicle ${data.action || 'controlled'} successfully`);
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
          fetchAllDataREST();
        }
      };

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setWsConnected(false);
      setConnectionStatus('Connection Failed');
      scheduleReconnect();
    }
  };

  // 🔥 FIRE DETECTION LOGIC
  const detectFire = (flameDetected, data) => {
    if (flameDetected && !fireDetected) {
      // New fire detected
      setFireDetected(true);
      
      const reason = `Fire detected! MQ2: ${data.mq2_ppm?.toFixed(1)}ppm, MQ7: ${data.mq7_ppm?.toFixed(1)}ppm`;
      
      console.log(`🔥 FIRE DETECTED - TRIGGERING AUTO RESCUE: ${reason}`);
      
      // Trigger auto rescue
      triggerAutoFireRescue(reason);
      
    } else if (!flameDetected && fireDetected) {
      // Fire cleared
      setFireDetected(false);
      console.log('✅ Fire conditions cleared');
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

  // Enhanced alert checking
  const checkForAlerts = (data) => {
    const mq2Level = data.mq2_ppm || 0;
    const mq7Level = data.mq7_ppm || 0;
    const fireDetected = data.flame || false;

    let alertMessage = '';

    if (fireDetected) {
      alertMessage = `🔥 FIRE DETECTED! MQ2: ${mq2Level.toFixed(1)} ppm, MQ7: ${mq7Level.toFixed(1)} ppm`;
    } else if (mq2Level > 200 && mq7Level > 100) {
      alertMessage = `🚨 CRITICAL GAS LEVELS! MQ2: ${mq2Level.toFixed(1)} ppm, MQ7: ${mq7Level.toFixed(1)} ppm`;
    } else if (mq2Level > 200) {
      alertMessage = `⚠️ HIGH MQ2 GAS DETECTED: ${mq2Level.toFixed(1)} ppm`;
    } else if (mq7Level > 100) {
      alertMessage = `⚠️ HIGH MQ7 GAS DETECTED: ${mq7Level.toFixed(1)} ppm`;
    }

    if (alertMessage) {
      toast.dismiss();
      toast.success(alertMessage, { duration: 6000 });
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

  // Fallback REST API fetch
  const fetchAllDataREST = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/gasfire/all`);
      if (response.data.status === 'success') {
        const data = response.data.data || [];
        setFireData(data);
        
        if (data.length > 0) {
          setLatestData(data[0]);
          
          // Check for fire in latest data
          if (data[0].flame !== undefined) {
            detectFire(data[0].flame, data[0]);
          }
          
          // Calculate metrics
          const mq2Values = data.map(item => item.mq2_ppm || 0);
          const mq7Values = data.map(item => item.mq7_ppm || 0);
          
          setMaxMQ2(Math.max(...mq2Values));
          setMaxMQ7(Math.max(...mq7Values));
          setAvgMQ2(mq2Values.reduce((a, b) => a + b, 0) / mq2Values.length);
          setAvgMQ7(mq7Values.reduce((a, b) => a + b, 0) / mq7Values.length);
        }
        
        setConnectionStatus('REST API');
      }
    } catch (error) {
      console.error('Error fetching fire data:', error);
      setConnectionStatus('API Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try WebSocket first, fallback to REST
    connectWebSocket();
    
    // Initial REST API call as backup
    setTimeout(() => {
      if (!wsConnected) {
        fetchAllDataREST();
      }
    }, 5000);
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // Vehicle control via WebSocket/REST
  const controlVehicle = async (action) => {
    try {
      const response = await axios.post(`${BASE_URL}/gasfire/vehicle/${action}`);
      if (response.data.status === 'success') {
        toast.success(`🚑 Vehicle ${action.toUpperCase()} command sent`);
        setVehicleStatus(action.toUpperCase());
      } else {
        toast.error('Failed to control vehicle');
      }
    } catch (error) {
      console.error('Error controlling vehicle:', error);
      toast.error('Error controlling vehicle');
    }
  };

  // Manual rescue vehicle activation
  const handleRescueClick = async () => {
    setRescueLoading(true);
    try {
      const actionUrl = rescueActive
        ? `${BASE_URL}/rescue/off`
        : `${BASE_URL}/rescue/fire/on`;

      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        toast.success(`🚑 Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'}`);
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

  // Manual refresh
  const handleRefresh = () => {
    if (wsConnected) {
      disconnectWebSocket();
      setTimeout(() => connectWebSocket(), 1000);
    } else {
      fetchAllDataREST();
    }
  };

  // Get gas level severity
  const getGasLevelSeverity = (mq2, mq7) => {
    if (mq2 > 300 || mq7 > 150) return 'critical';
    if (mq2 > 200 || mq7 > 100) return 'warning';
    return 'normal';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#DC143C';
      case 'warning': return '#cc4a02';
      case 'normal': return '#4caf50';
      default: return '#1F51FF';
    }
  };

  // Determine UI based on latest data
  const showRescueButton = latestData && (latestData.flame || 
    (latestData.mq2_ppm > 200 && latestData.mq7_ppm > 100));

  const showGasWarning = latestData && !latestData.flame &&
    ((latestData.mq2_ppm ?? 0) > 200 || (latestData.mq7_ppm ?? 0) > 100);

  return (
    <ThemeProvider theme={fireTheme}>
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
                <LocalFireDepartment sx={{ fontSize: 48, mr: 2, color: '#FF7A30' }} />
                <Typography variant="h4" component="h1" sx={{ color: '#000000', fontWeight: 700 }}>
                  Fire Emergency Dashboard
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

          {/* 🔥 AUTO-RESCUE TRIGGERED NOTIFICATION */}
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {autoFireRescueTriggered && (
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
                🔥 FIRE DETECTED! RESCUE VEHICLE ACTIVATED AUTOMATICALLY!
              </Alert>
            )}

            {/* 🔥 FIRE RESCUE COMPLETED NOTIFICATION */}
            {hasTriggeredFireRescue.current && !autoFireRescueTriggered && (
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 3,
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(255, 122, 48, 0.9) 0%, rgba(230, 90, 0, 0.9) 100%)',
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
                    onClick={resetAutoFireRescueSystem}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    RESET SYSTEM
                  </Button>
                }
              >
                ✅ FIRE AUTO-RESCUE COMPLETED - Vehicle remains active during fire conditions
              </Alert>
            )}
          </Box>

          {/* Statistics Cards */}
          <Box sx={{ width: '100%', mb: 4 }}>
            <Grid container spacing={4} justifyContent="center">
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #FF7A30 0%, #E65A00 100%)',
                    color: 'white',
                    height: '220px',
                    boxShadow: '0 6px 20px rgba(255, 122, 48, 0.3)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 4, 
                    px: 3,
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <LocalFireDepartment sx={{ fontSize: 48, mb: 2, color: 'white' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.2rem', mb: 2, color: 'white', lineHeight: 1.3 }}>
                      Active Fire Incidents
                    </Typography>
                    <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.8rem', color: 'white' }}>
                      {fireData.filter((item) => item.flame).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #DC143C 0%, #B91230 100%)',
                    color: 'white',
                    height: '220px',
                    boxShadow: '0 6px 20px rgba(220, 20, 60, 0.3)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 4, 
                    px: 3,
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <WarningAmber sx={{ fontSize: 48, mb: 2, color: 'white' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.2rem', mb: 2, color: 'white', lineHeight: 1.3 }}>
                      MQ2 Gas Alerts
                    </Typography>
                    <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.8rem', color: 'white' }}>
                      {fireData.filter((item) => item.mq2_ppm > 200).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #465C88 0%, #364670 100%)',
                    color: 'white',
                    height: '220px',
                    boxShadow: '0 6px 20px rgba(70, 92, 136, 0.3)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 4, 
                    px: 3,
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Speed sx={{ fontSize: 48, mb: 2, color: 'white' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.2rem', mb: 2, color: 'white', lineHeight: 1.3 }}>
                      MQ7 Gas Alerts
                    </Typography>
                    <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.8rem', color: 'white' }}>
                      {fireData.filter((item) => item.mq7_ppm > 100).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    background: rescueActive 
                      ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)'
                      : 'linear-gradient(135deg, #000000 0%, #333333 100%)',
                    color: 'white',
                    height: '220px',
                    boxShadow: rescueActive 
                      ? '0 6px 20px rgba(76, 175, 80, 0.3)'
                      : '0 6px 20px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 4, 
                    px: 3,
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <DirectionsCar sx={{ fontSize: 48, mb: 2, color: 'white' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.2rem', mb: 2, color: 'white', lineHeight: 1.3 }}>
                      Rescue Status
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.3rem', color: 'white' }}>
                      {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Main Dashboard Content */}
          <Box sx={{ width: '100%' }}>
            <Grid container spacing={4} justifyContent="center">
              {/* Control Panel */}
              <Grid item xs={12} lg={8}>
                <Paper 
                  sx={{ 
                    p: 4, 
                    backgroundColor: '#ffffff',
                    border: '2px solid #FF7A30',
                    borderRadius: 3,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                    minHeight: '600px',
                  }}
                >
                <Typography variant="h5" sx={{ mb: 4, color: '#000000', fontWeight: 600 }}>
                  Fire Emergency Control Panel
                </Typography>

                {/* Alert Status */}
                <Box mb={4}>
                  {latestData?.flame ? (
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
                      🔥 FIRE DETECTED! MQ2: {latestData.mq2_ppm?.toFixed(1)} ppm, MQ7: {latestData.mq7_ppm?.toFixed(1)} ppm
                      {hasTriggeredFireRescue.current && ' - Auto-rescue activated!'}
                    </Alert>
                  ) : showGasWarning ? (
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
                      ⚠️ High gas levels detected (MQ2: {latestData.mq2_ppm?.toFixed(1)} / MQ7: {latestData.mq7_ppm?.toFixed(1)} ppm)
                    </Alert>
                  ) : (
                    <Alert 
                      severity="success"
                      sx={{ 
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        border: '2px solid #4caf50',
                        borderRadius: 2,
                        fontSize: '1rem',
                        py: 2,
                      }}
                    >
                      ✅ No fire or dangerous gas detected. System Normal.
                    </Alert>
                  )}
                </Box>

                {/* 🔥 AUTO-RESCUE STATUS CARD */}
                <Card sx={{ mb: 4, backgroundColor: '#fff3e0', border: '2px solid #FF7A30', borderRadius: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: '#FF7A30', fontWeight: 600, mb: 3 }}>
                      🤖 Fire Auto-Rescue System
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" sx={{ color: '#333', mb: 2 }}>
                          <b>Fire Detection:</b> {fireDetected ? '🔥 ACTIVE' : '✅ MONITORING'}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#333' }}>
                          <b>Auto-Trigger:</b> {hasTriggeredFireRescue.current ? '✅ COMPLETED' : '🟢 ARMED'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" sx={{ color: '#333', mb: 2 }}>
                          <b>Last Activation:</b> {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#333' }}>
                          <b>Rescue Vehicle:</b> {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box mt={3} p={3} sx={{ backgroundColor: '#ffebcc', borderRadius: 2 }}>
                      <Typography variant="body1" sx={{ color: '#FF7A30', fontWeight: 600, mb: 2 }}>
                        🔥 Auto-Rescue Info:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#333', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        • Automatically triggers when fire is detected<br />
                        • Posts to /rescue/fire/on endpoint<br />
                        • One-time activation per fire incident<br />
                        • Manual reset available after activation
                      </Typography>
                    </Box>

                    {hasTriggeredFireRescue.current && (
                      <Box mt={3}>
                        <Button
                          variant="outlined"
                          onClick={resetAutoFireRescueSystem}
                          sx={{
                            borderColor: '#FF7A30',
                            color: '#FF7A30',
                            px: 3,
                            py: 1.5,
                            fontSize: '1rem',
                            '&:hover': { backgroundColor: 'rgba(255, 122, 48, 0.1)' }
                          }}
                        >
                          🔄 Reset Auto-Rescue System
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Gas Level Analysis */}
                {latestData && (
                  <Card sx={{ mb: 4, backgroundColor: '#f0f8ff', border: '2px solid #465C88', borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600, mb: 3 }}>
                        🌡️ Gas Level Analysis
                      </Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <Speed sx={{ color: '#DC143C', fontSize: 28 }} />
                            <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500 }}>
                              <b>MQ2 Level:</b> {latestData.mq2_ppm?.toFixed(1)} ppm
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min((latestData.mq2_ppm / 500) * 100, 100)} 
                            sx={{ 
                              height: 12, 
                              borderRadius: 6,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getSeverityColor(getGasLevelSeverity(latestData.mq2_ppm, 0)),
                                borderRadius: 6,
                              }
                            }} 
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <TrendingUp sx={{ color: '#465C88', fontSize: 28 }} />
                            <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500 }}>
                              <b>MQ7 Level:</b> {latestData.mq7_ppm?.toFixed(1)} ppm
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min((latestData.mq7_ppm / 300) * 100, 100)} 
                            sx={{ 
                              height: 12, 
                              borderRadius: 6,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getSeverityColor(getGasLevelSeverity(0, latestData.mq7_ppm)),
                                borderRadius: 6,
                              }
                            }} 
                          />
                        </Grid>
                      </Grid>
                      <Box mt={3} p={2} sx={{ backgroundColor: 'rgba(70, 92, 136, 0.1)', borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ color: '#465C88', fontWeight: 500 }}>
                          Max MQ2: {maxMQ2.toFixed(1)} ppm | Max MQ7: {maxMQ7.toFixed(1)} ppm
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Control Buttons Section */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600, mb: 3 }}>
                    Emergency Controls
                  </Typography>
                  
                  {/* Emergency Stop Rescue Button - Always visible when rescue is active */}
                  {rescueActive && (
                    <Box textAlign="center" mb={3}>
                      <Button
                        variant="contained"
                        size="large"
                        sx={{
                          backgroundColor: '#DC143C',
                          color: 'white',
                          px: 5,
                          py: 2.5,
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          borderRadius: 3,
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

                  {/* Manual Rescue Vehicle Button */}
                  {showRescueButton && (
                    <Box textAlign="center" mb={3}>
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
                          },
                        }}
                        startIcon={<DirectionsCar />}
                        onClick={handleRescueClick}
                        disabled={rescueLoading}
                      >
                        {rescueLoading
                          ? "Processing..."
                          : rescueActive
                          ? "🛑 Deactivate Fire Rescue"
                          : "🔥 MANUAL FIRE RESCUE"}
                      </Button>
                    </Box>
                  )}

                  {/* Secondary Control Buttons */}
                  <Grid container spacing={3} justifyContent="center">
                    <Grid item>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={emergencyStopRescue}
                        disabled={rescueLoading || !rescueActive}
                        sx={{ 
                          borderColor: '#DC143C',
                          color: '#DC143C',
                          px: 3,
                          py: 1.5,
                          fontSize: '1rem',
                          borderRadius: 2,
                          '&:hover': {
                            backgroundColor: 'rgba(220, 20, 60, 0.1)',
                            borderColor: '#b91230'
                          }
                        }}
                      >
                        {rescueLoading ? 'Stopping...' : '🛑 Turn Off Rescue Vehicle'}
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                          borderColor: '#465C88',
                          color: '#465C88',
                          px: 3,
                          py: 1.5,
                          fontSize: '1rem',
                          borderRadius: 2,
                          '&:hover': { backgroundColor: 'rgba(70, 92, 136, 0.1)' }
                        }}
                      >
                        Refresh Data
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                {/* Latest Data Display */}
                {latestData && (
                  <Card 
                    sx={{ 
                      p: 4, 
                      background: 'linear-gradient(135deg, rgba(233, 227, 223, 0.8) 0%, rgba(245, 240, 236, 0.8) 100%)',
                      border: '2px solid rgba(255, 122, 48, 0.3)',
                      borderRadius: 3,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 3,
                        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.1) 100%)',
                        borderRadius: 2,
                        px: 3,
                        py: 2,
                      }}
                    >
                      <Assessment sx={{ fontSize: 32, mr: 2, color: '#000000' }} />
                      <Typography variant="h6" sx={{ color: '#000000', fontWeight: 700 }}>
                        Latest Sensor Reading
                      </Typography>
                    </Box>
                    <Grid container spacing={4}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" sx={{ color: '#000000', mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                          <b>Time:</b> {new Date(latestData.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500, fontSize: '1.1rem' }}>
                          <b>MQ2:</b> {latestData.mq2_ppm?.toFixed(2)} ppm
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" sx={{ color: '#000000', mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                          <b>MQ7:</b> {latestData.mq7_ppm?.toFixed(2)} ppm
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500, fontSize: '1.1rem' }}>
                          <b>Flame:</b> {latestData.flame ? "🔥 Detected" : "✅ No Fire"}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box mt={3} p={2} sx={{ backgroundColor: 'rgba(255, 122, 48, 0.1)', borderRadius: 2 }}>
                      <Typography variant="body1" sx={{ color: '#000000', fontWeight: 500, fontSize: '1.1rem' }}>
                        <b>Auto-Rescue:</b> {hasTriggeredFireRescue.current ? '✅ COMPLETED' : '🟢 MONITORING'}
                      </Typography>
                    </Box>
                  </Card>
                )}
              </Paper>
            </Grid>

            {/* Fire Data Logs */}
            <Grid item xs={12} lg={4}>
              <Paper 
                sx={{ 
                  p: 4, 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(70, 92, 136, 0.3)',
                  borderRadius: 3,
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                  minHeight: '600px',
                }}
              >
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between" 
                  mb={4}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(70, 92, 136, 0.1) 0%, rgba(70, 92, 136, 0.15) 100%)',
                    borderRadius: 3,
                    px: 3,
                    py: 2,
                    border: '2px solid rgba(70, 92, 136, 0.2)',
                  }}
                >
                  <Box display="flex" alignItems="center">
                    <Assessment sx={{ mr: 2, color: '#465C88', fontSize: 32 }} />
                    <Typography variant="h6" sx={{ color: '#000000', fontWeight: 700 }}>
                      Fire & Gas Detection Logs
                    </Typography>
                  </Box>
                  {wsConnected && (
                    <Chip 
                      label="Real-time" 
                      size="medium" 
                      sx={{ 
                        backgroundColor: '#4caf50', 
                        color: 'white',
                        fontWeight: 600,
                        px: 2,
                      }}
                    />
                  )}
                </Box>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress sx={{ color: '#FF7A30', size: 60 }} />
                  </Box>
                ) : (
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      maxHeight: '500px', 
                      overflow: 'auto',
                      backgroundColor: '#F5F5DD',
                      borderRadius: 2,
                      border: '1px solid rgba(70, 92, 136, 0.2)',
                    }}
                  >
                    <List sx={{ p: 0 }}>
                      {fireData.length > 0 ? (
                        fireData.map((log, index) => (
                          <ListItem 
                            key={log._id || index}
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
                                    MQ2: {log.mq2_ppm?.toFixed(1)} | MQ7: {log.mq7_ppm?.toFixed(1)}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={log.flame ? '🔥 Fire' : '✅ No Fire'}
                                    sx={{
                                      backgroundColor: log.flame ? '#DC143C' : '#4caf50',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                    }}
                                  />
                                  <Chip
                                    size="small"
                                    label={getGasLevelSeverity(log.mq2_ppm, log.mq7_ppm).toUpperCase()}
                                    sx={{
                                      backgroundColor: getSeverityColor(getGasLevelSeverity(log.mq2_ppm, log.mq7_ppm)),
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
                                    Status: {log.status || 'normal'} | Rescue: {rescueActive ? 'ACTIVE' : 'STANDBY'}
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
        

        {/* 🔥 CSS for Pulse Animation */}
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

export default FireDashboard;