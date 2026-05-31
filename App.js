import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { initializeFirebase } from './src/config/firebase';
import AuthService from './src/services/AuthService';

// Initialize default admin and cashier users
const initializeDefaultUsers = async () => {
  try {
    const users = await AuthService.getUsers();
    if (users.length === 0) {
      // Create default admin
      await AuthService.registerUser('admin@divinevisions.com', 'admin123', 'System Admin', 'admin');
      // Create default cashier
      await AuthService.registerUser('cashier@divinevisions.com', 'cashier123', 'Default Cashier', 'cashier');
      console.log('Default users created');
    }
  } catch (error) {
    console.error('Error initializing default users:', error);
  }
};

const MainApp = () => {
  const { user, login, logout, loading } = useAuth();
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        await initializeDefaultUsers();
        setFirebaseReady(true);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        Alert.alert('Error', 'Failed to initialize app: ' + error.message);
      }
    };
    init();
  }, []);

  const handleLogin = (userData) => {
    login(userData);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            await logout();
          }
        }
      ]
    );
  };

  if (!firebaseReady || loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading DivineVisionsPOS...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <LoginScreen onLogin={handleLogin} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppNavigator />
        {/* Add logout button in header or via a menu */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default App;