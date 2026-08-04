import { useState } from 'react';

export function Tooltip({ children, content, side = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  const arrowClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && (
        <div className={`absolute ${sideClasses[side]} z-50 whitespace-nowrap pointer-events-none`}>
          <div
            className="text-xs px-2.5 py-1.5 rounded-md"
            style={{
              background: 'var(--bg-overlay)',
              color: 'var(--text-hi)',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 12px 32px -8px rgba(4, 6, 9, 0.75)',
            }}
          >
            {content}
            <div
              className={`absolute w-0 h-0 ${arrowClasses[side]}`}
              style={{
                borderBottomColor: side === 'top' ? 'var(--bg-overlay)' : 'transparent',
                borderTopColor: side === 'bottom' ? 'var(--bg-overlay)' : 'transparent',
                borderLeftColor: side === 'right' ? 'var(--bg-overlay)' : 'transparent',
                borderRightColor: side === 'left' ? 'var(--bg-overlay)' : 'transparent',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Tooltip;
