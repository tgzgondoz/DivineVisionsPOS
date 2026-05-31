import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue, update, push, set } from '../config/firebase';
import moment from 'moment';

const POSScreen = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [categories, setCategories] = useState(['All']);

  useEffect(() => {
    loadProducts();
  }, []);

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
      // Extract unique categories
      const uniqueCategories = ['All', ...new Set(productsList.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      setLoading(false);
    });
  };

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock!`);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.cartQuantity + 1 > product.quantity) {
        Alert.alert('Limit Reached', `Only ${product.quantity} units available in stock`);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    const product = products.find(p => p.id === productId);
    if (newQuantity > product.quantity) {
      Alert.alert('Limit Reached', `Only ${product.quantity} units available`);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, cartQuantity: newQuantity }
          : item
      ));
    }
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.sellPrice * item.cartQuantity), 0);
  };

  const getTotal = () => {
    return getSubtotal();
  };

  const getChange = () => {
    const received = parseFloat(amountReceived);
    if (isNaN(received)) return 0;
    return received - getTotal();
  };

  const processCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to the cart');
      return;
    }

    if (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < getTotal())) {
      Alert.alert('Insufficient Amount', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      
      // Create sale record
      const salesRef = ref(db, 'sales');
      const newSaleRef = push(salesRef);
      const saleData = {
        id: newSaleRef.key,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          sellPrice: item.sellPrice,
          buyPrice: item.buyPrice,
          quantity: item.cartQuantity,
          subtotal: item.sellPrice * item.cartQuantity
        })),
        subtotal: getSubtotal(),
        total: getTotal(),
        paymentMethod: paymentMethod,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) : getTotal(),
        change: paymentMethod === 'cash' ? getChange() : 0,
        customerName: customerName || 'Walk-in Customer',
        timestamp: new Date().toISOString(),
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss')
      };
      
      await set(newSaleRef, saleData);
      
      // Update inventory
      for (const item of cart) {
        const productRef = ref(db, `products/${item.id}`);
        const newQuantity = item.quantity - item.cartQuantity;
        await update(productRef, { quantity: newQuantity });
      }
      
      Alert.alert(
        'Success',
        `Sale completed!\nTotal: $${getTotal().toFixed(2)}\nChange: $${getChange().toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setCheckoutModal(false);
              setAmountReceived('');
              setCustomerName('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setCart([]) }
      ]
    );
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, item.quantity === 0 && styles.outOfStockCard]}
      onPress={() => addToCart(item)}
      disabled={item.quantity === 0}
      activeOpacity={0.7}
    >
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          {item.quantity < 10 && item.quantity > 0 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>Low Stock</Text>
            </View>
          )}
        </View>
        <Text style={styles.productSku}>{item.sku || 'No SKU'}</Text>
        <Text style={styles.productPrice}>${item.sellPrice?.toFixed(2)}</Text>
        <View style={styles.stockContainer}>
          <Icon name="cube-outline" size={12} color="#666" />
          <Text style={[styles.stockStatus, item.quantity < 10 && styles.lowStock]}>
            {item.quantity} units
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.addButton, item.quantity === 0 && styles.disabledButton]}
        onPress={() => addToCart(item)}
        disabled={item.quantity === 0}
      >
        <Icon name="add-circle" size={44} color={item.quantity === 0 ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => {
    const itemTotal = item.sellPrice * item.cartQuantity;
    const profit = (item.sellPrice - item.buyPrice) * item.cartQuantity;
    
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>${item.sellPrice?.toFixed(2)} x {item.cartQuantity}</Text>
          {profit > 0 && (
            <Text style={styles.cartItemProfit}>Profit: +${profit.toFixed(2)}</Text>
          )}
        </View>
        <View style={styles.cartItemControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity - 1)}
          >
            <Icon name="remove" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cartItemQuantity}>{item.cartQuantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity + 1)}
          >
            <Icon name="add" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cartItemTotal}>${itemTotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Icon name="trash-bin" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalProfit = cart.reduce((sum, item) => sum + ((item.sellPrice - item.buyPrice) * item.cartQuantity), 0);

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Point of Sale</Text>
            <Text style={styles.headerDate}>{moment().format('MMMM Do YYYY, h:mm:ss a')}</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{cart.length}</Text>
              <Text style={styles.headerStatLabel}>Items</Text>
            </View>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search</Text>
            </View>
          }
          contentContainerStyle={styles.productsList}
        />

        {/* Cart Summary */}
        {cart.length > 0 && (
          <View style={styles.cartSummary}>
            <View style={styles.cartHeader}>
              <View>
                <Text style={styles.cartTitle}>Current Sale</Text>
                <Text style={styles.cartSubtitle}>{cart.length} items in cart</Text>
              </View>
              <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
                <Icon name="trash-outline" size={20} color="#ff4444" />
                <Text style={styles.clearCartText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              style={styles.cartList}
              showsVerticalScrollIndicator={false}
            />
            
            <View style={styles.totalContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalAmount}>${getSubtotal().toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalAmount}>${getTotal().toFixed(2)}</Text>
              </View>
              {totalProfit > 0 && (
                <View style={styles.profitRow}>
                  <Icon name="trending-up" size={16} color="#4caf50" />
                  <Text style={styles.profitText}>Profit on this sale: ${totalProfit.toFixed(2)}</Text>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => setCheckoutModal(true)}
              >
                <Icon name="card-outline" size={20} color="#fff" />
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Checkout Modal */}
        <Modal
          visible={checkoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCheckoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Checkout</Text>
                <TouchableOpacity onPress={() => setCheckoutModal(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Customer Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter customer name"
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Payment Method</Text>
                  <View style={styles.paymentMethods}>
                    <TouchableOpacity
                      style={[styles.paymentMethod, paymentMethod === 'cash' && styles.paymentMethodActive]}
                      onPress={() => setPaymentMethod('cash')}
                    >
                      <Icon name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#fff' : '#666'} />
                      <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.paymentMethodTextActive]}>Cash</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
                      onPress={() => setPaymentMethod('card')}
                    >
                      <Icon name="card-outline" size={20} color={paymentMethod === 'card' ? '#fff' : '#666'} />
                      <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>Card</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.paymentMethod, paymentMethod === 'mobile' && styles.paymentMethodActive]}
                      onPress={() => setPaymentMethod('mobile')}
                    >
                      <Icon name="phone-portrait-outline" size={20} color={paymentMethod === 'mobile' ? '#fff' : '#666'} />
                      <Text style={[styles.paymentMethodText, paymentMethod === 'mobile' && styles.paymentMethodTextActive]}>Mobile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {paymentMethod === 'cash' && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Amount Received</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={amountReceived}
                      onChangeText={setAmountReceived}
                      placeholderTextColor="#999"
                    />
                  </View>
                )}
                
                <View style={styles.modalTotals}>
                  <View style={styles.modalTotalRow}>
                    <Text style={styles.modalTotalLabel}>Total Amount:</Text>
                    <Text style={styles.modalTotalValue}>${getTotal().toFixed(2)}</Text>
                  </View>
                  {paymentMethod === 'cash' && amountReceived && parseFloat(amountReceived) >= getTotal() && (
                    <View style={styles.modalTotalRow}>
                      <Text style={styles.modalTotalLabel}>Change:</Text>
                      <Text style={[styles.modalTotalValue, styles.changeText]}>${getChange().toFixed(2)}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setCheckoutModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={processCheckout}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalButtonText}>Complete Sale</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
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
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerDate: {
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
    opacity: 0.85,
  },
  headerStats: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStatLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  productsList: {
    paddingBottom: 120,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    margin: 6,
    width: '47%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  outOfStockCard: {
    opacity: 0.5,
    backgroundColor: '#fafafa',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#ff880020',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  lowStockBadgeText: {
    fontSize: 8,
    color: '#ff8800',
    fontWeight: '600',
  },
  productSku: {
    fontSize: 10,
    color: '#999',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockStatus: {
    fontSize: 10,
    color: '#4caf50',
    marginLeft: 4,
  },
  lowStock: {
    color: '#ff8800',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cartSummary: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '55%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444410',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearCartText: {
    color: '#ff4444',
    marginLeft: 4,
    fontSize: 13,
  },
  cartList: {
    maxHeight: 200,
  },
  cartItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cartItemInfo: {
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cartItemProfit: {
    fontSize: 11,
    color: '#4caf50',
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  totalContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    color: '#666',
  },
  grandTotal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  profitText: {
    fontSize: 12,
    color: '#4caf50',
    marginLeft: 6,
    fontWeight: '500',
  },
  checkoutButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paymentMethodActive: {
    backgroundColor: '#007AFF',
  },
  paymentMethodText: {
    marginLeft: 6,
    color: '#666',
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  modalTotals: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  modalTotalLabel: {
    fontSize: 16,
    color: '#666',
  },
  modalTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  changeText: {
    color: '#4caf50',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelModalButton: {
    backgroundColor: '#ff4444',
  },
  confirmModalButton: {
    backgroundColor: '#4caf50',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});

export default POSScreen;