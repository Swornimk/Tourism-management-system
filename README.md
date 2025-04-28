# Tourism App - Authentication System

This application uses a dual-approach authentication system to ensure maximum reliability and user experience. The primary authentication method supports both traditional email/password login and Google OAuth sign-in via Clerk.

## Authentication Features

### Email/Password Authentication
- Standard user registration and login with email and password
- Secure password storage using bcrypt hashing
- JWT-based authentication with access and refresh tokens

### Google Authentication (via Clerk)
- Primary Google sign-in using Clerk's OAuth integration
- Automatic fallback to direct Google authentication if Clerk encounters issues
- Seamless integration with the existing backend system

## Implementation Details

### Authentication Flow

1. **Email/Password Login**:
   - User enters credentials
   - Backend validates credentials and returns JWT tokens
   - JWT tokens are stored in AsyncStorage
   - User session is established

2. **Primary Google Authentication (Clerk)**:
   - User clicks Google sign-in button
   - Clerk handles OAuth flow with Google
   - On successful authentication, user data is sent to backend
   - Backend creates or updates user account
   - JWT tokens are generated and stored

3. **Fallback Google Authentication**:
   - Triggered when Clerk encounters an issue
   - Uses Expo's direct Google authentication
   - Fetches user profile from Google
   - Sends data to backend for authentication
   - JWT tokens are generated and stored

### Key Components

- **AuthContext**: Central context for managing authentication state
- **ClerkProvider**: Wraps the app to provide Clerk's authentication context
- **ClerkGoogleButton**: Handles Google sign-in using Clerk's OAuth
- **DirectGoogleAuth**: Provides fallback authentication when Clerk fails
- **Login.js**: Integrates both authentication methods with fallback logic

### Error Handling

The implementation includes robust error handling:
- Specific error messages for different failure scenarios
- Automatic fallback to direct Google auth when Clerk fails
- Detailed console logging for debugging
- User-friendly error messages

## Setup Instructions

1. Ensure you have Clerk publishable key in `.env` file:
   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

2. Configure Google OAuth credentials in Clerk dashboard:
   - Set up Google OAuth credentials
   - Configure redirect URIs
   - Enable Google authentication

3. Run the application:
   ```
   npm start
   ```

## Technologies Used

- React Native / Expo
- Clerk Authentication
- JWT
- bcrypt
- AsyncStorage for token management

## Google Authentication Setup

To enable Google Sign-In functionality, follow these steps:

1. **Create OAuth 2.0 credentials in Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Set up the OAuth consent screen if prompted
   - Select "Web application" for Web client, "Android" for Android client, and "iOS" for iOS client
   - Add authorized JavaScript origins and redirect URIs for Web client
   - For Android/iOS, follow the platform-specific instructions

2. **Configure expo-auth-session**:
   - For Expo development, add your URIs to the redirect list in your Google Cloud Console project
   - Add the following URIs:
     - `https://auth.expo.io/@your-username/your-app-slug`
     - `com.your.app://*` (for Standalone/bare apps)

3. **Update the client IDs in your app**:
   - Open `contexts/AuthContext.js`
   - Replace the placeholder client IDs with your actual OAuth client IDs:
   ```javascript
   const [request, response, promptAsync] = Google.useAuthRequest({
     androidClientId: "YOUR_ANDROID_CLIENT_ID",
     iosClientId: "YOUR_IOS_CLIENT_ID",
     webClientId: "YOUR_WEB_CLIENT_ID", 
     expoClientId: "YOUR_EXPO_CLIENT_ID"
   });
   ```

4. **Set up backend route**:
   - The app uses the `/auth/google` endpoint to authenticate users with Google
   - Make sure your backend handles this route correctly

## Installation

1. Clone the repository:
```
git clone https://github.com/your-username/tourism-app.git
cd tourism-app
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm start
```

## Features

- User authentication (Email/Password and Google Sign-In)
- Trip browsing and booking
- Real-time notifications
- Admin dashboard for trip management
- Payment integration

## Tech Stack

- React Native / Expo
- Express.js backend
- MongoDB
- Socket.io for real-time communication
- Firebase Cloud Messaging for notifications 