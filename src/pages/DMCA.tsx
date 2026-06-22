import React from 'react';
import LegalPage from '@/components/legal/LegalPage';

const DMCA: React.FC = () => (
  <LegalPage title="DMCA &amp; Copyright Policy" subtitle="Notice and takedown procedures under 17 U.S.C. § 512.">
    <h2>1. Our Commitment</h2>
    <p>
      All in 1 AI Model respects intellectual property rights and complies with the Digital Millennium Copyright Act
      (DMCA). We respond promptly to valid takedown notices and terminate the accounts of repeat infringers.
    </p>

    <h2>2. Filing a DMCA Takedown Notice</h2>
    <p>If you believe content on the Platform infringes your copyright, send a written notice to our Designated Agent that includes:</p>
    <ol>
      <li>An electronic or physical signature of the copyright owner or authorized agent.</li>
      <li>Identification of the copyrighted work claimed to be infringed.</li>
      <li>The URL or other specific location of the allegedly infringing material.</li>
      <li>Your full name, address, telephone number, and email.</li>
      <li>A statement of good-faith belief that the use is not authorized by the copyright owner, agent, or law.</li>
      <li>A statement, under penalty of perjury, that the information is accurate and you are authorized to act.</li>
    </ol>

    <h2>3. Designated DMCA Agent</h2>
    <p>
      <strong>DMCA Agent — All in 1 AI Model, Inc.</strong><br />
      Email: <a href="mailto:dmca@allin1aimodel.com">dmca@allin1aimodel.com</a><br />
      Mail: 1209 N. Orange Street, Wilmington, DE 19801, USA
    </p>

    <h2>4. Counter-Notification</h2>
    <p>If your content was removed in error, you may submit a counter-notice including:</p>
    <ol>
      <li>Your signature, name, address, and phone number.</li>
      <li>Identification of the removed material and its prior location.</li>
      <li>A statement under penalty of perjury that you have a good-faith belief the material was removed by mistake.</li>
      <li>Consent to jurisdiction of the federal court in your district (or Delaware if outside the USA).</li>
    </ol>

    <h2>5. Repeat Infringers</h2>
    <p>
      Accounts that receive multiple valid takedown notices will be permanently terminated, and associated payouts may be
      withheld pending investigation.
    </p>

    <h2>6. Non-Consensual Intimate Imagery (NCII) &amp; Deepfakes</h2>
    <p>
      We treat reports of non-consensual intimate imagery, including AI-generated deepfakes of real people, with the
      highest priority. Email <a href="mailto:trust@allin1aimodel.com">trust@allin1aimodel.com</a> with the URL and we will
      remove confirmed violations within 24 hours, independent of DMCA process.
    </p>

    <h2>7. False Claims</h2>
    <p>
      Knowingly submitting a false notice may result in liability for damages, costs, and attorneys' fees under 17 U.S.C.
      § 512(f).
    </p>
  </LegalPage>
);

export default DMCA;
