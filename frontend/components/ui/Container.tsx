import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div 
      className={`
        w-[90%] 
        max-w-[1500px] 
        mx-auto 
        min-h-screen 
        bg-background 
        border-l-2 
        border-r-2 
        border-foreground
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
}