import React, { useState } from 'react';
import axios from 'axios';
import BASE_URL from './common/baseurl';
import {
  Container,
  Typography,
  Button,
  Box,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import { 
  LocalFlorist as FloodIcon, 
  LocalFireDepartment as FireIcon, 
  Terrain as LandslideIcon,
  Stop as StopIcon
} from '@mui/icons-material';

const RescueControl = () => {
  const [loading, setLoading] = useState({
    flood: false,
    fire: false,
    landslide: false,
    stop: false // Add stop loading state
  });
  const [message, setMessage] = useState('');

  const handleRescueCommand = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setMessage('');

    try {
      const response = await axios.post(`${BASE_URL}/rescue/${type}/on`);
      
      if (response.data.status === 'success') {
        setMessage(`✅ ${type.toUpperCase()} rescue command sent successfully!`);
      } else {
        setMessage(`❌ Failed to send ${type} command`);
      }
    } catch (error) {
      console.error(`Error sending ${type} command:`, error);
      setMessage(`❌ Error: Could not send ${type} rescue command`);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Add stop all function
  const handleStopAll = async () => {
    setLoading(prev => ({ ...prev, stop: true }));
    setMessage('');

    try {
      const response = await axios.post(`${BASE_URL}/rescue/off`);
      
      if (response.data.status === 'success') {
        setMessage(`🛑 All rescue operations stopped successfully!`);
      } else {
        setMessage(`❌ Failed to stop rescue operations`);
      }
    } catch (error) {
      console.error('Error stopping rescue operations:', error);
      setMessage(`❌ Error: Could not stop rescue operations`);
    } finally {
      setLoading(prev => ({ ...prev, stop: false }));
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const rescueButtons = [
    {
      type: 'flood',
      label: 'Flood Rescue',
      icon: <FloodIcon />,
      color: 'primary',
      duration: '1.5 sec'
    },
    {
      type: 'fire',
      label: 'Fire Rescue',
      icon: <FireIcon />,
      color: 'error',
      duration: '1.0 sec'
    },
    {
      type: 'landslide',
      label: 'Landslide Rescue',
      icon: <LandslideIcon />,
      color: 'warning',
      duration: '0.5 sec'
    }
  ];

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" textAlign="center" mb={4}>
        Rescue Control System
      </Typography>

      {message && (
        <Alert 
          severity={message.includes('✅') || message.includes('🛑') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
        >
          {message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {rescueButtons.map((button) => (
          <Grid item xs={12} key={button.type}>
            <Card>
              <CardContent>
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  gap={2}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {button.icon}
                    <Typography variant="h6">
                      {button.label}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Duration: {button.duration}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color={button.color}
                    size="large"
                    fullWidth
                    onClick={() => handleRescueCommand(button.type)}
                    disabled={loading[button.type]}
                    sx={{ 
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading[button.type] 
                      ? 'Sending...' 
                      : `Activate ${button.label}`
                    }
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Add Stop All Button */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Emergency Control
            </Typography>
          </Divider>
          
          <Card sx={{ border: '2px solid #d32f2f' }}>
            <CardContent>
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                gap={2}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <StopIcon sx={{ color: '#d32f2f' }} />
                  <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                    Emergency Stop
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Immediately stop all rescue operations
                </Typography>
                
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  fullWidth
                  onClick={handleStopAll}
                  disabled={loading.stop}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    backgroundColor: '#d32f2f',
                    '&:hover': {
                      backgroundColor: '#b71c1c',
                    }
                  }}
                >
                  {loading.stop 
                    ? 'Stopping...' 
                    : '🛑 STOP ALL RESCUE'
                  }
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography 
        variant="body2" 
        color="text.secondary" 
        textAlign="center" 
        mt={4}
      >
        Click buttons to send rescue commands to ESP32 vehicle
      </Typography>
    </Container>
  );
};

export default RescueControl;