import CoinLabLogo from '../common/CoinLabLogo';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              <CoinLabLogo size="md" showText={true} />
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              Research terminal for cryptocurrency market analysis. Real-time data, news, and community insights. 
              Explore markets, read news, and join discussions.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="/" className="hover:text-emerald-400 transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/news" className="hover:text-emerald-400 transition-colors">
                  News
                </a>
              </li>
              <li>
                <a href="/community" className="hover:text-emerald-400 transition-colors">
                  Community
                </a>
              </li>
              <li>
                <a href="/search" className="hover:text-emerald-400 transition-colors">
                  Search
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="/about" className="hover:text-emerald-400 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} CoinLab. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="/privacy" className="hover:text-emerald-400 transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-emerald-400 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

