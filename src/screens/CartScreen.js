import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCartWishlist } from '../contexts/CartWishlistContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const { 
    cart, 
    loading, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart, 
    moveToWishlist,
    getCartTotal,
    getCartItemCount
  } = useCartWishlist();

  // Debug cart data
  useEffect(() => {
    console.log('🛒 CartScreen - Cart updated:', cart.length, 'items');
    console.log('📋 Cart items in CartScreen:', cart.map(item => ({ 
      id: item.id, 
      name: getLocalized(item.name), 
      quantity: item.quantity,
      price: item.price 
    })));
  }, [cart]);

  // Helper to get localized field
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[i18n.language] || obj.en || Object.values(obj)[0] || '';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // The CartWishlistContext handles real-time updates automatically
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    try {
      setUpdating(true);
      await updateCartQuantity(productId, newQuantity);
    } catch (error) {
      console.error('💥 Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      await removeFromCart(productId);
      Alert.alert('Success', 'Item removed from cart');
    } catch (error) {
      console.error('💥 Error removing from cart:', error);
      Alert.alert('Error', 'Failed to remove item from cart');
    }
  };

  const handleMoveToWishlist = async (item) => {
    try {
      await moveToWishlist(item);
      Alert.alert('Success', 'Item moved to wishlist!');
    } catch (error) {
      console.error('💥 Error moving to wishlist:', error);
      Alert.alert('Error', 'Failed to move to wishlist');
    }
  };

  const handleClearCart = async () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear your entire cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
              Alert.alert('Success', 'Cart cleared successfully!');
            } catch (error) {
              console.error('💥 Error clearing cart:', error);
              Alert.alert('Error', 'Failed to clear cart');
            }
          }
        }
      ]
    );
  };

  const getSubtotal = () => {
    return getCartTotal();
  };

  const getShippingCost = () => {
    return getSubtotal() > 1000 ? 0 : 100;
  };

  const getTotal = () => {
    return getSubtotal() + getShippingCost();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add some products to get started</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearCart}
          disabled={updating}
        >
          <MaterialIcons name="delete-sweep" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cart Items */}
        <View style={styles.cartItems}>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <Image
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/80x80?text=Product' }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {getLocalized(item.name)}
                </Text>
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {getLocalized(item.description)}
                </Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
              
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={updating}
                >
                  <MaterialIcons name="remove" size={20} color="#2E7D32" />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{item.quantity}</Text>
                
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={updating}
                >
                  <MaterialIcons name="add" size={20} color="#2E7D32" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.itemTotal}>
                ₹{item.price * item.quantity}
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.moveToWishlistButton}
                  onPress={() => handleMoveToWishlist(item)}
                  disabled={updating}
                >
                  <MaterialIcons name="favorite-border" size={16} color="#2E7D32" />
                  <Text style={styles.moveToWishlistText}>Move to Wishlist</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFromCart(item.id)}
                  disabled={updating}
                >
                  <MaterialIcons name="delete" size={16} color="#f44336" />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>₹{getSubtotal()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping:</Text>
            <Text style={styles.summaryValue}>₹{getShippingCost()}</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total:</Text>
            <Text style={styles.summaryTotalValue}>₹{getTotal()}</Text>
          </View>
          
          {getShippingCost() > 0 && (
            <View style={styles.freeShippingInfo}>
              <MaterialIcons name="local-shipping" size={16} color="#2E7D32" />
              <Text style={styles.freeShippingText}>
                Add ₹{1000 - getSubtotal()} more for free shipping!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => Alert.alert('Checkout', 'Checkout functionality will be implemented here')}
          disabled={updating || cart.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  cartItems: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  moveToWishlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  moveToWishlistText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  removeButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#f44336',
    fontWeight: 'bold',
  },
  orderSummary: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  freeShippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  freeShippingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  checkoutContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  checkoutButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default CartScreen; 