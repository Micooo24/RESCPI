import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  ArrowBack,
  LocalFireDepartment,
  WarningAmber, // Icon for Rescue Button
  Assessment,
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import BASE_URL from '../common/baseurl';

const fireTheme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f',
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

const FireDashboard = () => {
  const navigate = useNavigate();
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [latestData, setLatestData] = useState(null); // Store latest reading
  const [latestLoading, setLatestLoading] = useState(false); // Loading for fetch button

  // Fetch all fire data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/gasfire/all`);
        if (response.data.status === 'success') {
          setFireData(response.data.data);
        } else {
          console.error('Failed to fetch fire data');
        }
      } catch (error) {
        console.error('Error fetching fire data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleRescueClick = async () => {
    setRescueLoading(true);
    try {
      if (!rescueActive) {
        const response = await axios.post(`${BASE_URL}/rescue/vehicle/on`);
        if (response.data.status === 'success') {
          alert("🚨 Rescue Vehicle Activated!");
          setRescueActive(true);
        } else {
          alert(`❌ Activation Failed: ${response.data.message}`);
        }
      } else {
        const response = await axios.post(`${BASE_URL}/rescue/vehicle/off`);
        if (response.data.status === 'success') {
          alert("🛑 Rescue Vehicle Deactivated.");
          setRescueActive(false);
        } else {
          alert(`❌ Deactivation Failed: ${response.data.message}`);
        }
      }
    } catch (error) {
      console.error("Error controlling Rescue Vehicle:", error);
      alert("❌ Could not contact backend.");
    } finally {
      setRescueLoading(false);
    }
  };

  // Save data & fetch the latest reading
  const saveAndFetchLatest = async () => {
    setLatestLoading(true);
    try {
      // Dummy data (replace with real sensor values if needed)
      const dummyPayload = {
        mq2_ppm: Math.random() * 500, // Random MQ2 ppm
        mq7_ppm: Math.random() * 300, // Random MQ7 ppm
        flame: Math.random() < 0.3, // Random flame detection
      };

      const response = await axios.post(`${BASE_URL}/gasfire/data-latest`, dummyPayload);

      if (response.data.status === 'success') {
        setLatestData(response.data.latest);
        alert('✅ Data saved and latest reading fetched!');
      } else {
        alert(`❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error saving & fetching latest:', error);
      alert('❌ Could not contact backend.');
    } finally {
      setLatestLoading(false);
    }
  };

  // Determine UI based on latest data
  const showRescueButton = fireData.some(item => item.flame === true);

  const showGasWarning =
    !latestData?.flame &&
    ((latestData?.mq2_ppm ?? 0) > 200 || (latestData?.mq7_ppm ?? 0) > 100);

  return (
    <ThemeProvider theme={fireTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f2f6 50%, #dbeafe 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box display="flex" alignItems="center" mb={4}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ color: '#d32f2f', mr: 2 }}
            >
              Back to Home
            </Button>
            <LocalFireDepartment sx={{ fontSize: 40, mr: 2, color: '#d32f2f' }} />
            <Typography variant="h4" component="h1" color="text.primary">
              Fire Dashboard
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Statistics */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                  color: 'white',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">Active Incidents</Typography>
                  <Typography variant="h2">
                    {fireData.filter((item) => item.flame).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: 'white',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">MQ2 Alerts</Typography>
                  <Typography variant="h2">
                    {fireData.filter((item) => item.mq2_ppm > 200).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  color: 'white',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">MQ7 Alerts</Typography>
                  <Typography variant="h2">
                    {fireData.filter((item) => item.mq7_ppm > 100).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 🚨 Rescue Vehicle Alert Button */}
            <Grid item xs={12}>
              <Box textAlign="center" mb={2}>
                {showRescueButton ? (
                  <Button
                    variant="contained"
                    size="large"
                    color={rescueActive ? "error" : "primary"}
                    startIcon={<WarningAmber />}
                    onClick={handleRescueClick}
                    disabled={rescueLoading}
                  >
                    {rescueLoading
                      ? "Processing..."
                      : rescueActive
                      ? "Deactivate Rescue Vehicle"
                      : "Activate Rescue Vehicle"}
                  </Button>
                ) : showGasWarning ? (
                  <Alert severity="warning" sx={{ maxWidth: 500, mx: "auto" }}>
                    ⚠️ High gas levels detected (MQ2/MQ7). Monitor environment closely!
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ maxWidth: 400, mx: "auto" }}>
                    ✅ No fire or dangerous gas detected.
                  </Alert>
                )}
              </Box>

              {/* Fetch Latest Button */}
              <Box textAlign="center" mb={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={saveAndFetchLatest}
                  disabled={latestLoading}
                >
                  {latestLoading ? 'Saving & Fetching...' : 'Save & Fetch Latest Reading'}
                </Button>
              </Box>

              {/* Latest Data Card */}
              {latestData && (
                <Box textAlign="center" mt={2}>
                  <Card sx={{ maxWidth: 500, mx: "auto", p: 2 }}>
                    <Typography variant="h6">Latest Reading</Typography>
                    <Typography variant="body1">
                      <b>Time:</b> {new Date(latestData.timestamp).toLocaleString()}
                    </Typography>
                    <Typography variant="body1">
                      <b>MQ2:</b> {latestData.mq2_ppm.toFixed(2)} PPM
                    </Typography>
                    <Typography variant="body1">
                      <b>MQ7:</b> {latestData.mq7_ppm.toFixed(2)} PPM
                    </Typography>
                    <Typography variant="body1">
                      <b>Flame:</b> {latestData.flame ? "🔥 Detected" : "✅ No Fire"}
                    </Typography>
                  </Card>
                </Box>
              )}
            </Grid>

            {/* Fire Data Table */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <Assessment sx={{ mr: 1, color: '#d32f2f' }} />
                  <Typography variant="h6">Gas & Fire Logs</Typography>
                </Box>
                {loading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="200px"
                  >
                    <CircularProgress color="primary" />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><b>Timestamp</b></TableCell>
                          <TableCell><b>MQ2 (PPM)</b></TableCell>
                          <TableCell><b>MQ7 (PPM)</b></TableCell>
                          <TableCell><b>Flame</b></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fireData.map((row) => (
                          <TableRow key={row._id}>
                            <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{row.mq2_ppm.toFixed(2)}</TableCell>
                            <TableCell>{row.mq7_ppm.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                label={row.flame ? 'Detected' : 'No Fire'}
                                color={row.flame ? 'error' : 'success'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FireDashboard;
