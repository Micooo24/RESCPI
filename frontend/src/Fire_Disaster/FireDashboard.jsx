import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
} from '@mui/material';
import { ArrowBack, LocalFireDepartment } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const fireTheme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f',
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

const FireDashboard = () => {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={fireTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
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
            <LocalFireDepartment sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h3" component="h1" color="white">
              Fire Disaster Dashboard
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
              Fire Emergency Management System
            </Typography>
            <Typography variant="body1">
              This dashboard will contain fire monitoring tools, emergency response coordinates,
              and real-time fire incident tracking.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FireDashboard;
