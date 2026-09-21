import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-charcoal-900 text-slate-100">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-amber-400">
          Name Generator
        </h1>
        <p className="mt-2 text-slate-400">
          Fantasy, Sci-Fi & Character Name Generator
        </p>
      </header>
    </div>
  );
};

export default App;
