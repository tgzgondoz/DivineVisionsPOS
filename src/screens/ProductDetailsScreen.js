import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import ProductService from '../services/ProductService';

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [restockModal, setRestockModal] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [currentProduct, setCurrentProduct] = useState(product);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    ProductService.getInventoryTransactions(product.id, (transactionsList) => {
      setTransactions(transactionsList);
    });
  };

  const handleRestock = async () => {
    if (!restockQuantity || isNaN(restockQuantity) || parseInt(restockQuantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      await ProductService.updateInventory(product.id, parseInt(restockQuantity), 'restock');
      Alert.alert('Success', 'Inventory updated successfully');
      setRestockModal(false);
      setRestockQuantity('');
      loadTransactions();
      // Update local product quantity
      setCurrentProduct({
        ...currentProduct,
        quantity: currentProduct.quantity + parseInt(restockQuantity)
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update inventory');
    }
  };

  const profit = ProductService.calculateProfit(currentProduct);
  const margin = ProductService.calculateProfitMargin(currentProduct);
  const status = ProductService.getInventoryStatus(currentProduct.quantity);
  const statusColor = ProductService.getStatusColor(status);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.productName}>{currentProduct.name}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>📋 Product Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>SKU:</Text>
          <Text style={styles.value}>{currentProduct.sku || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{currentProduct.category}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Supplier:</Text>
          <Text style={styles.value}>{currentProduct.supplier || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{currentProduct.description || 'No description'}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>💰 Pricing Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Selling Price:</Text>
          <Text style={[styles.value, styles.price]}>${currentProduct.price?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Cost Price:</Text>
          <Text style={styles.value}>${currentProduct.cost?.toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Profit per unit:</Text>
          <Text style={[styles.value, styles.profit]}>${profit.toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Profit Margin:</Text>
          <Text style={[styles.value, styles.profit]}>{margin.toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>📦 Inventory Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Current Quantity:</Text>
          <Text style={[styles.value, styles.quantity]}>{currentProduct.quantity || 0}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Total Value:</Text>
          <Text style={styles.value}>${((currentProduct.quantity || 0) * (currentProduct.cost || 0)).toFixed(2)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Potential Revenue:</Text>
          <Text style={styles.value}>${((currentProduct.quantity || 0) * (currentProduct.price || 0)).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.restockButton}
        onPress={() => setRestockModal(true)}
      >
        <Text style={styles.buttonText}>📥 Restock Product</Text>
      </TouchableOpacity>

      {transactions.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📜 Recent Transactions</Text>
          {transactions.slice(0, 5).map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <Text style={[
                styles.transactionType,
                transaction.type === 'restock' ? styles.restockText : styles.saleText
              ]}>
                {transaction.type === 'restock' ? '+' : '-'}{transaction.quantity}
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.timestamp).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={restockModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRestockModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Restock Product</Text>
            <Text style={styles.modalSubtitle}>{currentProduct.name}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter quantity to add"
              keyboardType="numeric"
              value={restockQuantity}
              onChangeText={setRestockQuantity}
              placeholderTextColor="#999"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRestockModal(false);
                  setRestockQuantity('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRestock}
              >
                <Text style={styles.modalButtonText}>Restock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  price: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profit: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  restockButton: {
    backgroundColor: '#4caf50',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
  },
  restockText: {
    color: '#4caf50',
  },
  saleText: {
    color: '#ff4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  confirmButton: {
    backgroundColor: '#4caf50',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ProductDetailsScreen;