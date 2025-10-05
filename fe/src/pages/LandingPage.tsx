import React from 'react';
import Header from '../components/Header';
import MockDashboard from '../components/MockDashboard';
import FeatureCard from '../components/FeatureCard';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral via-white to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column - Content (56%) */}
            <div className="lg:col-span-7 space-y-6 md:space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-primary">100% Free • No Credit Card Required</span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-dark leading-tight">
                Master Crypto Trading
                <span className="block text-primary mt-2">Risk-Free</span>
              </h1>

              {/* Description */}
              <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-xl">
                Practice trading with real-time market data and $100,000 virtual balance. 
                Get AI-powered coaching, backtest strategies, and learn without losing real money.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="w-full sm:w-[180px] h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-soft-lg transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]">
                  Start Trading Free
                </button>
                <button className="w-full sm:w-[180px] h-12 bg-white border-2 border-accent text-accent hover:bg-accent hover:text-white font-semibold rounded-soft-lg transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]">
                  Watch Demo
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-white"></div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-text-dark">12,000+</span> traders
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">4.8/5 rating</span>
                </div>
              </div>
            </div>

            {/* Right Column - Mock Dashboard (40%) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <MockDashboard />
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
              Everything You Need to Learn
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional trading tools and AI guidance for beginners
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <FeatureCard
              icon="🤖"
              title="AI Trading Coach"
              description="Get personalized feedback on your trades and portfolio. Our AI analyzes your decisions and suggests improvements in real-time."
            />
            <FeatureCard
              icon="📊"
              title="Real-Time Data"
              description="Practice with live market data from Binance. Experience realistic price movements and market conditions without any risk."
            />
            <FeatureCard
              icon="🎯"
              title="Backtest Strategies"
              description="Test your trading strategies against historical data. Learn what works before risking real money in the market."
            />
            <FeatureCard
              icon="📚"
              title="Interactive Glossary"
              description="Hover over any trading term to get instant AI-powered explanations. Learn crypto terminology as you trade."
            />
            <FeatureCard
              icon="🔔"
              title="Smart Alerts"
              description="Set price alerts and get notified when markets move. Never miss an important trading opportunity again."
            />
            <FeatureCard
              icon="📰"
              title="Crypto News Feed"
              description="Stay informed with curated crypto news and market sentiment analysis. Make decisions based on the latest information."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24 bg-neutral">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
              Start Trading in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="glass-card rounded-soft-lg p-8 text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold text-text-dark mb-3">Sign Up Free</h3>
                <p className="text-gray-600">
                  Create your account in seconds. No credit card or verification required to start.
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-primary text-3xl">
                →
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="glass-card rounded-soft-lg p-8 text-center">
                <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold text-text-dark mb-3">Get $100K Virtual</h3>
                <p className="text-gray-600">
                  Start with $100,000 in virtual currency. Practice trading with realistic market conditions.
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-primary text-3xl">
                →
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="glass-card rounded-soft-lg p-8 text-center">
                <div className="w-16 h-16 bg-success text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-bold text-text-dark mb-3">Trade & Learn</h3>
                <p className="text-gray-600">
                  Start trading and get AI feedback. Learn from your mistakes and improve your skills.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <button className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-bold text-lg rounded-soft-lg hover:shadow-xl transition-all transform hover:scale-[1.05] active:scale-[0.95]">
              Get Started Now - It's Free!
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-soft flex items-center justify-center">
                  <span className="text-white font-bold text-xl">₿</span>
                </div>
                <span className="text-xl font-bold">CryptoMock</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Learn crypto trading without risk. Practice with real market data, get AI coaching, 
                and master trading strategies before investing real money.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; 2025 CryptoMock. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

