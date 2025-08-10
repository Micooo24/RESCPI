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
          {/* Header Section */}
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

          {/* House Cards Section */}
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

          {/* Monitoring Charts Section */}
          <Box 
            ref={chartSectionRef}
            sx={{ 
              width: "100%", 
              maxWidth: isExpanded ? "100%" : 1200, 
              mb: { xs: 5, md: 7 },
              transition: "all 0.3s ease",
            }}
          >
            {/* Charts Header */}
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              mb: 4,
              flexWrap: "wrap",
              gap: 2,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                <BarChart sx={{ fontSize: { xs: 24, md: 30 }, mr: 2, color: "#cc4a02" }} />
                <Typography
                  variant="h4"
                  sx={{ 
                    color: "#34623f",
                    fontWeight: 600,
                    fontSize: { xs: "1.5rem", sm: "2rem", md: "2.2rem" }
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
                      color: "#66FF00",
                      border: "2px solid #66FF00",
                      fontSize: { xs: "1rem", md: "1.2rem" },
                      "&:hover": {
                        backgroundColor: "rgba(102, 255, 0, 0.1)",
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

            {/* Connection Status */}
            <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: wsConnection?.readyState === WebSocket.OPEN ? "#66FF00" : "#DC143C",
                  fontWeight: 600,
                  px: 2,
                  py: 0.5,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  borderRadius: 1,
                }}
              >
                💧 Flood: {wsConnection?.readyState === WebSocket.OPEN ? "🟢 Connected" : "🔴 Disconnected"}
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: landslideWsConnection?.readyState === WebSocket.OPEN ? "#66FF00" : "#DC143C",
                  fontWeight: 600,
                  px: 2,
                  py: 0.5,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  borderRadius: 1,
                }}
              >
                🏔️ Landslide: {landslideWsConnection?.readyState === WebSocket.OPEN ? "🟢 Connected" : "🔴 Disconnected"}
              </Typography>

                            <Typography 
                variant="body2" 
                sx={{ 
                  color: gasFireWsConnection?.readyState === WebSocket.OPEN ? "#66FF00" : "#DC143C",
                  fontWeight: 600,
                  px: 2,
                  py: 0.5,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  borderRadius: 1,
                }}
              >
                🔥 Gas/Fire: {gasFireWsConnection?.readyState === WebSocket.OPEN ? "🟢 Connected" : "🔴 Disconnected"}
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: "#34623f",
                  fontWeight: 500,
                  px: 2,
                  py: 0.5,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  borderRadius: 1,
                }}
              >
                Data: Flood({floodData.length}) | Landslide({landslideData.length}) | Gas/Fire({gasFireData.length})
              </Typography>

              {loading && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: "#cc4a02",
                    fontWeight: 500,
                    px: 2,
                    py: 0.5,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    borderRadius: 1,
                  }}
                >
                  Loading...
                </Typography>
              )}

              {error && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: "#DC143C",
                    fontWeight: 500,
                    px: 2,
                    py: 0.5,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    borderRadius: 1,
                  }}
                >
                  Error: {error}
                </Typography>
              )}
            </Box>
            
            {/* Charts Grid */}
            <Grid container spacing={isExpanded ? 4 : 3}>
              {/* Flood Chart */}
              <Grid item xs={12} lg={6}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    height: isExpanded ? 500 : 400,
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
                    💧 Flood Monitoring ({floodData.length > 0 ? `${floodData.length} data points` : 'No data'})
                  </Typography>
                  
                  <Box sx={{ height: isExpanded ? 400 : 300 }}>
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
                    p: 3, 
                    height: isExpanded ? 500 : 400,
                    backgroundColor: '#ffffff',
                    border: '3px solid #DC143C',
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(220, 20, 60, 0.2)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: '#34623f', fontWeight: 600, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                    🏔️ Landslide Monitoring ({landslideData.length > 0 ? `${landslideData.length} data points` : 'No data'})
                  </Typography>
                  
                  <Box sx={{ height: isExpanded ? 400 : 300 }}>
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
              <Grid item xs={12} lg={4}>
                <Paper 
                  sx={{ 
                    p: 3, 
                    height: isExpanded ? 500 : 400,
                    backgroundColor: '#ffffff',
                    border: '3px solid #FF6384',
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(255, 99, 132, 0.2)',
                    },
                    '@media print': {
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid'
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: '#34623f', fontWeight: 600, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                    🔥 Gas/Fire Monitoring ({gasFireData.length > 0 ? `${gasFireData.length} data points` : 'No data'})
                  </Typography>
                  
                  <Box sx={{ height: isExpanded ? 400 : 300 }}>
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

          

          {/* Notifications Section */}
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