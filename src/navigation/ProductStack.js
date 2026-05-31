import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';

const Stack = createStackNavigator();

const ProductStack = () => {
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
        name="ProductList" 
        component={ProductManagementScreen}
        options={{ title: 'Products' }}
      />
      <Stack.Screen 
        name="AddEditProduct" 
        component={AddEditProductScreen}
        options={{ title: 'Product Form' }}
      />
    </Stack.Navigator>
  );
};

export default ProductStack;