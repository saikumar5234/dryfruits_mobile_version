import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Text, Title, Card, Button, Chip, Divider, ActivityIndicator, IconButton, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const { logout, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch products count
      const productsSnap = await getDocs(collection(db, 'products'));
      // Fetch orders and sum revenue only from completed orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      let totalRevenue = 0;
      ordersSnap.forEach(doc => {
        const data = doc.data();
        // Only count revenue from completed orders
        if (data.status === 'completed' && data.total) {
          totalRevenue += Number(data.total);
        }
      });
      // Fetch users count
      const usersSnap = await getDocs(collection(db, 'users'));
      setStats({
        totalProducts: productsSnap.size,
        totalRevenue,
        totalCustomers: usersSnap.size,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStats();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => {
    const formatRevenue = (amount) => {
      if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`;
      } else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
      }
      return `₹${amount.toLocaleString()}`;
    };
    const isRevenue = title === 'Total Revenue';
    const displayValue = isRevenue ? formatRevenue(value) : value;
    return (
      <Card style={[styles.statCard, { borderLeftColor: color }]}> 
        <Card.Content style={styles.statCardContent}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: color }]}> 
              <MaterialIcons name={icon} size={24} color="#fff" />
            </View>
            <Text style={styles.statTitle}>{title}</Text>
          </View>
          <Text style={[styles.statValue, { color }]}>{displayValue}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <LinearGradient
        colors={['#2E7D32', '#4CAF50']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <Avatar.Text 
                size={50} 
                label={currentUser?.email?.charAt(0).toUpperCase() || 'U'} 
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.userName}>{currentUser?.email || 'User'}</Text>
                <Chip 
                  mode="outlined" 
                  style={styles.roleChip}
                  textStyle={styles.roleChipText}
                >
                  Administrator
                </Chip>
              </View>
            </View>
            <IconButton
              icon="logout"
              iconColor="#fff"
              size={24}
              onPress={handleLogout}
              disabled={loading}
            />
          </View>
        </View>
      </LinearGradient>
      <View style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Title style={styles.sectionTitle}>Overview</Title>
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon="inventory"
            color="#1976d2"
          />
          <StatCard
            title="Total Revenue"
            value={stats.totalRevenue}
            icon="attach-money"
            color="#2E7D32"
            subtitle={`Completed orders: ₹${stats.totalRevenue.toLocaleString()}`}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon="people"
            color="#FF8F00"
          />
        </View>
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
          <View style={styles.actionCardsContainer}>
            <Card 
              style={styles.actionCard} 
              onPress={() => {
                console.log('🔄 Navigating to ProductManagement screen...');
                navigation.navigate('ProductManagement');
              }}
            >
              <Card.Content style={styles.actionCardContent}>
                <View style={[styles.actionIcon, { backgroundColor: '#1976d2' }]}> 
                  <MaterialIcons name="inventory" size={28} color="#fff" />
                </View>
                <Text style={styles.actionTitle}>Product Management</Text>
                <Text style={styles.actionDescription}>
                  Manage products, add new items, update inventory
                </Text>
              </Card.Content>
            </Card>
            <Card 
              style={styles.actionCard} 
              onPress={() => navigation.navigate('UpdateProductPrice')}
            >
              <Card.Content style={styles.actionCardContent}>
                <View style={[styles.actionIcon, { backgroundColor: '#F9A825' }]}> 
                  <MaterialIcons name="attach-money" size={28} color="#fff" />
                </View>
                <Text style={styles.actionTitle}>Update Prices</Text>
                <Text style={styles.actionDescription}>
                  Modify product prices and pricing strategies
                </Text>
              </Card.Content>
            </Card>
            <Card 
              style={styles.actionCard} 
              onPress={() => navigation.push('Orders')}
            >
              <Card.Content style={styles.actionCardContent}>
                <View style={[styles.actionIcon, { backgroundColor: '#2E7D32' }]}> 
                  <MaterialIcons name="shopping-cart" size={28} color="#fff" />
                </View>
                <Text style={styles.actionTitle}>View Orders</Text>
                <Text style={styles.actionDescription}>
                  Track orders, manage deliveries, view history
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
  },
  roleChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  statsContainer: {
    marginBottom: 32,
  },
  statCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    borderRadius: 12,
  },
  statCardContent: {
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#fff',
  },
  actionCardContent: {
    padding: 16,
    alignItems: 'center',
    textAlign: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default AdminDashboardScreen; 