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
            <LocalFireDepartment sx={{ fontSize: 40, mr: 2, color: '#cc4a02' }} />
            <Typography variant="h4" component="h1" sx={{ color: '#34623f', fontWeight: 600 }}>
              Fire Emergency Dashboard
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
            {/* Statistics Cards */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #cc4a02 0%, #a03902 100%)',
                  color: 'white',
                  height: '150px',
                  boxShadow: '0 4px 12px rgba(204, 74, 2, 0.3)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Active Fire Incidents</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {fireData.filter((item) => item.flame).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #DC143C 0%, #b91230 100%)',
                  color: 'white',
                  height: '150px',
                  boxShadow: '0 4px 12px rgba(220, 20, 60, 0.3)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>MQ2 Gas Alerts</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {fireData.filter((item) => item.mq2_ppm > 200).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #1F51FF 0%, #1a44d9 100%)',
                  color: 'white',
                  height: '150px',
                  boxShadow: '0 4px 12px rgba(31, 81, 255, 0.3)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>MQ7 Gas Alerts</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {fireData.filter((item) => item.mq7_ppm > 100).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Control Panel */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #cc4a02' }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  Emergency Control Panel
                </Typography>

                {/* Rescue Vehicle Button */}
                <Box textAlign="center" mb={3}>
                  {showRescueButton ? (
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
                      startIcon={<WarningAmber />}
                      onClick={handleRescueClick}
                      disabled={rescueLoading}
                    >
                      {rescueLoading
                        ? "Processing..."
                        : rescueActive
                        ? "Deactivate Rescue Vehicle"
                        : "🚨 ACTIVATE RESCUE VEHICLE"}
                    </Button>
                  ) : showGasWarning ? (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        backgroundColor: 'rgba(204, 74, 2, 0.1)',
                        border: '1px solid #cc4a02',
                        color: '#34623f',
                      }}
                    >
                      ⚠️ High gas levels detected (MQ2/MQ7). Monitor environment closely!
                    </Alert>
                  ) : (
                    <Alert 
                      severity="success"
                      sx={{ 
                        backgroundColor: 'rgba(31, 81, 255, 0.1)',
                        border: '1px solid #1F51FF',
                        color: '#34623f',
                      }}
                    >
                      ✅ No fire or dangerous gas detected. System Normal.
                    </Alert>
                  )}
                </Box>

                {/* Fetch Latest Button */}
                <Box textAlign="center" mb={3}>
                  <Button
                    variant="outlined"
                    sx={{
                      borderColor: '#1F51FF',
                      color: '#1F51FF',
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'rgba(31, 81, 255, 0.1)',
                        borderColor: '#1F51FF',
                      },
                    }}
                    onClick={saveAndFetchLatest}
                    disabled={latestLoading}
                  >
                    {latestLoading ? 'Saving & Fetching...' : 'Save & Fetch Latest Reading'}
                  </Button>
                </Box>

                {/* Latest Data Display */}
                {latestData && (
                  <Card 
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#F5F5DD',
                      border: '1px solid #34623f',
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600, mb: 2 }}>
                      Latest Sensor Reading
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Time:</b> {new Date(latestData.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>MQ2:</b> {latestData.mq2_ppm.toFixed(2)} PPM
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>MQ7:</b> {latestData.mq7_ppm.toFixed(2)} PPM
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34623f' }}>
                          <b>Flame:</b> {latestData.flame ? "🔥 Detected" : "✅ No Fire"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Card>
                )}
              </Paper>
            </Grid>

            {/* Fire Data Table */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 3, height: '100%', backgroundColor: '#ffffff', border: '2px solid #1F51FF' }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <Assessment sx={{ mr: 1, color: '#1F51FF' }} />
                  <Typography variant="h6" sx={{ color: '#34623f', fontWeight: 600 }}>
                    Fire & Gas Detection Logs
                  </Typography>
                </Box>
                {loading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="300px"
                  >
                    <CircularProgress sx={{ color: '#cc4a02' }} />
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: '400px' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ backgroundColor: '#F5F5DD', color: '#34623f', fontWeight: 600 }}>
                            Timestamp
                          </TableCell>
                          <TableCell sx={{ backgroundColor: '#F5F5DD', color: '#34623f', fontWeight: 600 }}>
                            MQ2 (PPM)
                          </TableCell>
                          <TableCell sx={{ backgroundColor: '#F5F5DD', color: '#34623f', fontWeight: 600 }}>
                            MQ7 (PPM)
                          </TableCell>
                          <TableCell sx={{ backgroundColor: '#F5F5DD', color: '#34623f', fontWeight: 600 }}>
                            Flame Status
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fireData.map((row) => (
                          <TableRow key={row._id} hover>
                            <TableCell sx={{ color: '#34623f' }}>
                              {new Date(row.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell sx={{ color: '#34623f' }}>
                              {row.mq2_ppm.toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ color: '#34623f' }}>
                              {row.mq7_ppm.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.flame ? '🔥 Fire Detected' : '✅ No Fire'}
                                sx={{
                                  backgroundColor: row.flame ? '#DC143C' : '#1F51FF',
                                  color: 'white',
                                  fontWeight: 600,
                                }}
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