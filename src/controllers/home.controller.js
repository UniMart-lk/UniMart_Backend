import homeService from '../services/home.service.js';

class HomeController {
  async getHomeFeed(req, res) {
    try {
      const userId = req.user?.id || null;
      const feed = await homeService.getHomeFeed(userId);
      return res.status(200).json({ status: 'success', data: feed });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
}
