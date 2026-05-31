import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView
} from 'react-native';
import ProductService from '../services/ProductService';

const ProductListScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    ProductService.getProducts((productsList) => {
      setProducts(productsList);
      filterProducts(productsList, searchQuery, selectedCategory);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const filterProducts = (productsList, query, category) => {
    let filtered = [...productsList];
    
    if (query) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }
    
    setFilteredProducts(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterProducts(products, text, selectedCategory);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    filterProducts(products, searchQuery, category);
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${productName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(productId);
              Alert.alert('Success', 'Product deleted successfully');
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleRestock = (product) => {
    Alert.alert(
      'Restock Product',
      `Enter quantity to add to ${product.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: async (quantity) => {
            if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
              try {
                await ProductService.updateInventory(product.id, parseInt(quantity), 'restock');
                Alert.alert('Success', 'Inventory updated successfully');
                loadProducts();
              } catch (error) {
                Alert.alert('Error', 'Failed to update inventory');
              }
            } else {
              Alert.alert('Error', 'Please enter a valid quantity');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const renderProduct = ({ item }) => {
    const status = ProductService.getInventoryStatus(item.quantity);
    const statusColor = ProductService.getStatusColor(status);
    const profit = ProductService.calculateProfit(item);
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {status}
          </Text>
        </View>
        
        <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
        
        <View style={styles.productDetails}>
          <View>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>${item.price?.toFixed(2)}</Text>
            <Text style={styles.costText}>Cost: ${item.cost?.toFixed(2)}</Text>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <Text style={styles.quantity}>{item.quantity || 0}</Text>
            <Text style={styles.profitText}>
              Profit: ${profit.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restockButton]}
            onPress={() => handleRestock(item)}
          >
            <Text style={styles.buttonText}>Restock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item.id, item.name)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search products..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive
            ]}
            onPress={() => handleCategoryFilter(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextActive
            ]}>{category}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProducts} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first product</Text>
          </View>
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  categoryScroll: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  productCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#999',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  costText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rightDetails: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#999',
  },
  quantity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profitText: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  restockButton: {
    backgroundColor: '#4caf50',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
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

export default ProductListScreen;