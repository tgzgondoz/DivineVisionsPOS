import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import ProductService from '../services/ProductService';

const InventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    totalRetailValue: 0,
    totalProfit: 0,
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
    
    const totalValue = productsList.reduce((sum, p) => {
      const quantity = p.quantity || 0;
      const cost = p.buyPrice || p.cost || 0;
      return sum + (quantity * cost);
    }, 0);
    
    const totalRetailValue = productsList.reduce((sum, p) => {
      const quantity = p.quantity || 0;
      const sellPrice = p.sellPrice || 0;
      return sum + (quantity * sellPrice);
    }, 0);
    
    const totalProfit = totalRetailValue - totalValue;
    
    const lowStockItems = productsList.filter(p => p.quantity < 10 && p.quantity > 0).length;
    const outOfStock = productsList.filter(p => p.quantity === 0).length;
    const highStockItems = productsList.filter(p => p.quantity >= 50).length;
    
    setStats({ 
      totalProducts, 
      totalValue, 
      totalRetailValue, 
      totalProfit, 
      lowStockItems, 
      outOfStock, 
      highStockItems 
    });
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#ff4444' };
    if (quantity < 10) return { label: 'Critical', color: '#ff8800' };
    if (quantity < 50) return { label: 'Normal', color: '#fec82b' };
    return { label: 'Good', color: '#4caf50' };
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const showProductDetails = (item) => {
    const costPrice = item.buyPrice || item.cost || 0;
    const sellPrice = item.sellPrice || 0;
    const profitPerUnit = sellPrice - costPrice;
    const totalValue = (item.quantity || 0) * costPrice;
    const totalProfit = (item.quantity || 0) * profitPerUnit;
    const status = getStockStatus(item.quantity);
    
    Alert.alert(
      `📦 ${item.name}`,
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 PRODUCT INFORMATION\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔖 SKU: ${item.sku || 'N/A'}\n` +
      `📂 Category: ${item.category || 'Uncategorized'}\n` +
      `📊 Status: ${status.label}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 PRICING\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 Cost Price: ${formatCurrency(costPrice)}\n` +
      `💲 Selling Price: ${formatCurrency(sellPrice)}\n` +
      `📈 Profit/Unit: ${formatCurrency(profitPerUnit)}\n` +
      `📊 Margin: ${costPrice > 0 ? ((profitPerUnit / costPrice) * 100).toFixed(1) : 0}%\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 INVENTORY\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔢 Quantity: ${item.quantity || 0} units\n` +
      `💎 Total Value: ${formatCurrency(totalValue)}\n` +
      `🎯 Potential Revenue: ${formatCurrency((item.quantity || 0) * sellPrice)}\n` +
      `🏆 Potential Profit: ${formatCurrency(totalProfit)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 Created: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}\n` +
      `🔄 Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'OK', onPress: () => console.log('Product viewed:', item.name) }
      ],
      { cancelable: true }
    );
  };

  const renderInventoryItem = ({ item }) => {
    const status = getStockStatus(item.quantity);
    const costPrice = item.buyPrice || item.cost || 0;
    const sellPrice = item.sellPrice || 0;
    const itemValue = (item.quantity || 0) * costPrice;
    const itemProfit = (item.quantity || 0) * (sellPrice - costPrice);
    
    return (
      <TouchableOpacity 
        style={styles.inventoryItem}
        onPress={() => showProductDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSku}>SKU: {item.sku || 'N/A'}</Text>
          <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
          <Text style={styles.itemPriceInfo}>
            Cost: {formatCurrency(costPrice)} | Sell: {formatCurrency(sellPrice)}
          </Text>
        </View>
        <View style={styles.itemStatus}>
          <Text style={[styles.itemQuantity, { color: status.color }]}>
            {item.quantity || 0} units
          </Text>
          <Text style={[styles.itemStatusText, { color: status.color }]}>
            {status.label}
          </Text>
          <Text style={styles.itemValue}>
            Value: {formatCurrency(itemValue)}
          </Text>
          <Text style={styles.itemProfit}>
            Profit: {formatCurrency(itemProfit)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fec82b" />
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
          <Text style={styles.statValue}>{formatCurrency(stats.totalValue)}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(stats.totalRetailValue)}</Text>
          <Text style={styles.statLabel}>Retail Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.success]}>{formatCurrency(stats.totalProfit)}</Text>
          <Text style={styles.statLabel}>Potential Profit</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#fec82b',
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
    marginTop: 8,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e0b05',
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
    color: '#fec82b',
    marginBottom: 2,
    fontWeight: '500',
  },
  itemPriceInfo: {
    fontSize: 11,
    color: '#666',
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
    marginBottom: 2,
  },
  itemProfit: {
    fontSize: 12,
    color: '#4caf50',
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