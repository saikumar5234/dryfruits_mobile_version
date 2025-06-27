import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Title, 
  TextInput, 
  Dialog, 
  Portal, 
  ActivityIndicator,
  Chip,
  IconButton,
  Menu,
  Divider
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../config/firebase';
import { collection, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const UpdateProductPriceScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successProductName, setSuccessProductName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  // Helper to get localized field
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj.en || Object.values(obj)[0] || '';
  };

  // Fetch products from Firebase
  const fetchProducts = async () => {
    try {
      setFetchingProducts(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    } finally {
      setFetchingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (!selectedProduct || !price) {
        setError('Product and price are required.');
        setLoading(false);
        return;
      }

      const newPrice = parseFloat(price);
      if (isNaN(newPrice) || newPrice <= 0) {
        setError('Please enter a valid price.');
        setLoading(false);
        return;
      }

      // Update product price in Firebase
      const productRef = doc(db, 'products', selectedProduct);
      await updateDoc(productRef, {
        price: newPrice,
        updatedAt: new Date()
      });

      // Add price history entry
      const priceHistoryRef = collection(db, 'products', selectedProduct, 'priceHistory');
      await addDoc(priceHistoryRef, {
        price: newPrice,
        date: date,
        createdAt: new Date(),
        type: 'manual_update'
      });

      // Find product name for success message
      const updatedProduct = products.find(p => p.id === selectedProduct);
      if (updatedProduct) {
        setSuccessProductName(getLocalized(updatedProduct.name));
        setSuccess(true);
        setPrice('');
        setDate(new Date());
        
        // Refresh products list
        await fetchProducts();
        
        // Reset after 3 seconds
        setTimeout(() => {
          setSuccess(false);
          setSuccessProductName('');
        }, 3000);
      }
    } catch (err) {
      console.error('Error updating price:', err);
      setError('Failed to update price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === selectedProduct);
  };

  const getSelectedProductName = () => {
    const product = getSelectedProduct();
    return product ? getLocalized(product.name) : 'Select a product';
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient
          colors={["#2E7D32", "#4CAF50"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successGradient}
        >
          <View style={styles.successContent}>
            {/* Success Icon */}
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={80} color="#fff" />
            </View>
            
            <Title style={styles.successTitle}>
              Price Updated Successfully!
            </Title>
            
            <Text style={styles.successProductName}>
              {successProductName}
            </Text>
            
            <Text style={styles.successMessage}>
              The product price has been updated and saved to the system.
            </Text>
            
            <Button
              mode="contained"
              onPress={() => {
                setSuccess(false);
                setSuccessProductName('');
                navigation.goBack();
              }}
              style={styles.successButton}
              contentStyle={styles.successButtonContent}
            >
              Continue
            </Button>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (fetchingProducts) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Title style={styles.title}>Update Product Price</Title>
        
        {/* Product Selection Dropdown */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Select Product</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  icon="chevron-down"
                  style={styles.dropdownButton}
                  contentStyle={styles.dropdownButtonContent}
                >
                  {getSelectedProductName()}
                </Button>
              }
            >
              {products.map((product) => (
                <Menu.Item
                  key={product.id}
                  onPress={() => {
                    setSelectedProduct(product.id);
                    setMenuVisible(false);
                  }}
                  title={getLocalized(product.name)}
                  titleStyle={styles.menuItemTitle}
                  leadingIcon={() => (
                    <MaterialIcons 
                      name="inventory" 
                      size={20} 
                      color="#2E7D32" 
                    />
                  )}
                />
              ))}
            </Menu>
            {selectedProduct && (
              <View style={styles.selectedProductInfo}>
                <Text style={styles.selectedProductLabel}>Current Price:</Text>
                <Text style={styles.selectedProductPrice}>₹{getSelectedProduct().price}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Price Input */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>New Price</Text>
            <TextInput
              label="Today's Price (₹)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon={() => <MaterialIcons name="attach-money" size={20} color="#4CAF50" />} />}
            />
            {getSelectedProduct() && (
              <View style={styles.priceComparison}>
                <Text style={styles.comparisonText}>
                  Current Price: ₹{getSelectedProduct().price}
                </Text>
                {price && (
                  <Text style={[
                    styles.priceDifference,
                    { color: parseFloat(price) > getSelectedProduct().price ? '#d32f2f' : '#2e7d32' }
                  ]}>
                    {parseFloat(price) > getSelectedProduct().price ? '↑' : '↓'} 
                    ₹{Math.abs(parseFloat(price) - getSelectedProduct().price)}
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Date Display */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Date</Text>
            <View style={styles.dateDisplay}>
              <MaterialIcons name="calendar-today" size={20} color="#4CAF50" />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </View>
            <Text style={styles.dateHelperText}>
              Price will be updated for today's date
            </Text>
          </Card.Content>
        </Card>

        {/* Error Message */}
        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={!selectedProduct || !price || loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          labelStyle={styles.submitButtonLabel}
        >
          {loading ? 'Updating...' : 'Update Price'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dropdownButton: {
    borderColor: '#2E7D32',
    justifyContent: 'space-between',
  },
  dropdownButtonContent: {
    justifyContent: 'space-between',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedProductInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
  },
  selectedProductLabel: {
    fontSize: 14,
    color: '#666',
  },
  selectedProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  priceComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  comparisonText: {
    fontSize: 14,
    color: '#666',
  },
  priceDifference: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  dateHelperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderColor: '#d32f2f',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  submitButtonContent: {
    height: 48,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
  },
  successGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  successProductName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  successMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.9,
  },
  successButton: {
    backgroundColor: '#fff',
  },
  successButtonContent: {
    height: 48,
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
});

export default UpdateProductPriceScreen; 