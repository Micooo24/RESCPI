import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { 
  SystemUpdateAlt, 
  ArrowBack, 
  Landslide,
  Warning,
  CheckCircle,
  DirectionsCar,
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import BASE_URL from '../common/baseurl';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/landslide/all`);
      const logList = response.data?.data || [];

      if (logList.length > 0) {
        setLogs(logList);

        const latest = logList[0];
        const servo1Off = latest.servo1 === 0;
        const servo2Off = latest.servo2 === 0;

        let newMessage = '';

        if (servo1Off && servo2Off) {
          newMessage = '🔴 Both OFF → 🚨 Alert: Landslide Detected, Rescue is on the way!';
        } else if (servo1Off || servo2Off) {
          newMessage = '🟠 One OFF → ⚠️ Warning: Landslide Movement Detected';
        }

        if (newMessage && newMessage !== lastMessage) {
          toast.dismiss();
          console.log('Toast Message:', newMessage);
          toast.success(newMessage, { duration: 5000 });
          setLastMessage(newMessage);
        } else if (!newMessage && lastMessage) {
          toast.dismiss();
          setLastMessage('');
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleServo = async (servoNumber, action) => {
    try {
      await axios.post(`${BASE_URL}/landslide/servo/${servoNumber}/${action}`);

      // Update local state immediately
      let nextServo1 = servo1;
      let nextServo2 = servo2;
      if (servoNumber === 1) nextServo1 = action === 'on' ? 1 : 0;
      if (servoNumber === 2) nextServo2 = action === 'on' ? 1 : 0;
      setServo1(nextServo1);
      setServo2(nextServo2);

      toast.dismiss();
      if (nextServo1 === 0 && nextServo2 === 0) {
        toast.error('🔴 🚨 Alert: Landslide Detected, Rescue is on the way!', { duration: 5000 });
      } else if (nextServo1 === 0 || nextServo2 === 0) {
        toast('🟠 ⚠️ Warning: Landslide Movement Detected', {
          duration: 5000,
          icon: '⚠️',
          style: { background: '#ff9800', color: 'white' },
        });
      }

      // Fetch updated logs
      fetchLogs();
    } catch (error) {
      console.error(`Failed to toggle Servo ${servoNumber}:`, error);
      toast.error('Failed to toggle servo.');
    }
  };

  // Toggle Rescue Vehicle
  const toggleRescueVehicle = async () => {
    setRescueLoading(true);
    const actionUrl = rescueActive
      ? `${BASE_URL}/rescue/vehicle/off`
      : `${BASE_URL}/rescue/vehicle/on`;

    try {
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

  const getStatusLevel = () => {
    if (servo1 === 0 && servo2 === 0) return 'critical';
    if (servo1 === 0 || servo2 === 0) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#DC143C';
      case 'warning': return '#cc4a02';
      case 'normal': return '#66FF00';
      default: return '#1F51FF';
    }
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
          {/* Header */}
          <Box display="flex" alignItems="center" mb={3}>
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

          <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
            {/* Control Panel */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #cc4a02' }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  Landslide Control Panel
                </Typography>

                {/* Status Alert */}
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
                      🚨 CRITICAL: Both servos are OFF! Landslide detected - immediate action required!
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
                      ⚠️ WARNING: One servo is OFF. Landslide movement detected - monitor closely.
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
                      ✅ NORMAL: Both servos are active. System functioning normally.
                    </Alert>
                  )}
                </Box>

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

                {/* Rescue Vehicle Button */}
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
                      onClick={toggleRescueVehicle}
                      disabled={rescueLoading}
                    >
                      {rescueLoading
                        ? "Processing..."
                        : rescueActive
                        ? "Deactivate Rescue Vehicle"
                        : "🚨 ACTIVATE RESCUE VEHICLE"}
                    </Button>
                  </Box>
                )}

                {/* Current Status Display */}
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
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Alert Level:</b> {getStatusLevel().toUpperCase()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#34623f' }}>
                        <b>Total Logs:</b> {logs.length}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Paper>
            </Grid>

            {/* Logs Section */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #1F51FF' }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  Landslide Detection Logs
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
                                <Typography sx={{ color: '#34623f', fontWeight: 600 }}>
                                  Status: {log.status}
                                </Typography>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" sx={{ color: '#34623f' }}>
                                    X: {log.accel_x} | Y: {log.accel_y} | Z: {log.accel_z}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#666666' }}>
                                    {new Date(log.created_at).toLocaleString()}
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
                                No logs available.
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
    </ThemeProvider>
  );
};

export default LandslideDashboard;