export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-bold tracking-tight">
        DailyFreedomAutomated
      </h1>
      <p className="mt-4 text-lg text-gray-400">
        Automated social media content pipeline — powered by AI.
      </p>
      <div className="mt-8 flex gap-3">
        <span className="rounded-full bg-green-900/50 px-3 py-1 text-sm text-green-400">
          System Online
        </span>
      </div>
    </main>
  );
}
