// Mock data for the history list. This will eventually come from an API.
const historyItems = [
  { id: 1, time: "10:32 AM", amount: 100, currency: "$ENB" },
  { id: 2, time: "9:15 AM", amount: 100, currency: "$ENB" },
  { id: 3, time: "Yesterday, 8:00 PM", amount: 100, currency: "$ENB" },
  { id: 4, time: "Yesterday, 7:12 PM", amount: 100, currency: "$ENB" },
];

export default function HistoryPage() {
  return (
    <div className="flex flex-col space-y-3">
      {historyItems.map((item) => (
        <div 
          key={item.id} 
          className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-200"
        >
          <div>
            <p className="font-semibold text-gray-800">Claimed Tokens</p>
            <p className="text-sm text-gray-500">{item.time}</p>
          </div>
          <p className="font-bold text-lg text-green-500">
            + {item.amount} {item.currency}
          </p>
        </div>
      ))}
    </div>
  );
}