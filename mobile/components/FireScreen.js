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


const FireScreen = ({ navigation }) => {
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rescueActive, setRescueActive] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [latestData, setLatestData] = useState(null);
  const [latestLoading, setLatestLoading] = useState(false);

  // Fetch all fire data
  const fetchAllData = async () => {
    try {
      const response = await axios.get(`${baseURL}/gasfire/all`);
      if (response.data.status === 'success') {
        setFireData(response.data.data);
      } else {
        console.error('Failed to fetch fire data');
      }
    } catch (error) {
      console.error('Error fetching fire data:', error);
      Alert.alert('Error', 'Failed to fetch fire data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleRescueClick = async () => {
    setRescueLoading(true);
    try {
      if (!rescueActive) {
        const response = await axios.post(`${baseURL}/rescue/vehicle/on`);
        if (response.data.status === 'success') {
          Alert.alert('Success', '🚨 Rescue Vehicle Activated!');
          setRescueActive(true);
        } else {
          Alert.alert('Error', `❌ Activation Failed: ${response.data.message}`);
        }
      } else {
        const response = await axios.post(`${baseURL}/rescue/vehicle/off`);
        if (response.data.status === 'success') {
          Alert.alert('Success', '🛑 Rescue Vehicle Deactivated.');
          setRescueActive(false);
        } else {
          Alert.alert('Error', `❌ Deactivation Failed: ${response.data.message}`);
        }
      }
    } catch (error) {
      console.error('Error controlling Rescue Vehicle:', error);
      Alert.alert('Error', '❌ Could not contact backend.');
    } finally {
      setRescueLoading(false);
    }
  };

  const saveAndFetchLatest = async () => {
    setLatestLoading(true);
    try {
      const dummyPayload = {
        mq2_ppm: Math.random() * 500,
        mq7_ppm: Math.random() * 300,
        flame: Math.random() < 0.3,
      };

      const response = await axios.post(`${baseURL}/gasfire/data-latest`, dummyPayload);

      if (response.data.status === 'success') {
        setLatestData(response.data.latest);
        Alert.alert('Success', '✅ Data saved and latest reading fetched!');
      } else {
        Alert.alert('Error', `❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error saving & fetching latest:', error);
      Alert.alert('Error', '❌ Could not contact backend.');
    } finally {
      setLatestLoading(false);
    }
  };

  const showRescueButton = fireData.some(item => item.flame === true);
  const showGasWarning =
    !latestData?.flame &&
    ((latestData?.mq2_ppm ?? 0) > 200 || (latestData?.mq7_ppm ?? 0) > 100);

  const StatCard = ({ title, value, colors, icon }) => (
    <View style={styles.statCardContainer}>
      <LinearGradient colors={colors} style={styles.statCard}>
        <Ionicons name={icon} size={30} color="white" style={styles.statIcon} />
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </LinearGradient>
    </View>
  );

  const LogItem = ({ item }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logTime}>
          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
        <View style={[styles.flameBadge, { backgroundColor: item.flame ? '#f44336' : '#4caf50' }]}>
          <Text style={styles.flameBadgeText}>
            {item.flame ? '🔥 Fire' : '✅ Safe'}
          </Text>
        </View>
      </View>
      <View style={styles.logData}>
        <Text style={styles.logText}>MQ2: {item.mq2_ppm.toFixed(2)} PPM</Text>
        <Text style={styles.logText}>MQ7: {item.mq7_ppm.toFixed(2)} PPM</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading Fire Data...</Text>
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
          <Ionicons name="arrow-back" size={24} color="#d32f2f" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="flame" size={32} color="#d32f2f" />
          <Text style={styles.headerTitle}>Fire Dashboard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Active Incidents"
            value={fireData.filter(item => item.flame).length}
            colors={['#f44336', '#d32f2f']}
            icon="flame"
          />
          <StatCard
            title="MQ2 Alerts"
            value={fireData.filter(item => item.mq2_ppm > 200).length}
            colors={['#ff9800', '#f57c00']}
            icon="warning"
          />
          <StatCard
            title="MQ7 Alerts"
            value={fireData.filter(item => item.mq7_ppm > 100).length}
            colors={['#4caf50', '#388e3c']}
            icon="checkmark-circle"
          />
        </View>

        {/* Alert Status */}
        <View style={styles.alertContainer}>
          {showRescueButton ? (
            <TouchableOpacity
              style={[styles.rescueButton, { backgroundColor: rescueActive ? '#f44336' : '#d32f2f' }]}
              onPress={handleRescueClick}
              disabled={rescueLoading}
            >
              {rescueLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="warning" size={24} color="white" />
                  <Text style={styles.rescueButtonText}>
                    {rescueActive ? 'Deactivate Rescue Vehicle' : 'Activate Rescue Vehicle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : showGasWarning ? (
            <View style={styles.warningAlert}>
              <Ionicons name="warning" size={24} color="#ff9800" />
              <Text style={styles.warningText}>
                ⚠️ High gas levels detected (MQ2/MQ7). Monitor environment closely!
              </Text>
            </View>
          ) : (
            <View style={styles.successAlert}>
              <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
              <Text style={styles.successText}>
                ✅ No fire or dangerous gas detected.
              </Text>
            </View>
          )}
        </View>

        {/* Fetch Latest Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.fetchButton}
            onPress={saveAndFetchLatest}
            disabled={latestLoading}
          >
            {latestLoading ? (
              <ActivityIndicator color="#d32f2f" />
            ) : (
              <Text style={styles.fetchButtonText}>Save & Fetch Latest Reading</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Latest Data Card */}
        {latestData && (
          <View style={styles.latestDataCard}>
            <Text style={styles.latestDataTitle}>Latest Reading</Text>
            <Text style={styles.latestDataText}>
              <Text style={styles.bold}>Time:</Text> {new Date(latestData.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.latestDataText}>
              <Text style={styles.bold}>MQ2:</Text> {latestData.mq2_ppm.toFixed(2)} PPM
            </Text>
            <Text style={styles.latestDataText}>
              <Text style={styles.bold}>MQ7:</Text> {latestData.mq7_ppm.toFixed(2)} PPM
            </Text>
            <Text style={styles.latestDataText}>
              <Text style={styles.bold}>Flame:</Text> {latestData.flame ? "🔥 Detected" : "✅ No Fire"}
            </Text>
          </View>
        )}

        {/* Fire Data Logs */}
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Ionicons name="list" size={24} color="#d32f2f" />
            <Text style={styles.logsTitle}>Gas & Fire Logs</Text>
          </View>
          {fireData.length > 0 ? (
            fireData.slice(0, 10).map((item, index) => (
              <LogItem key={item._id || index} item={item} />
            ))
          ) : (
            <Text style={styles.noDataText}>No fire data available</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    justifyContent: 'space-between',
  },
  statCardContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  alertContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  rescueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  rescueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    color: '#e65100',
    fontSize: 14,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  successText: {
    flex: 1,
    marginLeft: 12,
    color: '#2e7d32',
    fontSize: 14,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  fetchButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  fetchButtonText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
  latestDataCard: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
  },
  latestDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  latestDataText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  logsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  logItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTime: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  flameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flameBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logText: {
    fontSize: 12,
    color: '#333',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    padding: 20,
  },
});

export default FireScreen;