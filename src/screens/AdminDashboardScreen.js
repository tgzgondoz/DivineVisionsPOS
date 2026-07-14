import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthService from '../services/AuthService';
import { getDatabaseInstance, ref, onValue } from '../config/firebase';

const AdminDashboardScreen = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    cashiers: 0,
    activeUsers: 0
  });
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cashier'
  });

  useEffect(() => {
    loadUsers();
    loadSystemStats();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const usersList = await AuthService.getUsers();
    setUsers(usersList);
    calculateStats(usersList);
    setLoading(false);
  };

  const calculateStats = (usersList) => {
    const totalUsers = usersList.length;
    const admins = usersList.filter(u => u.role === 'admin').length;
    const cashiers = usersList.filter(u => u.role === 'cashier').length;
    const activeUsers = usersList.filter(u => u.isActive).length;
    setStats({ totalUsers, admins, cashiers, activeUsers });
  };

  const loadSystemStats = () => {
    const db = getDatabaseInstance();
    
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const products = data ? Object.keys(data).length : 0;
    });
    
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const sales = data ? Object.keys(data).length : 0;
    });
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await AuthService.registerUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
      Alert.alert('Success', 'User added successfully');
      setModalVisible(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'cashier' });
      loadUsers();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await AuthService.toggleUserStatus(userId, !currentStatus);
      Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    Alert.alert(
      'Change Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await AuthService.updateUserRole(userId, newRole);
              Alert.alert('Success', 'Role updated successfully');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === user.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }
    
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteUser(userId);
              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar, item.role === 'admin' ? styles.adminAvatar : styles.cashierAvatar]}>
          <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.cashierBadge]}>
              <Icon 
                name={item.role === 'admin' ? 'shield-checkmark' : 'person'} 
                size={10} 
                color={item.role === 'admin' ? '#EF4444' : '#10B981'} 
              />
              <Text style={[styles.roleText, item.role === 'admin' ? styles.adminRoleText : styles.cashierRoleText]}>
                {item.role?.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <View style={[styles.statusDot, item.isActive ? styles.activeDot : styles.inactiveDot]} />
              <Text style={[styles.statusText, item.isActive ? styles.activeStatusText : styles.inactiveStatusText]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.userActions}>
        {item.role !== 'admin' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.promoteBtn]}
            onPress={() => handleChangeRole(item.id, 'admin')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-up" size={14} color="#111827" />
            <Text style={styles.actionBtnText}>Promote</Text>
          </TouchableOpacity>
        )}
        {item.role !== 'cashier' && item.id !== user.id && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.demoteBtn]}
            onPress={() => handleChangeRole(item.id, 'cashier')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-down" size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Demote</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, item.isActive ? styles.deactivateBtn : styles.activateBtn]}
          onPress={() => handleToggleStatus(item.id, item.isActive)}
          activeOpacity={0.7}
        >
          <Icon name={item.isActive ? "close" : "checkmark"} size={14} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        {item.id !== user.id && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteUser(item.id, item.fullName)}
            activeOpacity={0.7}
          >
            <Icon name="trash" size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#FEC82B" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {stats.totalUsers} users • {stats.activeUsers} active
            </Text>
          </View>
          <TouchableOpacity style={styles.headerAction} onPress={loadUsers}>
            <Icon name="refresh-outline" size={22} color="#FEC82B" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.totalIcon]}>
              <Icon name="people-outline" size={20} color="#FEC82B" />
            </View>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.adminIcon]}>
              <Icon name="shield-checkmark-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, styles.adminStat]}>{stats.admins}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.cashierIcon]}>
              <Icon name="person-outline" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, styles.cashierStat]}>{stats.cashiers}</Text>
            <Text style={styles.statLabel}>Cashiers</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.activeIcon]}>
              <Icon name="checkmark-circle-outline" size={20} color="#FEC82B" />
            </View>
            <Text style={[styles.statValue, styles.activeStat]}>{stats.activeUsers}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* User List Header */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Icon name="people-outline" size={20} color="#FEC82B" />
            <Text style={styles.listTitle}>User Management</Text>
          </View>
          <TouchableOpacity style={styles.addUserBtn} onPress={() => setModalVisible(true)}>
            <Icon name="add" size={20} color="#111827" />
            <Text style={styles.addUserText}>Add User</Text>
          </TouchableOpacity>
        </View>

        {/* User List */}
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="people-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Add users to get started</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Add User Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Icon name="person-add-outline" size={24} color="#FEC82B" />
                  <Text style={styles.modalTitle}>Add New User</Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={newUser.fullName}
                      onChangeText={(text) => setNewUser({ ...newUser, fullName: text })}
                      placeholder="Enter full name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={newUser.email}
                      onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                      placeholder="Enter email"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={newUser.password}
                      onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                      placeholder="Enter password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Role</Text>
                  <View style={styles.roleSelector}>
                    <TouchableOpacity
                      style={[styles.roleOption, newUser.role === 'admin' && styles.roleOptionActive]}
                      onPress={() => setNewUser({ ...newUser, role: 'admin' })}
                    >
                      <Icon name="shield-checkmark-outline" size={18} color={newUser.role === 'admin' ? '#111827' : '#6B7280'} />
                      <Text style={[styles.roleOptionText, newUser.role === 'admin' && styles.roleOptionTextActive]}>
                        Admin
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleOption, newUser.role === 'cashier' && styles.roleOptionActive]}
                      onPress={() => setNewUser({ ...newUser, role: 'cashier' })}
                    >
                      <Icon name="person-outline" size={18} color={newUser.role === 'cashier' ? '#111827' : '#6B7280'} />
                      <Text style={[styles.roleOptionText, newUser.role === 'cashier' && styles.roleOptionTextActive]}>
                        Cashier
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser} activeOpacity={0.8}>
                  <Icon name="checkmark-circle" size={20} color="#111827" />
                  <Text style={styles.submitBtnText}>Add User</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEC82B15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEC82B30',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalIcon: {
    backgroundColor: '#FEC82B15',
  },
  adminIcon: {
    backgroundColor: '#EF444415',
  },
  cashierIcon: {
    backgroundColor: '#10B98115',
  },
  activeIcon: {
    backgroundColor: '#FEC82B15',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  adminStat: {
    color: '#EF4444',
  },
  cashierStat: {
    color: '#10B981',
  },
  activeStat: {
    color: '#FEC82B',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEC82B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#FEC82B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addUserText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminAvatar: {
    backgroundColor: '#EF444415',
  },
  cashierAvatar: {
    backgroundColor: '#FEC82B15',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FEC82B',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  adminBadge: {
    backgroundColor: '#EF444415',
  },
  cashierBadge: {
    backgroundColor: '#10B98115',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  adminRoleText: {
    color: '#EF4444',
  },
  cashierRoleText: {
    color: '#10B981',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  activeBadge: {
    backgroundColor: '#10B98115',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#10B981',
  },
  inactiveDot: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#10B981',
  },
  inactiveStatusText: {
    color: '#6B7280',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 4,
  },
  promoteBtn: {
    backgroundColor: '#FEC82B',
  },
  demoteBtn: {
    backgroundColor: '#F59E0B',
  },
  deactivateBtn: {
    backgroundColor: '#EF4444',
  },
  activateBtn: {
    backgroundColor: '#10B981',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  roleOptionActive: {
    backgroundColor: '#FEC82B',
    borderColor: '#FEC82B',
  },
  roleOptionText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 14,
  },
  roleOptionTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#FEC82B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 40,
    gap: 8,
    shadowColor: '#FEC82B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

export default AdminDashboardScreen;