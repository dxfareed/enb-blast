import styles from './page.module.css';

const leaderboardData = [
  { rank: 1, username: '@alice', score: 15_250, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: false },
  { rank: 2, username: '@bob', score: 14_100, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: false },
  { rank: 3, username: '@charlie', score: 13_500, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: false },
  { rank: 4, username: '@david', score: 12_800, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: false },
  { rank: 5, username: '@username', score: 12_750, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: true },
  { rank: 6, username: '@eve', score: 11_900, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: false },
  { rank: 7, username: '@frank', score: 10_600, pfpUrl: "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3", isCurrentUser: false },
];

const getRankStyling = (rank: number) => {
  switch (rank) {
    case 1: return styles.rank1;
    case 2: return styles.rank2;
    case 3: return styles.rank3;
    default: return styles.rankDefault;
  }
};

export default function LeaderboardPage() {
  return (
    <div className={styles.leaderboardContainer}>
      <h1 className={styles.title}>Leaderboard</h1>
      {leaderboardData.map((user) => (
        <div 
          key={user.rank} 
          className={`${styles.userRow} ${user.isCurrentUser ? styles.currentUser : ''}`}
        >
          <div className={`${styles.rankCircle} ${getRankStyling(user.rank)}`}>
            {user.rank}
          </div>
          <img 
            src={user.pfpUrl}
            alt={`${user.username}'s profile picture`}
            className={styles.pfp}
            width={48}
            height={48}
          />
          <div className={styles.userInfo}>
            <p className={styles.username}>{user.username}</p>
          </div>
          <div className={styles.scoreInfo}>
            <p className={styles.score}>{user.score.toLocaleString()}</p>
            <p className={styles.scoreLabel}>points</p>
          </div>
        </div>
      ))}
    </div>
  );
}