import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileCheck2, 
  AlertTriangle, 
  Users, 
  Key, 
  Lock, 
  ArrowLeft,
  Mail,
  ShieldAlert,
  ServerOff,
  Cpu
} from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-200 antialiased selection:bg-primary-500/30">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo-3d.png" alt="IEC" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                Industrial Evidence Chain
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Terms of Service</span>
            </div>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero Banner */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Operational Agreement & Compliance Protocols</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Effective Date: October 29, 2026 · Version 2.5
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-[#121824]/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-xl space-y-10">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <FileCheck2 className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. System Purpose & Permitted Use</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              The Industrial Evidence Chain (&ldquo;IEC&rdquo;) application provides an authenticated, cryptographically anchored environment for recording, preserving, and auditing maintenance and inspection operations performed on industrial machinery, facilities, and assets. By accessing or utilizing this application, you agree to be bound by these Terms of Service. If you do not agree, do not access or use the application.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Users className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. Account Registration & Administrative Approval</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Access to IEC is restricted to authorized personnel who have received explicit operational approval:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Verification Gate:</strong> All newly registered accounts, whether through standard credentials or Google Sign-In, enter a pending state and cannot access system functions until verified and activated by an authorized system administrator.</li>
              <li><strong>Role-Based Scope:</strong> Access privileges are assigned based on organizational duties: <em>Technician</em> (capture & submit), <em>Manager</em> (verify & operational actions), <em>Auditor</em> (inspect history & compliance), and <em>Admin</em> (system oversight & user governance). Users must not attempt to perform actions outside their authorized scope.</li>
              <li><strong>Credential Security:</strong> You are responsible for safeguarding your login credentials. Sharing accounts or delegating authenticated sessions is strictly prohibited.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">3. Acceptable Use Policy</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Users must exercise high professional care when using the system. You agree that you will not:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5 text-gray-600 dark:text-gray-300">
              <li>Submit fabricated, doctored, synthetic, or misleading photographs, videos, or maintenance records.</li>
              <li>Inject spoofed or manipulated GPS coordinates, timestamps, or device identifiers.</li>
              <li>Attempt to reverse-engineer, bypass, or tamper with the cryptographic SHA-256 hashing algorithms or Hyperledger Fabric proof verifications.</li>
              <li>Disrupt or degrade system performance or flood endpoints with automated scrapers.</li>
              <li>Interfere with the chain of custody or attempt unauthorized modification of historical records.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Cpu className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">4. Evidence Submission & Cryptographic Non-Repudiation</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Upon evidence submission:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5 text-gray-600 dark:text-gray-300">
              <li>A canonical SHA-256 payload digest is generated from the combined metadata, telemetry, and media checksums.</li>
              <li>This payload is anchored to an immutable ledger transaction with block number and Merkle proof.</li>
              <li>Submitting personnel acknowledge that anchored records create an immutable, non-repudiable audit footprint tied to their identity.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">5. Verification & Technical Limitations Disclaimer</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              IEC provides cryptographic integrity verification. Users and organizations acknowledge the following crucial operational boundaries:
            </p>
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <p>
                <strong>Cryptographic Integrity vs. Ground Truth:</strong> Verification demonstrates that digital bytes and metadata have not changed since the moment of anchoring. It confirms mathematical integrity between the stored record and ledger proof. It does not replace physical engineering inspections, sensor calibration tests, or statutory safety certifications.
              </p>
              <p>
                <strong>System Error vs. Tampering:</strong> In the event of network connectivity interruptions, temporary storage timeouts, or missing media files, the system distinguishes <span className="font-semibold text-amber-600">STORAGE_ERROR</span> from an intentional <span className="font-semibold text-rose-600">INTEGRITY_MISMATCH</span>. Users must follow operational recovery procedures before escalating.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Lock className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">6. Confidentiality & Industrial Asset Data</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              All asset specifications, equipment diagrams, machine telemetry, operational logs, and maintenance evidence accessible through IEC constitute proprietary, confidential industrial information. Unauthorized dissemination, extraction, or reproduction of these materials is strictly prohibited and subject to legal prosecution.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <ServerOff className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">7. Availability & Third-Party Dependencies</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              The application is hosted via distributed cloud platforms (Google Cloud Platform, Firebase, and Vercel). While reasonable efforts are made to ensure continuous availability, service may experience scheduled maintenance or unexpected downtimes. IEC is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis for industrial operations.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Key className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">8. Account Suspension & Access Termination</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              System administrators reserve the right to suspend or revoke account access immediately and without notice upon detection of:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-300">
              <li>Compromised login credentials or anomalous authentication sessions.</li>
              <li>Intentional submission of corrupted, fraudulent, or altered evidence.</li>
              <li>Violations of safety regulations or unauthorized access attempts.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Mail className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">9. Questions & Operational Contact</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              For operational assistance, legal inquiries, or compliance questions regarding these Terms, contact the project administration desk:
            </p>
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 block">Project Administration & Legal Desk</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white font-medium">support@iec-evidence.org</span>
              </div>
              <a
                href="mailto:support@iec-evidence.org"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Contact Administration
              </a>
            </div>
          </section>

        </div>

        {/* Legal Footer Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400 px-2">
          <span>© 2026 Industrial Evidence Chain. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-primary-600 dark:hover:text-primary-400 underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-400 underline-offset-4 hover:underline">
              Sign In Portal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
