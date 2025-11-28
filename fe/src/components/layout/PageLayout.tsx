import { ReactNode } from 'react';
import TopBar from './TopBar';
import Footer from './Footer';
import BackendStatus from '../common/BackendStatus';
import HeroPattern from '../common/HeroPattern';

interface PageLayoutProps {
  children: ReactNode;
  showBackendStatus?: boolean;
  pattern?: 'dots' | 'grid' | 'circuit' | 'topography' | 'waves';
  patternOpacity?: number;
  className?: string;
}

const PageLayout = ({ 
  children, 
  showBackendStatus = true,
  pattern = 'dots',
  patternOpacity = 0.1,
  className = ''
}: PageLayoutProps) => {
  return (
    <div className={`relative min-h-screen text-white overflow-hidden ${className}`} 
      style={{ background: 'radial-gradient(circle at top, rgba(52, 211, 153, 0.2), transparent), radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.25), transparent 45%), #020617' }}>
      <HeroPattern pattern={pattern} opacity={patternOpacity} />
      <TopBar />
      {showBackendStatus && <BackendStatus />}
      {children}
      <Footer />
    </div>
  );
};

export default PageLayout;

