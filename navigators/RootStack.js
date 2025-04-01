// import React from 'react';
// import { Colors } from './../components/styles';
// const { tertiary } = Colors;

// // React Navigation
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';

// // screens
// import Login from './../screens/Login';
// import Signup from './../screens/Signup';
// import Welcome from './../screens/profile';
// import Home from './../screens/Home';

// const Stack = createStackNavigator();

// const RootStack = () => {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         screenOptions={{
//           headerStyle: {
//             backgroundColor: 'transparent',
//           },
//           headerTintColor: tertiary,
//           headerTransparent: true,
//           headerTitle: '',
//           headerLeftContainerStyle: {
//             paddingLeft: 20,
//           },
//           headerShown: false,
//         }}
//         initialRouteName="Login"
//       >
//         <Stack.Screen name="Login" component={Login} />
//         <Stack.Screen name="Signup" component={Signup} />
//         <Stack.Screen 
//           name="Welcome" 
//           component={Welcome}
//           options={{ headerShown: false }}
//         />
//         <Stack.Screen name = "Home" component = {Home}/>
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// };

// export default RootStack;