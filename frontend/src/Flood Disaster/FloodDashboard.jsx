import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import BASE_URL from '../common/baseurl'; // Import the BASE_URL properly
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
} from '@mui/material';
import { Water, Dashboard, Warning, CheckCircle, Refresh, WifiOff, Wifi } from '@mui/icons-material';

const WS_URL = 'ws://10.16.180.193:5000/flood/ws/frontend';

const FloodDashboard = () => {
  const [floodData, setFloodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

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
        }, 30000); // Keep alive every 30 seconds
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received flood data:', data);
          
          // Handle sensor data from ESP32
          if (data.type === 'sensor' || data.distance !== undefined) {
            setFloodData({
              ...data,
              timestamp: data.timestamp || new Date().toISOString()
            });
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
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000); // Exponential backoff
    
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
        setFloodData(response.data.data);
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
        alert(`Pump turned ${isPumpOn ? 'OFF' : 'ON'}`);
        
        // If WebSocket is not connected, fetch updated data via REST
        if (!wsConnected) {
          setTimeout(() => fetchFloodDataREST(false), 500);
        }
      } else {
        alert('Failed to toggle pump');
      }
    } catch (error) {
      alert('Error toggling pump');
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

  // Determine alert status based on distance
  const getAlertStatus = (distance) => {
    if (distance === null || distance === undefined) return 'unknown';
    if (distance <= 4) return 'critical';
    if (distance <= 10) return 'warning';
    return 'normal';
  };

  const alertColors = {
    critical: '#DC143C',
    warning: '#cc4a02',
    normal: '#66FF00',
    unknown: '#999999',
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Header with Connection Status */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Flood Monitoring Dashboard
        </Typography>
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

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : floodData ? (
        <>
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

            <Card sx={{ flex: 1, textAlign: 'center', backgroundColor: alertColors[getAlertStatus(floodData.distance)] + '22' }}>
              <CardContent>
                {getAlertStatus(floodData.distance) === 'critical' ? (
                  <Warning sx={{ fontSize: 40, mb: 1, color: alertColors.critical }} />
                ) : getAlertStatus(floodData.distance) === 'warning' ? (
                  <Warning sx={{ fontSize: 40, mb: 1, color: alertColors.warning }} />
                ) : (
                  <CheckCircle sx={{ fontSize: 40, mb: 1, color: alertColors.normal }} />
                )}
                <Typography variant="h6">Alert Status</Typography>
                <Typography variant="h3" sx={{ textTransform: 'uppercase', color: alertColors[getAlertStatus(floodData.distance)] }}>
                  {getAlertStatus(floodData.distance)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          <Box textAlign="center" mb={4}>
            <Button
              variant="contained"
              color={floodData.pump === 'ON' ? 'error' : 'success'}
              onClick={togglePump}
              disabled={buttonLoading}
              sx={{ mr: 2 }}
            >
              {buttonLoading ? 'Processing...' : floodData.pump === 'ON' ? 'Turn Pump OFF' : 'Turn Pump ON'}
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />} 
              onClick={handleRefresh} 
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Last update: {new Date(floodData.timestamp).toLocaleString()}
            {wsConnected && ' • Real-time via WebSocket'}
          </Typography>
        </>
      ) : (
        <Alert severity="warning">
          No flood data available. ESP32 may not be connected.
        </Alert>
      )}
    </Container>
  );
};

export default FloodDashboard;