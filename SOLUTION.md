# Solution for Real-Time Trip Updates

Based on reviewing the code, here are the specific changes needed to fix the real-time update issues:

## 1. Remove Redundant Focus-Based Refresh in Profile Component

In `screens/Home.js`, remove the following useEffect that is causing unnecessary API calls:

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

## 2. Add Global Trip Status Event Listeners

In the socket setup in the Profile component, add explicit listeners for global trip status events:

```javascript
// Add global listeners for trip approval and rejection events
socketService.socket?.on('tripApproved', (data) => {
  console.log('Global trip approval received:', data);
  setRefreshTrigger(Date.now());
  fetchUserTrips();
});

socketService.socket?.on('tripRejected', (data) => {
  console.log('Global trip rejection received:', data);
  setRefreshTrigger(Date.now());
  fetchUserTrips();
});
```

Don't forget to clean up these listeners when unmounting:

```javascript
// Remove global event listeners
socketService.socket?.off('tripApproved');
socketService.socket?.off('tripRejected');
```

## 3. Join the Global Trip Approvals Room in Socket Setup

Make sure the Profile component joins the global trip approvals room:

```javascript
// Join the global trip approvals room to get all approval updates
await socketService.joinTripRoom('trip:approvals');
```

And leave it when unmounting:

```javascript
// Leave the global approvals room
await socketService.leaveTripRoom('trip:approvals');
```

## 4. Add Trip Rejected Event in Server Controller

The server is already emitting `tripApproved` events, but we should add `tripRejected` events too. In `server/controller/tripController.js`, add:

```javascript
// Also emit a general trip approval event for all clients listening
if (status === 'approved') {
  console.log(`Emitting global tripApproved event for trip ${id}`);
  io.to('trip:approvals').emit('tripApproved', {
    tripId: id,
    title: updatedTrip.title,
    location: updatedTrip.location,
    price: updatedTrip.price,
    tripImageUrl: updatedTrip.tripImageUrl,
    updatedAt: updatedTrip.updatedAt
  });
} else if (status === 'rejected') {
  console.log(`Emitting global tripRejected event for trip ${id}`);
  io.to('trip:approvals').emit('tripRejected', {
    tripId: id,
    title: updatedTrip.title,
    updatedAt: updatedTrip.updatedAt
  });
}
```

## 5. Listen for Trip Rejected Events in Socket Service

In `config/socketService.js`, add a listener for trip rejection events similar to the approval listener:

```javascript
// Also listen for tripRejected events
socket.on('tripRejected', (tripData) => {
  console.log('Trip rejected notification received:', tripData);
  
  // Notify any registered handlers
  notificationHandlers.forEach(handler => {
    try {
      handler({
        title: 'Trip Rejected',
        body: `Trip "${tripData.title}" has been rejected`,
        data: {
          type: 'trip_rejection',
          tripId: tripData.tripId,
          status: 'rejected'
        },
        timestamp: tripData.updatedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in trip rejection notification handler:', error);
    }
  });
});
```

## 6. Ensure TripContext Refreshes When Socket Events Are Received

Consider enhancing the TripContext to listen directly to socket events:

```javascript
// Add in TripContext.js, inside TripProvider
useEffect(() => {
  const setupSocketListeners = async () => {
    // Initialize socket if needed
    const socket = await socketService.getSocket();
    
    // Join the global trip approvals room
    await socketService.joinTripRoom('trip:approvals');
    
    // Listen for trip approved/rejected events
    socket?.on('tripApproved', () => {
      console.log('TripContext: Trip approval event received');
      fetchAllTrips();
      fetchUserTrips();
    });
    
    socket?.on('tripRejected', () => {
      console.log('TripContext: Trip rejection event received');
      fetchAllTrips();
      fetchUserTrips();
    });
    
    // Listen for general trip status updates
    socket?.on('tripStatusUpdated', () => {
      console.log('TripContext: Trip status update received');
      fetchAllTrips();
      fetchUserTrips();
    });
  };
  
  setupSocketListeners();
  
  // Cleanup function
  return () => {
    const cleanup = async () => {
      const socket = await socketService.getSocket();
      await socketService.leaveTripRoom('trip:approvals');
      socket?.off('tripApproved');
      socket?.off('tripRejected');
      socket?.off('tripStatusUpdated');
    };
    
    cleanup();
  };
}, [fetchAllTrips, fetchUserTrips]);
```

## Summary of Changes

These changes ensure:

1. Redundant refresh operations are eliminated
2. All components listen to the appropriate socket events
3. Proper event propagation for both trip approvals and rejections
4. Both admins and users receive the appropriate notifications
5. The UI is updated in real-time without unnecessary API calls

The key improvement is proper subscription to global approval/rejection events and ensuring the Profile component properly processes both explicit trip status updates for its own trips and global events that might affect it. 