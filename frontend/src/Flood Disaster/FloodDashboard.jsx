import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Chip,
} from '@mui/material';
import { 
  ArrowBack, 
  Flood, 
  Download,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

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
  const [selectedReport, setSelectedReport] = useState(null);

  // Sample data for chart
  const floodData = [
    { month: 'Jan', level: 8 },
    { month: 'Feb', level: 12 },
    { month: 'Mar', level: 6 },
    { month: 'Apr', level: 15 },
    { month: 'May', level: 20 },
    { month: 'Jun', level: 10 },
  ];

  const reportTypes = [
    { id: 1, name: 'Water Level Report', type: 'PDF', date: '2025-07-01' },
    { id: 2, name: 'Flood Risk Analysis', type: 'Excel', date: '2025-06-28' },
    { id: 3, name: 'Evacuation Analytics', type: 'PDF', date: '2025-06-25' },
  ];

  const handleDownloadReport = (reportId) => {
    setSelectedReport(reportId);
    setTimeout(() => {
      setSelectedReport(null);
      alert('Report downloaded!');
    }, 1500);
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
        <Container maxWidth="lg">
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

          <Grid container spacing={3}>
            {/* Statistics */}
            <Grid item xs={12} md={4}>
              <Card sx={{ background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">Current Alerts</Typography>
                  <Typography variant="h2">2</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">Water Level</Typography>
                  <Typography variant="h2">15m</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">Safe Areas</Typography>
                  <Typography variant="h2">85%</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Water Level Chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <TrendingUp sx={{ mr: 1, color: '#2196f3' }} />
                  <Typography variant="h6">Water Level Trends</Typography>
                </Box>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'end', gap: 3, p: 2 }}>
                  {floodData.map((data, index) => (
                    <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <Box
                        sx={{
                          height: `${data.level * 8}px`,
                          width: '50px',
                          backgroundColor: '#2196f3',
                          borderRadius: '4px 4px 0 0',
                          mb: 1,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          pt: 1,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {data.level}m
                        </Typography>
                      </Box>
                      <Typography variant="body2">{data.month}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Downloadable Reports */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <Assessment sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="h6">Reports</Typography>
                </Box>
                <List>
                  {reportTypes.map((report) => (
                    <ListItem key={report.id} sx={{ px: 0, py: 1 }}>
                      <ListItemText
                        primary={<Typography variant="body2">{report.name}</Typography>}
                        secondary={
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <Chip label={report.type} size="small" />
                            <Typography variant="caption">{report.date}</Typography>
                          </Box>
                        }
                      />
                      <Button
                        startIcon={<Download />}
                        variant="contained"
                        size="small"
                        onClick={() => handleDownloadReport(report.id)}
                        disabled={selectedReport === report.id}
                        sx={{ 
                          ml: 1,
                          backgroundColor: '#2196f3',
                          '&:hover': { backgroundColor: '#1976d2' }
                        }}
                      >
                        {selectedReport === report.id ? 'Loading...' : 'Download'}
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FloodDashboard;
