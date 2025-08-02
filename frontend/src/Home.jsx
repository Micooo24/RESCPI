import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import {
  LocalFireDepartment,
  Flood,
  Landslide,
} from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Minimal theme
const minimalTheme = createTheme({
  palette: {
    background: {
      default: "#ffffff",
    },
    text: {
      primary: "#333333",
    },
  },
});

const Home = () => {
  const navigate = useNavigate();

  // Disaster type cards
  const disasterTypes = [
    {
      title: "Fire",
      icon: <LocalFireDepartment sx={{ fontSize: 40 }} />,
      color: "#f44336",
      route: "/Fire_disaster/firedashboard",
    },
    {
      title: "Flood",
      icon: <Flood sx={{ fontSize: 40 }} />,
      color: "#2196f3",
      route: "/Flood_disaster/flooddashboard",
    },
    {
      title: "Landslide",
      icon: <Landslide sx={{ fontSize: 40 }} />,
      color: "#795548",
      route: "/landslidedisaster/landslidedashboard",
    },
  ];

  // Minimal notifications
  const notifications = [
    { type: "Fire", location: "Downtown Area", status: "Active" },
    { type: "Flood", location: "River District", status: "Warning" },
    { type: "Landslide", location: "Hill Road", status: "Monitoring" },
  ];

  return (
    <ThemeProvider theme={minimalTheme}>
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          position: "fixed",
          top: 0,
          left: 0,
          overflow: "auto",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 2,
          }}
        >
          {/* Simple Header */}
          <Typography
            variant="h4"
            component="h1"
            sx={{ 
              mb: 1,
              color: "#333333",
              fontWeight: 500,
            }}
          >
            RESCPI
          </Typography>
          
          <Typography
            variant="body1"
            sx={{ 
              mb: 4,
              color: "#666666",
            }}
          >
            Disaster Management System
          </Typography>

          {/* Disaster Cards */}
          <Box 
            sx={{ 
              display: "flex", 
              gap: 3,
              flexWrap: "wrap",
              justifyContent: "center",
              mb: 4,
            }}
          >
            {disasterTypes.map((disaster, index) => (
              <Card
                key={index}
                sx={{
                  minWidth: 200,
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  border: `2px solid ${disaster.color}`,
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ py: 3 }}>
                  <Box sx={{ color: disaster.color, mb: 1 }}>
                    {disaster.icon}
                  </Box>
                  <Typography variant="h6" sx={{ color: disaster.color }}>
                    {disaster.title}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                  <Button
                    variant="outlined"
                    sx={{
                      borderColor: disaster.color,
                      color: disaster.color,
                      "&:hover": {
                        backgroundColor: disaster.color,
                        color: "#ffffff",
                      },
                    }}
                    onClick={() => navigate(disaster.route)}
                  >
                    Open
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>

          {/* Minimal Notifications */}
          <Box sx={{ width: "100%", maxWidth: 600 }}>
            <Typography
              variant="h6"
              sx={{ 
                mb: 2,
                color: "#333333",
                textAlign: "center",
              }}
            >
              Current Alerts
            </Typography>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {notifications.map((notification, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 2,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    backgroundColor: "#fafafa",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#333333" }}>
                    <strong>{notification.type}</strong> - {notification.location}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: notification.status === "Active" ? "#f44336" : 
                             notification.status === "Warning" ? "#ff9800" : "#4caf50",
                      fontWeight: 500,
                    }}
                  >
                    {notification.status}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default Home;