import { ReactNode, MouseEvent } from 'react';
import { navigate, isActivePath } from '../../utils/navigation';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  activeClassNameDefault?: string;
  exact?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: any;
}

/**
 * Custom Link component that uses client-side navigation
 * Prevents full page reload and works with App.tsx routing
 */
const Link = ({ 
  href, 
  children, 
  className = '', 
  activeClassName = '',
  activeClassNameDefault = '',
  exact = false,
  onClick,
  ...props 
}: LinkProps) => {
  const isActive = isActivePath(href, exact);
  const baseClass = activeClassNameDefault || className;
  const finalClassName = isActive 
    ? `${baseClass} ${activeClassName}`.trim()
    : baseClass;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Don't handle if modifier keys pressed (allow open in new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    
    e.preventDefault();
    
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }
    
    // Always navigate for client-side routing
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} className={finalClassName} {...props}>
      {children}
    </a>
  );
};

export default Link;

