import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Title, Card, Button, Chip, Divider, ActivityIndicator, IconButton, Searchbar, Menu } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

const OrdersScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [error, setError] = useState(null);

  // Get current user ID from context
  const currentUserId = currentUser?.uid;

  // Fetch orders from Firebase
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📦 Fetching orders...');
      
      // Use direct Firebase query like web implementation
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt descending (most recent first)
      const sortedOrders = ordersData.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      
      console.log('✅ Orders fetched successfully:', sortedOrders.length, 'orders');
      setOrders(sortedOrders);
    } catch (error) {
      console.error('💥 Error fetching orders:', error);
      setError('Failed to load orders. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load orders on component mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  };

  // Get order total
  const getOrderTotal = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Get localized text
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj['en'] || obj[Object.keys(obj)[0]] || '';
  };

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'cancelled':
        return {
          color: '#f44336',
          icon: 'cancel',
          label: 'Cancelled',
          backgroundColor: '#ffebee'
        };
      case 'completed':
        return {
          color: '#2E7D32',
          icon: 'check-circle',
          label: 'Completed',
          backgroundColor: '#e8f5e9'
        };
      case 'pending':
        return {
          color: '#FF8F00',
          icon: 'schedule',
          label: 'Pending',
          backgroundColor: '#fff3e0'
        };
      case 'processing':
        return {
          color: '#1976d2',
          icon: 'build',
          label: 'Processing',
          backgroundColor: '#e3f2fd'
        };
      case 'shipped':
        return {
          color: '#9C27B0',
          icon: 'local-shipping',
          label: 'Shipped',
          backgroundColor: '#f3e5f5'
        };
      default:
        return {
          color: '#666',
          icon: 'shopping-bag',
          label: status,
          backgroundColor: '#f5f5f5'
        };
    }
  };

  // Filter orders based on search and status
  const getFilteredOrders = () => {
    let filtered = orders;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(order => 
        (order.orderNumber && order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.id && order.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.userId && order.userId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.items && order.items.some(item => 
          getLocalized(item.name).toLowerCase().includes(searchQuery.toLowerCase())
        ))
      );
    }
    
    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log('📦 Updating order status:', { orderId, newStatus });
      const result = await firebaseService.updateOrderStatus(orderId, newStatus);
      
      if (result.success) {
        console.log('✅ Order status updated successfully');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Refresh orders to get updated data
        await fetchOrders();
      } else {
        console.error('❌ Failed to update order status:', result.error);
      }
    } catch (error) {
      console.error('💥 Error updating order status:', error);
    }
  };

  const OrderCard = ({ order }) => {
    const statusConfig = getStatusConfig(order.status);
    const orderTotal = getOrderTotal(order.items);
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
    
    return (
      <Card style={styles.orderCard} onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // You can add order details navigation here
      }}>
        <Card.Content style={styles.orderCardContent}>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>
                #{order.orderNumber || order.id.slice(-8)}
              </Text>
              <Text style={styles.orderDate}>
                {orderDate.toLocaleDateString()} • {orderDate.toLocaleTimeString()}
              </Text>
            </View>
            <Chip
              mode="outlined"
              style={[styles.statusChip, { 
                borderColor: statusConfig.color,
                backgroundColor: statusConfig.backgroundColor
              }]}
              textStyle={[styles.statusChipText, { color: statusConfig.color }]}
              icon={statusConfig.icon}
            >
              {statusConfig.label}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          {/* Customer Info */}
          <View style={styles.customerInfo}>
            <MaterialIcons name="person" size={16} color="#666" />
            <Text style={styles.customerText}>
              Customer: {order.userId || 'Unknown'}
            </Text>
          </View>

          {/* Order Items */}
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsTitle}>Items:</Text>
            {order.items?.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {getLocalized(item.name)}
                </Text>
                <Text style={styles.itemQuantity}>
                  x{item.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  ₹{item.price * item.quantity}
                </Text>
              </View>
            ))}
          </View>

          <Divider style={styles.divider} />

          {/* Order Footer */}
          <View style={styles.orderFooter}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>₹{orderTotal}</Text>
            </View>
            
            {/* Status Update Buttons */}
            <View style={styles.actionButtons}>
              {order.status === 'pending' && (
                <Button
                  mode="contained"
                  onPress={() => updateOrderStatus(order.id, 'processing')}
                  style={[styles.actionButton, { backgroundColor: '#1976d2' }]}
                  labelStyle={styles.actionButtonLabel}
                >
                  Start Processing
                </Button>
              )}
              {order.status === 'processing' && (
                <Button
                  mode="contained"
                  onPress={() => updateOrderStatus(order.id, 'shipped')}
                  style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                  labelStyle={styles.actionButtonLabel}
                >
                  Mark Shipped
                </Button>
              )}
              {order.status === 'shipped' && (
                <Button
                  mode="contained"
                  onPress={() => updateOrderStatus(order.id, 'completed')}
                  style={[styles.actionButton, { backgroundColor: '#2E7D32' }]}
                  labelStyle={styles.actionButtonLabel}
                >
                  Mark Completed
                </Button>
              )}
              {(order.status === 'pending' || order.status === 'processing') && (
                <Button
                  mode="outlined"
                  onPress={() => updateOrderStatus(order.id, 'cancelled')}
                  style={[styles.actionButton, { borderColor: '#f44336' }]}
                  labelStyle={[styles.actionButtonLabel, { color: '#f44336' }]}
                >
                  Cancel Order
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const statusOptions = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2E7D32', '#4CAF50']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <IconButton
              icon="arrow-left"
              iconColor="#fff"
              size={24}
              onPress={() => navigation.goBack()}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>View Orders</Text>
              <Text style={styles.headerSubtitle}>
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search and Filter */}
        <View style={styles.searchFilterContainer}>
          <Searchbar
            placeholder="Search orders..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#2E7D32"
          />
          
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setFilterMenuVisible(true)}
                icon="filter-variant"
                style={styles.filterButton}
                labelStyle={styles.filterButtonLabel}
              >
                {statusOptions.find(opt => opt.key === statusFilter)?.label || 'Filter'}
              </Button>
            }
          >
            {statusOptions.map((option) => (
              <Menu.Item
                key={option.key}
                onPress={() => {
                  setStatusFilter(option.key);
                  setFilterMenuVisible(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                title={option.label}
                leadingIcon={statusFilter === option.key ? 'check' : undefined}
              />
            ))}
          </Menu>
        </View>

        {/* Orders List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={80} color="#f44336" />
            <Text style={styles.errorText}>Failed to load orders</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <Button
              mode="contained"
              onPress={fetchOrders}
              style={styles.retryButton}
            >
              Retry
            </Button>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="shopping-bag" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No orders have been placed yet'
              }
            </Text>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                mode="outlined"
                onPress={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                style={styles.emptyButton}
              >
                Clear Filters
              </Button>
            )}
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    elevation: 2,
    borderRadius: 12,
  },
  filterButton: {
    borderColor: '#2E7D32',
    borderRadius: 12,
  },
  filterButtonLabel: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  orderCard: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  orderCardContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  orderFooter: {
    marginTop: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    height: 36,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
  },
});

export default OrdersScreen; 