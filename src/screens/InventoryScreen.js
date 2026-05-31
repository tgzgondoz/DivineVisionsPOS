import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import ProductService from '../services/ProductService';

const InventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStock: 0,
    highStockItems: 0
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    ProductService.getProducts((productsList) => {
      setProducts(productsList);
      calculateStats(productsList);
      setLoading(false);
    });
  };

  const calculateStats = (productsList) => {
    const totalProducts = productsList.length;
    const totalValue = productsList.reduce((sum, p) => sum + ((p.quantity || 0) * (p.cost || 0)), 0);
    const lowStockItems = productsList.filter(p => p.quantity < 10 && p.quantity > 0).length;
    const outOfStock = productsList.filter(p => p.quantity === 0).length;
    const highStockItems = productsList.filter(p => p.quantity >= 50).length;
    
    setStats({ totalProducts, totalValue, lowStockItems, outOfStock, highStockItems });
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#ff4444' };
    if (quantity < 10) return { label: 'Critical', color: '#ff8800' };
    if (quantity < 50) return { label: 'Normal', color: '#ffcc00' };
    return { label: 'Good', color: '#4caf50' };
  };

  const renderInventoryItem = ({ item }) => {
    const status = getStockStatus(item.quantity);
    return (
      <TouchableOpacity 
        style={styles.inventoryItem}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSku}>SKU: {item.sku || 'N/A'}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        <View style={styles.itemStatus}>
          <Text style={[styles.itemQuantity, { color: status.color }]}>
            {item.quantity || 0} units
          </Text>
          <Text style={[styles.itemStatusText, { color: status.color }]}>
            {status.label}
          </Text>
          <Text style={styles.itemValue}>
            ${((item.quantity || 0) * (item.cost || 0)).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${stats.totalValue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.warning]}>{stats.lowStockItems}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.danger]}>{stats.outOfStock}</Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.success]}>{stats.highStockItems}</Text>
          <Text style={styles.statLabel}>Well Stocked</Text>
        </View>
      </View>

      <FlatList
        data={products.sort((a, b) => (a.quantity || 0) - (b.quantity || 0))}
        keyExtractor={(item) => item.id}
        renderItem={renderInventoryItem}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Inventory List</Text>
            <Text style={styles.listHeaderSubtitle}>
              {products.filter(p => p.quantity < 20).length} items need attention
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products in inventory</Text>
            <Text style={styles.emptySubtext}>Add products to see them here</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statCard: {
    width: '33.33%',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  warning: {
    color: '#ff8800',
  },
  danger: {
    color: '#ff4444',
  },
  success: {
    color: '#4caf50',
  },
  listHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  inventoryItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#007AFF',
  },
  itemStatus: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});

export default InventoryScreen;