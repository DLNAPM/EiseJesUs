import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const SCRIPTURES = [
  // The Eight Beatitudes (Matthew 5:3-12, NIV)
  { ref: "Matthew 5:3", text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven." },
  { ref: "Matthew 5:4", text: "Blessed are those who mourn, for they will be comforted." },
  { ref: "Matthew 5:5", text: "Blessed are the meek, for they will inherit the earth." },
  { ref: "Matthew 5:6", text: "Blessed are those who hunger and thirst for righteousness, for they will be filled." },
  { ref: "Matthew 5:7", text: "Blessed are the merciful, for they will be shown mercy." },
  { ref: "Matthew 5:8", text: "Blessed are the pure in heart, for they will see God." },
  { ref: "Matthew 5:9", text: "Blessed are the peacemakers, for they will be called children of God." },
  { ref: "Matthew 5:10", text: "Blessed are those who are persecuted because of righteousness, for theirs is the kingdom of heaven." },
  { ref: "Matthew 5:11-12", text: "Blessed are you when people insult you, persecute you and falsely say all kinds of evil against you because of me. Rejoice and be glad, because great is your reward in heaven." },
  
  // The Armor of God (Ephesians 6:10-18)
  { ref: "Ephesians 6:10", text: "Finally, be strong in the Lord and in his mighty power." },
  { ref: "Ephesians 6:11", text: "Put on the full armor of God, so that you can take your stand against the devil’s schemes." },
  { ref: "Ephesians 6:12", text: "For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world." },
  { ref: "Ephesians 6:13", text: "Therefore put on the full armor of God, so that when the day of evil comes, you may be able to stand your ground." },
  { ref: "Ephesians 6:14", text: "Stand firm then, with the belt of truth buckled around your waist, with the breastplate of righteousness in place." },
  { ref: "Ephesians 6:15", text: "And with your feet fitted with the readiness that comes from the gospel of peace." },
  { ref: "Ephesians 6:16", text: "In addition to all this, take up the shield of faith, with which you can extinguish all the flaming arrows of the evil one." },
  { ref: "Ephesians 6:17", text: "Take the helmet of salvation and the sword of the Spirit, which is the word of God." },
  { ref: "Ephesians 6:18", text: "And pray in the Spirit on all occasions with all kinds of prayers and requests." }
];

export default function ScriptureBanner() {
  const [verse, setVerse] = useState(SCRIPTURES[0]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Select verse based on day of year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const index = dayOfYear % SCRIPTURES.length;
    setVerse(SCRIPTURES[index]);
  }, []);

  return (
    <div 
      className="w-full bg-accent/5 border-b border-ui-border overflow-hidden relative cursor-default group h-10 flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex whitespace-nowrap">
        <motion.div
           animate={{
             x: isPaused ? undefined : [0, -1000]
           }}
           transition={{
             repeat: Infinity,
             duration: 30,
             ease: "linear",
             repeatType: "loop"
           }}
           className="flex items-center gap-12 px-4"
        >
          {/* Duplicate the verse multiple times to create a continuous scroll effect */}
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div 
              key={i} 
              className="flex items-center gap-4"
              animate={isPaused ? { opacity: 1 } : { opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <span className="text-accent font-serif italic font-bold text-xs uppercase tracking-widest">{verse.ref}:</span>
              <span className="text-text-secondary font-sans text-sm font-medium pr-8">{verse.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Subtle overlay to fade edges */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />
    </div>
  );
}
