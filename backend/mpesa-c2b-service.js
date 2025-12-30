const axios = require('axios');

class MpesaC2BService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    this.baseURL = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` }
        }
      );
      return response.data.access_token;
    } catch (error) {
      console.error('❌ Access token error:', error.response?.data || error.message);
      throw new Error('Failed to get M-PESA access token');
    }
  }

  async registerC2BUrls(validationUrl, confirmationUrl) {
    try {
      const token = await this.getAccessToken();
      
      console.log('🔧 Registering C2B URLs...');
      console.log('Validation URL:', validationUrl);
      console.log('Confirmation URL:', confirmationUrl);
      console.log('Shortcode:', this.shortcode);
      
      const response = await axios.post(
        `${this.baseURL}/mpesa/c2b/v2/registerurl`,
        {
          ShortCode: this.shortcode,
          ResponseType: 'Completed',
          ConfirmationURL: confirmationUrl,
          ValidationURL: validationUrl
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ C2B URLs registered:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ C2B registration error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new MpesaC2BService();