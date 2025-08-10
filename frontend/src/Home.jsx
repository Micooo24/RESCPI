import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Modal,
  Backdrop,
} from "@mui/material";
import {
  LocalFireDepartment,
  Flood,
  Landslide,
  Home as HomeIcon,
  BarChart,
  Print,
  Fullscreen,
  FullscreenExit,
  Close,
} from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Updated theme with new color scheme
const minimalTheme = createTheme({
  palette: {
    background: {
      default: "#F5F5DD",
    },
    text: {
      primary: "#34623f",
    },
    primary: {
      main: "#F5F5DD",
    },
    secondary: {
      main: "#34623f",
    },
  },
});

const Home = () => {
  const navigate = useNavigate();
  const chartSectionRef = useRef(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Disaster type cards with new color schemes
  const disasterTypes = [
    {
      title: "Fire",
      icon: <LocalFireDepartment sx={{ fontSize: 45 }} />,
      colors: {
        primary: "#cc4a02",
        secondary: "#DC143C",
        third: "#1F51FF"
      },
      route: "/Fire_disaster/firedashboard",
    },
    {
      title: "Flood",
      icon: <Flood sx={{ fontSize: 45 }} />,
      colors: {
        primary: "#cc4a02",
        secondary: "#66FF00",
        third: "#1F51FF"
      },
      route: "/Flood_disaster/flooddashboard",
    },
    {
      title: "Landslide",
      icon: <Landslide sx={{ fontSize: 45 }} />,
      colors: {
        primary: "#cc4a02",
        secondary: "#66FF00",
        third: "#1F51FF"
      },
      route: "/landslidedisaster/landslidedashboard",
    },
  ];

  // Minimal notifications
  const notifications = [
    { type: "Fire", location: "Downtown Area", status: "Active" },
    { type: "Flood", location: "River District", status: "Warning" },
    { type: "Landslide", location: "Hill Road", status: "Monitoring" },
  ];

  // Chart Data
  const fireIncidentsData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        label: 'Fire Incidents',
        data: [2, 5, 3, 8, 6, 4, 7],
        backgroundColor: 'rgba(204, 74, 2, 0.6)',
        borderColor: '#cc4a02',
        borderWidth: 3,
        tension: 0.4,
      }
    ],
  };

  const floodWaterLevelData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'Water Level (cm)',
        data: [15, 18, 22, 25, 28, 24, 20],
        backgroundColor: 'rgba(31, 81, 255, 0.3)',
        borderColor: '#1F51FF',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      }
    ],
  };

  const landslideAlertData = {
    labels: ['Normal', 'Low Risk', 'Medium Risk', 'High Risk', 'Critical'],
    datasets: [{
      data: [45, 25, 15, 10, 5],
      backgroundColor: [
        '#66FF00',
        '#1F51FF', 
        '#cc4a02',
        '#DC143C',
        '#8B0000'
      ],
      borderColor: '#ffffff',
      borderWidth: 3,
    }],
  };

  const overallStatusData = {
    labels: ['Fire Incidents', 'Flood Warnings', 'Landslide Alerts'],
    datasets: [{
      data: [35, 40, 25],
      backgroundColor: [
        '#cc4a02',
        '#1F51FF',
        '#66FF00'
      ],
      borderColor: '#ffffff',
      borderWidth: 3,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 10,
            weight: 'bold'
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          color: 'rgba(52, 98, 63, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          color: 'rgba(52, 98, 63, 0.1)'
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 10,
            weight: 'bold'
          }
        }
      }
    }
  };

  // Print function for charts
  const handlePrintCharts = () => {
    const printWindow = window.open('', '_blank');
    const chartSection = chartSectionRef.current;
    
    if (chartSection) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>RESCPI Emergency Analytics Dashboard</title>
          <style>
            @media print {
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px;
                color: #34623f;
              }
              .print-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #cc4a02;
                padding-bottom: 20px;
              }
              .chart-container {
                page-break-inside: avoid;
                margin-bottom: 30px;
                border: 2px solid #34623f;
                padding: 15px;
                border-radius: 8px;
              }
              .chart-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
              }
              .chart-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: #34623f;
              }
              @page {
                margin: 1in;
                size: landscape;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>RESCPI Emergency Analytics Dashboard</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          ${chartSection.innerHTML}
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Toggle full screen view
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <ThemeProvider theme={minimalTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#F5F5DD",
          py: 3,
          overflow: "auto",
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {/* Balanced Header Section */}
          <Box sx={{ textAlign: "center", mb: { xs: 4, md: 5 } }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{ 
                mb: 1,
                color: "#34623f",
                fontWeight: 700,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" }
              }}
            >
              RESCPI
            </Typography>
            
            <Typography
              variant="h6"
              sx={{ 
                color: "#34623f",
                opacity: 0.8,
                fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" }
              }}
            >
              Disaster Management System
            </Typography>
          </Box>

          {/* Balanced House Cards Section */}
          <Box 
            sx={{ 
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              gap: { xs: 3, sm: 4, md: 5 },
              width: "100%",
              maxWidth: 1000,
              mb: { xs: 5, md: 7 },
              justifyItems: "center",
            }}
          >
            {disasterTypes.map((disaster, index) => (
              <Box
                key={index}
                sx={{
                  position: "relative",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-12px) scale(1.02)",
                    "& .house-roof": {
                      borderBottomColor: disaster.colors.primary,
                      filter: "brightness(1.15) saturate(1.2)",
                      transform: "scale(1.05)",
                    },
                    "& .house-card": {
                      boxShadow: `0 20px 40px rgba(204, 74, 2, 0.25), 0 0 0 3px ${disaster.colors.third}20`,
                      borderColor: disaster.colors.secondary,
                    },
                    "& .house-door": {
                      backgroundColor: disaster.colors.primary,
                      filter: "brightness(1.15)",
                      transform: "scale(1.05)",
                    },
                    "& .house-windows": {
                      borderColor: disaster.colors.secondary,
                      backgroundColor: disaster.colors.third,
                      transform: "scale(1.1)",
                    },
                    "& .house-icon": {
                      transform: "scale(1.1) rotate(5deg)",
                    },
                    "& .house-title": {
                      transform: "scale(1.05)",
                      color: disaster.colors.secondary,
                      filter: "brightness(1.1)",
                    },
                  },
                }}
                onClick={() => navigate(disaster.route)}
              >
                {/* House Roof */}
                <Box
                  className="house-roof"
                  sx={{
                    width: 0,
                    height: 0,
                    borderLeft: { xs: "120px solid transparent", sm: "130px solid transparent", md: "140px solid transparent" },
                    borderRight: { xs: "120px solid transparent", sm: "130px solid transparent", md: "140px solid transparent" },
                    borderBottom: { xs: `35px solid ${disaster.colors.primary}`, sm: `38px solid ${disaster.colors.primary}`, md: `40px solid ${disaster.colors.primary}` },
                    margin: "0 auto",
                    position: "relative",
                    zIndex: 3,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
                
                {/* Chimney */}
                <Box
                  sx={{
                    width: { xs: 12, md: 15 },
                    height: { xs: 20, md: 25 },
                    backgroundColor: disaster.colors.secondary,
                    position: "absolute",
                    top: { xs: 6, md: 8 },
                    right: { xs: "calc(50% - 75px)", sm: "calc(50% - 80px)", md: "calc(50% - 85px)" },
                    zIndex: 4,
                    opacity: 0.9,
                  }}
                />
                
                {/* House Body */}
                <Card
                  className="house-card"
                  sx={{
                    backgroundColor: "#F5F5DD",
                    border: `3px solid ${disaster.colors.primary}`,
                    borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    boxShadow: "0 8px 20px rgba(52, 98, 63, 0.15)",
                    marginTop: "-3px",
                    position: "relative",
                    zIndex: 2,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    minHeight: { xs: 260, sm: 270, md: 280 },
                    width: { xs: 240, sm: 260, md: 280 },
                    margin: "0 auto",
                  }}
                >
                  <CardContent sx={{ py: { xs: 3, md: 4 }, px: 3 }}>
                    {/* Door */}
                    <Box
                      className="house-door"
                      sx={{
                        width: { xs: 60, md: 70 },
                        height: { xs: 80, md: 90 },
                        backgroundColor: disaster.colors.primary,
                        margin: "0 auto 20px auto",
                        borderRadius: "12px 12px 0 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`,
                      }}
                    >
                      <Box 
                        className="house-icon"
                        sx={{ 
                          color: "#F5F5DD", 
                          mb: 1,
                          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          "& svg": {
                            fontSize: { xs: 35, md: 45 }
                          }
                        }}
                      >
                        {disaster.icon}
                      </Box>
                      {/* Door Handle */}
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          backgroundColor: disaster.colors.third,
                          borderRadius: "50%",
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      />
                    </Box>
                    
                    {/* Windows */}
                    <Box sx={{ display: "flex", justifyContent: "space-around", mb: 3 }}>
                      {[1, 2].map((window) => (
                        <Box
                          key={window}
                          className="house-windows"
                          sx={{
                            width: { xs: 22, md: 25 },
                            height: { xs: 22, md: 25 },
                            border: `3px solid ${disaster.colors.secondary}`,
                            backgroundColor: "#ffffff",
                            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              top: "50%",
                              left: "0",
                              right: "0",
                              height: "1px",
                              backgroundColor: disaster.colors.secondary,
                              transform: "translateY(-50%)",
                            },
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              top: "0",
                              bottom: "0",
                              left: "50%",
                              width: "1px",
                              backgroundColor: disaster.colors.secondary,
                              transform: "translateX(-50%)",
                            },
                          }}
                        />
                      ))}
                    </Box>
                    
                    {/* Title */}
                    <Typography 
                      className="house-title"
                      variant="h5" 
                      sx={{ 
                        color: disaster.colors.primary, 
                        fontWeight: 600,
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        mb: 2,
                        fontSize: { xs: "1.3rem", md: "1.5rem" }
                      }}
                    >
                      {disaster.title}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "center", pb: 3 }}>
                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: disaster.colors.third,
                        color: "#ffffff",
                        px: 4,
                        py: 1,
                        borderRadius: 3,
                        fontWeight: 600,
                        fontSize: { xs: "0.85rem", md: "0.9rem" },
                        transition: "all 0.3s ease",
                        "&:hover": {
                          backgroundColor: disaster.colors.third,
                          transform: "scale(1.05)",
                          boxShadow: `0 6px 16px ${disaster.colors.third}40`,
                          filter: "brightness(1.1)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(disaster.route);
                      }}
                    >
                      Enter
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>

          {/* Balanced Charts Section */}
          <Box 
            ref={chartSectionRef}
            sx={{ 
              width: "100%", 
              maxWidth: isExpanded ? "100%" : 1200, 
              mb: { xs: 5, md: 7 },
              transition: "all 0.3s ease",
            }}
          >
            {/* Chart Header */}
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              mb: 4,
              flexWrap: "wrap",
              gap: 2,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                <BarChart sx={{ fontSize: { xs: 24, md: 30 }, mr: 2, color: "#34623f" }} />
                <Typography
                  variant="h4"
                  sx={{ 
                    color: "#34623f",
                    fontWeight: 600,
                    fontSize: { xs: "1.5rem", sm: "2rem", md: "2.2rem" }
                  }}
                >
                  Emergency Analytics Dashboard
                </Typography>
              </Box>
              
              {/* Control Buttons */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Tooltip title="Full Screen View">
                  <IconButton 
                    onClick={toggleFullScreen}
                    sx={{ 
                      color: "#1F51FF",
                      border: "2px solid #1F51FF",
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      "&:hover": {
                        backgroundColor: "rgba(31, 81, 255, 0.1)",
                      }
                    }}
                  >
                    <Fullscreen />
                  </IconButton>
                </Tooltip>

                <Tooltip title={isExpanded ? "Collapse View" : "Expand View"}>
                  <IconButton 
                    onClick={toggleExpanded}
                    sx={{ 
                      color: "#34623f",
                      border: "2px solid #34623f",
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      "&:hover": {
                        backgroundColor: "rgba(52, 98, 63, 0.1)",
                      }
                    }}
                  >
                    {isExpanded ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Print Charts">
                  <Button
                    variant="contained"
                    startIcon={<Print />}
                    onClick={handlePrintCharts}
                    sx={{
                      backgroundColor: "#cc4a02",
                      color: "#ffffff",
                      fontWeight: 600,
                      px: 3,
                      fontSize: { xs: "0.8rem", md: "0.9rem" },
                      "&:hover": {
                        backgroundColor: "#a03902",
                        transform: "scale(1.02)",
                      },
                    }}
                  >
                    Print Charts
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            
            <Grid container spacing={isExpanded ? 4 : 3}>
              {/* Fire Incidents Chart */}
              <Grid item xs={12} md={6}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    height: isExpanded ? 400 : 320,
                    backgroundColor: '#ffffff',
                    border: '3px solid #cc4a02',
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(204, 74, 2, 0.2)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: '#34623f', fontWeight: 600, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                    🔥 Fire Incidents Timeline (Last 7 Days)
                  </Typography>
                  <Box sx={{ height: isExpanded ? 300 : 220 }}>
                    <Line data={fireIncidentsData} options={chartOptions} />
                  </Box>
                </Paper>
              </Grid>

              {/* Flood Water Level Chart */}
              <Grid item xs={12} md={6}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    height: isExpanded ? 400 : 320,
                    backgroundColor: '#ffffff',
                    border: '3px solid #1F51FF',
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(31, 81, 255, 0.2)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: '#34623f', fontWeight: 600, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                    💧 Water Level Monitoring (24 Hours)
                  </Typography>
                  <Box sx={{ height: isExpanded ? 300 : 220 }}>
                    <Line data={floodWaterLevelData} options={chartOptions} />
                  </Box>
                </Paper>
              </Grid>

              {/* Landslide Alert Distribution */}
              <Grid item xs={12} md={6}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    height: isExpanded ? 400 : 320,
                    backgroundColor: '#ffffff',
                    border: '3px solid #66FF00',
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(102, 255, 0, 0.2)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: '#34623f', fontWeight: 600, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                    ⛰️ Landslide Alert Distribution
                  </Typography>
                  <Box sx={{ height: isExpanded ? 300 : 220 }}>
                    <Doughnut data={landslideAlertData} options={pieOptions} />
                  </Box>
                </Paper>
              </Grid>

              {/* Overall System Status */}
              <Grid item xs={12} md={6}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    height: isExpanded ? 400 : 320,
                    backgroundColor: '#ffffff',
                    border: '3px solid #34623f',
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(52, 98, 63, 0.2)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: '#34623f', fontWeight: 600, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                    📊 Overall Emergency Status
                  </Typography>
                  <Box sx={{ height: isExpanded ? 300 : 220 }}>
                    <Pie data={overallStatusData} options={pieOptions} />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* Balanced Notifications Section */}
          <Box sx={{ width: "100%", maxWidth: 800, px: { xs: 1, md: 0 } }}>
            <Typography
              variant="h5"
              sx={{ 
                mb: 4,
                color: "#34623f",
                textAlign: "center",
                fontWeight: 600,
                fontSize: { xs: "1.3rem", md: "1.5rem" }
              }}
            >
              Current Alerts
            </Typography>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {notifications.map((notification, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: { xs: 2.5, md: 3 },
                    border: "2px solid #34623f",
                    borderRadius: 3,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 2px 8px rgba(52, 98, 63, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(52, 98, 63, 0.2)",
                      borderColor: "#cc4a02",
                      backgroundColor: "#fefefe",
                    },
                  }}
                >
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: "#34623f", 
                      fontWeight: 500,
                      fontSize: { xs: "0.9rem", md: "1rem" }
                    }}
                  >
                    <strong>{notification.type}</strong> - {notification.location}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "#ffffff",
                      fontWeight: 700,
                      backgroundColor: notification.status === "Active" ? "#DC143C" : 
                                     notification.status === "Warning" ? "#cc4a02" : "#66FF00",
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      minWidth: { xs: 80, md: 90 },
                      textAlign: "center",
                      fontSize: { xs: "0.75rem", md: "0.8rem" }
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

      {/* Full Screen Modal */}
      <Modal
        open={isFullScreen}
        onClose={toggleFullScreen}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#F5F5DD',
            p: 4,
            overflow: 'auto',
            outline: 'none',
          }}
        >
          {/* Full Screen Header */}
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            mb: 4,
          }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <BarChart sx={{ fontSize: 40, mr: 2, color: "#34623f" }} />
              <Typography
                variant="h3"
                sx={{ 
                  color: "#34623f",
                  fontWeight: 600,
                }}
              >
                RESCPI Emergency Analytics Dashboard
              </Typography>
            </Box>
            
            <IconButton 
              onClick={toggleFullScreen}
              sx={{ 
                color: "#34623f",
                border: "2px solid #34623f",
                fontSize: "2rem",
                "&:hover": {
                  backgroundColor: "rgba(52, 98, 63, 0.1)",
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>
          
          {/* Full Screen Charts Grid */}
          <Grid container spacing={4}>
            {/* Fire Incidents Chart */}
            <Grid item xs={12} lg={6}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: 500,
                  backgroundColor: '#ffffff',
                  border: '3px solid #cc4a02',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  🔥 Fire Incidents Timeline (Last 7 Days)
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Line data={fireIncidentsData} options={chartOptions} />
                </Box>
              </Paper>
            </Grid>

            {/* Flood Water Level Chart */}
            <Grid item xs={12} lg={6}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: 500,
                  backgroundColor: '#ffffff',
                  border: '3px solid #1F51FF',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  💧 Water Level Monitoring (24 Hours)
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Line data={floodWaterLevelData} options={chartOptions} />
                </Box>
              </Paper>
            </Grid>

            {/* Landslide Alert Distribution */}
            <Grid item xs={12} lg={6}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: 500,
                  backgroundColor: '#ffffff',
                  border: '3px solid #66FF00',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  ⛰️ Landslide Alert Distribution
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Doughnut data={landslideAlertData} options={pieOptions} />
                </Box>
              </Paper>
            </Grid>

            {/* Overall System Status */}
            <Grid item xs={12} lg={6}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: 500,
                  backgroundColor: '#ffffff',
                  border: '3px solid #34623f',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  📊 Overall Emergency Status
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Pie data={overallStatusData} options={pieOptions} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Modal>
    </ThemeProvider>
  );
};

export default Home;