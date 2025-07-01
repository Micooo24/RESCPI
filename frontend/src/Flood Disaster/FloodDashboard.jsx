import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
} from '@mui/material';
import { ArrowBack, Flood } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const floodTheme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
});

const FloodDashboard = () => {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={floodTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" mb={4}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ color: 'white', mr: 2 }}
            >
              Back to Home
            </Button>
            <Flood sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h3" component="h1" color="white">
              Flood Disaster Dashboard
            </Typography>
          </Box>

          <Paper
            sx={{
              p: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              color: 'white',
            }}
          >
            <Typography variant="h5" mb={2}>
              Flood Monitoring & Response System
            </Typography>
            <Typography variant="body1">
              This dashboard will contain water level monitoring, flood prediction models,
              evacuation routes, and emergency response coordination tools.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FloodDashboard;
