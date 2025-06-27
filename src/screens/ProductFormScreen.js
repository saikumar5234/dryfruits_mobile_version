import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, Image } from 'react-native';
import { Text, Title, Card, Button, TextInput, ActivityIndicator, IconButton, Chip, Divider, Dialog, Portal, List, SegmentedButtons } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { firebaseService } from '../services/firebaseService';

const { width } = Dimensions.get('window');

const ProductFormScreen = ({ navigation, route }) => {
  console.log('📱 ProductFormScreen loaded with route params:', route.params);
  
  const { product } = route.params || {}; // product for editing, undefined for adding
  const [name, setName] = useState({
    en: product?.name?.en || product?.name || '',
    te: product?.name?.te || '',
    hi: product?.name?.hi || ''
  });
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [description, setDescription] = useState({
    en: product?.description?.en || product?.description || '',
    te: product?.description?.te || '',
    hi: product?.description?.hi || ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [category, setCategory] = useState(product?.category || 'premium');
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

  // Get localized text
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj['en'] || obj[Object.keys(obj)[0]] || '';
  };

  // Handle image picker
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📸 Image selected:', result.assets[0].uri);
        setImage(result.assets[0]);
        setImagePreview(result.assets[0].uri);
        setImageUrl(''); // Clear URL when image is selected
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('💥 Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (imageAsset) => {
    try {
      console.log('📤 Starting image upload...');
      
      // Convert image to blob
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const result = await firebaseService.uploadProductImage(blob, imageAsset.fileName || `product_${Date.now()}.jpg`);
      
      if (result.success) {
        console.log('✅ Image uploaded successfully:', result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('💥 Error uploading image:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (!name.en.trim() || !price.trim() || !description.en.trim()) {
        Alert.alert('Error', 'Please fill in all required fields (English)');
        return;
      }

      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue < 0) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }

      setLoading(true);
      setError('');
      
      console.log('💾 Saving product...');
      console.log('📋 Form data:', { name, price: priceValue, description, category, hasImage: !!image, imageUrl });
      
      let finalImageUrl = imageUrl;
      
      // Upload image if selected
      if (image) {
        console.log('📤 Uploading image...');
        finalImageUrl = await uploadImage(image);
        console.log('✅ Image uploaded, URL:', finalImageUrl);
      }

      const productData = {
        name,
        price: priceValue,
        description,
        imageUrl: finalImageUrl,
        category,
        createdAt: product ? product.createdAt : new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Product data to save:', productData);

      let result;
      if (product) {
        // Update existing product
        console.log('🔄 Updating existing product...');
        result = await firebaseService.updateProduct(product.id, productData);
      } else {
        // Add new product
        console.log('➕ Adding new product...');
        result = await firebaseService.addProduct(productData);
      }
      
      if (result.success) {
        console.log('✅ Product saved successfully');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSuccess(true);
        
        // Show success message and navigate back
        setTimeout(() => {
          setSuccess(false);
          navigation.goBack();
        }, 2000);
      } else {
        console.error('❌ Failed to save product:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('💥 Error saving product:', error);
      setError(`Error saving product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Success animation component
  const SuccessAnimation = () => (
    <View style={styles.successContainer}>
      <View style={styles.successCircle}>
        <MaterialIcons name="check" size={40} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Product Saved Successfully!</Text>
      <Text style={styles.successSubtitle}>
        {product ? 'Product has been updated' : 'New product has been added'}
      </Text>
    </View>
  );

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'te', label: 'Telugu' },
    { value: 'hi', label: 'Hindi' }
  ];

  const categories = [
    { value: 'nuts', label: 'Nuts' },
    { value: 'dried_fruits', label: 'Dried Fruits' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'premium', label: 'Premium' }
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
              <Text style={styles.headerTitle}>
                {product ? 'Edit Product' : 'Add New Product'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {product ? 'Update product details' : 'Create a new product'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {success ? (
          <SuccessAnimation />
        ) : (
          <Card style={styles.formCard}>
            <Card.Content>
              <Title style={styles.formTitle}>
                {product ? 'Edit Product' : 'Add New Product'}
              </Title>
              
              {error && (
                <View style={styles.errorMessage}>
                  <MaterialIcons name="error" size={16} color="#f44336" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Product Name - English */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Name (English) *</Text>
                <TextInput
                  value={name.en}
                  onChangeText={(text) => setName({ ...name, en: text })}
                  placeholder="Enter product name in English"
                  style={styles.textInput}
                  mode="outlined"
                  left={<TextInput.Icon icon="package-variant" />}
                />
              </View>

              {/* Product Name - Telugu */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Name (Telugu)</Text>
                <TextInput
                  value={name.te}
                  onChangeText={(text) => setName({ ...name, te: text })}
                  placeholder="Enter product name in Telugu"
                  style={styles.textInput}
                  mode="outlined"
                  left={<TextInput.Icon icon="package-variant" />}
                />
              </View>

              {/* Product Name - Hindi */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Name (Hindi)</Text>
                <TextInput
                  value={name.hi}
                  onChangeText={(text) => setName({ ...name, hi: text })}
                  placeholder="Enter product name in Hindi"
                  style={styles.textInput}
                  mode="outlined"
                  left={<TextInput.Icon icon="package-variant" />}
                />
              </View>

              {/* Description - English */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (English) *</Text>
                <TextInput
                  value={description.en}
                  onChangeText={(text) => setDescription({ ...description, en: text })}
                  placeholder="Enter description in English"
                  style={styles.textInput}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  left={<TextInput.Icon icon="text" />}
                />
              </View>

              {/* Description - Telugu */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (Telugu)</Text>
                <TextInput
                  value={description.te}
                  onChangeText={(text) => setDescription({ ...description, te: text })}
                  placeholder="Enter description in Telugu"
                  style={styles.textInput}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  left={<TextInput.Icon icon="text" />}
                />
              </View>

              {/* Description - Hindi */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (Hindi)</Text>
                <TextInput
                  value={description.hi}
                  onChangeText={(text) => setDescription({ ...description, hi: text })}
                  placeholder="Enter description in Hindi"
                  style={styles.textInput}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  left={<TextInput.Icon icon="text" />}
                />
              </View>

              {/* Price */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Price (₹) *</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Enter price"
                  style={styles.textInput}
                  mode="outlined"
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="currency-inr" />}
                />
              </View>

              {/* Category */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Category *</Text>
                <Button
                  mode="outlined"
                  onPress={() => setCategoryDialogVisible(true)}
                  icon="chevron-down"
                  style={styles.categoryButton}
                  labelStyle={styles.categoryButtonLabel}
                >
                  {categories.find(cat => cat.value === category)?.label || 'Select Category'}
                </Button>
              </View>

              {/* Image Section */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Image</Text>
                
                {/* Image URL Input */}
                <TextInput
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="Enter image URL (optional)"
                  style={styles.textInput}
                  mode="outlined"
                  left={<TextInput.Icon icon="link" />}
                />
                
                <Text style={styles.helperText}>Or upload an image from your device</Text>
                
                {/* Image Upload Button */}
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  icon="camera"
                  style={styles.uploadButton}
                  labelStyle={styles.uploadButtonLabel}
                >
                  Pick Image
                </Button>
                
                {/* Image Preview */}
                {(imagePreview || imageUrl) && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: imagePreview || imageUrl }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => {
                        setImage(null);
                        setImagePreview('');
                        setImageUrl('');
                      }}
                      style={styles.removeImageButton}
                    />
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={loading || !name.en.trim() || !price.trim() || !description.en.trim()}
                style={styles.submitButton}
                labelStyle={styles.submitButtonLabel}
                loading={loading}
              >
                {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Category Selection Dialog */}
      <Portal>
        <Dialog 
          visible={categoryDialogVisible} 
          onDismiss={() => setCategoryDialogVisible(false)}
          style={styles.categoryDialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Select Category</Dialog.Title>
          <Dialog.Content>
            <View style={styles.categoryList}>
              {categories.map((cat) => (
                <List.Item
                  key={cat.value}
                  title={cat.label}
                  left={(props) => <List.Icon {...props} icon="tag" />}
                  onPress={() => {
                    setCategory(cat.value);
                    setCategoryDialogVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.categoryListItem,
                    category === cat.value && styles.selectedCategoryItem
                  ]}
                  titleStyle={[
                    styles.categoryListItemTitle,
                    category === cat.value && styles.selectedCategoryItemTitle
                  ]}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCategoryDialogVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    justifyContent: 'space-between',
    width: '100%',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
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
  formCard: {
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  uploadButton: {
    marginTop: 8,
    borderColor: '#2E7D32',
  },
  uploadButtonLabel: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
    alignItems: 'center',
  },
  imagePreview: {
    width: width - 80,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryButtons: {
    marginBottom: 8,
  },
  categoryButton: {
    marginTop: 8,
    borderColor: '#2E7D32',
    justifyContent: 'space-between',
  },
  categoryButtonLabel: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  categoryDialog: {
    maxHeight: 400,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  categoryList: {
    maxHeight: 250,
  },
  categoryListItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedCategoryItem: {
    backgroundColor: '#e8f5e8',
  },
  categoryListItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  selectedCategoryItemTitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ProductFormScreen; 