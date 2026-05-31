import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeFirebase } from './src/config/firebase';

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeFirebase();
        setIsReady(true);
      } catch (err) {
        console.error('Firebase initialization error:', err);
        setError(err.message);
        Alert.alert('Error', 'Failed to initialize app: ' + err.message);
      }
    };
    initApp();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {error}</Text>
              <Text style={styles.errorSubtext}>Check your internet connection and Firebase configuration</Text>
            </View>
          ) : (
            <>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading DivineVisionsPOS...</Text>
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
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
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;