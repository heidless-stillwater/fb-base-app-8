import FileManager from '@/components/file-manager';

export default function Home() {
  return (
    <main className="flex items-start justify-center min-h-screen p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl">
        <FileManager />
      </div>
    </main>
  );
}
