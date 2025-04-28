# Required Changes to Fix Real-Time Trip Updates

## 1. Remove Redundant Focus-Based Refresh in Profile (Home.js)

Delete the following code block (approx. line 586-603):

```javascript
// Add effect to refresh trips when screen is focused
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

## 2. Examine and Fix the TripContext

Check the TripContext implementation to ensure that both admins and regular users receive notifications when trip statuses change. The context should:

1. Properly subscribe to socket events for trip status changes
2. Update the trip lists when socket notifications are received
3. Make sure notifications are sent to the correct users

## 3. Review Trip Approval Controller (server-side)

In the server's tripController.js, ensure that when trip approval/rejection happens:

1. Notifications are sent to the trip creator
2. Socket events are properly emitted
3. The tripApproved and tripRejected events contain all necessary data

## 4. Enhance Socket Service

Make sure the socket service:
- Properly connects and reconnects when needed
- Has methods to join and leave rooms
- Handles various trip status update events
- Broadcasts changes to all interested components

## 5. Testing

After implementing these changes:
1. Create a trip as a regular user
2. Log in as admin and approve/reject it
3. Verify the user's Profile page updates in real-time
4. Check that notifications appear for both admin and user appropriately 