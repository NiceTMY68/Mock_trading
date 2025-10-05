import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-18">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-accent rounded-soft flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">₿</span>
              </div>
              <span className="text-lg md:text-xl font-bold text-text-dark hidden sm:inline">
                CryptoMock
              </span>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors font-medium">
              How it works
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors font-medium">
              Pricing
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <button className="text-sm md:text-base px-4 md:px-6 py-2 md:py-2.5 text-gray-700 hover:text-primary transition-colors font-medium">
              Login
            </button>
            <button className="text-sm md:text-base px-4 md:px-6 py-2 md:py-2.5 bg-primary hover:bg-primary/90 text-white rounded-soft transition-all font-semibold shadow-sm hover:shadow-md">
              Sign up
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

