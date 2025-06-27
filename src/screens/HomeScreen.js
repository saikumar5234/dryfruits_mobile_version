import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCartWishlist } from '../contexts/CartWishlistContext';
import { useTranslation } from 'react-i18next';
import { ratingsService } from '../services/firebaseService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Rating related state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingProduct, setRatingProduct] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [productRatings, setProductRatings] = useState({});
  const [productAverageRatings, setProductAverageRatings] = useState({});
  const [ratingLoading, setRatingLoading] = useState(false);

  const { t, i18n } = useTranslation();
  const { currentUser, logout, pendingUsers } = useAuth();
  const { 
    cart, 
    wishlist, 
    addToCart, 
    toggleWishlist, 
    isInCart, 
    isInWishlist, 
    getCartCount, 
    getWishlistCount 
  } = useCartWishlist();

  // Debug cart and wishlist changes
  useEffect(() => {
    console.log('🛒 HomeScreen - Cart updated:', cart.length, 'items');
    console.log('📋 Cart items:', cart.map(item => ({ id: item.id, name: getLocalized(item.name), quantity: item.quantity })));
  }, [cart]);

  useEffect(() => {
    console.log('💝 HomeScreen - Wishlist updated:', wishlist.length, 'items');
    console.log('📋 Wishlist items:', wishlist);
  }, [wishlist]);

  // Debug current user
  useEffect(() => {
    console.log('👤 HomeScreen - Current user:', currentUser ? {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email
    } : 'No user');
  }, [currentUser]);

  // Helper to get localized field
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[i18n.language] || obj.en || Object.values(obj)[0] || '';
  };

  const categories = ['all', 'nuts', 'dried-fruits', 'seeds'];

  const fetchProducts = async () => {
    try {
      console.log('🛍️ Fetching products...');
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Products fetched:', productsData.length);
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('💥 Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => {
        const name = getLocalized(product.name).toLowerCase();
        const description = getLocalized(product.description).toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, i18n.language]);

  const handleAddToCart = async (product) => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Error', 'Please login to add items to cart');
        return;
      }

      console.log('🛒 Adding to cart:', getLocalized(product.name));
      
      await addToCart(product);
      console.log('✅ Added to cart successfully');
      Alert.alert('Success', `${getLocalized(product.name)} added to cart!`);
    } catch (error) {
      console.error('💥 Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleWishlistToggle = async (product) => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Error', 'Please login to manage wishlist');
        return;
      }

      console.log('💝 Toggling wishlist for:', getLocalized(product.name));
      
      await toggleWishlist(product);
      console.log('✅ Wishlist toggled successfully');
      Alert.alert('Success', isInWishlist(product.id) ? 'Removed from wishlist' : 'Added to wishlist!');
    } catch (error) {
      console.error('💥 Error toggling wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  // Rating functions
  const openRatingModal = async (product) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'Please login to rate products');
      return;
    }

    setRatingProduct(product);
    setUserRating(0);
    setUserReview('');

    // Check if user has already rated this product
    try {
      const result = await ratingsService.getUserRating(product.id, currentUser.id);
      if (result.success && result.data) {
        setUserRating(result.data.rating);
        setUserReview(result.data.review || '');
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }

    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (!currentUser?.id || !ratingProduct) return;

    if (userRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setRatingLoading(true);
    try {
      let result;
      const existingRating = await ratingsService.getUserRating(ratingProduct.id, currentUser.id);
      
      if (existingRating.success && existingRating.data) {
        // Update existing rating
        result = await ratingsService.updateRating(existingRating.data.id, userRating, userReview);
      } else {
        // Add new rating
        result = await ratingsService.addRating(
          ratingProduct.id, 
          currentUser.id, 
          userRating, 
          userReview, 
          currentUser.name
        );
      }

      if (result.success) {
        Alert.alert('Success', 'Rating submitted successfully!');
        setRatingModalVisible(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  // Setup real-time rating listeners
  useEffect(() => {
    const unsubscribeFunctions = [];

    products.forEach(product => {
      // Listen to product ratings
      const ratingsUnsubscribe = ratingsService.onProductRatingsChange(product.id, (ratings) => {
        setProductRatings(prev => ({
          ...prev,
          [product.id]: ratings
        }));
      });

      // Listen to product average rating
      const averageUnsubscribe = ratingsService.onProductAverageRatingChange(product.id, (data) => {
        setProductAverageRatings(prev => ({
          ...prev,
          [product.id]: data
        }));
      });

      unsubscribeFunctions.push(ratingsUnsubscribe, averageUnsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [products]);

  const isNewProduct = (product) => {
    return product.createdAt && (Date.now() - new Date(product.createdAt.toDate ? product.createdAt.toDate() : product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 14);
  };

  const renderProductCard = ({ item }) => {
    const isWishlisted = isInWishlist(item.id);
    const inCart = isInCart(item.id);
    const productRatingsList = productRatings[item.id] || [];
    const averageRating = productAverageRatings[item.id]?.averageRating || item.averageRating || 0;
    const ratingCount = productAverageRatings[item.id]?.ratingCount || item.ratingCount || 0;

    console.log(`🛍️ Product ${item.id} (${getLocalized(item.name)}): inCart=${inCart}, isWishlisted=${isWishlisted}`);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
      >
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
         
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {getLocalized(item.name)}
          </Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {getLocalized(item.description)}
          </Text>
          
          {/* Rating display */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name={star <= averageRating ? "star" : "star-border"}
                  size={14}
                  color={star <= averageRating ? "#F9A825" : "#ccc"}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
            {ratingCount > 0 && (
              <Text style={styles.reviewsText}>({ratingCount} reviews)</Text>
            )}
          </View>
          
          <View style={styles.cardFooter}>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            {/* Hide cart and wishlist buttons for admin users */}
            {currentUser?.role !== 'admin' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, inCart && styles.actionButtonActive]}
                  onPress={() => handleAddToCart(item)}
                  disabled={inCart}
                >
                  <MaterialIcons 
                    name={inCart ? "check" : "shopping-cart"} 
                    size={16} 
                    color={inCart ? "#fff" : "#2E7D32"} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.wishlistButton, isWishlisted && styles.wishlistButtonActive]}
                  onPress={() => handleWishlistToggle(item)}
                >
                  <MaterialIcons 
                    name={isWishlisted ? "favorite" : "favorite-border"} 
                    size={16} 
                    color={isWishlisted ? "#fff" : "#2E7D32"} 
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Rating button for all users */}
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => openRatingModal(item)}
          >
            <MaterialIcons name="star-rate" size={16} color="#F9A825" />
            <Text style={styles.rateButtonText}>Rate this product</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryTab = ({ item }) => (
    <Button
      mode={selectedCategory === item ? "contained" : "outlined"}
      onPress={() => setSelectedCategory(item)}
      style={[styles.categoryTab, selectedCategory === item && styles.activeCategoryTab]}
      labelStyle={[styles.categoryLabel, selectedCategory === item && styles.activeCategoryLabel]}
    >
      {item.charAt(0).toUpperCase() + item.slice(1)}
    </Button>
  );

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const renderProductModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedProduct ? getLocalized(selectedProduct.name) : ''}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedProduct && (
            <ScrollView style={styles.modalBody}>
              <Image
                source={{ uri: selectedProduct.imageUrl || 'https://via.placeholder.com/300' }}
                style={styles.modalImage}
                resizeMode="cover"
              />
              
              <Text style={styles.modalDescription}>
                {getLocalized(selectedProduct.description)}
              </Text>
              
              {/* Rating display in modal */}
              {(() => {
                const averageRating = productAverageRatings[selectedProduct.id]?.averageRating || selectedProduct.averageRating || 0;
                const ratingCount = productAverageRatings[selectedProduct.id]?.ratingCount || selectedProduct.ratingCount || 0;
                
                return (
                  <View style={styles.modalRatingContainer}>
                    <View style={styles.modalStarsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name={star <= averageRating ? "star" : "star-border"}
                          size={20}
                          color={star <= averageRating ? "#F9A825" : "#ccc"}
                        />
                      ))}
                    </View>
                    <Text style={styles.modalRatingText}>{averageRating.toFixed(1)}</Text>
                    {ratingCount > 0 && (
                      <Text style={styles.modalReviewsText}>({ratingCount} reviews)</Text>
                    )}
                  </View>
                );
              })()}
              
              <Text style={styles.modalPrice}>₹{selectedProduct.price}</Text>
              
              {/* Hide cart and wishlist buttons for admin users */}
              {currentUser?.role !== 'admin' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, isInCart(selectedProduct.id) && styles.modalActionButtonActive]}
                    onPress={() => {
                      handleAddToCart(selectedProduct);
                      setModalVisible(false);
                    }}
                    disabled={isInCart(selectedProduct.id)}
                  >
                    <MaterialIcons 
                      name={isInCart(selectedProduct.id) ? "check" : "shopping-cart"} 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={styles.modalActionButtonText}>
                      {isInCart(selectedProduct.id) ? 'In Cart' : 'Add to Cart'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalWishlistButton, isInWishlist(selectedProduct.id) && styles.modalWishlistButtonActive]}
                    onPress={() => handleWishlistToggle(selectedProduct)}
                  >
                    <MaterialIcons 
                      name={isInWishlist(selectedProduct.id) ? "favorite" : "favorite-border"} 
                      size={20} 
                      color={isInWishlist(selectedProduct.id) ? "#fff" : "#2E7D32"} 
                    />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Rating button for all users */}
              <TouchableOpacity
                style={styles.modalRateButton}
                onPress={() => {
                  setModalVisible(false);
                  openRatingModal(selectedProduct);
                }}
              >
                <MaterialIcons name="star-rate" size={20} color="#F9A825" />
                <Text style={styles.modalRateButtonText}>Rate this product</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderSidebar = () => (
    <Modal
      visible={sidebarVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setSidebarVisible(false)}
    >
      <View style={styles.sidebarOverlay}>
        <View style={styles.sidebarContent}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Menu</Text>
            <TouchableOpacity
              onPress={() => setSidebarVisible(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sidebarBody}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{currentUser?.name || 'User'}</Text>
              <Text style={styles.userRole}>{currentUser?.role || 'Customer'}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                navigation.navigate('MyOrders');
              }}
            >
              <MaterialIcons name="receipt" size={24} color="#2E7D32" />
              <Text style={styles.sidebarItemText}>My Orders</Text>
            </TouchableOpacity>
            
            {currentUser?.role === 'admin' && (
              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('ProductManagement');
                }}
              >
                <MaterialIcons name="admin-panel-settings" size={24} color="#2E7D32" />
                <Text style={styles.sidebarItemText}>Admin Dashboard</Text>
              </TouchableOpacity>
            )}
            
            {currentUser?.role === 'admin' && (
              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={() => {
                  setSidebarVisible(false);
                  navigation.navigate('MainTabs', { tab: 'notifications' });
                }}
              >
                <View style={styles.sidebarItemWithBadge}>
                  <MaterialIcons name="notifications" size={24} color="#2E7D32" />
                  <Text style={styles.sidebarItemText}>Notifications</Text>
                  {pendingUsers && pendingUsers.length > 0 && (
                    <View style={styles.sidebarBadge}>
                      <Text style={styles.sidebarBadgeText}>{pendingUsers.length}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarVisible(false);
                logout();
              }}
            >
              <MaterialIcons name="logout" size={24} color="#f44336" />
              <Text style={[styles.sidebarItemText, { color: '#f44336' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRatingModal = () => (
    <Modal
      visible={ratingModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setRatingModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.ratingModalContent}>
          <View style={styles.ratingModalHeader}>
            <Text style={styles.ratingModalTitle}>
              Rate {ratingProduct ? getLocalized(ratingProduct.name) : 'Product'}
            </Text>
            <TouchableOpacity
              onPress={() => setRatingModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.ratingModalBody}>
            {/* Star Rating */}
            <View style={styles.starRatingContainer}>
              <Text style={styles.starRatingLabel}>Your Rating:</Text>
              <View style={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setUserRating(star)}
                  >
                    <MaterialIcons
                      name={star <= userRating ? "star" : "star-border"}
                      size={32}
                      color={star <= userRating ? "#F9A825" : "#ccc"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.starRatingText}>
                {userRating > 0 ? `${userRating} star${userRating > 1 ? 's' : ''}` : 'Select rating'}
              </Text>
            </View>

            {/* Review Text */}
            <View style={styles.reviewInputContainer}>
              <Text style={styles.reviewInputLabel}>Your Review (Optional):</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience with this product..."
                value={userReview}
                onChangeText={setUserReview}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitRatingButton, userRating === 0 && styles.submitRatingButtonDisabled]}
              onPress={submitRating}
              disabled={userRating === 0 || ratingLoading}
            >
              {ratingLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitRatingButtonText}>
                  {userRating > 0 ? 'Submit Rating' : 'Select Rating First'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Existing Ratings */}
            {ratingProduct && productRatings[ratingProduct.id] && (
              <View style={styles.existingRatingsContainer}>
                <Text style={styles.existingRatingsTitle}>Recent Reviews</Text>
                {productRatings[ratingProduct.id].slice(0, 5).map((rating, index) => (
                  <View key={rating.id} style={styles.ratingItem}>
                    <View style={styles.ratingItemHeader}>
                      <Text style={styles.ratingItemName}>{rating.userName}</Text>
                      <View style={styles.ratingItemStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialIcons
                            key={star}
                            name={star <= rating.rating ? "star" : "star-border"}
                            size={12}
                            color={star <= rating.rating ? "#F9A825" : "#ccc"}
                          />
                        ))}
                      </View>
                    </View>
                    {rating.review && (
                      <Text style={styles.ratingItemReview}>{rating.review}</Text>
                    )}
                    <Text style={styles.ratingItemDate}>
                      {rating.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <MaterialIcons name="menu" size={24} color="#2E7D32" />
        </TouchableOpacity>
        
        {/* Notification button for admin - REMOVED */}
        {/* {currentUser?.role === 'admin' && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('MainTabs', { tab: 'notifications' })}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="notifications" size={24} color="#2E7D32" />
              {pendingUsers && pendingUsers.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingUsers.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )} */}
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('Home')}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Hide wishlist and cart for admin users */}
          {currentUser?.role !== 'admin' && (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('Wishlist')}
              >
                <View style={styles.iconContainer}>
                  <MaterialIcons name="favorite" size={24} color="#2E7D32" />
                  {getWishlistCount() > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{getWishlistCount()}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('Cart')}
              >
                <View style={styles.iconContainer}>
                  <MaterialIcons name="shopping-cart" size={24} color="#2E7D32" />
                  {(() => {
                    const count = getCartCount();
                    console.log('🛒 Cart badge count:', count);
                    return count > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{count}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_products')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <View style={styles.tabsContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryTab}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        />
      </View>

      {/* Products */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="inventory" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No products found</Text>
            <Text style={styles.emptyStateText}>Try adjusting your search or filters</Text>
          </View>
        }
      />

      {renderProductModal()}
      {renderSidebar()}
      {renderRatingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuButton: {
    padding: 8,
    width: 40,
  },
  notificationButton: {
    padding: 8,
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft:'40'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    justifyContent: 'flex-end',
  },
  headerButton: {
    marginLeft: 16,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 16,
  },
  categoryTab: {
    marginRight: 8,
    borderRadius: 20,
    minWidth: 80,
    height: 36,
  },
  activeCategoryTab: {
    backgroundColor: '#2E7D32',
  },
  categoryLabel: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeCategoryLabel: {
    color: '#fff',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8f8f8',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  outOfStockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  outOfStockText: {
    color: '#d32f2f',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F9A825',
    backgroundColor: '#fff3e0',
  },
  newText: {
    color: '#F9A825',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  actionButtonActive: {
    backgroundColor: '#2E7D32',
  },
  wishlistButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  wishlistButtonActive: {
    backgroundColor: '#2E7D32',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalActionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modalActionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalWishlistButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  modalWishlistButtonActive: {
    backgroundColor: '#2E7D32',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sidebarBody: {
    flex: 1,
    padding: 20,
  },
  userInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  sidebarItemWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sidebarBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  reviewsText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F9A825',
    backgroundColor: '#f0f8f0',
  },
  rateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F9A825',
  },
  ratingModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ratingModalBody: {
    padding: 20,
  },
  starRatingContainer: {
    marginBottom: 20,
  },
  starRatingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starRatingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  reviewInputContainer: {
    marginBottom: 20,
  },
  reviewInputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  reviewInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    color: '#666',
  },
  submitRatingButton: {
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitRatingButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitRatingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  existingRatingsContainer: {
    marginTop: 20,
  },
  existingRatingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  ratingItem: {
    marginBottom: 16,
  },
  ratingItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginRight: 8,
  },
  ratingItemStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingItemReview: {
    fontSize: 14,
    color: '#666',
  },
  ratingItemDate: {
    fontSize: 12,
    color: '#999',
  },
  modalRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRatingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalReviewsText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  modalRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F9A825',
    backgroundColor: '#f0f8f0',
  },
  modalRateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F9A825',
  },
});

export default HomeScreen; 