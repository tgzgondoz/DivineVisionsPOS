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
  ActivityIndicator
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
      if (existingItem.quantity + 1 > product.quantity) {
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
    return cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.1; // 10% tax
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
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
          price: item.price,
          cost: item.cost,
          quantity: item.cartQuantity,
          subtotal: item.price * item.cartQuantity
        })),
        subtotal: getSubtotal(),
        tax: getTax(),
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

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, item.quantity === 0 && styles.outOfStockCard]}
      onPress={() => addToCart(item)}
      disabled={item.quantity === 0}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productSku}>{item.sku || 'No SKU'}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>${item.price?.toFixed(2)}</Text>
          <Text style={styles.productCost}>Cost: ${item.cost?.toFixed(2)}</Text>
        </View>
        <Text style={[styles.stockStatus, item.quantity < 10 && styles.lowStock]}>
          Stock: {item.quantity} units
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, item.quantity === 0 && styles.disabledButton]}
        onPress={() => addToCart(item)}
        disabled={item.quantity === 0}
      >
        <Icon name="add-circle" size={40} color={item.quantity === 0 ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price?.toFixed(2)} each</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.cartQuantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.cartItemQuantity}>{item.cartQuantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.cartQuantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.cartItemTotal}>
          ${(item.price * item.cartQuantity).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Icon name="trash-bin" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Point of Sale</Text>
        <Text style={styles.headerDate}>{moment().format('MMMM Do YYYY, h:mm:ss a')}</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Current Sale</Text>
            <Text style={styles.cartItemCount}>{cart.length} items</Text>
          </View>
          
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            style={styles.cartList}
          />
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalAmount}>${getSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax (10%):</Text>
              <Text style={styles.totalAmount}>${getTax().toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => setCheckoutModal(true)}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={checkoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCheckoutModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name (Optional)"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor="#999"
            />
            
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'cash' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={styles.paymentMethodText}>Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('card')}
              >
                <Text style={styles.paymentMethodText}>Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'mobile' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('mobile')}
              >
                <Text style={styles.paymentMethodText}>Mobile Money</Text>
              </TouchableOpacity>
            </View>
            
            {paymentMethod === 'cash' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Amount Received"
                keyboardType="decimal-pad"
                value={amountReceived}
                onChangeText={setAmountReceived}
                placeholderTextColor="#999"
              />
            )}
            
            <View style={styles.modalTotals}>
              <Text style={styles.modalTotalText}>Total: ${getTotal().toFixed(2)}</Text>
              {paymentMethod === 'cash' && amountReceived && (
                <Text style={styles.modalChangeText}>Change: ${getChange().toFixed(2)}</Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setCheckoutModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={processCheckout}
              >
                <Text style={styles.modalButtonText}>Complete Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerDate: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
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
    marginBottom: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
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
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 8,
    width: '47%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outOfStockCard: {
    opacity: 0.5,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productCost: {
    fontSize: 11,
    color: '#666',
  },
  stockStatus: {
    fontSize: 11,
    color: '#4caf50',
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
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: '50%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemCount: {
    fontSize: 14,
    color: '#666',
  },
  cartList: {
    maxHeight: 200,
  },
  cartItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartItemQuantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    flex: 1,
    fontSize: 14,
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
    borderTopColor: '#e0e0e0',
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
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkoutButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  paymentMethodActive: {
    backgroundColor: '#007AFF',
  },
  paymentMethodText: {
    color: '#333',
  },
  modalTotals: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  modalTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  modalChangeText: {
    fontSize: 14,
    color: '#4caf50',
    textAlign: 'center',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
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
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default POSScreen;