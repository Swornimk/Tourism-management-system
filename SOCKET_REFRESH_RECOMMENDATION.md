# Socket-Based Refresh Recommendations

## Current Situation

Currently, the app uses both real-time socket updates and focus-based refresh mechanisms:

1. **Profile Screen** - Uses socket notifications for real-time updates but also refreshes trips when the screen is focused.
2. **FeaturedDestinations** - Already uses socket notifications correctly.
3. **RecommendedDestinations** - Already uses socket notifications correctly.

## Recommended Changes

To make the app more efficient and reduce unnecessary API calls, we should:

1. **Remove focus-based refresh from Profile component**:
   - The `useEffect` at approximately line 571 in `screens/Home.js` that adds a focus listener should be removed.
   - The app should rely solely on socket notifications for trip updates, which are already implemented.

```javascript
// This useEffect should be removed
useEffect(() => {
  let isMounted = true;
  let lastFetchTime = 0;
  const DEBOUNCE_TIME = 2000; // 2 seconds debounce
  
  const unsubscribe = navigation.addListener('focus', () => {
    const now = Date.now();
    // Only fetch if we haven't fetched recently
    if (now - lastFetchTime > DEBOUNCE_TIME && isMounted) {
      console.log('Profile screen focused, refreshing trips...');
      lastFetchTime = now;
      fetchUserTrips();
    }
  });
  
  return () => {
    isMounted = false;
    unsubscribe();
  };
}, [navigation, fetchUserTrips]);
```

2. **Ensure consistency across components**:
   - FeaturedDestinations and RecommendedDestinations already use the correct approach with socket listeners.
   - The socket listeners in these components refresh data when real changes occur rather than on timer or focus events.

## Benefits of Socket-Based Updates

1. **Efficiency** - Data is only refreshed when it actually changes, reducing unnecessary API calls.
2. **Real-Time Experience** - Users see updates immediately when they occur.
3. **Reduced Server Load** - Fewer unnecessary API requests to the server.
4. **Battery Saving** - Fewer network requests means less battery consumption on mobile devices.

## Implementation Details

The socket listener pattern as seen in the Profile component is ideal:

```javascript
// Set up WebSocket listeners for real-time trip updates
useEffect(() => {
  // Initialize socket and subscribe to user trips status changes
  const setupTripStatusListeners = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      
      // Join a user-specific room to receive updates about their trips
      await socketService.joinTripRoom(`user:${userId}`);
      
      // For each trip, set up a listener
      if (userTrips && userTrips.length > 0) {
        userTrips.forEach(trip => {
          socketService.listenToTripStatusUpdates(trip._id, (updatedTrip) => {
            console.log('Real-time trip update received in Profile:', updatedTrip);
            // Trigger a refresh
            setRefreshTrigger(Date.now());
            // Also fetch trips to ensure data is up to date
            fetchUserTrips();
          });
        });
      }
    } catch (error) {
      console.error('Error setting up trip status listeners:', error);
    }
  };
  
  setupTripStatusListeners();
  
  // Clean up listeners when component unmounts
  return () => {
    // Cleanup logic here
  };
}, [userTrips, fetchUserTrips]);
```

This pattern ensures that:
1. The component joins the appropriate rooms for receiving updates
2. It sets up listeners for each trip
3. When updates are received, it refreshes the data
4. It properly cleans up listeners when unmounting 