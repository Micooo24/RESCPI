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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header with Navigation and Connection Status */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ 
              color: '#0077b6', 
              mr: 2,
              '&:hover': {
                backgroundColor: 'rgba(0, 119, 182, 0.1)',
              }
            }}
          >
            Back to Home
          </Button>
          <Typography variant="h4" sx={{ color: '#0077b6', fontWeight: 600 }}>
            Flood Emergency Dashboard
          </Typography>
        </Box>
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

      {/* 🚨 AUTO-RESCUE TRIGGERED NOTIFICATION (IMMEDIATE) */}
      {autoRescueTriggered && (
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
          🚨 CRITICAL FLOOD DETECTED! RESCUE VEHICLE ACTIVATED IMMEDIATELY! (ONE-TIME ACTIVATION)
        </Alert>
      )}

      {/* 🚨 AUTO-RESCUE COMPLETED NOTIFICATION */}
      {autoRescueCompleted && !autoRescueTriggered && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2,
            backgroundColor: 'rgba(0, 119, 182, 0.9)',
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
          ✅ FLOOD AUTO-RESCUE COMPLETED - Vehicle activated IMMEDIATELY, remains active during critical conditions
        </Alert>
      )}

      {/* 🚨 CRITICAL FLOOD PERSISTENT ALERT */}
      {criticalFloodDetected && autoRescueCompleted && !autoRescueTriggered && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            backgroundColor: 'rgba(139, 0, 0, 0.9)',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
          icon={<Warning sx={{ color: 'white' }} />}
        >
          🚨 CRITICAL FLOOD CONDITIONS PERSIST - Rescue vehicle remains active (IMMEDIATE rescue completed)
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress sx={{ color: '#0077b6' }} />
        </Box>
      ) : floodData ? (
        <Grid container spacing={3}>
          {/* Main Monitoring Cards */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} mb={3}>
              <Card sx={{ flex: 1, textAlign: 'center' }}>
                <CardContent>
                  <Water sx={{ fontSize: 40, mb: 1, color: '#0077b6' }} />
                  <Typography variant="h6">Water Volume</Typography>
                  <Typography variant="h3">{floodData.liters ?? 0} L</Typography>
                  {floodData.distance && (
                    <Typography variant="body2" color="text.secondary">
                      {floodData.distance} cm depth
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, textAlign: 'center' }}>
                <CardContent>
                  <Dashboard sx={{ fontSize: 40, mb: 1, color: '#2d6a4f' }} />
                  <Typography variant="h6">Pump Status</Typography>
                  <Chip
                    label={floodData.pump || 'OFF'}
                    color={floodData.pump === 'ON' ? 'success' : 'error'}
                    sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                  />
                  {floodData.mode && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Mode: {floodData.mode}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, textAlign: 'center', backgroundColor: alertColors[getAlertStatus(floodData.liters)] + '22' }}>
                <CardContent>
                  {getAlertStatus(floodData.liters) === 'critical' ? (
                    <Warning sx={{ fontSize: 40, mb: 1, color: alertColors.critical }} />
                  ) : getAlertStatus(floodData.liters) === 'warning' ? (
                    <Warning sx={{ fontSize: 40, mb: 1, color: alertColors.warning }} />
                  ) : (
                    <CheckCircle sx={{ fontSize: 40, mb: 1, color: alertColors.normal }} />
                  )}
                  <Typography variant="h6">Alert Status</Typography>
                  <Typography variant="h3" sx={{ textTransform: 'uppercase', color: alertColors[getAlertStatus(floodData.liters)] }}>
                    {getAlertStatus(floodData.liters)}
                  </Typography>
                  {/* 🚨 Auto-rescue status indicator */}
                  {criticalFloodDetected && !autoRescueCompleted && (
                    <Chip 
                      label="RESCUE ARMED" 
                      size="small" 
                      sx={{ 
                        mt: 1,
                        backgroundColor: '#DC143C', 
                        color: 'white',
                        fontWeight: 'bold',
                        animation: 'pulse 2s infinite'
                      }}
                    />
                  )}
                  {autoRescueCompleted && (
                    <Chip 
                      label="RESCUE ACTIVE" 
                      size="small" 
                      sx={{ 
                        mt: 1,
                        backgroundColor: '#0077b6', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* 🚨 AUTO-RESCUE STATUS CARD - UPDATED FOR IMMEDIATE RESCUE */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, backgroundColor: '#F0F8FF', border: '2px solid #0077b6' }}>
              <Typography variant="h6" sx={{ color: '#0077b6', fontWeight: 600, mb: 2 }}>
                🤖 Flood Auto-Rescue System (IMMEDIATE ACTIVATION)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Warning Threshold:</b> ≥{FLOOD_DETECTION.WARNING_LITERS_THRESHOLD}L
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Critical Threshold:</b> ≥{FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Current Volume:</b> {floodData.liters}L
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Auto-Activation:</b> {
                      autoRescueCompleted ? '✅ COMPLETED (ACTIVE)' :
                      criticalFloodDetected ? '🔴 ARMED' : '🟢 MONITORING'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Last Activation:</b> {lastAutoRescueTime ? new Date(lastAutoRescueTime).toLocaleTimeString() : 'Never'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Rescue Vehicle:</b> {rescueActive ? '🚑 ACTIVE' : '⏸️ STANDBY'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    <b>Status:</b> {autoRescueCompleted ? '✅ IMMEDIATE COMPLETE' : '🟢 READY'}
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Status Description */}
              <Box mt={2} p={2} sx={{ backgroundColor: '#E8F4F8', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#0077b6', fontWeight: 600 }}>
                  🔍 How it works:
                </Typography>
                <Typography variant="body2" sx={{ color: '#333', fontSize: '0.9rem' }}>
                  • <b>Warning:</b> ≥{FLOOD_DETECTION.WARNING_LITERS_THRESHOLD}L water volume<br />
                  • <b>Critical:</b> ≥{FLOOD_DETECTION.CRITICAL_LITERS_THRESHOLD}L - triggers <b>IMMEDIATE</b> rescue (no delay)<br />
                  • Vehicle activates instantly and remains active<br />
                  • Manual reset required to re-enable auto-trigger<br />
                  • Manual override always available
                </Typography>
              </Box>

              {/* Reset Button */}
              {autoRescueCompleted && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={resetAutoRescueSystem}
                    sx={{
                      borderColor: '#0077b6',
                      color: '#0077b6',
                      '&:hover': { backgroundColor: 'rgba(0, 119, 182, 0.1)' }
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
        <Alert severity="warning">
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
  );
};

export default FloodDashboard;