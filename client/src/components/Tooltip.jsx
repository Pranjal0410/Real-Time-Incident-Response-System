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
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg border border-gray-700">
            {content}
            <div
              className={`absolute w-0 h-0 border-gray-900 ${arrowClasses[side]}`}
              style={{
                borderBottomColor: side === 'top' ? '#111827' : 'transparent',
                borderTopColor: side === 'bottom' ? '#111827' : 'transparent',
                borderLeftColor: side === 'right' ? '#111827' : 'transparent',
                borderRightColor: side === 'left' ? '#111827' : 'transparent'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Tooltip;
