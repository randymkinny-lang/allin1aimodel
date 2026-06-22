import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQS = [
  {
    q: 'Is this legal?',
    a: 'Yes. All content is AI-generated synthetic media. We have full AI disclosure built into the platform and our terms require all creators to disclose AI content on every platform they post to.',
  },
  {
    q: 'Do I own the content I create?',
    a: '100%. Every photo, video, and persona you build belongs to you. We never claim rights to your creations.',
  },
  {
    q: 'Will I get banned on Instagram or TikTok?',
    a: "Not if you follow our Ban Prevention Playbook — which is built directly into the app. It's updated monthly and covers every major platform.",
  },
  {
    q: 'Do I need tech skills?',
    a: 'None. If you can fill out a form and click a button, you can launch your first AI model today.',
  },
  {
    q: "What's the difference between Starter and Creator?",
    a: 'Starter gets you generating content and set up on 2 platforms. Creator unlocks the AI chatbot, all platforms, full customization, and payment setup — everything you need to actually earn.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings in 30 seconds.',
  },
  {
    q: 'How fast can I start making money?',
    a: 'With the curriculum inside the app, most creators have their model live and monetized within 7 days. Speed depends on how fast you move.',
  },
];

const FAQ: React.FC = () => {
  return (
    <section id="faq" className="py-20 px-4 bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Common Questions
          </h2>
          <p className="mt-3 text-slate-400">
            Everything you need to know before you start.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="w-full space-y-3"
        >
          {FAQS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-slate-800 rounded-xl bg-slate-900/60 px-5"
            >
              <AccordionTrigger className="text-left text-white font-semibold hover:no-underline py-5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-300 leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
