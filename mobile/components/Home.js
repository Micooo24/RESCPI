import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Chip,
  Divider,
  Avatar,
  Banner,
  Provider as PaperProvider,
  DefaultTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#03DAC6',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#f44336',
    success: '#4caf50',
  },
};

const Home = ({ navigation }) => {
  const disasters = [
    {
      id: 1,
      title: 'Fire Emergency',
      subtitle: 'Gas & Fire Detection',
      description: 'Monitor MQ2/MQ7 sensors and flame detection with real-time alerts',
      icon: 'fire',
      route: 'FireScreen',
      status: 'Active',
      color: '#f44336',
    },
    {
      id: 2,
      title: 'Flood Monitoring',
      subtitle: 'Water Level Control',
      description: 'Track water levels and automated pump control system',
      icon: 'waves',
      route: 'FloodScreen',
      status: 'Active',
      color: '#2196F3',
    },
    {
      id: 3,
      title: 'Landslide Detection',
      subtitle: 'Ground Movement',
      description: 'Monitor accelerometer data and servo control mechanisms',
      icon: 'terrain',
      route: 'LandslideScreen',
      status: 'Active',
      color: '#795548',
    }
  ];

  const handleNavigation = (route) => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate(route);
      } else {
        console.error('Navigation not available');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Surface style={styles.headerSurface}>
            <View style={styles.headerRow}>
              <Avatar.Icon 
                size={48} 
                icon="shield-check" 
                style={[styles.headerAvatar, { backgroundColor: theme.colors.primary }]}
              />
              <View style={styles.headerText}>
                <Title style={styles.mainTitle}>RESCPI</Title>
                <Paragraph style={styles.subtitle}>Smart Rescue Alert System</Paragraph>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>3</Paragraph>
                <Paragraph style={styles.statLabel}>Systems</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>24/7</Paragraph>
                <Paragraph style={styles.statLabel}>Monitoring</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>Live</Paragraph>
                <Paragraph style={styles.statLabel}>Status</Paragraph>
              </View>
            </View>
          </Surface>

          {/* Status Banner */}
          <Banner
            visible={true}
            actions={[]}
            icon="check-circle"
            style={styles.statusBanner}
          >
            All systems operational • Last updated: {new Date().toLocaleTimeString()}
          </Banner>

          {/* Welcome Section */}
          <Surface style={styles.welcomeSurface}>
            <Title style={styles.welcomeTitle}>Dashboard Overview</Title>
            <Paragraph style={styles.welcomeText}>
              Monitor and manage emergency situations with our integrated rescue alert system. 
              Select a system below to access real-time monitoring and control features.
            </Paragraph>
          </Surface>

          {/* System Cards */}
          <Title style={styles.sectionTitle}>Available Systems</Title>
          
          {disasters.map((item) => (
            <Card 
              key={item.id}
              style={styles.systemCard}
              onPress={() => handleNavigation(item.route)}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Avatar.Icon 
                    size={40} 
                    icon={item.icon} 
                    style={[styles.cardAvatar, { backgroundColor: item.color }]}
                  />
                  <View style={styles.cardHeaderText}>
                    <Title style={styles.cardTitle}>{item.title}</Title>
                    <Paragraph style={styles.cardSubtitle}>{item.subtitle}</Paragraph>
                  </View>
                  <Chip 
                    mode="outlined" 
                    compact
                    style={styles.statusChip}
                    textStyle={styles.statusChipText}
                  >
                    {item.status}
                  </Chip>
                </View>
                
                <Paragraph style={styles.cardDescription}>
                  {item.description}
                </Paragraph>
                
                <Button 
                  mode="contained"
                  onPress={() => handleNavigation(item.route)}
                  style={[styles.accessButton, { backgroundColor: item.color }]}
                  compact
                  labelStyle={styles.buttonLabel}
                >
                  Access System
                </Button>
              </Card.Content>
            </Card>
          ))}

          {/* Emergency Contact */}
          <Card style={styles.emergencyCard}>
            <Card.Content style={styles.emergencyContent}>
              <View style={styles.emergencyRow}>
                <Avatar.Icon 
                  size={40} 
                  icon="phone" 
                  style={styles.emergencyAvatar}
                />
                <View style={styles.emergencyText}>
                  <Title style={styles.emergencyTitle}>Emergency Hotline</Title>
                  <Paragraph style={styles.emergencyNumber}>911 - Available 24/7</Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerSurface: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerAvatar: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statusBanner: {
    marginBottom: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  welcomeSurface: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 12,
    elevation: 1,
  },
  welcomeTitle: {
    marginBottom: 8,
    fontSize: 18,
  },
  welcomeText: {
    color: '#666',
    lineHeight: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  systemCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusChip: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  statusChipText: {
    color: '#2e7d32',
    fontSize: 10,
  },
  cardDescription: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  accessButton: {
    borderRadius: 8,
  },
  buttonLabel: {
    color: 'white',
  },
  emergencyCard: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#ffebee',
  },
  emergencyContent: {
    padding: 20,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyAvatar: {
    backgroundColor: '#f44336',
    marginRight: 16,
  },
  emergencyText: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    color: '#d32f2f',
  },
  emergencyNumber: {
    color: '#666',
  },
});

export default Home;