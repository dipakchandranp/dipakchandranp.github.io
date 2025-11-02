export function EmptyState({ message, submessage }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <p className="text-lg mb-2">{message}</p>
        {submessage && <p className="text-sm">{submessage}</p>}
      </div>
    </div>
  )
}

