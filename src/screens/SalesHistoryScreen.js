import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue } from '../config/firebase';
import moment from 'moment';

const SalesHistoryScreen = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filter, setFilter] = useState('today');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = () => {
    const db = getDatabaseInstance();
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const salesList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];
      setSales(salesList);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const getFilteredSales = () => {
    const now = moment();
    return sales.filter(sale => {
      const saleDate = moment(sale.timestamp);
      switch(filter) {
        case 'today':
          return saleDate.isSame(now, 'day');
        case 'week':
          return saleDate.isAfter(now.clone().subtract(7, 'days'));
        case 'month':
          return saleDate.isAfter(now.clone().subtract(30, 'days'));
        default:
          return true;
      }
    });
  };

  const getTotalRevenue = () => {
    return getFilteredSales().reduce((sum, sale) => sum + (sale.total || 0), 0);
  };

  const getTotalProfit = () => {
    return getFilteredSales().reduce((sum, sale) => {
      const saleProfit = sale.items?.reduce((itemSum, item) => {
        const profit = (item.sellPrice - item.buyPrice) * item.quantity;
        return itemSum + (profit || 0);
      }, 0);
      return sum + (saleProfit || 0);
    }, 0);
  };

  const getTotalTransactions = () => {
    return getFilteredSales().length;
  };

  const getAverageOrderValue = () => {
    const total = getTotalRevenue();
    const count = getTotalTransactions();
    return count > 0 ? total / count : 0;
  };

  const getTopProduct = () => {
    const productSales = {};
    getFilteredSales().forEach(sale => {
      sale.items?.forEach(item => {
        if (!productSales[item.name]) {
          productSales[item.name] = { quantity: 0, revenue: 0 };
        }
        productSales[item.name].quantity += item.quantity;
        productSales[item.name].revenue += item.subtotal || (item.sellPrice * item.quantity);
      });
    });
    
    let topProduct = null;
    let maxQuantity = 0;
    Object.entries(productSales).forEach(([name, data]) => {
      if (data.quantity > maxQuantity) {
        maxQuantity = data.quantity;
        topProduct = { name, ...data };
      }
    });
    return topProduct;
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const renderSaleItem = ({ item }) => {
    const profit = item.items?.reduce((sum, i) => sum + ((i.sellPrice - i.buyPrice) * i.quantity), 0) || 0;
    
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => setSelectedSale(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <Text style={styles.saleId}>#{item.id?.slice(-8)}</Text>
          <Text style={styles.saleDate}>{moment(item.timestamp).format('MM/DD/YY h:mm A')}</Text>
        </View>
        
        <Text style={styles.saleCustomer}>{item.customerName || 'Walk-in Customer'}</Text>
        
        <View style={styles.saleFooter}>
          <View>
            <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>
            <Text style={styles.saleProfit}>Profit: +{formatCurrency(profit)}</Text>
          </View>
          <View style={[styles.paymentBadge, 
            item.paymentMethod === 'cash' && styles.cashBadge,
            item.paymentMethod === 'card' && styles.cardBadge,
            item.paymentMethod === 'mobile' && styles.mobileBadge
          ]}>
            <Text style={styles.paymentText}>{item.paymentMethod?.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSaleDetails = () => (
    <Modal
      visible={!!selectedSale}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSelectedSale(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sale Details</Text>
            <TouchableOpacity onPress={() => setSelectedSale(null)}>
              <Icon name="close" size={24} color="#75482f" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Sale ID</Text>
              <Text style={styles.detailValue}>{selectedSale?.id}</Text>
              
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{moment(selectedSale?.timestamp).format('MMMM Do YYYY, h:mm:ss a')}</Text>
              
              <Text style={styles.detailLabel}>Customer</Text>
              <Text style={styles.detailValue}>{selectedSale?.customerName || 'Walk-in Customer'}</Text>
              
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{selectedSale?.paymentMethod?.toUpperCase()}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Items</Text>
              {selectedSale?.items?.map((item, index) => {
                const profit = (item.sellPrice - item.buyPrice) * item.quantity;
                return (
                  <View key={index} style={styles.detailItem}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(item.sellPrice)} × {item.quantity}
                      </Text>
                      <Text style={styles.itemProfit}>Profit: +{formatCurrency(profit)}</Text>
                    </View>
                    <Text style={styles.itemTotal}>{formatCurrency(item.subtotal || item.sellPrice * item.quantity)}</Text>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.detailSection}>
              <View style={styles.totalDetailRow}>
                <Text style={styles.totalDetailLabel}>Subtotal</Text>
                <Text style={styles.totalDetailValue}>{formatCurrency(selectedSale?.subtotal)}</Text>
              </View>
              <View style={[styles.totalDetailRow, styles.grandTotalDetail]}>
                <Text style={styles.grandTotalDetailLabel}>Total</Text>
                <Text style={styles.grandTotalDetailValue}>{formatCurrency(selectedSale?.total)}</Text>
              </View>
              {selectedSale?.paymentMethod === 'cash' && (
                <>
                  <View style={styles.totalDetailRow}>
                    <Text style={styles.totalDetailLabel}>Amount Received</Text>
                    <Text style={styles.totalDetailValue}>{formatCurrency(selectedSale?.amountReceived)}</Text>
                  </View>
                  <View style={styles.totalDetailRow}>
                    <Text style={styles.totalDetailLabel}>Change</Text>
                    <Text style={[styles.totalDetailValue, styles.changeText]}>{formatCurrency(selectedSale?.change)}</Text>
                  </View>
                </>
              )}
              <View style={styles.totalProfitRow}>
                <Text style={styles.totalProfitLabel}>Total Profit</Text>
                <Text style={styles.totalProfitValue}>
                  +{formatCurrency(selectedSale?.items?.reduce((sum, i) => sum + ((i.sellPrice - i.buyPrice) * i.quantity), 0))}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" color="#fec82b" />
        <Text style={styles.loadingText}>Loading sales history...</Text>
      </View>
    );
  }

  const filteredSales = getFilteredSales();
  const totalRevenue = getTotalRevenue();
  const totalProfit = getTotalProfit();
  const totalTransactions = getTotalTransactions();
  const averageOrder = getAverageOrderValue();
  const topProduct = getTopProduct();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.miniHeader}>
        <Text style={styles.miniHeaderTitle}>Sales</Text>
        <Text style={styles.miniHeaderDate}>{moment().format('MMM DD, YYYY')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.profitColor]}>{formatCurrency(totalProfit)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(averageOrder)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </ScrollView>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]}
          onPress={() => setFilter('month')}
        >
          <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      {topProduct && (
        <View style={styles.topProductBanner}>
          <Text style={styles.topProductText}>🏆 Top: {topProduct.name} ({topProduct.quantity} sold)</Text>
        </View>
      )}

      <FlatList
        data={filteredSales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSales} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={64} color="#75482f" />
            <Text style={styles.emptyText}>No sales found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'today' ? 'No sales today' : 
               filter === 'week' ? 'No sales this week' :
               filter === 'month' ? 'No sales this month' : 
               'Start selling to see records'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {renderSaleDetails()}
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
  miniHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  miniHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  miniHeaderDate: {
    fontSize: 13,
    color: '#75482f',
  },
  statsScroll: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginHorizontal: 6,
    minWidth: 110,
    alignItems: 'center',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fec82b',
    marginBottom: 2,
  },
  profitColor: {
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#fec82b',
  },
  filterText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#0e0b05',
  },
  topProductBanner: {
    backgroundColor: '#fec82b10',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fec82b30',
  },
  topProductText: {
    fontSize: 11,
    color: '#fec82b',
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  saleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleId: {
    fontSize: 11,
    color: '#999',
  },
  saleDate: {
    fontSize: 10,
    color: '#999',
  },
  saleCustomer: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleTotal: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fec82b',
  },
  saleProfit: {
    fontSize: 10,
    color: '#4caf50',
    marginTop: 2,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  cashBadge: {
    backgroundColor: '#4caf50',
  },
  cardBadge: {
    backgroundColor: '#fec82b',
  },
  mobileBadge: {
    backgroundColor: '#ff9800',
  },
  paymentText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  detailSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
    marginTop: 6,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  itemProfit: {
    fontSize: 10,
    color: '#4caf50',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fec82b',
  },
  totalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalDetailValue: {
    fontSize: 13,
    color: '#333',
  },
  grandTotalDetail: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  grandTotalDetailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalDetailValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fec82b',
  },
  changeText: {
    color: '#4caf50',
  },
  totalProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  totalProfitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  totalProfitValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SalesHistoryScreen;