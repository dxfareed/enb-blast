// We mark this as a client component because it will have interactive elements
// like buttons that require JavaScript in the browser.
'use client'; 

export default function GamePage() {

  const handleClaim = () => {
    // We'll add the logic for this later
    alert("Tokens Claimed!");
  };

  return (
    <div className="flex flex-col items-center justify-between h-full space-y-8">
      {/* The main interactive area */}
      <div 
        className="w-full h-96 bg-yellow-100 border-2 border-dashed border-yellow-400 rounded-3xl flex items-center justify-center p-4"
      >
        <p className="text-yellow-600 text-center font-medium">
          This is the interactive area where the "popping" game will happen.
        </p>
      </div>
      
      {/* The claim button */}
      <button 
        onClick={handleClaim}
        className="w-full bg-blue-500 text-white font-bold py-4 px-4 rounded-full shadow-lg hover:bg-blue-600 active:scale-95 transition-transform"
      >
        Claim 100 $TOKENS
      </button>
    </div>
  );
}