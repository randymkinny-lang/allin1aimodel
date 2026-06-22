import React from 'react';

interface Book {
  title: string;
  subtitle: string;
  author: string;
  image: string;
  link: string;
}

const books: Book[] = [
  {
    title: 'The Lazy Genius Journal',
    subtitle:
      "From Prison to Passive Income — 90 Days to Build a Life They Said You Couldn't Have",
    author: 'Randy Kinny',
    image:
      'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780368865951_18898991.webp',
    link: 'https://a.co/d/03quKHb9',
  },
  {
    title: 'Consistency Beats Perfection',
    subtitle:
      'How to Build a Profitable AI Model Business Without Burning Out — The Lazy Genius Way',
    author: 'Randy Kinny',
    image:
      'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780368850573_28a38261.jpg',
    link: 'https://a.co/d/02RLBkku',
  },
  {
    title: 'AI1AIM Official Curriculum Book',
    subtitle: 'All in 1 AI Model — AI Model Business Implementation Guide',
    author: 'Randy Kinny',
    image:
      'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780368879308_86ded892.png',
    link: 'https://a.co/d/0fanfkxG',
  },
];

const BooksSection: React.FC = () => {
  return (
    <section className="bg-slate-950 py-20 px-4 border-y border-amber-500/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            The Books Behind the System
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            Before I built the platform, I wrote the playbook. Start here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {books.map((book) => (
            <div
              key={book.title}
              className="flex flex-col rounded-2xl border-2 border-amber-500/60 bg-slate-900/60 overflow-hidden shadow-lg shadow-amber-500/10 transition-transform duration-300 hover:-translate-y-2 hover:border-amber-400"
            >
              <div className="bg-slate-950 p-4 flex items-center justify-center">
                <img
                  src={book.image}
                  alt={`${book.title} book cover`}
                  className="h-72 w-auto object-contain rounded-md shadow-md"
                />
              </div>
              <div className="flex flex-col flex-1 p-6 text-center">
                <h3 className="text-xl font-bold text-amber-300">{book.title}</h3>
                <p className="mt-3 text-sm text-slate-300 flex-1">{book.subtitle}</p>
                <p className="mt-4 text-sm font-semibold text-slate-400">
                  {book.author}
                </p>
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 font-semibold text-slate-950 transition-all hover:from-amber-300 hover:to-yellow-400 hover:shadow-lg hover:shadow-amber-500/30"
                >
                  Get the Book →
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm italic text-amber-400">
          Read the books. Use the platform. Build the empire.
        </p>
      </div>
    </section>
  );
};

export default BooksSection;
