import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}
export function Logo({
  size = 'md',
  showText = true
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14'
  };
  const iconSize = {
    sm: 18,
    md: 22,
    lg: 28
  };
  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };
  return <Link to="/" className="flex items-center gap-3 group">
      
      {showText && <span className={`${textSizeClasses[size]} font-display font-bold text-gradient`}>Lucent</span>}
    </Link>;
}