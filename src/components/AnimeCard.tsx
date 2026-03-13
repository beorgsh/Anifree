import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Captions, Mic } from 'lucide-react';
import { motion } from 'motion/react';

interface AnimeCardProps {
  anime: any;
  className?: string;
  index?: number;
  badge?: string;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, className = '', index = 0, badge }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link 
        to={`/anime/${anime.id}`}
        className={`group relative flex flex-col gap-3 transition-all duration-300 hover:-translate-y-2 ${className}`}
      >
        <div className="relative aspect-[1/1.414] overflow-hidden rounded-md bg-anilist-fg shadow-lg">
          <img 
            src={anime.poster} 
            alt={anime.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
            <div className="rounded-full bg-anilist-accent p-3 text-black shadow-xl transform scale-0 group-hover:scale-100 transition-transform duration-300">
              <Play fill="currentColor" size={24} />
            </div>
          </div>
          
          {badge && (
            <div className="absolute top-2 right-2 bg-anilist-accent text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter z-10 shadow-lg">
              {badge}
            </div>
          )}

          {/* Sub/Dub Indicators - Vertically Aligned */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
            {anime.tvInfo?.sub && (
              <div className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white backdrop-blur-sm border border-white/10 shadow-lg">
                <Captions size={12} className="text-anilist-accent" />
                <span>{anime.tvInfo.sub}</span>
              </div>
            )}
            {anime.tvInfo?.dub && (
              <div className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white backdrop-blur-sm border border-white/10 shadow-lg">
                <Mic size={12} className="text-anilist-accent" />
                <span>{anime.tvInfo.dub}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-anilist-heading group-hover:text-anilist-accent transition-colors leading-tight">
            {anime.title || anime.japanese_title}
          </h3>
        </div>
      </Link>
    </motion.div>
  );
};

export default AnimeCard;
