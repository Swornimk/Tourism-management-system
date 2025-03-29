import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native'; // Added missing import
import { Destination } from "../config/data";
import {
  Avatar,
  WelcomeImage,
  PageTitle,
  SubTitle,
  StyledFormArea,
  StyledButton,
  InnerContainer,
  WelcomeContainer,
  ButtonText,
  Line,
  Colors,
} from '../components/styles';

// Home Screen Component
const Home = ({ navigation }) => {
  return (
    <>
      <StatusBar style="light" />
      <InnerContainer>
        <WelcomeImage resizeMode="cover" source={require('./../assets/img/Img2.jpg')} />

        <WelcomeContainer>
          <PageTitle welcome={true}>Welcome! Traveller</PageTitle>
          <SubTitle welcome={true}>Swornim KC</SubTitle>
          <SubTitle welcome={true}>swornimkc@gmail.com</SubTitle>

          <StyledFormArea>
            <Avatar resizeMode="cover" source={require('./../assets/img/logo.jpg')} />
            <Line />
            <StyledButton onPress={() => { navigation.navigate('Welcome') }}>
              <ButtonText>Profile</ButtonText>
            </StyledButton>
          </StyledFormArea>
        </WelcomeContainer>
      </InnerContainer>
    </>
  );
};

// Profile Screen Component (Add your profile screen content here)
const Profile = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <StatusBar style="light" />
          <InnerContainer>
            <WelcomeImage resizeMode="cover" source={require('./../assets/img/Img2.jpg')} />
    
            <WelcomeContainer>
              <PageTitle welcome={true}>Welcome! Traveller</PageTitle>
              <SubTitle welcome={true}>Swornim KC</SubTitle>
              <SubTitle welcome={true}>swornimkc@gmail.com</SubTitle>
    
              <StyledFormArea>
                <Avatar resizeMode="cover" source={require('./../assets/img/logo.jpg')} />
    
                <Line />
                <StyledButton onPress={() => {navigation.navigate('Login');
    
                }}>
                  <ButtonText>Logout</ButtonText>
                </StyledButton>
              </StyledFormArea>
            </WelcomeContainer>
          </InnerContainer>
  </View>
);
const Location = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <StatusBar style="light" />
          <InnerContainer>
            <WelcomeImage resizeMode="cover" source={require('./../assets/img/Img2.jpg')} />
    
            <WelcomeContainer>
              <PageTitle welcome={true}>Welcome! Traveller</PageTitle>
              <SubTitle welcome={true}>Swornim KC</SubTitle>
              <SubTitle welcome={true}>swornimkc@gmail.com</SubTitle>
    
              <StyledFormArea>
                <Avatar resizeMode="cover" source={require('./../assets/img/logo.jpg')} />
    
                <Line />
                <StyledButton onPress={() => {navigation.navigate('Login');
    
                }}>
                  <ButtonText>Logout</ButtonText>
                </StyledButton>
              </StyledFormArea>
            </WelcomeContainer>
          </InnerContainer>
  </View>
);
const Setting = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <StatusBar style="light" />
          <InnerContainer>
            <WelcomeImage resizeMode="cover" source={require('./../assets/img/Img2.jpg')} />
    
            <WelcomeContainer>
              <PageTitle welcome={true}>Welcome! Traveller</PageTitle>
              <SubTitle welcome={true}>Swornim KC</SubTitle>
              <SubTitle welcome={true}>swornimkc@gmail.com</SubTitle>
    
              <StyledFormArea>
                <Avatar resizeMode="cover" source={require('./../assets/img/logo.jpg')} />
    
                <Line />
                <StyledButton onPress={() => {navigation.navigate('Login');
    
                }}>
                  <ButtonText>Logout</ButtonText>
                </StyledButton>
              </StyledFormArea>
            </WelcomeContainer>
          </InnerContainer>
  </View>
);

// Create Tab Navigator
const Tab = createBottomTabNavigator();

// Main App Component with Navigation
const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen 
          name="Home" 
          component={Home} 
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={Profile} 
          options={{ tabBarLabel: 'Profile' }}
        />
                <Tab.Screen 
          name="Location" 
          component={Location} 
          options={{ tabBarLabel: 'Location' }}
        />
                <Tab.Screen 
          name="Setting" 
          component={Setting} 
          options={{ tabBarLabel: 'Setting' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App; // Changed export to App instead of Home