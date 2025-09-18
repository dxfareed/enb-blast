import Image from 'next/image';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      
      <div className="flex flex-col items-center justify-around w-full max-w-sm h-[80vh] bg-white rounded-3xl shadow-lg p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-48 h-48 rounded-full border-4 border-gray-800 flex items-center justify-center overflow-hidden mb-4">
            <Image 
              src="/splash.png"
              alt="Splash Image" 
              width={192} 
              height={192}
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Pop Game</h1>
          <p className="text-gray-500 mt-2">Catch the falling token to win!</p>
        </div>

        <div className="w-full">
          <Link 
            href="/game"
            className="block w-full text-center bg-blue-600 text-white font-bold py-4 px-6 rounded-full text-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform transform hover:scale-105"
          >
            Start Playing
          </Link>
        </div>

      </div>
    </main>
  );
}