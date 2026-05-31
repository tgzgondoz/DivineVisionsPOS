import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

// Import screens
import POSScreen from '../screens/POSScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = ({ onLogout }) => {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'POS') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Sales') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'shield' : 'shield-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <TouchableOpacity 
            onPress={onLogout} 
            style={{ marginRight: 16 }}
          >
            <Icon name="log-out" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen 
        name="POS" 
        component={POSScreen}
        options={{ 
          title: 'Point of Sale',
          headerShown: true 
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductManagementScreen}
        options={{ 
          title: 'Product Management',
          headerShown: true 
        }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesHistoryScreen}
        options={{ 
          title: 'Sales History',
          headerShown: true 
        }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={{ 
          title: 'Inventory Dashboard',
          headerShown: true 
        }}
      />
      {isAdmin() && (
        <Tab.Screen 
          name="Admin" 
          component={AdminDashboardScreen}
          options={{ 
            title: 'Admin Panel',
            headerShown: true,
            headerRight: () => (
              <TouchableOpacity 
                onPress={onLogout} 
                style={{ marginRight: 16 }}
              >
                <Icon name="log-out" size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default AppNavigator;