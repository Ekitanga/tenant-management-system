const axios = require('axios');

class MPesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    
    // API URLs
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
  }

  // Generate OAuth token
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      console.log('✅ M-PESA token generated');
      return response.data.access_token;
    } catch (error) {
      console.error('❌ Token generation error:', error.response?.data || error.message);
      throw new Error('Failed to generate M-PESA access token');
    }
  }

  // Generate password for STK Push
  generatePassword() {
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  // Get timestamp in format: YYYYMMDDHHmmss
  getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Format phone number to 254XXXXXXXXX
  formatPhoneNumber(phone) {
    // Remove spaces, dashes, plus signs
    let cleaned = phone.replace(/[\s\-\+]/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If starts with 254, keep as is
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // If starts with +254, remove +
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // Otherwise, assume it's missing 254
    return '254' + cleaned;
  }

  // Initiate STK Push
  async stkPush({ phoneNumber, amount, accountReference, transactionDesc }) {
    try {
      const token = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      console.log('📱 Initiating STK Push:', {
        phone: formattedPhone,
        amount,
        reference: accountReference
      });

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(amount), // Must be integer
          PartyA: formattedPhone, // Customer phone
          PartyB: this.shortcode, // Your paybill
          PhoneNumber: formattedPhone,
          CallBackURL: this.callbackUrl,
          AccountReference: accountReference || 'Rent Payment',
          TransactionDesc: transactionDesc || 'Rent Payment'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ STK Push initiated:', response.data);

      return {
        success: true,
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      };

    } catch (error) {
      console.error('❌ STK Push error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || 'Failed to initiate payment',
        details: error.response?.data
      };
    }
  }

  // Query STK Push transaction status
  async queryTransaction(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Query error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new MPesaService();