'use client';

export default function HistoryPage() {
  const claims = [
    { id: 1, time: '2 mins ago', amount: '100' },
    { id: 2, time: '5 mins ago', amount: '100' },
    { id: 3, time: '10 mins ago', amount: '100' },
    { id: 4, time: '15 mins ago', amount: '100' },
  ];

  return (
    <div className="p-4">
      <div className="space-y-3">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
          >
            <span className="text-gray-600">
              Claimed ({claim.time})
            </span>
            <span className="font-medium">
              {claim.amount} $END
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 