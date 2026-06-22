import React from 'react';
import LegalPage from '@/components/legal/LegalPage';

const Privacy: React.FC = () => (
  <LegalPage title="Privacy Policy" subtitle="How we collect, use, and protect your data.">
    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Account data:</strong> email, username, password hash, profile info.</li>
      <li><strong>Content data:</strong> models, prompts, generated media, chat logs.</li>
      <li><strong>Payment data:</strong> processed by Stripe — we never store full card numbers.</li>
      <li><strong>Usage data:</strong> device type, IP, pages visited, feature usage.</li>
      <li><strong>Age verification:</strong> a localStorage flag and (where required) ID verification through a third-party processor.</li>
    </ul>

    <h2>2. How We Use Your Data</h2>
    <ul>
      <li>To operate, secure, and improve the Platform.</li>
      <li>To run AI safety classifiers on uploaded media (see <a href="/ai-disclosure">AI Disclosure</a>).</li>
      <li>To process payments and pay creators.</li>
      <li>To comply with legal obligations (CSAM reporting, court orders, tax law).</li>
      <li>To send transactional and (with consent) marketing emails.</li>
    </ul>

    <h2>3. Legal Bases (GDPR)</h2>
    <p>
      We process personal data under the bases of contract performance, legitimate interest, consent, and legal obligation.
      EU/UK users may withdraw consent at any time.
    </p>

    <h2>4. Sharing</h2>
    <p>
      We share data only with: payment processors (Stripe), cloud infrastructure (Supabase, AWS), AI providers (Replicate,
      OpenAI) for inference, and law enforcement when legally required. We do not sell personal data.
    </p>

    <h2>5. AI Inference &amp; Third-Party Models</h2>
    <p>
      Prompts and uploads sent to AI inference providers are subject to those providers' privacy policies. We send the
      minimum data necessary and do not allow training on your private content without explicit opt-in.
    </p>

    <h2>6. Your Rights</h2>
    <ul>
      <li>Access, correct, delete, or export your data.</li>
      <li>Object to processing or restrict it.</li>
      <li>Lodge a complaint with your local data protection authority.</li>
      <li>California (CCPA): right to know, delete, and opt out of "sharing".</li>
    </ul>
    <p>Submit requests to <a href="mailto:privacy@allin1aimodel.com">privacy@allin1aimodel.com</a>.</p>

    <h2>7. Retention</h2>
    <p>
      Account data is retained while your account is active and up to 90 days after deletion (longer where law requires).
      Moderation flags and CSAM reports are retained per legal obligation.
    </p>

    <h2>8. Security</h2>
    <p>
      We use TLS in transit, encryption at rest, role-based access controls, and row-level security on our database.
      No system is perfectly secure — please use a strong, unique password.
    </p>

    <h2>9. Children</h2>
    <p>
      The Platform is strictly 18+. We do not knowingly collect data from anyone under 18. If we learn we have, we
      delete the account immediately.
    </p>

    <h2>10. International Transfers</h2>
    <p>
      Data may be processed in the United States and other countries. For EU/UK transfers we rely on Standard Contractual
      Clauses.
    </p>

    <h2>11. Cookies</h2>
    <p>
      We use essential cookies for sessions and (with consent) analytics cookies. Manage preferences in your browser.
    </p>

    <h2>12. Changes</h2>
    <p>We will notify you of material changes by email or in-app banner.</p>
  </LegalPage>
);

export default Privacy;
