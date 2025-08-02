import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../common/baseurl';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  Stack,
} from '@mui/material';
import { ArrowBack, Flood, Refresh, Height, DirectionsCar } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Custom theme
const floodTheme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
});

const FloodDashboard = () => {
  const navigate = useNavigate();
  const [floodData, setFloodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [latestDistance, setLatestDistance] = useState(null); // Latest distance
  const [showRescueButton, setShowRescueButton] = useState(false); // Toggle Rescue Button
  const [rescueActive, setRescueActive] = useState(false); // Rescue vehicle state

  // Fetch latest flood data (full document)
  const fetchFloodData = async () => {
    try {
      setRefreshLoading(true);
      const response = await axios.get(`${BASE_URL}/flood/latest`);
      if (response.data.status === 'success') {
        const data = response.data.data;
        setFloodData(data);

        // Update latest distance
        if (data.distance !== undefined) {
          setLatestDistance(data.distance);

          // Show Rescue button if water level is high (<= 4cm)
          if (data.distance > 0 && data.distance <= 4) {
            setShowRescueButton(true);
          } else {
            setShowRescueButton(false);
          }
        }
      } else {
        console.error('⚠️ No data received:', response.data.message);
        setShowRescueButton(false); // Hide if no data
      }
    } catch (error) {
      console.error('❌ Error fetching flood data:', error);
      setShowRescueButton(false);
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  };

  // Fetch latest distance only
  const fetchLatestDistance = async () => {
    try {
      setButtonLoading(true);
      const response = await axios.get(`${BASE_URL}/flood/latest/distance`);
      if (response.data.status === 'success') {
        const distance = response.data.distance;
        setLatestDistance(distance);
        alert(`✅ Latest Distance: ${distance} cm`);

        // Update Rescue button visibility
        if (distance > 0 && distance < 1) {
          setShowRescueButton(true);
        } else {
          setShowRescueButton(false);
        }
      } else {
        alert('⚠️ No distance data found');
        setShowRescueButton(false);
      }
    } catch (error) {
      console.error('❌ Error fetching latest distance:', error);
      alert('Error fetching latest distance');
      setShowRescueButton(false);
    } finally {
      setButtonLoading(false);
    }
  };

  useEffect(() => {
    fetchFloodData();
  }, []);

  // Handle Enable/Disable Pump
  const togglePump = async () => {
    if (!floodData) return;
    setButtonLoading(true);

    const newPumpState = floodData.pump === 'ON' ? 'OFF' : 'ON';
    const controlUrl = newPumpState === 'ON'
      ? `${BASE_URL}/flood/control/on`
      : `${BASE_URL}/flood/control/off`;

    try {
      const response = await axios.post(controlUrl);

      if (response.data.status === 'success') {
        alert(`✅ Pump turned ${newPumpState}`);
        fetchFloodData(); // Refresh data after toggling
      } else {
        alert('⚠️ Failed to update pump state');
      }
    } catch (error) {
      console.error('❌ Error toggling pump:', error);
      alert('Error communicating with server');
    } finally {
      setButtonLoading(false);
    }
  };

  // 🚨 Toggle Rescue Vehicle
  const toggleRescueVehicle = async () => {
    setButtonLoading(true);
    const actionUrl = rescueActive
      ? `${BASE_URL}/rescue/vehicle/off`
      : `${BASE_URL}/rescue/vehicle/on`;

    try {
      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        alert(`🚑 Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'}`);
      } else {
        alert('⚠️ Failed to control rescue vehicle');
      }
    } catch (error) {
      console.error('❌ Error toggling rescue vehicle:', error);
      alert('Error controlling rescue vehicle');
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <ThemeProvider theme={floodTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f2f6 50%, #dbeafe 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          {/* Header */}
          <Box display="flex" alignItems="center" mb={4}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ color: '#2196f3', mr: 2 }}
            >
              Back to Home
            </Button>
            <Flood sx={{ fontSize: 40, mr: 2, color: '#2196f3' }} />
            <Typography variant="h4" component="h1" color="text.primary">
              Flood Dashboard
            </Typography>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" mt={5}>
              <CircularProgress color="primary" />
            </Box>
          ) : floodData ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Latest Flood Data
              </Typography>
              <Typography><strong>_id:</strong> {floodData._id}</Typography>
              <Typography><strong>Timestamp:</strong> {floodData.timestamp}</Typography>
              <Typography><strong>Water Level:</strong> {floodData.distance} cm</Typography>
              <Typography><strong>Pump Status:</strong> {floodData.pump}</Typography>
              <Typography><strong>Mode:</strong> {floodData.mode}</Typography>

              {/* Buttons */}
              <Stack direction="row" spacing={2} mt={3} justifyContent="center" flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchFloodData}
                  disabled={refreshLoading}
                  color="primary"
                >
                  {refreshLoading ? 'Refreshing...' : 'Refresh Data'}
                </Button>

                <Button
                  variant="contained"
                  color={floodData.pump === 'ON' ? 'error' : 'success'}
                  onClick={togglePump}
                  disabled={buttonLoading}
                >
                  {buttonLoading
                    ? 'Processing...'
                    : floodData.pump === 'ON'
                    ? 'Disable Pump'
                    : 'Enable Pump'}
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Height />}
                  onClick={fetchLatestDistance}
                  disabled={buttonLoading}
                >
                  {buttonLoading ? 'Fetching...' : 'Latest Distance'}
                </Button>

                {/* 🚑 Rescue Vehicle Button */}
                {showRescueButton && (
                  <Button
                    variant="contained"
                    color={rescueActive ? 'error' : 'primary'}
                    startIcon={<DirectionsCar />}
                    onClick={toggleRescueVehicle}
                    disabled={buttonLoading}
                  >
                    {rescueActive ? 'Disable Rescue Vehicle' : 'Enable Rescue Vehicle'}
                  </Button>
                )}
              </Stack>

              {/* Show latest distance fetched */}
              {latestDistance !== null && (
                <Typography variant="body1" mt={2} color="primary">
                  📏 Latest Distance: {latestDistance} cm
                </Typography>
              )}
            </Paper>
          ) : (
            <Typography color="textSecondary" align="center" mt={4}>
              No flood data available.
            </Typography>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FloodDashboard;
