'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Application Error
              </h2>
              <p className="text-gray-600 mb-6">
                {error.message || 'A critical error occurred.'}
              </p>
              <button
                onClick={reset}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
