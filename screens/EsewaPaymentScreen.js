import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, Alert, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paymentService } from '../config/services';

const EsewaPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [formHtml, setFormHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCredentials, setShowCredentials] = useState(true);
  const { bookingId, paymentData } = route.params || {};

  // Create HTML form for eSewa API v1
  const createFormHtml = () => {
    try {
      if (!paymentData) {
        throw new Error('Payment data is missing');
      }
      
      // Updated test environment URL for eSewa API v1
      const formActionUrl = 'https://rc.esewa.com.np/epay/main';
      
      // Create form HTML with v1 API required fields
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <title>eSewa Payment</title>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f8f9fa;
                font-family: Arial, sans-serif;
              }
              .loader {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .container {
                text-align: center;
                padding: 20px;
              }
              h2 {
                color: #2c3e50;
              }
              p {
                color: #7f8c8d;
              }
              .error {
                color: #e74c3c;
                margin-top: 20px;
                padding: 10px;
                background-color: #fadbd8;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Connecting to eSewa</h2>
              <div class="loader"></div>
              <p>Please wait, you will be redirected to eSewa payment page...</p>
              <div id="error-container"></div>
            </div>
            
            <form id="esewaForm" action="${formActionUrl}" method="POST" target="_self">
              <input type="hidden" name="amt" value="${paymentData.amt}" />
              <input type="hidden" name="txAmt" value="${paymentData.txAmt}" />
              <input type="hidden" name="psc" value="${paymentData.psc}" />
              <input type="hidden" name="pdc" value="${paymentData.pdc}" />
              <input type="hidden" name="tAmt" value="${paymentData.tAmt}" />
              <input type="hidden" name="pid" value="${paymentData.pid}" />
              <input type="hidden" name="scd" value="${paymentData.scd}" />
              <input type="hidden" name="su" value="${paymentData.success_url}" />
              <input type="hidden" name="fu" value="${paymentData.failure_url}" />
              <input type="submit" id="submitButton" value="Submit" style="display: none;" />
            </form>
            
            <script>
              // Auto-submit the form after a short delay
              console.log("Submitting payment form to ${formActionUrl}");
              setTimeout(function() {
                document.getElementById('submitButton').click();
              }, 1000);
            </script>
          </body>
        </html>
      `;
      
      return html;
    } catch (err) {
      console.error('Error creating form HTML:', err);
      setError(err.message || 'Failed to create payment form');
      return null;
    }
  };
  
  // Log payment data for debugging
  useEffect(() => {
    console.log('Payment data received:', paymentData);
    
    // Create and set the form HTML
    setFormHtml(createFormHtml());
    
    // Debug available URLs
    const debugUrls = async () => {
      try {
        // Check if the test environment is accessible
        console.log('Checking if eSewa test environment is accessible...');
        fetch('https://rc.esewa.com.np')
          .then(response => {
            console.log('eSewa server response:', response.status);
          })
          .catch(error => {
            console.error('Error reaching eSewa server:', error);
          });
      } catch (error) {
        console.error('Debug error:', error);
      }
    };
    
    debugUrls();
    
    // Handle back button press
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Cancel Payment',
        'Are you sure you want to cancel this payment?',
        [
          { text: 'No', style: 'cancel', onPress: () => {} },
          { 
            text: 'Yes', 
            style: 'destructive', 
            onPress: () => {
              navigation.goBack();
              return true;
            }
          }
        ]
      );
      return true; // Prevent default behavior
    });
    
    return () => backHandler.remove();
  }, []);
  
  const handleNavigationStateChange = (navState) => {
    console.log('Navigation state changed:', navState.url);
    
    // Hide loading indicator when page is loaded
    if (navState.loading === false) {
      setLoading(false);
    }
    
    // Check for success URL pattern - using eSewa's success URL
    if (navState.url.includes('esewa.com.np/#/success')) {
      console.log('Payment successful, redirecting to success page');
      
      try {
        // Extract query parameters from the URL
        // Since the URL format is using hash (#), we need to parse it manually
        const urlParts = navState.url.split('?');
        let params = {};
        
        if (urlParts.length > 1) {
          // Get the query string part
          const queryString = urlParts[1];
          // Split the query string by &
          const paramPairs = queryString.split('&');
          
          // Parse each parameter
          paramPairs.forEach(pair => {
            const [key, value] = pair.split('=');
            params[key] = value;
          });
        }
        
        // Get the actual values from the URL
        const refId = params.refId || '';
        const oid = params.oid || paymentData.pid;
        const amount = params.amt || paymentData.amt;
        
        console.log('Payment success params:', { refId, oid, amount });
        
        // Set a flag to prevent duplicate navigation
        navigation.setParams({ paymentProcessed: true });
        
        // Navigate to success screen with correct parameters
        navigation.navigate('PaymentSuccess', { 
          bookingId, 
          pid: oid,  // Use pid which is expected by the backend verification
          refId,
          amount
        });
      } catch (error) {
        console.error('Error parsing success URL:', error);
        // Fallback with basic information
        navigation.navigate('PaymentSuccess', { 
          bookingId, 
          pid: paymentData.pid,
          refId: 'parsing-error'
        });
      }
      
      return;
    }
    
    // Check if payment has been processed already to avoid redundant redirects
    const paymentProcessed = route.params?.paymentProcessed;
    
    // Check for failure URL pattern - using eSewa's failure URL
    if (!paymentProcessed && (
        navState.url.includes('esewa.com.np/#/failure') || 
        navState.url.includes('/payment-cancelled') ||
        navState.url.includes('/login?redirectUrl='))) {
      
      console.log('Payment failed or cancelled, redirecting to failure page');
      
      // Set a flag to prevent duplicate navigation
      navigation.setParams({ paymentProcessed: true });
      
      // Navigate to failure screen (don't use replace as it breaks the navigation stack)
      navigation.navigate('PaymentFailure', { 
        bookingId, 
        message: 'Payment was cancelled or failed' 
      });
      
      return;
    }

    // Check if redirected to eSewa home page after payment
    if (!paymentProcessed && navState.url.includes('esewa.com.np/#/home')) {
      console.log('Redirected to eSewa home page, likely after payment');
      
      // Set a flag to prevent duplicate navigation
      navigation.setParams({ paymentProcessed: true });
      
      // Since we can't get parameters from this URL, use the ones we already have
      navigation.navigate('PaymentSuccess', { 
        bookingId, 
        pid: paymentData.pid
      });
      
      return;
    }
  };
  
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.backText} onPress={() => navigation.goBack()}>
          Go Back
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Connecting to payment gateway...</Text>
        </View>
      )}
      
      {formHtml ? (
        <>
      <WebView
        source={{ html: formHtml }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        originWhitelist={['*']}
        incognito={true}
        applicationNameForUserAgent="Tourism App / React Native WebView"
        cacheEnabled={false}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess={true}
        javaScriptCanOpenWindowsAutomatically={true}
        onShouldStartLoadWithRequest={(request) => {
          // Log all requests for debugging
          console.log('WebView requested URL:', request.url);
          
          // Always allow navigations 
          return true;
        }}
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          const errorMessage = `WebView error: ${nativeEvent.description || 'Unknown error'}\nCode: ${nativeEvent.code}\nURL: ${nativeEvent.url}`;
          console.error(errorMessage);
          setError(errorMessage);
        }}
        renderError={(errorDomain, errorCode, errorDesc) => {
          const errorMessage = `Error rendering WebView: ${errorDesc} (${errorCode})`;
          console.error(errorMessage);
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Text style={styles.errorText}>Please try again or use a different payment method.</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
          
          {showCredentials && (
            <View style={styles.credentialsContainer}>
              <View style={styles.credentialsBox}>
                <Text style={styles.credentialsTitle}>Test Credentials:</Text>
                <Text style={styles.credentialsText}>
                  Phone: 9806800001{'\n'}
                  Password: Nepal@123{'\n'}
                  MPIN: 1122
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowCredentials(false)}
                >
                  <Text style={styles.closeButtonText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Could not load payment page</Text>
          <Text style={styles.backText} onPress={() => navigation.goBack()}>
            Go Back
        </Text>
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#3498db',
    textDecorationLine: 'underline',
    padding: 10,
  },
  credentialsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  credentialsBox: {
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  credentialsText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  closeButton: {
    backgroundColor: '#2980b9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EsewaPaymentScreen;