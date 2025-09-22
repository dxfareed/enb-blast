'use client';

import { useState } from 'react';

export default function GamePage() {
  const [isPopping, setIsPopping] = useState(false);

  const handleClaim = () => {
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative m-4 rounded-lg bg-gray-50">
        <div className="absolute inset-0 p-4">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-yellow-200"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleClaim}
          className={`w-full py-3 rounded-full bg-blue-500 text-white font-medium text-lg
            ${isPopping ? 'transform scale-95' : 'transform scale-100'}
            transition-transform duration-200`}
        >
          Claim 100 $TOKENS
        </button>
      </div>
    </div>
  );
} 