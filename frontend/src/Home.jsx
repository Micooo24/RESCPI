import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Alert,
} from "@mui/material";
import {
  LocalFireDepartment,
  Flood,
  Landslide,
  Warning,
  Emergency,
} from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Custom theme for disaster alert system
const disasterTheme = createTheme({
  palette: {
    primary: {
      main: "#d32f2f", // Red for emergency
      dark: "#b71c1c",
      light: "#f44336",
    },
    secondary: {
      main: "#ff9800", // Orange for warning
      dark: "#f57c00",
      light: "#ffb74d",
    },
    background: {
      default: "#0a0a0a",
      paper: "#1a1a1a",
    },
    text: {
      primary: "#ffffff",
      secondary: "#cccccc",
    },
    error: {
      main: "#f44336",
    },
    warning: {
      main: "#ff9800",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "4rem",
      textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
    },
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          textTransform: "none",
          fontWeight: 600,
          fontSize: "1.1rem",
          padding: "12px 24px",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.4)",
          },
        },
      },
    },
  },
});

const Home = () => {
  const navigate = useNavigate();

  const disasterTypes = [
    {
      title: "Fire Disaster",
      icon: <LocalFireDepartment sx={{ fontSize: 60 }} />,
      color: "#ff4444",
      description: "Monitor and respond to fire emergencies",
      route: "/Fire_disaster/firedashboard",
      gradient: "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
    },
    {
      title: "Flood Disaster",
      icon: <Flood sx={{ fontSize: 60 }} />,
      color: "#2196f3",
      description: "Track flood conditions and water levels",
      route: "/Flood_disaster/flooddashboard",
      gradient: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)",
    },
    {
      title: "Landslide Disaster",
      icon: <Landslide sx={{ fontSize: 60 }} />,
      color: "#8d6e63",
      description: "Monitor geological hazards and slope stability",
      route: "/landslidedisaster/landslidedashboard",
      gradient: "linear-gradient(135deg, #8d6e63 0%, #5d4037 100%)",
    },
  ];

  return (
    <ThemeProvider theme={disasterTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a1a1a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(255, 68, 68, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(141, 110, 99, 0.1) 0%, transparent 50%)
            `,
            zIndex: 0,
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={6}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Emergency sx={{ fontSize: 80, color: "#ff4444", mr: 2 }} />
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  background: "linear-gradient(45deg, #ff4444, #ff9800, #ffeb3b)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "0.1em",
                }}
              >
                RESCPI
              </Typography>
            </Box>
            <Typography
              variant="h4"
              component="h2"
              sx={{ color: "text.secondary", mb: 2 }}
            >
              Disaster Alert Management System
            </Typography>
            <Alert
              severity="info"
              icon={<Warning />}
              sx={{
                maxWidth: 600,
                mx: "auto",
                backgroundColor: "rgba(255, 152, 0, 0.1)",
                border: "1px solid rgba(255, 152, 0, 0.3)",
                "& .MuiAlert-icon": {
                  color: "#ff9800",
                },
              }}
            >
              Real-time disaster monitoring and emergency response coordination
            </Alert>
          </Box>

          {/* Disaster Type Cards */}
          <Grid container spacing={4} justifyContent="center">
            {disasterTypes.map((disaster, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    background: disaster.gradient,
                    color: "white",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", flexGrow: 1, p: 4 }}>
                    <Box mb={2}>{disaster.icon}</Box>
                    <Typography variant="h5" component="h3" mb={2} fontWeight="bold">
                      {disaster.title}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {disaster.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "center", pb: 3 }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate(disaster.route)}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: "white",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.3)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      Access Dashboard
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Footer */}
          <Paper
            sx={{
              mt: 6,
              p: 3,
              textAlign: "center",
              backgroundColor: "rgba(26, 26, 26, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Emergency Hotline: <strong style={{ color: "#ff4444" }}>911</strong> |
              System Status: <strong style={{ color: "#4caf50" }}>OPERATIONAL</strong>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default Home;
