'use client';

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      {/* Profile Picture */}
      <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
        {/* profile picture here */}
      </div>

      {/* Username */}
      <div className="text-lg font-medium">
        @username
      </div>

      {/* Stats */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">★</span>
          <span>Level 1</span>
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-1">
          Total: 1000
        </div>
      </div>

      {/* Level Progress */}
      <div className="w-full max-w-xs">
        <div className="bg-gray-100 rounded-full h-4">
          <div 
            className="bg-blue-500 h-full rounded-full" 
            style={{ width: '60%' }}
          />
        </div>
      </div>
    </div>
  );
} 