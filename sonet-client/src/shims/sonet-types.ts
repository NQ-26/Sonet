// Shim for missing @sonet/types package
// This is referenced in the codebase but doesn't exist

export const TID = {
  next: () => Math.random().toString(36).substring(2, 15),
}

// Add missing retry function
export const retry = async <T>(
  fn: () => Promise<T>,
  options: {maxRetries: number; retryable: (error: any) => boolean}
): Promise<T> => {
  let lastError: any
  for (let i = 0; i <= options.maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i === options.maxRetries || !options.retryable(error)) {
        throw error
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100))
    }
  }
  throw lastError
}