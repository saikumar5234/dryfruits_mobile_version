import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Card,
  Button,
  Avatar,
  Chip,
  IconButton,
  Searchbar,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useCartWishlist } from '../contexts/CartWishlistContext';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const WishlistScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { 
    wishlist, 
    cart, 
    loading, 
    removeFromWishlist, 
    addToCart, 
    isInCart 
  } = useCartWishlist();
  const { t, i18n } = useTranslation();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistProducts, setWishlistProducts] = useState([]);

  // Helper to get localized field
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[i18n.language] || obj.en || Object.values(obj)[0] || '';
  };

  // Fetch product data for wishlist items
  const fetchWishlistProducts = async () => {
    try {
      console.log('💝 Fetching product data for wishlist items:', wishlist);
      
      const productPromises = wishlist.map(async (productId) => {
        try {
          const productDoc = await getDoc(doc(db, 'products', productId));
          if (productDoc.exists()) {
            return { id: productDoc.id, ...productDoc.data() };
          } else {
            console.warn('⚠️ Product not found:', productId);
            return null;
          }
        } catch (error) {
          console.error('💥 Error fetching product:', productId, error);
          return null;
        }
      });

      const products = await Promise.all(productPromises);
      const validProducts = products.filter(product => product !== null);
      
      console.log('✅ Fetched wishlist products:', validProducts.length, 'items');
      setWishlistProducts(validProducts);
    } catch (error) {
      console.error('💥 Error fetching wishlist products:', error);
    }
  };

  // Fetch products when wishlist changes
  useEffect(() => {
    if (wishlist.length > 0) {
      fetchWishlistProducts();
    } else {
      setWishlistProducts([]);
    }
  }, [wishlist]);

  // Debug wishlist data
  useEffect(() => {
    console.log('💝 WishlistScreen - Wishlist updated:', wishlist.length, 'items');
    console.log('📋 Wishlist items in WishlistScreen:', wishlist);
  }, [wishlist]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The CartWishlistContext handles real-time updates automatically
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFromWishlist(productId);
      Alert.alert('Success', 'Item removed from wishlist');
    } catch (error) {
      console.error('💥 Error removing from wishlist:', error);
      Alert.alert('Error', 'Failed to remove item from wishlist');
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      Alert.alert('Success', 'Item added to cart!');
    } catch (error) {
      console.error('💥 Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const renderWishlistItem = ({ item }) => {
    const isNewProduct = item.createdAt && (Date.now() - new Date(item.createdAt.toDate ? item.createdAt.toDate() : item.createdAt).getTime() < 1000 * 60 * 60 * 24 * 14);
    const inCart = isInCart(item.id);

    return (
      <View style={styles.wishlistItemContainer}>
        <Card style={styles.wishlistCard} elevation={3}>
          <View style={styles.cardHeader}>
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/300' }}
              style={styles.itemImage}
              resizeMode="cover"
            />
            
            {/* Badges */}
            <View style={styles.badgesContainer}>
              {!item.inStock && (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
              )}
              {isNewProduct && (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>New</Text>
                </View>
              )}
            </View>

            {/* Remove from wishlist button */}
            <TouchableOpacity
              style={styles.removeWishlistButton}
              onPress={() => handleRemoveFromWishlist(item.id)}
            >
              <MaterialIcons name="favorite" size={20} color="#e91e63" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardContent}>
            {/* Product name and category */}
            <View style={styles.productInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {getLocalized(item.name)}
              </Text>
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryText}>
                  {item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Category'}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.itemDescription} numberOfLines={2}>
              {getLocalized(item.description)}
            </Text>

            {/* Rating and reviews */}
            {item.rating && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#F9A825" />
                <Text style={styles.ratingText}>{item.rating}</Text>
                {item.reviews && (
                  <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
                )}
              </View>
            )}

            {/* Price and actions */}
            <View style={styles.priceActionContainer}>
              <View style={styles.priceContainer}>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
                {item.originalPrice && item.originalPrice > item.price && (
                  <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, inCart && styles.actionButtonActive]}
                  onPress={() => handleAddToCart(item)}
                  disabled={inCart || !item.inStock}
                >
                  <MaterialIcons 
                    name={inCart ? "check" : "shopping-cart"} 
                    size={16} 
                    color={inCart ? "#fff" : "#2E7D32"} 
                  />
                  <Text style={[styles.actionButtonText, inCart && styles.actionButtonTextActive]}>
                    {inCart ? 'In Cart' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFromWishlist(item.id)}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#f44336" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const EmptyWishlist = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons name="favorite-border" size={80} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
      <Text style={styles.emptySubtext}>
        Start adding your favorite dry fruits to your wishlist and never miss out on the best deals!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.emptyButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const filteredItems = wishlistProducts.filter(item => {
    // Handle multi-language name objects
    const itemName = typeof item.name === 'object' && item.name.en 
      ? item.name.en 
      : typeof item.name === 'string' 
        ? item.name 
        : '';
    
    return itemName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={loading} color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2E7D32', '#4CAF50']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.welcomeText}>My Wishlist</Text>
            <Text style={styles.userName}>
              {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <MaterialIcons name="shopping-cart" size={24} color="#fff" />
            {cart.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {wishlistProducts.length > 0 ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Search wishlist..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              iconColor="#2E7D32"
            />
          </View>

          {/* Wishlist Items */}
          <FlatList
            data={filteredItems}
            renderItem={renderWishlistItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.wishlistContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2E7D32']}
                tintColor="#2E7D32"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <EmptyWishlist />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    minHeight: 40,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  wishlistList: {
    paddingBottom: 20,
  },
  wishlistItemContainer: {
    padding: 8,
  },
  wishlistCard: {
    flex: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardHeader: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f8f8f8',
  },
  cardContent: {
    padding: 16,
  },
  productInfo: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    lineHeight: 20,
  },
  categoryContainer: {
    marginTop: 6,
  },
  categoryText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemDescription: {
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: '#2E7D32',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  outOfStockBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  outOfStockText: {
    color: '#f44336',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F9A825',
  },
  newText: {
    color: '#F9A825',
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeWishlistButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultsHeader: {
    padding: 12,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  wishlistContainer: {
    paddingBottom: 20,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WishlistScreen; 