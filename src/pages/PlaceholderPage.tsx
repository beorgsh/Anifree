import React from 'react';
import { motion } from 'motion/react';
import { Layers } from 'lucide-react';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-8 lg:px-16 py-8 space-y-12"
    >
      <h1 className="text-2xl sm:text-4xl font-black text-anilist-heading uppercase tracking-tighter border-l-4 sm:border-l-8 border-anilist-accent pl-4 sm:pl-6 flex items-center gap-3 sm:gap-4">
        <Layers size={24} className="sm:w-10 sm:h-10 text-anilist-accent" />
        {title}
      </h1>

      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="bg-white/5 p-12 rounded-3xl border border-white/10 max-w-md w-full backdrop-blur-xl">
          <p className="text-anilist-text mb-8 text-lg font-medium">This feature is currently under development. Stay tuned for updates!</p>
          <div className="w-16 h-1 bg-anilist-accent mx-auto rounded-full opacity-50"></div>
        </div>
      </div>
    </motion.div>
  );
};

export default PlaceholderPage;
