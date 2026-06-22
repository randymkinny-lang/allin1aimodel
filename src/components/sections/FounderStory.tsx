import React from 'react';

interface FounderStoryProps {
  onSeeSystem: () => void;
}

const FOUNDER_IMAGE =
  'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780368879308_86ded892.png';

const bookThumbs = [
  {
    title: 'The Lazy Genius Journal',
    image:
      'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780368865951_18898991.webp',
    link: 'https://a.co/d/03quKHb9',
  },
  {
    title: 'Consistency Beats Perfection',
    image:
      'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780368850573_28a38261.jpg',
    link: 'https://a.co/d/02RLBkku',
  },
];

const FounderStory: React.FC<FounderStoryProps> = ({ onSeeSystem }) => {
  return (
    <section className="bg-slate-950 py-20 px-4 border-y border-amber-500/20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Founder image */}
        <div className="flex justify-center md:justify-start">
          <div className="rounded-2xl border-2 border-amber-500/60 p-2 bg-slate-900/60 shadow-lg shadow-amber-500/10">
            <img
              src={FOUNDER_IMAGE}
              alt="Randy Kinny — Founder of All in 1 AI Model"
              className="w-full max-w-md h-auto object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Text column */}
        <div className="text-left">
          <span className="text-sm font-bold uppercase tracking-widest text-amber-400">
            The Founder
          </span>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            From Handcuffs to 7 Figures.
          </h2>

          <div className="mt-6 space-y-4 text-slate-300 leading-relaxed">
            <p>
              I'm Randy Kinny — author, entrepreneur, and the guy who built this
              platform from scratch after getting out of prison with nothing but
              a phone and a plan.
            </p>
            <p>No investors. No connections. No second chances handed to me.</p>
            <p>
              I figured out how to build AI models that generate content, hold
              conversations, and make money while I sleep. Then I built the tools
              I wished existed and put them all in one place.
            </p>
            <p>
              All in 1 AI Model isn't just software. It's the system I used. And
              now it's yours.
            </p>
          </div>

          <button
            onClick={onSeeSystem}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3 font-semibold text-slate-950 transition-all hover:from-amber-300 hover:to-yellow-400 hover:shadow-lg hover:shadow-amber-500/30"
          >
            See the System →
          </button>

          {/* Book thumbnails */}
          <div className="mt-8">
            <div className="flex gap-4">
              {bookThumbs.map((book) => (
                <a
                  key={book.title}
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-amber-500/50 overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-amber-400"
                >
                  <img
                    src={book.image}
                    alt={`${book.title} book cover`}
                    className="h-28 w-auto object-contain"
                  />
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs italic text-amber-400">
              As seen in Randy's books — available on Amazon.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderStory;
