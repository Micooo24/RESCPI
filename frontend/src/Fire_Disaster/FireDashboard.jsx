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

const fireTheme = createTheme({
  palette: {
    primary: {
      main: '#cc4a02',
    },
    secondary: {
      main: '#DC143C',
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
              <LocalFireDepartment sx={{ fontSize: 40, mr: 2, color: '#cc4a02' }} />
              <Typography variant="h4" component="h1" sx={{ color: '#34623f', fontWeight: 600 }}>
                Fire Emergency Dashboard
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

          {/* 🔥 AUTO-RESCUE TRIGGERED NOTIFICATION */}
          {autoFireRescueTriggered && (
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
              🔥 FIRE DETECTED! RESCUE VEHICLE ACTIVATED AUTOMATICALLY!
            </Alert>
          )}

          {/* 🔥 FIRE RESCUE COMPLETED NOTIFICATION */}
          {hasTriggeredFireRescue.current && !autoFireRescueTriggered && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2,
                backgroundColor: 'rgba(204, 74, 2, 0.9)',
                color: 'white',
                fontSize: '1.0rem',
                fontWeight: 'bold'
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

          <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
            {/* Statistics Cards */}
            <Grid item xs={12} md={12}>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      background: 'linear-gradient(135deg, #cc4a02 0%, #a03902 100%)',
                      color: 'white',
                      height: '120px',
                      boxShadow: '0 4px 12px rgba(204, 74, 2, 0.3)',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        Active Fire Incidents
                      </Typography>
                      <Typography variant="h2" sx={{ fontWeight: 700 }}>
                        {fireData.filter((item) => item.flame).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      background: 'linear-gradient(135deg, #DC143C 0%, #b91230 100%)',
                      color: 'white',
                      height: '120px',
                      boxShadow: '0 4px 12px rgba(220, 20, 60, 0.3)',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        MQ2 Gas Alerts
                      </Typography>
                      <Typography variant="h2" sx={{ fontWeight: 700 }}>
                        {fireData.filter((item) => item.mq2_ppm > 200).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      background: 'linear-gradient(135deg, #1F51FF 0%, #1a44d9 100%)',
                      color: 'white',
                      height: '120px',
                      boxShadow: '0 4px 12px rgba(31, 81, 255, 0.3)',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        MQ7 Gas Alerts
                      </Typography>
                      <Typography variant="h2" sx={{ fontWeight: 700 }}>
                        {fireData.filter((item) => item.mq7_ppm > 100).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card
                    sx={{
                      background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
                      color: 'white',
                      height: '120px',
                      boxShadow: '0 4px 12px rgba(45, 106, 79, 0.3)',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        Rescue Status
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700 }}>
                        {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Control Panel */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #cc4a02' }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  Fire Emergency Control Panel
                </Typography>

                {/* Alert Status */}
                <Box mb={3}>
                  {latestData?.flame ? (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        backgroundColor: 'rgba(220, 20, 60, 0.1)',
                        border: '1px solid #DC143C',
                      }}
                    >
                      🔥 FIRE DETECTED! MQ2: {latestData.mq2_ppm?.toFixed(1)} ppm, MQ7: {latestData.mq7_ppm?.toFixed(1)} ppm
                      {hasTriggeredFireRescue.current && ' - Auto-rescue activated!'}
                    </Alert>
                  ) : showGasWarning ? (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        backgroundColor: 'rgba(204, 74, 2, 0.1)',
                        border: '1px solid #cc4a02',
                      }}
                    >
                      ⚠️ High gas levels detected (MQ2: {latestData.mq2_ppm?.toFixed(1)} / MQ7: {latestData.mq7_ppm?.toFixed(1)} ppm)
                    </Alert>
                  ) : (
                    <Alert 
                      severity="success"
                      sx={{ 
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        border: '1px solid #4caf50',
                      }}
                    >
                      ✅ No fire or dangerous gas detected. System Normal.
                    </Alert>
                  )}
                </Box>

                {/* 🔥 AUTO-RESCUE STATUS CARD */}
                <Card sx={{ mb: 3, backgroundColor: '#fff3e0', border: '2px solid #cc4a02' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#cc4a02', fontWeight: 600, mb: 2 }}>
                      🤖 Fire Auto-Rescue System
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#333' }}>
                          <b>Fire Detection:</b> {fireDetected ? '🔥 ACTIVE' : '✅ MONITORING'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#333' }}>
                          <b>Auto-Trigger:</b> {hasTriggeredFireRescue.current ? '✅ COMPLETED' : '🟢 ARMED'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#333' }}>
                          <b>Last Activation:</b> {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#333' }}>
                          <b>Rescue Vehicle:</b> {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box mt={2} p={2} sx={{ backgroundColor: '#ffebcc', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: '#cc4a02', fontWeight: 600 }}>
                        🔥 Auto-Rescue Info:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#333', fontSize: '0.9rem' }}>
                        • Automatically triggers when fire is detected<br />
                        • Posts to /rescue/fire/on endpoint<br />
                        • One-time activation per fire incident<br />
                        • Manual reset available after activation
                      </Typography>
                    </Box>

                    {hasTriggeredFireRescue.current && (
                      <Box mt={2}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={resetAutoFireRescueSystem}
                          sx={{
                            borderColor: '#cc4a02',
                            color: '#cc4a02',
                            '&:hover': { backgroundColor: 'rgba(204, 74, 2, 0.1)' }
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
                  <Card sx={{ mb: 3, backgroundColor: '#f0f8ff', border: '1px solid #1F51FF' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600, mb: 2 }}>
                        🌡️ Gas Level Analysis
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Speed sx={{ color: '#DC143C' }} />
                            <Typography variant="body2" sx={{ color: '#34623f' }}>
                              <b>MQ2 Level:</b> {latestData.mq2_ppm?.toFixed(1)} ppm
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min((latestData.mq2_ppm / 500) * 100, 100)} 
                            sx={{ 
                              mt: 1, 
                              height: 8, 
                              borderRadius: 4,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getSeverityColor(getGasLevelSeverity(latestData.mq2_ppm, 0))
                              }
                            }} 
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <TrendingUp sx={{ color: '#1F51FF' }} />
                            <Typography variant="body2" sx={{ color: '#34623f' }}>
                              <b>MQ7 Level:</b> {latestData.mq7_ppm?.toFixed(1)} ppm
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min((latestData.mq7_ppm / 300) * 100, 100)} 
                            sx={{ 
                              mt: 1, 
                              height: 8, 
                              borderRadius: 4,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getSeverityColor(getGasLevelSeverity(0, latestData.mq7_ppm))
                              }
                            }} 
                          />
                        </Grid>
                      </Grid>
                      <Typography variant="body2" sx={{ color: '#666666', mt: 1 }}>
                        Max MQ2: {maxMQ2.toFixed(1)} ppm | Max MQ7: {maxMQ7.toFixed(1)} ppm
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {/* 🔥 NEW: Emergency Stop Rescue Button - Always visible when rescue is active */}
                {rescueActive && (
                  <Box textAlign="center" mb={3}>
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

                {/* Alternative Emergency Stop Button */}
                <Box textAlign="center" mb={3}>
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

                {/* Refresh Button */}
                <Box textAlign="center" mb={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleRefresh}
                    disabled={loading}
                    sx={{
                      borderColor: '#1F51FF',
                      color: '#1F51FF',
                      '&:hover': { backgroundColor: 'rgba(31, 81, 255, 0.1)' }
                    }}
                  >
                    Refresh Data
                  </Button>
                </Box>

                {/* Latest Data Display */}
                {latestData && (
                  <Card sx={{ p: 2, backgroundColor: '#F5F5DD' }}>
                    <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600, mb: 2 }}>
                      Latest Sensor Reading
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Time:</b> {new Date(latestData.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>MQ2:</b> {latestData.mq2_ppm?.toFixed(2)} ppm
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>MQ7:</b> {latestData.mq7_ppm?.toFixed(2)} ppm
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Flame:</b> {latestData.flame ? "🔥 Detected" : "✅ No Fire"}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Typography variant="body2" sx={{ color: '#34623f', mt: 1 }}>
                      <b>Auto-Rescue:</b> {hasTriggeredFireRescue.current ? '✅ COMPLETED' : '🟢 MONITORING'}
                    </Typography>
                  </Card>
                )}
              </Paper>
            </Grid>

            {/* Fire Data Logs */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #1F51FF' }}>
                <Box display="flex" alignItems="center" justify="space-between" mb={3}>
                  <Box display="flex" alignItems="center">
                    <Assessment sx={{ mr: 1, color: '#1F51FF' }} />
                    <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600 }}>
                      Fire & Gas Detection Logs
                    </Typography>
                  </Box>
                  {wsConnected && (
                    <Chip 
                      label="Real-time" 
                      size="small" 
                      sx={{ backgroundColor: '#4caf50', color: 'white' }}
                    />
                  )}
                </Box>
                
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
                      {fireData.length > 0 ? (
                        fireData.map((log, index) => (
                          <ListItem 
                            key={log._id || index}
                            sx={{
                              borderBottom: '1px solid #e0e0e0',
                              '&:hover': { backgroundColor: 'rgba(204, 74, 2, 0.05)' }
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                  <Typography sx={{ color: '#34623f', fontWeight: 600 }}>
                                    MQ2: {log.mq2_ppm?.toFixed(1)} | MQ7: {log.mq7_ppm?.toFixed(1)}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={log.flame ? '🔥 Fire' : '✅ No Fire'}
                                    sx={{
                                      backgroundColor: log.flame ? '#DC143C' : '#4caf50',
                                      color: 'white',
                                      fontSize: '0.7rem'
                                    }}
                                  />
                                  <Chip
                                    size="small"
                                    label={getGasLevelSeverity(log.mq2_ppm, log.mq7_ppm).toUpperCase()}
                                    sx={{
                                      backgroundColor: getSeverityColor(getGasLevelSeverity(log.mq2_ppm, log.mq7_ppm)),
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
                                    Status: {log.status || 'normal'} | Rescue: {rescueActive ? 'ACTIVE' : 'STANDBY'}
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

        {/* 🔥 CSS for Pulse Animation */}
        <style jsx global>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
        `}</style>
      </Box>
    </ThemeProvider>
  );
};

export default FireDashboard;