import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your screens
import Home from '../components/Home';
import FireScreen from '../components/FireScreen';
import FloodScreen from '../components/FloodScreen';
import LandslideScreen from '../components/LandslideScreen';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={Home}
          options={{
            title: 'RESCPI Dashboard',
            headerShown: false, // Hide header for home screen since it has its own design
          }}
        />
        
        <Stack.Screen 
          name="FireScreen" 
          component={FireScreen}
          options={{
            title: 'Fire Detection System',
            headerShown: false, // Your screens have their own headers
          }}
        />
        
        <Stack.Screen 
          name="FloodScreen" 
          component={FloodScreen}
          options={{
            title: 'Flood Monitoring System',
            headerShown: false, // Your screens have their own headers
          }}
        />
        
        <Stack.Screen 
          name="LandslideScreen" 
          component={LandslideScreen}
          options={{
            title: 'Landslide Detection System',
            headerShown: false, // Your screens have their own headers
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;