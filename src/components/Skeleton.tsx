import React from 'react';

export const AnimeCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="relative aspect-[1/1.414] overflow-hidden rounded-md bg-white/5 shadow-lg"></div>
      <div className="h-4 w-3/4 bg-white/5 rounded"></div>
      <div className="h-3 w-1/2 bg-white/5 rounded"></div>
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="relative h-[70vh] w-full overflow-hidden bg-anilist-fg animate-pulse">
      <div className="absolute inset-0 bg-white/5"></div>
      <div className="relative flex h-full flex-col justify-center px-4 sm:px-8 lg:px-16 max-w-4xl gap-6">
        <div className="h-12 w-3/4 bg-white/10 rounded"></div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-white/5 rounded"></div>
          <div className="h-4 w-full bg-white/5 rounded"></div>
          <div className="h-4 w-2/3 bg-white/5 rounded"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-12 w-32 bg-white/10 rounded"></div>
          <div className="h-12 w-32 bg-white/10 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const SectionSkeleton: React.FC = () => {
  return (
    <section className="px-4 sm:px-8 lg:px-16 py-8">
      <div className="h-6 w-48 bg-white/10 rounded mb-6"></div>
      <div className="flex gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-28 sm:w-44 md:w-48 lg:w-56">
            <AnimeCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
};
