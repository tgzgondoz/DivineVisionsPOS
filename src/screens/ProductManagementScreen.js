import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue, update, push, set, remove } from '../config/firebase';

const ProductManagementScreen = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState(['Other']);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    category: '',
    quantity: '',
    sku: ''
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, selectedSort]);

  const loadProducts = () => {
    const db = getDatabaseInstance();
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const productsList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setProducts(productsList);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const loadCategories = () => {
    const db = getDatabaseInstance();
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesList = Object.keys(data).map(key => data[key].name);
        setCategories(['Other', ...categoriesList]);
      } else {
        setCategories(['Other']);
      }
    });
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];
    
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    filtered.sort((a, b) => {
      switch(selectedSort) {
        case 'name':
          return a.name?.localeCompare(b.name || '') || 0;
        case 'sellPrice':
          return (b.sellPrice || 0) - (a.sellPrice || 0);
        case 'buyPrice':
          return (b.buyPrice || 0) - (a.buyPrice || 0);
        case 'profit':
          const profitA = (a.sellPrice || 0) - (a.buyPrice || 0);
          const profitB = (b.sellPrice || 0) - (b.buyPrice || 0);
          return profitB - profitA;
        case 'stock':
          return (a.quantity || 0) - (b.quantity || 0);
        case 'date':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });
    
    setFilteredProducts(filtered);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCategorySelect = (category) => {
    if (category === 'Other') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: category });
    }
  };

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      setFormData({ ...formData, category: customCategory.trim() });
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  };

  const calculateProfit = () => {
    const sellPrice = parseFloat(formData.sellPrice) || 0;
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    return (sellPrice - buyPrice).toFixed(2);
  };

  const calculateMargin = () => {
    const sellPrice = parseFloat(formData.sellPrice) || 0;
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    if (sellPrice === 0) return '0%';
    return `${((sellPrice - buyPrice) / sellPrice * 100).toFixed(1)}%`;
  };

  const calculateROI = () => {
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    if (buyPrice === 0) return '0%';
    const profit = calculateProfit();
    return `${((parseFloat(profit) / buyPrice) * 100).toFixed(1)}%`;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter product name');
      return false;
    }
    if (!formData.buyPrice || parseFloat(formData.buyPrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid cost price');
      return false;
    }
    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid selling price');
      return false;
    }
    if (parseFloat(formData.buyPrice) > parseFloat(formData.sellPrice)) {
      Alert.alert('Validation Error', 'Cost price cannot be higher than selling price');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select or enter a category');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const productData = {
        name: formData.name.trim(),
        buyPrice: parseFloat(formData.buyPrice),
        sellPrice: parseFloat(formData.sellPrice),
        category: formData.category,
        quantity: parseInt(formData.quantity) || 0,
        sku: formData.sku?.trim() || '',
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        const productRef = ref(db, `products/${editingProduct.id}`);
        await update(productRef, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        const productsRef = ref(db, 'products');
        const newProductRef = push(productsRef);
        await set(newProductRef, {
          ...productData,
          createdAt: new Date().toISOString(),
          id: newProductRef.key
        });
        Alert.alert('Success', 'Product added successfully');
      }
      
      setModalVisible(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDatabaseInstance();
              const productRef = ref(db, `products/${product.id}`);
              await remove(productRef);
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

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      buyPrice: product.buyPrice?.toString() || '',
      sellPrice: product.sellPrice?.toString() || '',
      category: product.category || '',
      quantity: product.quantity?.toString() || '',
      sku: product.sku || ''
    });
    setShowCustomCategory(false);
    setCustomCategory('');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      buyPrice: '',
      sellPrice: '',
      category: '',
      quantity: '',
      sku: ''
    });
    setShowCustomCategory(false);
    setCustomCategory('');
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#ff4444' };
    if (quantity < 10) return { label: 'Low Stock', color: '#ff8800' };
    if (quantity < 50) return { label: 'In Stock', color: '#4caf50' };
    return { label: 'Well Stocked', color: '#4caf50' };
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const renderProduct = ({ item }) => {
    const stockStatus = getStockStatus(item.quantity);
    const profit = (item.sellPrice || 0) - (item.buyPrice || 0);
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={[styles.stockStatus, { color: stockStatus.color }]}>
            {stockStatus.label}
          </Text>
        </View>
        
        <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
        
        <View style={styles.productDetails}>
          <View>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.productPrice}>{formatCurrency(item.sellPrice)}</Text>
            <Text style={styles.costText}>Cost: {formatCurrency(item.buyPrice)}</Text>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <Text style={styles.productQuantity}>{item.quantity || 0}</Text>
            <Text style={styles.profitText}>Profit: {formatCurrency(profit)}</Text>
          </View>
        </View>
        
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTotalStats = () => {
    const totalProducts = products.length;
    const totalInventoryValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.buyPrice || 0)), 0);
    const totalPotentialRevenue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.sellPrice || 0)), 0);
    const totalPotentialProfit = totalPotentialRevenue - totalInventoryValue;
    const lowStockCount = products.filter(p => p.quantity < 10 && p.quantity > 0).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;
    
    return { totalProducts, totalInventoryValue, totalPotentialRevenue, totalPotentialProfit, lowStockCount, outOfStockCount };
  };

  const stats = getTotalStats();
  const categoriesList = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" color="#fec82b" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
     
      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsScrollContent}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalInventoryValue)}</Text>
            <Text style={styles.statLabel}>Inventory Value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalPotentialRevenue)}</Text>
            <Text style={styles.statLabel}>Revenue Potential</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalPotentialProfit)}</Text>
            <Text style={styles.statLabel}>Profit Potential</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.warningText]}>{stats.lowStockCount}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.dangerText]}>{stats.outOfStockCount}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Product FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>Filters & Sort</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categoriesList.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive
                ]}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterTitle}>Sort By</Text>
          <View style={styles.sortButtons}>
            {['name', 'sellPrice', 'buyPrice', 'profit', 'stock', 'date'].map((sort) => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortButton,
                  selectedSort === sort && styles.sortButtonActive
                ]}
                onPress={() => setSelectedSort(sort)}
              >
                <Text style={[
                  styles.sortButtonText,
                  selectedSort === sort && styles.sortButtonTextActive
                ]}>
                  {sort === 'sellPrice' ? 'Sell' : 
                   sort === 'buyPrice' ? 'Cost' :
                   sort === 'profit' ? 'Profit' :
                   sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

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
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Tap + to add your first product'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Add/Edit Product Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalForm}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter product name"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>SKU (Stock Keeping Unit)</Text>
            <TextInput
              style={styles.input}
              value={formData.sku}
              onChangeText={(text) => handleInputChange('sku', text)}
              placeholder="Enter unique SKU (optional)"
              placeholderTextColor="#999"
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Cost Price *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.buyPrice}
                  onChangeText={(text) => handleInputChange('buyPrice', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Selling Price *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.sellPrice}
                  onChangeText={(text) => handleInputChange('sellPrice', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {formData.buyPrice && formData.sellPrice && (
              <View style={styles.statsBox}>
                <Text style={styles.statsText}>Profit: ${calculateProfit()}</Text>
                <Text style={styles.statsText}>Margin: {calculateMargin()}</Text>
                <Text style={styles.statsText}>ROI: {calculateROI()}</Text>
              </View>
            )}

            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    formData.category === cat && styles.categoryButtonActive
                  ]}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    formData.category === cat && styles.categoryButtonTextActive
                  ]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {showCustomCategory && (
              <View style={styles.customCategoryContainer}>
                <TextInput
                  style={[styles.input, styles.customCategoryInput]}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter custom category"
                  placeholderTextColor="#999"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.customCategorySubmit}
                  onPress={handleCustomCategorySubmit}
                >
                  <Text style={styles.customCategorySubmitText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}

            {formData.category && !categories.includes(formData.category) && (
              <View style={styles.customCategoryBadge}>
                <Text style={styles.customCategoryBadgeText}>
                  Custom: {formData.category}
                </Text>
                <TouchableOpacity onPress={() => setFormData({ ...formData, category: '' })}>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Initial Quantity</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => handleInputChange('quantity', text)}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  statsScroll: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsScrollContent: {
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 6,
    minWidth: 110,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fec82b',
    marginBottom: 4,
  },
  warningText: {
    color: '#ff8800',
  },
  dangerText: {
    color: '#ff4444',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fec82b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 100,
  },
  fabText: {
    fontSize: 32,
    color: '#0e0b05',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  filterToggle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterToggleText: {
    color: '#fec82b',
    fontSize: 14,
    fontWeight: '500',
  },
  filtersPanel: {
    backgroundColor: '#fff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#fec82b',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#0e0b05',
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  sortButtonActive: {
    backgroundColor: '#fec82b',
  },
  sortButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#0e0b05',
  },
  listContainer: {
    paddingBottom: 80,
  },
  productCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  stockStatus: {
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
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fec82b',
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
  productQuantity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profitText: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
  },
  productActions: {
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
  editButton: {
    backgroundColor: '#fec82b',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#0e0b05',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fec82b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  modalForm: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#fec82b',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 12,
  },
  categoryButtonTextActive: {
    color: '#0e0b05',
    fontWeight: '500',
  },
  customCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  customCategoryInput: {
    flex: 1,
    marginRight: 8,
  },
  customCategorySubmit: {
    backgroundColor: '#fec82b',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
  },
  customCategorySubmitText: {
    color: '#0e0b05',
    fontWeight: '600',
    fontSize: 12,
  },
  customCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  customCategoryBadgeText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 12,
  },
  statsBox: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginVertical: 2,
  },
  saveButton: {
    backgroundColor: '#fec82b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#0e0b05',
    fontSize: 18,
    fontWeight: '600',
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

export default ProductManagementScreen;