import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
} from '@mui/material';
import { ArrowBack, Landslide } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const landslideTheme = createTheme({
  palette: {
    primary: {
      main: '#8d6e63',
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

const LandslideDashboard = () => {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={landslideTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #8d6e63 0%, #5d4037 100%)',
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
            <Landslide sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h3" component="h1" color="white">
              Landslide Disaster Dashboard
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
              Geological Hazard Monitoring System
            </Typography>
            <Typography variant="body1">
              This dashboard will contain slope stability monitoring, geological surveys,
              early warning systems, and landslide risk assessment tools.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default LandslideDashboard;
