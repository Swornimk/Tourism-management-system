import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useEsewaPayment from '../components/EsewaPayment';

const PaymentScreen = () => {
    const { initiatePayment } = useEsewaPayment();

    const handlePayment = () => {
        // Example payment details
        const amount = 100; // Amount in NPR
        const productName = "Test Product";
        const productId = "PROD-" + Date.now();

        initiatePayment(amount, productName, productId);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Payment Details</Text>
            <Text style={styles.amount}>Amount: NPR 100</Text>
            <TouchableOpacity 
                style={styles.payButton}
                onPress={handlePayment}
            >
                <Text style={styles.payButtonText}>Pay with eSewa</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    amount: {
        fontSize: 18,
        marginBottom: 30,
    },
    payButton: {
        backgroundColor: '#60BB46', // eSewa's green color
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
    },
    payButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default PaymentScreen; 