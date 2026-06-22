import React from 'react';
import LegalPage from '@/components/legal/LegalPage';

const Terms: React.FC = () => (
  <LegalPage title="Terms of Service" subtitle="The rules of the road for using our platform.">
    <h2>1. Acceptance of Terms</h2>
    <p>
      By accessing or using All in 1 AI Model ("Platform", "we", "us"), you agree to be bound by these Terms of Service.
      If you do not agree, you may not use the Platform. You must be at least 18 years of age to create an account or
      access any synthetic-media generation features.
    </p>

    <h2>2. Eligibility &amp; Age Requirement</h2>
    <p>
      The Platform is strictly for adults aged 18 or older (21+ in jurisdictions where required). By using the Platform,
      you represent and warrant that you meet this age requirement. We reserve the right to suspend or terminate any
      account that we reasonably believe is operated by a minor.
    </p>

    <h2>3. User Accounts</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account credentials and for all activity occurring
      under your account. Notify us immediately of any unauthorized use.
    </p>

    <h2>4. AI-Generated Content &amp; Synthetic Media</h2>
    <p>
      The Platform enables you to create AI personas, generate synthetic images, audio, and chat. All content created
      with our tools is <strong>synthetic</strong> and depicts <strong>fictional, AI-generated personas</strong>, not real
      people. You agree to clearly disclose AI-generated content as required by applicable law (see our{' '}
      <a href="/ai-disclosure">AI Disclosure</a>).
    </p>

    <h2>5. Prohibited Conduct</h2>
    <ul>
      <li>Generating sexual content depicting minors or anyone under 18 (CSAM) — strictly forbidden and reported to NCMEC.</li>
      <li>Non-consensual deepfakes, impersonation, or use of any real person's likeness without verifiable consent.</li>
      <li>Harassment, doxxing, threats, or incitement to violence.</li>
      <li>Illegal content, fraud, or infringement of third-party intellectual property.</li>
      <li>Bypassing safety filters, age gates, or moderation systems.</li>
    </ul>

    <h2>6. Content Moderation</h2>
    <p>
      All uploads and generations are scanned by AI safety classifiers. Flagged content may be hidden, removed, or
      escalated to human review. Repeat or severe violations result in account termination. See our{' '}
      <a href="/dmca">DMCA Policy</a> for copyright takedowns.
    </p>

    <h2>7. Payments, Subscriptions &amp; Refunds</h2>
    <p>
      Paid plans renew automatically until cancelled. Refunds are issued at our discretion within 7 days of purchase if
      no significant usage has occurred. Creator payouts are subject to our Payouts Terms.
    </p>

    <h2>8. Intellectual Property</h2>
    <p>
      You retain ownership of content you create, subject to a worldwide, royalty-free license to us to host, display,
      and process it for the operation of the Platform. We retain all rights to the Platform itself.
    </p>

    <h2>9. Disclaimers &amp; Limitation of Liability</h2>
    <p>
      The Platform is provided "as is" without warranties of any kind. To the maximum extent permitted by law, our
      aggregate liability is limited to the greater of $100 or the fees you paid in the 12 months preceding the claim.
    </p>

    <h2>10. Termination</h2>
    <p>
      We may suspend or terminate your access at any time for violation of these Terms. You may close your account at
      any time from Settings.
    </p>

    <h2>11. Governing Law</h2>
    <p>
      These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles.
      Disputes shall be resolved by binding arbitration in Wilmington, Delaware.
    </p>

    <h2>12. Changes</h2>
    <p>
      We may update these Terms from time to time. Material changes will be announced in-app at least 14 days before
      taking effect.
    </p>
  </LegalPage>
);

export default Terms;
