'use client';

export default function LeaderboardPage() {
  const leaders = [
    { id: 1, username: '@player1', score: '5000', rank: 1 },
    { id: 2, username: '@player2', score: '4500', rank: 2 },
    { id: 3, username: '@player3', score: '4000', rank: 3 },
    { id: 4, username: '@player4', score: '3500', rank: 4 },
    { id: 5, username: '@player5', score: '3000', rank: 5 },
  ];

  return (
    <div className="p-4">
      <div className="space-y-3">
        {leaders.map((leader) => (
          <div
            key={leader.id}
            className="flex items-center p-4 bg-gray-50 rounded-lg"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
              {leader.rank}
            </div>

            <div className="flex-1 mx-4">
              <div className="font-medium">{leader.username}</div>
            </div>

            <div className="text-right">
              <div className="font-bold text-blue-600">{leader.score}</div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 