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
}
