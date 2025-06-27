import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, IconButton, Divider, Title } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import * as Haptics from 'expo-haptics';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width } = Dimensions.get('window');

const getOrderTotal = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

const getLocalized = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj['en'] || obj[Object.keys(obj)[0]] || '';
};

const getStatusConfig = (status) => {
  switch (status) {
    case 'cancelled':
      return { 
        color: '#f44336', 
        icon: 'close-circle', 
        label: 'Cancelled',
        backgroundColor: '#ffebee'
      };
    case 'completed':
      return { 
        color: '#4caf50', 
        icon: 'check-circle', 
        label: 'Completed',
        backgroundColor: '#e8f5e9'
      };
    case 'pending':
      return { 
        color: '#ff9800', 
        icon: 'clock-outline', 
        label: 'Pending',
        backgroundColor: '#fff3e0'
      };
    case 'processing':
      return { 
        color: '#2196f3', 
        icon: 'progress-clock', 
        label: 'Processing',
        backgroundColor: '#e3f2fd'
      };
    case 'shipped':
      return { 
        color: '#673ab7', 
        icon: 'truck-fast', 
        label: 'Shipped',
        backgroundColor: '#f3e5f5'
      };
    default:
      return { 
        color: '#757575', 
        icon: 'shopping', 
        label: status,
        backgroundColor: '#f5f5f5'
      };
  }
};

const MyOrdersScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Get current user ID from context (use id instead of uid to match web implementation)
  const currentUserId = currentUser?.id;

  // Fetch user orders from Firebase
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUserId) {
        console.log('⚠️ No user ID available for fetching orders');
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      console.log('📦 Fetching orders for user:', currentUserId);
      console.log('📦 User ID type:', typeof currentUserId);
      console.log('📦 User ID length:', currentUserId?.length);
      
      // Use the same query as web implementation
      const q = query(collection(db, 'orders'), where('userId', '==', currentUserId));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt descending (most recent first) - same as web
      const sortedOrders = ordersData.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      
      console.log('✅ User orders fetched successfully:', sortedOrders.length, 'orders');
      console.log('📦 Sorted orders:', sortedOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : 'No date',
        itemsCount: order.items?.length || 0,
        userId: order.userId
      })));
      
      setOrders(sortedOrders);
    } catch (error) {
      console.error('💥 Error fetching user orders:', error);
      setError('Failed to load orders. Please check your connection.');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Load orders on component mount
  useEffect(() => {
    if (!currentUserId) {
      console.log('⚠️ No user available, skipping order fetch');
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [fetchOrders, currentUserId]);

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

  const renderOrder = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    const orderTotal = getOrderTotal(item.items);
    const orderDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
    
    return (
      <Card 
        style={styles.orderCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // You can add order details navigation here
        }}
      >
        <Card.Content style={styles.orderCardContent}>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>
                #{item.orderNumber || item.id.slice(-8)}
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
            >
              {statusConfig.label}
            </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Order Items */}
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsTitle}>Items:</Text>
            {item.items?.map((orderItem, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {getLocalized(orderItem.name)}
                </Text>
                <Text style={styles.itemQuantity}>
                  x {orderItem.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  ₹{orderItem.price}
                </Text>
              </View>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Order Total */}
          <View style={styles.orderFooter}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>₹{orderTotal}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <IconButton
                icon="arrow-left"
                iconColor="#fff"
                size={24}
                onPress={() => navigation.goBack()}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>My Orders</Text>
                <Text style={styles.headerSubtitle}>Loading your orders...</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <IconButton
                icon="arrow-left"
                iconColor="#fff"
                size={24}
                onPress={() => navigation.goBack()}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>My Orders</Text>
                <Text style={styles.headerSubtitle}>Error loading orders</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color="#f44336" />
          <Text style={styles.errorText}>Failed to load orders</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <IconButton
            mode="contained"
            onPress={fetchOrders}
            style={styles.retryButton}
          >
            Retry
          </IconButton>
        </View>
      </View>
    );
  }

  if (!orders.length) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <IconButton
                icon="arrow-left"
                iconColor="#fff"
                size={24}
                onPress={() => navigation.goBack()}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>My Orders</Text>
                <Text style={styles.headerSubtitle}>No orders found</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-bag" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            Your orders will appear here after you make a purchase.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <IconButton
              icon="arrow-left"
              iconColor="#fff"
              size={24}
              onPress={() => navigation.goBack()}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>My Orders</Text>
              <Text style={styles.headerSubtitle}>
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
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
  ordersList: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  orderCardContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfo: {
    flexDirection: 'column',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  itemsContainer: {
    marginBottom: 8,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  orderFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statusChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    height: 28,
  },
  statusChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#2E7D32',
    marginTop: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
});

export default MyOrdersScreen; 