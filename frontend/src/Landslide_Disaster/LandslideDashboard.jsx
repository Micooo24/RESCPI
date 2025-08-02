import React, { useEffect, useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { SystemUpdateAlt } from '@mui/icons-material';
import BASE_URL from '../common/baseurl';
import toast from 'react-hot-toast';

const LandslideDashboard = () => {
  const [servo1, setServo1] = useState(1);
const [servo2, setServo2] = useState(1);

  const [logs, setLogs] = useState([]);
  const [lastMessage, setLastMessage] = useState('');

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/landslide/all`);
      const logList = response.data?.data || [];

      if (logList.length > 0) {
        setLogs(logList);

        const latest = logList[0];
        const servo1Off = latest.servo1 === 0;
        const servo2Off = latest.servo2 === 0;

        let newMessage = '';

        if (servo1Off && servo2Off) {
          newMessage = '🔴 Both OFF → 🚨 Alert: Landslide Detected, Rescue is on the way!';
        } else if (servo1Off || servo2Off) {
          newMessage = '🟠 One OFF → ⚠️ Warning: Landslide Movement Detected';
        }

        if (newMessage && newMessage !== lastMessage) {
          toast.dismiss();
          console.log('Toast Message:', newMessage); // 👈 console log added
          toast.success(newMessage, { duration: 5000 });
          setLastMessage(newMessage);
        } else if (!newMessage && lastMessage) {
          toast.dismiss();
          setLastMessage('');
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };


const toggleServo = async (servoNumber, action) => {
  try {
    await axios.post(`${BASE_URL}/landslide/servo/${servoNumber}/${action}`);

    // Update local state immediately
    let nextServo1 = servo1;
    let nextServo2 = servo2;
    if (servoNumber === 1) nextServo1 = action === 'on' ? 1 : 0;
    if (servoNumber === 2) nextServo2 = action === 'on' ? 1 : 0;
    setServo1(nextServo1);
    setServo2(nextServo2);

    toast.dismiss();
    if (nextServo1 === 0 && nextServo2 === 0) {
      toast.error('🔴 🚨 Alert: Landslide Detected, Rescue is on the way!', { duration: 5000 });
    } else if (nextServo1 === 0 || nextServo2 === 0) {
      toast('🟠 ⚠️ Warning: Landslide Movement Detected', {
        duration: 5000,
        icon: '⚠️',
        style: { background: '#ff9800', color: 'white' },
      });
    }

    // Fetch updated logs
    fetchLogs();
  } catch (error) {
    console.error(`Failed to toggle Servo ${servoNumber}:`, error);
    toast.error('Failed to toggle servo.');
  }
};
  return (
    <Container maxWidth="md">
      <Typography variant="h4" align="center" gutterBottom>
        Landslide Detection Dashboard
      </Typography>

      <Grid container spacing={2} justifyContent="center" mt={3}>
        <Grid item>
          <Button
            variant="contained"
            color="success"
            startIcon={<SystemUpdateAlt />}
            onClick={() => toggleServo(1, 'on')}
          >
            Turn ON Servo 1
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="error"
            startIcon={<SystemUpdateAlt />}
            onClick={() => toggleServo(1, 'off')}
          >
            Turn OFF Servo 1
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SystemUpdateAlt />}
            onClick={() => toggleServo(2, 'on')}
          >
            Turn ON Servo 2
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<SystemUpdateAlt />}
            onClick={() => toggleServo(2, 'off')}
          >
            Turn OFF Servo 2
          </Button>
        </Grid>
      </Grid>

      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Logs
            </Typography>
            <Paper elevation={2}>
              <List>
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Status: ${log.status}`}
                        secondary={`X: ${log.accel_x} | Y: ${log.accel_y} | Z: ${log.accel_z} | Time: ${new Date(
                          log.created_at
                        ).toLocaleString()}`}
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No logs available." />
                  </ListItem>
                )}
              </List>
            </Paper>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LandslideDashboard;
