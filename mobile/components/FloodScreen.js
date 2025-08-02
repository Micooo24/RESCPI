import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import baseURL from '../assets/common/baseURL';

const { width } = Dimensions.get('window');

const FloodScreen = ({ navigation }) => {
  const [floodData, setFloodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [latestDistance, setLatestDistance] = useState(null);
  const [showRescueButton, setShowRescueButton] = useState(false);
  const [rescueActive, setRescueActive] = useState(false);

  // Fetch latest flood data (full document)
  const fetchFloodData = async () => {
    try {
      setRefreshLoading(true);
      const response = await axios.get(`${baseURL}/flood/latest`);
      if (response.data.status === 'success') {
        const data = response.data.data;
        setFloodData(data);

        // Update latest distance
        if (data.distance !== undefined) {
          setLatestDistance(data.distance);

          // Show Rescue button if water level is high (<= 4cm)
          if (data.distance > 0 && data.distance <= 4) {
            setShowRescueButton(true);
          } else {
            setShowRescueButton(false);
          }
        }
      } else {
        console.error('⚠️ No data received:', response.data.message);
        setShowRescueButton(false);
      }
    } catch (error) {
      console.error('❌ Error fetching flood data:', error);
      Alert.alert('Error', 'Failed to fetch flood data');
      setShowRescueButton(false);
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  };

  // Fetch latest distance only
  const fetchLatestDistance = async () => {
    try {
      setButtonLoading(true);
      const response = await axios.get(`${baseURL}/flood/latest/distance`);
      if (response.data.status === 'success') {
        const distance = response.data.distance;
        setLatestDistance(distance);
        Alert.alert('Success', `✅ Latest Distance: ${distance} cm`);

        // Update Rescue button visibility
        if (distance > 0 && distance <= 4) {
          setShowRescueButton(true);
        } else {
          setShowRescueButton(false);
        }
      } else {
        Alert.alert('Warning', '⚠️ No distance data found');
        setShowRescueButton(false);
      }
    } catch (error) {
      console.error('❌ Error fetching latest distance:', error);
      Alert.alert('Error', 'Error fetching latest distance');
      setShowRescueButton(false);
    } finally {
      setButtonLoading(false);
    }
  };

  useEffect(() => {
    fetchFloodData();
  }, []);

  const onRefresh = () => {
    fetchFloodData();
  };

  // Handle Enable/Disable Pump
  const togglePump = async () => {
    if (!floodData) return;
    setButtonLoading(true);

    const newPumpState = floodData.pump === 'ON' ? 'OFF' : 'ON';
    const controlUrl = newPumpState === 'ON'
      ? `${baseURL}/flood/control/on`
      : `${baseURL}/flood/control/off`;

    try {
      const response = await axios.post(controlUrl);

      if (response.data.status === 'success') {
        Alert.alert('Success', `✅ Pump turned ${newPumpState}`);
        fetchFloodData(); // Refresh data after toggling
      } else {
        Alert.alert('Error', '⚠️ Failed to update pump state');
      }
    } catch (error) {
      console.error('❌ Error toggling pump:', error);
      Alert.alert('Error', 'Error communicating with server');
    } finally {
      setButtonLoading(false);
    }
  };

  // Toggle Rescue Vehicle
  const toggleRescueVehicle = async () => {
    setButtonLoading(true);
    const actionUrl = rescueActive
      ? `${baseURL}/rescue/vehicle/off`
      : `${baseURL}/rescue/vehicle/on`;

    try {
      const response = await axios.post(actionUrl);
      if (response.data.status === 'success') {
        setRescueActive(!rescueActive);
        Alert.alert('Success', `🚑 Rescue Vehicle turned ${rescueActive ? 'OFF' : 'ON'}`);
      } else {
        Alert.alert('Error', '⚠️ Failed to control rescue vehicle');
      }
    } catch (error) {
      console.error('❌ Error toggling rescue vehicle:', error);
      Alert.alert('Error', 'Error controlling rescue vehicle');
    } finally {
      setButtonLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View style={styles.statIconContainer}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>Loading Flood Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2196f3" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="water" size={32} color="#2196f3" />
          <Text style={styles.headerTitle}>Flood Dashboard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshLoading} onRefresh={onRefresh} />
        }
      >
        {floodData ? (
          <>
            {/* Statistics Cards */}
            <View style={styles.statsContainer}>
              <StatCard
                title="Water Level"
                value={`${floodData.distance} cm`}
                icon="water"
                color="#2196f3"
              />
              <StatCard
                title="Pump Status"
                value={floodData.pump}
                icon={floodData.pump === 'ON' ? 'checkmark-circle' : 'close-circle'}
                color={floodData.pump === 'ON' ? '#4caf50' : '#f44336'}
              />
            </View>

            {/* Main Data Card */}
            <View style={styles.dataCard}>
              <Text style={styles.dataCardTitle}>Latest Flood Data</Text>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>ID:</Text>
                <Text style={styles.dataValue}>{floodData._id}</Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Timestamp:</Text>
                <Text style={styles.dataValue}>
                  {new Date(floodData.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Water Level:</Text>
                <Text style={[styles.dataValue, styles.waterLevel]}>
                  {floodData.distance} cm
                </Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Pump Status:</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: floodData.pump === 'ON' ? '#4caf50' : '#f44336' }
                ]}>
                  <Text style={styles.statusText}>{floodData.pump}</Text>
                </View>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Mode:</Text>
                <Text style={styles.dataValue}>{floodData.mode}</Text>
              </View>

              {/* Latest Distance Display */}
              {latestDistance !== null && (
                <View style={styles.latestDistanceContainer}>
                  <Ionicons name="ruler" size={20} color="#2196f3" />
                  <Text style={styles.latestDistanceText}>
                    Latest Distance: {latestDistance} cm
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Refresh Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.refreshButton]}
                onPress={fetchFloodData}
                disabled={refreshLoading}
              >
                {refreshLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="refresh" size={20} color="white" />
                )}
                <Text style={styles.buttonText}>
                  {refreshLoading ? 'Refreshing...' : 'Refresh Data'}
                </Text>
              </TouchableOpacity>

              {/* Pump Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  floodData.pump === 'ON' ? styles.disableButton : styles.enableButton
                ]}
                onPress={togglePump}
                disabled={buttonLoading}
              >
                {buttonLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons 
                    name={floodData.pump === 'ON' ? 'stop-circle' : 'play-circle'} 
                    size={20} 
                    color="white" 
                  />
                )}
                <Text style={styles.buttonText}>
                  {buttonLoading
                    ? 'Processing...'
                    : floodData.pump === 'ON'
                    ? 'Disable Pump'
                    : 'Enable Pump'}
                </Text>
              </TouchableOpacity>

              {/* Latest Distance Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.distanceButton]}
                onPress={fetchLatestDistance}
                disabled={buttonLoading}
              >
                {buttonLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="ruler" size={20} color="white" />
                )}
                <Text style={styles.buttonText}>
                  {buttonLoading ? 'Fetching...' : 'Latest Distance'}
                </Text>
              </TouchableOpacity>

              {/* Rescue Vehicle Button */}
              {showRescueButton && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.rescueButton,
                    { backgroundColor: rescueActive ? '#f44336' : '#ff9800' }
                  ]}
                  onPress={toggleRescueVehicle}
                  disabled={buttonLoading}
                >
                  {buttonLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="car" size={20} color="white" />
                  )}
                  <Text style={styles.buttonText}>
                    {rescueActive ? 'Disable Rescue Vehicle' : 'Enable Rescue Vehicle'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Water Level Alert */}
            {floodData.distance <= 4 && (
              <View style={styles.alertContainer}>
                <Ionicons name="warning" size={24} color="#ff9800" />
                <Text style={styles.alertText}>
                  ⚠️ High Water Level Alert! Distance: {floodData.distance} cm
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="water-outline" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No flood data available</Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.refreshButton]}
              onPress={fetchFloodData}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dataCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  waterLevel: {
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  latestDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  latestDistanceText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#2196f3',
  },
  enableButton: {
    backgroundColor: '#4caf50',
  },
  disableButton: {
    backgroundColor: '#f44336',
  },
  distanceButton: {
    backgroundColor: '#9c27b0',
  },
  rescueButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
    color: '#e65100',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
});

export default FloodScreen;