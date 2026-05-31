import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const RestrictedScreen = ({ navigation, screenName }) => {
  return (
    <View style={styles.container}>
      <Icon name="lock-closed" size={80} color="#999" />
      <Text style={styles.title}>Access Restricted</Text>
      <Text style={styles.message}>
        The {screenName} section is only available for Administrator users.
      </Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('POS')}
      >
        <Text style={styles.buttonText}>Go to POS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RestrictedScreen;