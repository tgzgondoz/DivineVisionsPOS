import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import InventoryScreen from '../screens/InventoryScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';

const Stack = createStackNavigator();

const InventoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="InventoryList" 
        component={InventoryScreen}
        options={{ title: 'Inventory Dashboard' }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ title: 'Product Details' }}
      />
    </Stack.Navigator>
  );
};

export default InventoryStack;