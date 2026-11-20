import homeService from '../services/home.service.js';

class HomeController {
  async getHomeFeed(req, res) {
    try {
      const userId = req.user?.id || null;
      const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit) || 10, 1), 50) : 10;
      const feed = await homeService.getHomeFeed(userId, { limit });
      return res.status(200).json({ status: 'success', data: feed });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
  async getFeaturedProducts(req, res) {
    try {
      const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit) || 10, 1), 50) : 10;
      const products = await homeService.getFeaturedMarketplace(limit);
      return res.status(200).json({ status: 'success', data: { products } });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
  async getFeaturedRentals(req, res) {
    try {
      const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit) || 10, 1), 50) : 10;
      const rentals = await homeService.getFeaturedRentals(limit);
      return res.status(200).json({ status: 'success', data: { rentals } });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
}
