import React, { useRef, useState, useEffect } from "react";
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
  Refresh,
} from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Updated theme with new color scheme and Poppins font
const modernTheme = createTheme({
  typography: {
    fontFamily: [
      'Poppins',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  },
  palette: {
    background: {
      default: "#E9E3DF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#000000",
      secondary: "#465C88",
    },
    primary: {
      main: "#FF7A30",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#465C88",
      contrastText: "#FFFFFF",
    },
    error: {
      main: "#000000",
    },
    warning: {
      main: "#FF7A30",
    },
    success: {
      main: "#465C88",
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 2px 8px rgba(0, 0, 0, 0.05)',
    '0 4px 16px rgba(0, 0, 0, 0.08)',
    '0 8px 24px rgba(0, 0, 0, 0.12)',
    '0 12px 32px rgba(0, 0, 0, 0.15)',
    '0 16px 40px rgba(0, 0, 0, 0.18)',
    '0 20px 48px rgba(0, 0, 0, 0.2)',
    ...Array(18).fill('0 24px 56px rgba(0, 0, 0, 0.25)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          padding: '12px 32px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: 'none',
        },
      },
    },
  },
});

const Home = () => {
  const navigate = useNavigate();
  const chartSectionRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [floodData, setFloodData] = useState([]);
  const [landslideData, setLandslideData] = useState([]);
  const [gasFireData, setGasFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const [landslideWsConnection, setLandslideWsConnection] = useState(null);
  const [gasFireWsConnection, setGasFireWsConnection] = useState(null);

  // Updated disaster types with uniform color scheme
  const disasterTypes = [
    {
      title: "Fire",
      icon: <LocalFireDepartment sx={{ fontSize: 45 }} />,
      colors: {
        primary: "#FF7A30",
        secondary: "#465C88",
        third: "#000000"
      },
      route: "/Fire_disaster/firedashboard",
    },
    {
      title: "Flood",
      icon: <Flood sx={{ fontSize: 45 }} />,
      colors: {
        primary: "#FF7A30",
        secondary: "#465C88",
        third: "#000000"
      },
      route: "/Flood_disaster/flooddashboard",
    },
    {
      title: "Landslide",
      icon: <Landslide sx={{ fontSize: 45 }} />,
      colors: {
        primary: "#FF7A30",
        secondary: "#465C88",
        third: "#000000"
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

  // Fetch flood data from API
  const fetchFloodData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://10.16.180.193:5000/flood/latest');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setFloodData(prevData => {
          const newData = [...prevData, result.data];
          return newData.slice(-50);
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching flood data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch landslide data from API
  const fetchLandslideData = async () => {
    try {
      const response = await fetch('http://10.16.180.193:5000/landslide/all');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setLandslideData(result.data.slice(0, 50)); // Get latest 50 data points
      }
      
    } catch (err) {
      console.error('Error fetching landslide data:', err);
      setError(err.message);
    }
  };

    const fetchGasFireData = async () => {
    try {
      const response = await fetch('http://10.16.180.193:5000/gasfire/all');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setGasFireData(result.data.slice(0, 50)); // Get latest 50 data points
      }
      
    } catch (err) {
      console.error('Error fetching gas fire data:', err);
      setError(err.message);
    }
  };

  // Setup WebSocket connection for flood real-time data
  const setupFloodWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/flood/ws/frontend');
      
      ws.onopen = () => {
        console.log('Flood WebSocket connected');
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'sensor' || data.distance !== undefined) {
            setFloodData(prevData => {
              const newData = [...prevData, data];
              return newData.slice(-50);
            });
          }
        } catch (err) {
          console.error('Error parsing Flood WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('Flood WebSocket disconnected');
        setTimeout(setupFloodWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('Flood WebSocket error:', error);
      };
      
      setWsConnection(ws);
      
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
      
      return () => {
        clearInterval(pingInterval);
        ws.close();
      };
    } catch (err) {
      console.error('Error setting up Flood WebSocket:', err);
    }
  };

  // Setup WebSocket connection for landslide real-time data
  const setupLandslideWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/landslide/ws/frontend');
      
      ws.onopen = () => {
        console.log('Landslide WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'sensor' || data.accel_x !== undefined) {
            setLandslideData(prevData => {
              const newData = [data, ...prevData];
              return newData.slice(0, 50);
            });
          }
        } catch (err) {
          console.error('Error parsing Landslide WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('Landslide WebSocket disconnected');
        setTimeout(setupLandslideWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('Landslide WebSocket error:', error);
      };
      
      setLandslideWsConnection(ws);
      
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
      
      return () => {
        clearInterval(pingInterval);
        ws.close();
      };
    } catch (err) {
      console.error('Error setting up Landslide WebSocket:', err);
    }
  };

  const setupGasFireWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/gasfire/ws/frontend');
      
      ws.onopen = () => {
        console.log('Gas Fire WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'sensor' || data.mq2_ppm !== undefined) {
            setGasFireData(prevData => {
              const newData = [data, ...prevData];
              return newData.slice(0, 50);
            });
          }
        } catch (err) {
          console.error('Error parsing Gas Fire WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('Gas Fire WebSocket disconnected');
        setTimeout(setupGasFireWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('Gas Fire WebSocket error:', error);
      };
      
      setGasFireWsConnection(ws);
      
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
      
      return () => {
        clearInterval(pingInterval);
        ws.close();
      };
    } catch (err) {
      console.error('Error setting up Gas Fire WebSocket:', err);
    }
  };

  
  // Initialize data fetching and WebSocket
  useEffect(() => {
    fetchFloodData();
    fetchLandslideData();
    fetchGasFireData();
    const floodCleanup = setupFloodWebSocket();
    const landslideCleanup = setupLandslideWebSocket();
    const gasFireCleanup = setupGasFireWebSocket();
    
    return () => {
      if (floodCleanup) floodCleanup();
      if (landslideCleanup) landslideCleanup();
      if (gasFireCleanup) gasFireCleanup();
    };
  }, []);

  // Prepare chart data from flood data
  const prepareFloodChartData = () => {
    if (!floodData || floodData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = floodData.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    });

    const distanceData = floodData.map(item => item.distance || 0);
    const litersData = floodData.map(item => item.liters || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Distance (cm)',
          data: distanceData,
          backgroundColor: 'rgba(31, 81, 255, 0.3)',
          borderColor: '#1F51FF',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#1F51FF',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
        {
          label: 'Water Volume (L)',
          data: litersData,
          backgroundColor: 'rgba(102, 255, 0, 0.3)',
          borderColor: '#66FF00',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
          pointBackgroundColor: '#66FF00',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
        }
      ],
    };
  };

  // Prepare chart data from landslide data
  const prepareLandslideChartData = () => {
    if (!landslideData || landslideData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = landslideData.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }).reverse(); // Reverse to show chronological order

    const accelXData = landslideData.map(item => item.accel_x || 0).reverse();
    const accelYData = landslideData.map(item => item.accel_y || 0).reverse();
    const accelZData = landslideData.map(item => item.accel_z || 0).reverse();
    const dropData = landslideData.map(item => item.drop_ft || 0).reverse();

    return {
      labels,
      datasets: [
        {
          label: 'Accel X',
          data: accelXData,
          backgroundColor: 'rgba(220, 20, 60, 0.3)',
          borderColor: '#DC143C',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#DC143C',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'Accel Y',
          data: accelYData,
          backgroundColor: 'rgba(255, 165, 0, 0.3)',
          borderColor: '#FFA500',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#FFA500',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'Accel Z',
          data: accelZData,
          backgroundColor: 'rgba(128, 0, 128, 0.3)',
          borderColor: '#800080',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#800080',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'Drop Height (ft)',
          data: dropData,
          backgroundColor: 'rgba(139, 69, 19, 0.3)',
          borderColor: '#8B4513',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
          pointBackgroundColor: '#8B4513',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
        }
      ],
    };
  };

    const prepareGasFireChartData = () => {
    if (!gasFireData || gasFireData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = gasFireData.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }).reverse(); // Reverse to show chronological order

    const mq2Data = gasFireData.map(item => item.mq2_ppm || 0).reverse();
    const mq7Data = gasFireData.map(item => item.mq7_ppm || 0).reverse();
    const flameData = gasFireData.map(item => item.flame ? 1000 : 0).reverse(); // Show flame as high value for visibility

    return {
      labels,
      datasets: [
        {
          label: 'MQ2 Gas (ppm)',
          data: mq2Data,
          backgroundColor: 'rgba(255, 99, 132, 0.3)',
          borderColor: '#FF6384',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#FF6384',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
        {
          label: 'MQ7 Carbon Monoxide (ppm)',
          data: mq7Data,
          backgroundColor: 'rgba(255, 159, 64, 0.3)',
          borderColor: '#FF9F40',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: '#FF9F40',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
        {
          label: 'Flame Detection',
          data: flameData,
          backgroundColor: 'rgba(255, 0, 0, 0.5)',
          borderColor: '#FF0000',
          borderWidth: 4,
          fill: false,
          tension: 0,
          yAxisID: 'y1',
          pointBackgroundColor: '#FF0000',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 10,
          stepped: true, // Make it look like digital signal
        }
      ],
    };
  };

  const floodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(52, 98, 63, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#34623f',
        borderWidth: 1,
        callbacks: {
          afterBody: function(context) {
            const dataIndex = context[0].dataIndex;
            if (floodData[dataIndex]) {
              const item = floodData[dataIndex];
              return [
                `Pump: ${item.pump || 'OFF'}`,
                `Mode: ${item.mode || 'AUTO'}`,
                `Time: ${new Date(item.timestamp).toLocaleString()}`
              ];
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
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
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Distance (cm)',
          color: '#1F51FF',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#1F51FF',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          color: 'rgba(31, 81, 255, 0.1)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Water Volume (L)',
          color: '#66FF00',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#66FF00',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const landslideChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(52, 98, 63, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#34623f',
        borderWidth: 1,
        callbacks: {
          afterBody: function(context) {
            const dataIndex = context[0].dataIndex;
            const reversedIndex = landslideData.length - 1 - dataIndex;
            if (landslideData[reversedIndex]) {
              const item = landslideData[reversedIndex];
              return [
                `Servo1: ${item.servo1 ? 'ON' : 'OFF'}`,
                `Servo2: ${item.servo2 ? 'ON' : 'OFF'}`,
                `Status: ${item.status || 'normal'}`,
                `Height: ${item.sensor_height_ft}ft`,
                `Time: ${new Date(item.timestamp).toLocaleString()}`
              ];
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
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
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Acceleration',
          color: '#DC143C',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#DC143C',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          color: 'rgba(220, 20, 60, 0.1)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Drop Height (ft)',
          color: '#8B4513',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#8B4513',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

   const gasFireChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(52, 98, 63, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#34623f',
        borderWidth: 1,
        callbacks: {
          afterBody: function(context) {
            const dataIndex = context[0].dataIndex;
            const reversedIndex = gasFireData.length - 1 - dataIndex;
            if (gasFireData[reversedIndex]) {
              const item = gasFireData[reversedIndex];
              return [
                `Device: ${item.device || 'ESP32_GasFire'}`,
                `Status: ${item.status || 'normal'}`,
                `WiFi RSSI: ${item.wifi_rssi || 'N/A'}dBm`,
                `Uptime: ${item.uptime_ms ? Math.floor(item.uptime_ms / 1000) : 'N/A'}s`,
                `Time: ${new Date(item.timestamp).toLocaleString()}`
              ];
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: '#34623f',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
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
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Gas Concentration (ppm)',
          color: '#FF6384',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#FF6384',
          font: {
            size: isFullScreen ? 12 : 10
          }
        },
        grid: {
          color: 'rgba(255, 99, 132, 0.1)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Flame Detection',
          color: '#FF0000',
          font: {
            size: isFullScreen ? 14 : 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#FF0000',
          font: {
            size: isFullScreen ? 12 : 10
          },
          callback: function(value) {
            return value === 1000 ? 'FIRE' : value === 0 ? 'SAFE' : value;
          }
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 1200
      },
    },
  };

  // Refresh data
  const handleRefreshData = () => {
    fetchFloodData();
    fetchLandslideData();
    fetchGasFireData();
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
          <title>RESCPI Monitoring Dashboard</title>
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
              @page {
                margin: 1in;
                size: landscape;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>RESCPI Monitoring Dashboard</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Flood Data Points: ${floodData.length}</p>
            <p>Landslide Data Points: ${landslideData.length}</p>
            <p>Gas/Fire Data Points: ${gasFireData.length}</p>
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
    <ThemeProvider theme={modernTheme}>
      {/* Import Poppins Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #E9E3DF 0%, #F5F0EC 100%)",
          py: 3,
          overflow: "auto",
          position: "relative",
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
            opacity: 0.03,
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #FF7A30 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, #465C88 0%, transparent 50%)
            `,
            zIndex: 0,
          }}
        />
        <Container
          maxWidth={false}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            px: { xs: 2, sm: 3, md: 4 },
            maxWidth: "1600px",
            mx: "auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header Section */}
          <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h1"
              component="h1"
              sx={{ 
                fontSize: { xs: "3rem", md: "4.5rem" },
                fontWeight: 800,
                background: "linear-gradient(135deg, #FF7A30 0%, #465C88 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2,
                lineHeight: 1.1,
              }}
            >
              RESCPI
            </Typography>
            
            <Typography
              variant="h5"
              sx={{ 
                color: "#465C88",
                fontWeight: 500,
                mb: 1,
                fontSize: { xs: "1.2rem", md: "1.5rem" },
              }}
            >
              Disaster Management System
            </Typography>
            
            <Typography
              variant="body1"
              sx={{
                color: "rgba(70, 92, 136, 0.7)",
                maxWidth: 600,
                mx: "auto",
                fontSize: "1.1rem",
                lineHeight: 1.6,
              }}
            >
              Advanced real-time monitoring and emergency response system
            </Typography>
          </Box>

          {/* House Cards Section */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 6, md: 8 } }}>
            <Box 
              sx={{ 
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: { xs: 4, sm: 5, md: 6 },
                width: "100%",
                maxWidth: 1400,
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
                    transform: "translateY(-15px) scale(1.03)",
                    "& .modern-house-roof": {
                      transform: "scale(1.05)",
                      filter: "brightness(1.15) saturate(1.2)",
                    },
                    "& .modern-house-card": {
                      boxShadow: `0 25px 50px ${disaster.colors.primary}30`,
                      border: `3px solid ${disaster.colors.primary}`,
                    },
                    "& .modern-house-door": {
                      transform: "scale(1.05)",
                      filter: "brightness(1.1)",
                    },
                    "& .modern-house-windows": {
                      transform: "scale(1.1)",
                      boxShadow: `0 0 20px ${disaster.colors.secondary}40`,
                    },
                    "& .modern-house-icon": {
                      transform: "scale(1.2) rotate(8deg)",
                    },
                    "& .modern-house-title": {
                      transform: "scale(1.05)",
                      color: disaster.colors.primary,
                    },
                    "& .modern-house-chimney": {
                      filter: "brightness(1.2)",
                    },
                  },
                }}
                onClick={() => navigate(disaster.route)}
              >
                {/* Modern House Roof */}
                <Box
                  className="modern-house-roof"
                  sx={{
                    width: 0,
                    height: 0,
                    borderLeft: { xs: "140px solid transparent", sm: "150px solid transparent", md: "160px solid transparent" },
                    borderRight: { xs: "140px solid transparent", sm: "150px solid transparent", md: "160px solid transparent" },
                    borderBottom: { 
                      xs: `45px solid #282727ff`, 
                      sm: `48px solid #282727ff`, 
                      md: `50px solid #282727ff` 
                    },
                    margin: "0 auto",
                    position: "relative",
                    zIndex: 3,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    filter: `drop-shadow(0 8px 16px ${disaster.colors.primary}40)`,
                  }}
                />
                
                {/* Modern Chimney */}
                <Box
                  className="modern-house-chimney"
                  sx={{
                    width: { xs: 16, md: 20 },
                    height: { xs: 35, md: 40 },
                    background: "#353333ff",
                    position: "absolute",
                    top: { xs: 8, md: 10 },
                    right: { xs: "calc(50% - 90px)", sm: "calc(50% - 95px)", md: "calc(50% - 100px)" },
                    zIndex: 4,
                    borderRadius: "4px 4px 0 0",
                    transition: "all 0.4s ease",
                    boxShadow: `0 4px 12px ${disaster.colors.secondary}30`,
                  }}
                />
                
                {/* Modern House Body */}
                <Card
                  className="modern-house-card"
                  sx={{
                    background: "linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%)",
                    borderTop: "none",
                    borderRadius: "0 0 20px 20px",
                    boxShadow: `0 12px 30px ${disaster.colors.primary}20`,
                    marginTop: "-3px",
                    position: "relative",
                    zIndex: 2,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    minHeight: { xs: 320, sm: 340, md: 360 },
                    width: { xs: 280, sm: 300, md: 320 },
                    margin: "0 auto",
                    overflow: "hidden",
                  }}
                >
                  {/* Background Pattern
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(135deg, ${disaster.colors.primary}05, ${disaster.colors.secondary}05)`,
                      zIndex: 0,
                    }}
                  /> */}

                  <CardContent sx={{ py: { xs: 3, md: 4 }, px: 3, position: "relative", zIndex: 1 }}>
                    {/* Modern Door */}
                    <Box
                      className="modern-house-door"
                      sx={{
                        width: { xs: 80, md: 90 },
                        height: { xs: 100, md: 110 },
                        background: `linear-gradient(135deg, ${disaster.colors.primary}, ${disaster.colors.secondary})`,
                        margin: "0 auto 25px auto",
                        borderRadius: "16px 16px 0 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: `0 8px 20px ${disaster.colors.primary}30`,
                        border: `2px solid ${disaster.colors.secondary}20`,
                      }}
                    >
                      <Box 
                        className="modern-house-icon"
                        sx={{ 
                          color: "#FFFFFF", 
                          mb: 1,
                          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                          "& svg": {
                            fontSize: { xs: 40, md: 50 }
                          }
                        }}
                      >
                        {disaster.icon}
                      </Box>

                    </Box>
                    
                    {/* Modern Windows */}
                    <Box sx={{ display: "flex", justifyContent: "space-around", mb: 3 }}>
                      {[1, 2].map((window) => (
                        <Box
                          key={window}
                          className="modern-house-windows"
                          sx={{
                            width: { xs: 28, md: 32 },
                            height: { xs: 28, md: 32 },
                            border: `3px solid ${disaster.colors.secondary}`,
                            background: `linear-gradient(135deg, #E9F7FF, #FFFFFF)`,
                            borderRadius: "8px",
                            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            boxShadow: `0 4px 12px ${disaster.colors.secondary}20`,
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              top: "50%",
                              left: "0",
                              right: "0",
                              height: "2px",
                              backgroundColor: disaster.colors.secondary,
                              transform: "translateY(-50%)",
                            },
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              top: "0",
                              bottom: "0",
                              left: "50%",
                              width: "2px",
                              backgroundColor: disaster.colors.secondary,
                              transform: "translateX(-50%)",
                            },
                          }}
                        />
                      ))}
                    </Box>
                    
                    {/* Modern Title */}
                    <Typography 
                      className="modern-house-title"
                      variant="h4" 
                      sx={{ 
                        color: disaster.colors.primary, 
                        fontWeight: 700,
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        mb: 2,
                        fontSize: { xs: "1.4rem", md: "1.6rem" },
                        textShadow: `0 2px 4px ${disaster.colors.primary}20`,
                      }}
                    >
                      {disaster.title}
                    </Typography>

                    {/* Modern Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#465C88",
                        lineHeight: 1.5,
                        textAlign: "center",
                        mb: 3,
                        fontWeight: 500,
                      }}
                    >
                      Emergency Response System
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: "center", pb: 3, position: "relative", zIndex: 1 }}>
                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: "#465C88",
                        color: "#FFFFFF",
                        px: 5,
                        py: 1.5,
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: { xs: "0.9rem", md: "1rem" },
                        transition: "all 0.3s ease",
                        "&:hover": {
                          backgroundColor: "#3f5175ff",
                          transform: "scale(1.05) translateY(-2px)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(disaster.route);
                      }}
                    >
                      Enter Dashboard
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>

          {/* Monitoring Charts Section */}
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            width: "100%",
            mb: { xs: 6, md: 8 }
          }}>
            <Box 
              ref={chartSectionRef}
              sx={{ 
                width: "100%", 
                maxWidth: isExpanded ? "100%" : 1400, 
                transition: "all 0.3s ease",
                px: { xs: 2, sm: 3, md: 4 }
              }}
            >
            {/* Charts Header */}
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              mb: 6,
              flexWrap: "wrap",
              gap: 2,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                <BarChart sx={{ fontSize: { xs: 24, md: 30 }, mr: 2, color: "#FF7A30" }} />
                <Typography
                  variant="h3"
                  sx={{ 
                    background: " #465C88",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    fontSize: { xs: "1.8rem", sm: "2.2rem", md: "2.5rem" }
                  }}
                >
                  Real-time Monitoring Dashboard
                </Typography>
              </Box>
              
              {/* Control Buttons */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Tooltip title="Refresh Data">
                  <IconButton 
                    onClick={handleRefreshData}
                    disabled={loading}
                    sx={{ 
                      color: "#FF7A30",
                      border: "2px solid #FF7A30",
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      "&:hover": {
                        backgroundColor: "rgba(255, 122, 48, 0.1)",
                      },
                      "&:disabled": {
                        opacity: 0.5,
                      }
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Full Screen View">
                  <IconButton 
                    onClick={toggleFullScreen}
                    sx={{ 
                      color: "#465C88",
                      border: "2px solid #465C88",
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      "&:hover": {
                        backgroundColor: "rgba(70, 92, 136, 0.1)",
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
                      color: "#465C88",
                      border: "2px solid #465C88",
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      "&:hover": {
                        backgroundColor: "rgba(70, 92, 136, 0.1)",
                      }
                    }}
                  >
                    {isExpanded ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Print Charts">

                </Tooltip>
              </Box>
            </Box>
            
            {/* Charts Grid */}
            <Grid container spacing={isExpanded ? 4 : 3} justifyContent="center">
              {/* Flood Chart */}
              <Grid item xs={12} lg={6}>
                <Paper 
                  sx={{ 
                    p: 4, 
                    height: isExpanded ? 520 : 420,
                    background: "linear-gradient(135deg, #FFFFFF 0%, #F8FFFE 100%)",
                    border: '2px solid #4FC3F720',
                    borderRadius: 4,
                    transition: "all 0.4s ease",
                    overflow: "hidden",
                    position: "relative",
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(79, 195, 247, 0.2)',
                      border: '2px solid #4FC3F750',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: 'linear-gradient(90deg, #4FC3F7, #03A9F4)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4FC3F7, #03A9F4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        mr: 2,
                      }}
                    >
                      💧
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ color: '#4FC3F7', fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.4rem" } }}>
                        Flood Monitoring
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', fontWeight: 500 }}>
                        {floodData.length > 0 ? `${floodData.length} data points` : 'No data'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ height: isExpanded ? 420 : 320 }}>
                    {floodData.length > 0 ? (
                      <Line data={prepareFloodChartData()} options={floodChartOptions} />
                    ) : (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '100%',
                          color: '#4FC3F7',
                          fontSize: '1.2rem',
                          fontWeight: 500
                        }}
                      >
                        {loading ? 'Loading flood data...' : error ? `Error: ${error}` : 'No flood data available'}
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Landslide Chart */}
              <Grid item xs={12} lg={6}>
                <Paper 
                  sx={{ 
                    p: 4, 
                    height: isExpanded ? 520 : 420,
                    background: "linear-gradient(135deg, #FFFFFF 0%, #FFFEF8 100%)",
                    border: '2px solid #FF9F4020',
                    borderRadius: 4,
                    transition: "all 0.4s ease",
                    overflow: "hidden",
                    position: "relative",
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(255, 159, 64, 0.2)',
                      border: '2px solid #FF9F4050',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: 'linear-gradient(90deg, #FF9F40, #FF7A30)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #FF9F40, #FF7A30)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        mr: 2,
                      }}
                    >
                      🏔️
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ color: '#FF9F40', fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.4rem" } }}>
                        Landslide Monitoring
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', fontWeight: 500 }}>
                        {landslideData.length > 0 ? `${landslideData.length} data points` : 'No data'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ height: isExpanded ? 420 : 320 }}>
                    {landslideData.length > 0 ? (
                      <Line data={prepareLandslideChartData()} options={landslideChartOptions} />
                    ) : (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '100%',
                          color: '#FF9F40',
                          fontSize: '1.2rem',
                          fontWeight: 500
                        }}
                      >
                        Loading landslide data...
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            {/* Gas/Fire Chart */}
              <Grid item xs={12} lg={8}>
                <Paper 
                  sx={{ 
                    p: 4, 
                    height: isExpanded ? 520 : 420,
                    background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8F8 100%)",
                    border: '2px solid #FF526520',
                    borderRadius: 4,
                    transition: "all 0.4s ease",
                    overflow: "hidden",
                    position: "relative",
                    mx: "auto",
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(255, 82, 101, 0.2)',
                      border: '2px solid #FF526550',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: 'linear-gradient(90deg, #FF5265, #F44336)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #FF5265, #F44336)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        mr: 2,
                      }}
                    >
                      🔥
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ color: '#FF5265', fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.4rem" } }}>
                        Gas/Fire Monitoring
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#465C88', fontWeight: 500 }}>
                        {gasFireData.length > 0 ? `${gasFireData.length} data points` : 'No data'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ height: isExpanded ? 420 : 320 }}>
                    {gasFireData.length > 0 ? (
                      <Line data={prepareGasFireChartData()} options={gasFireChartOptions} />
                    ) : (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '100%',
                          color: '#FF5265',
                          fontSize: '1.2rem',
                          fontWeight: 500
                        }}
                      >
                        Loading gas/fire data...
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
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
              <BarChart sx={{ fontSize: 40, mr: 2, color: "#cc4a02" }} />
              <Typography
                variant="h3"
                sx={{ 
                  color: "#34623f",
                  fontWeight: 600,
                }}
              >
                RESCPI Real-time Monitoring Dashboard
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
          
          {/* Full Screen Charts */}
          <Grid container spacing={4} sx={{ height: 'calc(100vh - 200px)' }}>
            <Grid item xs={12} md={6}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: '100%',
                  backgroundColor: '#ffffff',
                  border: '3px solid #1F51FF',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  💧 Flood Monitoring - Full Screen
                </Typography>
                <Box sx={{ height: 'calc(100% - 80px)' }}>
                  {floodData.length > 0 ? (
                    <Line data={prepareFloodChartData()} options={floodChartOptions} />
                  ) : (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#34623f',
                        fontSize: '2rem',
                        fontWeight: 500
                      }}
                    >
                      No flood data available
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: '100%',
                  backgroundColor: '#ffffff',
                  border: '3px solid #DC143C',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  🏔️ Landslide Monitoring - Full Screen
                </Typography>
                <Box sx={{ height: 'calc(100% - 80px)' }}>
                  {landslideData.length > 0 ? (
                    <Line data={prepareLandslideChartData()} options={landslideChartOptions} />
                  ) : (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#34623f',
                        fontSize: '2rem',
                        fontWeight: 500
                      }}
                    >
                      No landslide data available
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

          <Grid item xs={12} md={4}>
              <Paper 
                sx={{ 
                  p: 4, 
                  height: '100%',
                  backgroundColor: '#ffffff',
                  border: '3px solid #FF6384',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, color: '#34623f', fontWeight: 600 }}>
                  🔥 Gas/Fire Monitoring - Full Screen
                </Typography>
                <Box sx={{ height: 'calc(100% - 80px)' }}>
                  {gasFireData.length > 0 ? (
                    <Line data={prepareGasFireChartData()} options={gasFireChartOptions} />
                  ) : (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#34623f',
                        fontSize: '2rem',
                        fontWeight: 500
                      }}
                    >
                      No gas/fire data available
                    </Box>
                  )}
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