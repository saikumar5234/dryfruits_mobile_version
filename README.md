# Mobile Dry Fruits App

A beautiful React Native mobile application for a dry fruits store with authentication functionality.

## Features

- 🔐 **Authentication System**: Login and Signup with email/password
- 🎨 **Beautiful UI**: Modern design with gradients and animations
- 📱 **Mobile Optimized**: Responsive design for all screen sizes
- 🔒 **Secure**: Firebase Authentication integration
- 🚀 **Fast**: Optimized performance with React Native

## Screenshots

The app includes:
- **Login Screen**: Beautiful gradient design with form validation
- **Signup Screen**: User registration with password confirmation
- **Home Screen**: Welcome screen with app features overview

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase account

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile-dryfruits
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Install Expo CLI globally** (if not already installed)
   ```bash
   npm install -g @expo/cli
   ```

## Firebase Setup

1. **Create a Firebase project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one

2. **Enable Authentication**
   - In Firebase Console, go to Authentication
   - Click "Get started"
   - Enable "Email/Password" authentication method

3. **Get Firebase configuration**
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click "Add app" and select "Web"
   - Copy the configuration object

4. **Update Firebase configuration**
   - Open `src/config/firebase.js`
   - Replace the placeholder values with your actual Firebase configuration:

   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

## Running the App

1. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

2. **Run on device/simulator**
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## Project Structure

```
mobile-dryfruits/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase configuration
│   ├── contexts/
│   │   └── AuthContext.js       # Authentication context
│   └── screens/
│       ├── LoginScreen.js       # Login screen
│       ├── SignupScreen.js      # Signup screen
│       └── HomeScreen.js        # Home screen
├── App.js                       # Main app component
├── package.json                 # Dependencies
└── README.md                    # This file
```

## Dependencies

- **React Native**: Core framework
- **Expo**: Development platform
- **React Navigation**: Navigation between screens
- **Firebase**: Authentication and database
- **Expo Linear Gradient**: Beautiful gradient backgrounds
- **React Native Vector Icons**: Icons

## Authentication Flow

1. **App Launch**: Checks if user is authenticated
2. **Not Authenticated**: Shows Login/Signup screens
3. **Authenticated**: Shows Home screen
4. **Logout**: Returns to Login screen

## Features in Detail

### Login Screen
- Email and password input fields
- Password visibility toggle
- Form validation
- Loading states
- Error handling
- Google sign-in button (placeholder)
- Link to signup screen

### Signup Screen
- Email, password, and confirm password fields
- Password validation
- Form validation
- Loading states
- Error handling
- Google sign-up button (placeholder)
- Link to login screen

### Home Screen
- Welcome message with user email
- App features overview
- Logout functionality
- Beautiful gradient header

## Customization

### Colors
The app uses a green color scheme. You can customize colors in the style files:
- Primary: `#2E7D32`
- Secondary: `#4CAF50`
- Accent: `#66BB6A`

### Styling
All styles are defined using React Native StyleSheet. You can modify:
- Colors and gradients
- Typography
- Spacing and layout
- Animations and transitions

## Troubleshooting

### Common Issues

1. **Firebase configuration error**
   - Ensure all Firebase config values are correct
   - Check if Authentication is enabled in Firebase Console

2. **Navigation issues**
   - Make sure all dependencies are installed
   - Check if screens are properly exported

3. **Build errors**
   - Clear cache: `expo start -c`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

### Getting Help

If you encounter any issues:
1. Check the console for error messages
2. Ensure all dependencies are properly installed
3. Verify Firebase configuration
4. Check Expo documentation for troubleshooting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the Firebase documentation
- Refer to React Native and Expo documentation 