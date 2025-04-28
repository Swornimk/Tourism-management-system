# Clerk Authentication Setup for Tourism App

This guide explains how to set up and use Clerk for Google authentication in the Tourism app.

## Prerequisites

1. A Clerk account (sign up at [clerk.com](https://clerk.com))
2. Google OAuth credentials from the [Google Cloud Console](https://console.cloud.google.com)

## Configuration Steps

### 1. Create a Clerk Application

1. Go to the [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Configure the following:
   - Enable Google OAuth
   - Set up your redirect URIs (for both development and production)
   - Configure your application's domain settings

### 2. Set Environment Variables

Update the `.env` file at the root of your project with your Clerk publishable key:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

Replace `pk_test_YOUR_PUBLISHABLE_KEY_HERE` with your actual publishable key from the Clerk dashboard.

### 3. Configure Google OAuth in Clerk

1. In your Clerk Dashboard, go to "Social Connections" 
2. Configure Google OAuth with your Google Client ID and Secret
3. Make sure the redirect URIs match your application's configuration

## Implementation Details

The implementation maintains compatibility with the existing authentication system:

1. **ClerkProvider.js**: Wraps the application with Clerk's authentication context
2. **ClerkGoogleButton.js**: Handles Google sign-in using Clerk's OAuth flow
3. **DirectGoogleAuth.js**: Provides a fallback authentication method when Clerk encounters issues
4. **Login.js**: Updated to use both authentication methods with automatic fallback logic

## How It Works

### Primary Authentication Flow (Clerk)

When a user clicks the Google Sign-In button:

1. Clerk handles the OAuth flow with Google
2. After successful authentication, Clerk returns user data
3. The user data is sent to the Tourism backend API
4. The Tourism backend creates or updates the user's account
5. JWT tokens are generated and stored in AsyncStorage
6. The existing session management continues to work as before

### Fallback Authentication Flow

If the primary authentication flow fails (due to server errors, Clerk limitations, etc.):

1. An alternative Google sign-in button is displayed
2. This button uses Expo's direct Google authentication without Clerk
3. Once the user authenticates with Google, the app receives the access token
4. The app uses the token to fetch user data directly from Google's API
5. This data is sent to the Tourism backend and processed the same way

## Improved Error Handling

The implementation includes detailed error handling and logging:

1. Comprehensive error messages for different failure scenarios
2. Automatic detection of server errors (HTTP 500) with helpful user feedback
3. Detailed console logging to assist with debugging
4. Automatic retry with the fallback method when appropriate

## Handling Existing Users

The implementation now handles both new and existing users:

- **New Users**: When a new user signs in with Google, we collect their profile information (email, name, profile picture) and send it to our backend to create a new account.

- **Existing Users**: If a user already exists in our system (identified by their Google account email), our backend will simply generate a new auth token and log them in.

- **Single Session Mode**: Clerk operates in single session mode, which means users can only be signed into one account at a time. The implementation handles this by:
  1. Signing out the current Clerk session before starting a new OAuth flow
  2. Providing a fallback mechanism to use the current user's data if available
  3. Showing appropriate error messages if these methods fail
  4. Automatically offering the alternate authentication method

## Additional User Data

The implementation tries to gather additional user data from Google profiles when available:

- Full name (first name + last name)
- Profile picture URL
- Email address
- Birth date (if available)

This data is passed to the backend for user creation or profile updating.

## Testing

Test the Google Sign-In flow on both:
- Web (using Expo Web)
- Native (Android/iOS)

When testing, try both new user scenarios and existing user scenarios. Also test the fallback authentication flow by:

1. First attempting to sign in with the primary Clerk method
2. If it fails, use the alternative method that appears
3. Verify that both methods eventually lead to successful authentication

## Troubleshooting

If you encounter issues:

1. **Single Session Error**: If you see "You're currently in single session mode" error, the app will attempt to use your current session. If that fails, try the alternate authentication method that appears.

2. **Server Errors (500)**: If you see server errors:
   - Check your backend API implementation
   - Verify that all required fields are being sent correctly
   - Try the alternate authentication method
   - Check server logs for more details

3. **Navigation Issues**: If the app doesn't navigate to the proper screen after authentication, check your navigation setup and the response from your backend.

4. **General Debug Steps**:
   - Check browser console for errors
   - Verify your Clerk publishable key is correct
   - Ensure Google OAuth is properly configured in Clerk dashboard
   - Confirm the backend endpoint at `https://tourism-tfph.onrender.com/auth/google` is accepting the data format 