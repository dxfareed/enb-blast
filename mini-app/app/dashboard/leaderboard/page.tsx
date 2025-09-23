// Mock data for the leaderboard. Later, this will come from your database.
const leaderboardData = [
  { rank: 1, username: '@alice', score: 15_250, isCurrentUser: false },
  { rank: 2, username: '@bob', score: 14_100, isCurrentUser: false },
  { rank: 3, username: '@charlie', score: 13_500, isCurrentUser: false },
  { rank: 4, username: '@david', score: 12_800, isCurrentUser: false },
  { rank: 5, username: '@username', score: 12_750, isCurrentUser: true }, // This is our user
  { rank: 6, username: '@eve', score: 11_900, isCurrentUser: false },
  { rank: 7, username: '@frank', score: 10_600, isCurrentUser: false },
];

// A helper function to style the top ranks
const getRankStyling = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-400 text-yellow-900 border-yellow-500';
    case 2:
      return 'bg-gray-300 text-gray-800 border-gray-400';
    case 3:
      return 'bg-yellow-600 text-white border-yellow-700';
    default:
      return 'bg-gray-200 text-gray-700 border-gray-300';
  }
};

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col space-y-3">
      <h1 className="text-2xl font-bold mb-3 text-gray-800">Leaderboard</h1>
      {leaderboardData.map((user) => (
        <div 
          key={user.rank} 
          className={`flex items-center space-x-4 p-3 rounded-2xl border-2 ${user.isCurrentUser ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200'}`}
        >
          {/* Rank */}
          <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg border-2 ${getRankStyling(user.rank)}`}>
            {user.rank}
          </div>

          {/* Username and Score */}
          <div className="flex-grow">
            <p className={`font-bold text-lg ${user.isCurrentUser ? 'text-blue-800' : 'text-gray-900'}`}>{user.username}</p>
          </div>
          <div className="text-right">
            <p className={`font-bold text-lg ${user.isCurrentUser ? 'text-blue-800' : 'text-gray-800'}`}>{user.score.toLocaleString()}</p>
            <p className="text-sm text-gray-500">points</p>
          </div>
        </div>
      ))}
    </div>
  );
}