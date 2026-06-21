import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link
        to="/topics"
        className="rounded-[7px] bg-accent px-4 py-2 text-[13px] font-bold text-accent-text transition hover:brightness-[1.06]"
      >
        Go to app
      </Link>
    </div>
  )
}
