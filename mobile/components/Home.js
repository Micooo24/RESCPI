import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Avatar,
  Provider as PaperProvider,
  DefaultTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#F5F5DD',
    secondary: '#34623f',
    accent: '#ff6801',
    background: '#F5F5DD',
    surface: '#ffffff',
    text: '#34623f',
    onSurface: '#34623f',
  },
};

const Home = ({ navigation }) => {
  const systems = [
    {
      id: 1,
      title: 'Fire Emergency',
      description: 'Gas & Fire Detection',
      icon: 'fire',
      route: 'FireScreen',
      color: '#ff6801',
    },
    {
      id: 2,
      title: 'Flood Monitoring',
      description: 'Water Level Control',
      icon: 'waves',
      route: 'FloodScreen',
      color: '#34623f',
    },
    {
      id: 3,
      title: 'Landslide Detection',
      description: 'Ground Movement',
      icon: 'terrain',
      route: 'LandslideScreen',
      color: '#ff6801',
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
          {/* Header */}
          <View style={styles.header}>
            <Title style={[styles.title, { color: theme.colors.secondary }]}>RESCPI</Title>
            <Paragraph style={[styles.subtitle, { color: theme.colors.secondary }]}>Emergency Alert System</Paragraph>
          </View>

          {/* System Cards */}
          {systems.map((item) => (
            <Card 
              key={item.id}
              style={styles.systemCard}
              onPress={() => handleNavigation(item.route)}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Avatar.Icon 
                    size={48} 
                    icon={item.icon} 
                    style={[styles.cardAvatar, { backgroundColor: item.color }]}
                  />
                  <View style={styles.cardText}>
                    <Title style={[styles.cardTitle, { color: theme.colors.secondary }]}>{item.title}</Title>
                    <Paragraph style={[styles.cardDescription, { color: theme.colors.secondary }]}>{item.description}</Paragraph>
                  </View>
                </View>
                
                <Button 
                  mode="contained"
                  onPress={() => handleNavigation(item.route)}
                  style={[styles.accessButton, { backgroundColor: item.color }]}
                  labelStyle={styles.buttonLabel}
                >
                  Monitor
                </Button>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DD',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  systemCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#ffffff',
  },
  cardContent: {
    padding: 24,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardAvatar: {
    marginRight: 20,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  accessButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home;