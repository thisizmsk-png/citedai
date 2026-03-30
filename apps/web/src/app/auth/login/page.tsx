export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sign in to CitedAI</h1>
          <p className="mt-2 text-sm text-gray-500">
            Analyze and optimize your content for AI citation.
          </p>
        </div>
        {/* TODO: Supabase Auth UI component */}
        <p className="text-center text-xs text-gray-400">
          Auth UI will be rendered here via @supabase/auth-ui-react
        </p>
      </div>
    </div>
  );
}
