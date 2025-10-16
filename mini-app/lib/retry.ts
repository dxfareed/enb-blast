// --- Utility for retrying failed operations ---
export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 2000 // 2 seconds
): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Operation failed. Attempt ${i + 1} of ${retries}. Retrying in ${delay / 1000}s...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};
