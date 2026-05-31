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
import RestrictedScreen from '../screens/RestrictedScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = ({ onLogout }) => {
  const { user, isAdmin, isCashier } = useAuth();
  
  if (!user) {
    return null;
  }

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
      {/* POS - Both roles can access */}
      <Tab.Screen 
        name="POS" 
        component={POSScreen}
        options={{ 
          title: 'Point of Sale',
          headerShown: true 
        }}
      />
      
      {/* Products - Only Admin, Cashier sees restricted message */}
      <Tab.Screen 
        name="Products" 
        component={isAdmin() ? ProductManagementScreen : RestrictedScreen}
        options={{ 
          title: 'Product Management',
          headerShown: true 
        }}
        initialParams={{ screenName: 'Product Management' }}
      />
      
      {/* Sales - Both roles can access */}
      <Tab.Screen 
        name="Sales" 
        component={SalesHistoryScreen}
        options={{ 
          title: 'Sales History',
          headerShown: true 
        }}
      />
      
      {/* Inventory - Only Admin, Cashier sees restricted message */}
      <Tab.Screen 
        name="Inventory" 
        component={isAdmin() ? InventoryScreen : RestrictedScreen}
        options={{ 
          title: 'Inventory Dashboard',
          headerShown: true 
        }}
        initialParams={{ screenName: 'Inventory Dashboard' }}
      />
      
      
    </Tab.Navigator>
  );
};

export default AppNavigator;