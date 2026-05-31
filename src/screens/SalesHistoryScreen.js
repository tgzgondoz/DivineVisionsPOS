import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDatabaseInstance, ref, onValue } from '../config/firebase';
import moment from 'moment';

const SalesHistoryScreen = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filter, setFilter] = useState('today'); // today, week, month, all

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
    return getFilteredSales().reduce((sum, sale) => sum + sale.total, 0);
  };

  const getTotalProfit = () => {
    return getFilteredSales().reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((itemSum, item) => {
        return itemSum + ((item.price - item.cost) * item.quantity);
      }, 0);
      return sum + saleProfit;
    }, 0);
  };

  const getTotalTransactions = () => {
    return getFilteredSales().length;
  };

  const renderSaleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => setSelectedSale(item)}
    >
      <View style={styles.saleHeader}>
        <Text style={styles.saleId}>Sale #{item.id.slice(-8)}</Text>
        <Text style={styles.saleDate}>{moment(item.timestamp).format('MM/DD/YYYY h:mm A')}</Text>
      </View>
      <View style={styles.saleDetails}>
        <Text style={styles.saleCustomer}>{item.customerName || 'Walk-in Customer'}</Text>
        <Text style={styles.saleItems}>{item.items.length} items</Text>
      </View>
      <View style={styles.saleFooter}>
        <Text style={styles.saleTotal}>${item.total.toFixed(2)}</Text>
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentText}>{item.paymentMethod.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSaleDetails = () => (
    <Modal
      visible={!!selectedSale}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setSelectedSale(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sale Details</Text>
            <TouchableOpacity onPress={() => setSelectedSale(null)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Sale ID:</Text>
              <Text style={styles.detailValue}>{selectedSale?.id}</Text>
              
              <Text style={styles.detailLabel}>Date & Time:</Text>
              <Text style={styles.detailValue}>{moment(selectedSale?.timestamp).format('MMMM Do YYYY, h:mm:ss a')}</Text>
              
              <Text style={styles.detailLabel}>Customer:</Text>
              <Text style={styles.detailValue}>{selectedSale?.customerName || 'Walk-in Customer'}</Text>
              
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>{selectedSale?.paymentMethod?.toUpperCase()}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Items</Text>
              {selectedSale?.items.map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)} x {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemTotal}>${item.subtotal.toFixed(2)}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.detailSection}>
              <View style={styles.totalDetailRow}>
                <Text style={styles.totalDetailLabel}>Subtotal:</Text>
                <Text style={styles.totalDetailValue}>${selectedSale?.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalDetailRow}>
                <Text style={styles.totalDetailLabel}>Tax (10%):</Text>
                <Text style={styles.totalDetailValue}>${selectedSale?.tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalDetailRow, styles.grandTotalDetail]}>
                <Text style={styles.grandTotalDetailLabel}>Total:</Text>
                <Text style={styles.grandTotalDetailValue}>${selectedSale?.total.toFixed(2)}</Text>
              </View>
              {selectedSale?.paymentMethod === 'cash' && (
                <>
                  <View style={styles.totalDetailRow}>
                    <Text style={styles.totalDetailLabel}>Amount Received:</Text>
                    <Text style={styles.totalDetailValue}>${selectedSale?.amountReceived?.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalDetailRow}>
                    <Text style={styles.totalDetailLabel}>Change:</Text>
                    <Text style={styles.totalDetailValue}>${selectedSale?.change?.toFixed(2)}</Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const filteredSales = getFilteredSales();
  const totalRevenue = getTotalRevenue();
  const totalProfit = getTotalProfit();
  const totalTransactions = getTotalTransactions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales History</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${totalRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.profitColor]}>${totalProfit.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
      </View>

      {/* Filter Buttons */}
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
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]}
          onPress={() => setFilter('month')}
        >
          <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>This Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All Time</Text>
        </TouchableOpacity>
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sales found</Text>
          </View>
        }
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  profitColor: {
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  saleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleId: {
    fontSize: 12,
    color: '#999',
  },
  saleDate: {
    fontSize: 12,
    color: '#666',
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saleCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  saleItems: {
    fontSize: 12,
    color: '#666',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paymentText: {
    fontSize: 10,
    color: '#007AFF',
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
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  totalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalDetailValue: {
    fontSize: 14,
    color: '#333',
  },
  grandTotalDetail: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  grandTotalDetailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default SalesHistoryScreen;