import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  FileText, 
  Database, 
  Eye, 
  HardDrive, 
  CheckCircle, 
  Mail, 
  ArrowLeft,
  Server,
  Layers,
  KeyRound
} from 'lucide-react';

export function PrivacyPolicyPage() {
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
              <span className="text-[10px] text-gray-500 font-mono">Legal & Privacy Center</span>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-400 text-xs font-medium mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Industrial Compliance & Cryptographic Data Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Privacy Policy
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
              <FileText className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. Purpose and Scope</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              The Industrial Evidence Chain (IEC) system is an enterprise-grade custody management platform designed to capture, notarize, anchor, and verify physical and sensory maintenance operations on industrial machinery and assets. This Privacy Policy describes how IEC collects, processes, and protects information when you access or interact with the web application deployed at <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-xs">iec-firebase-deployment.vercel.app</code>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <KeyRound className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. Account Registration & Authentication</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              IEC operates on strict role-based access control (RBAC). User accounts may be established using:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Organizational Email and Password:</strong> Securely stored and authenticated using Google Firebase Authentication. Passwords are never stored in plain text and are managed using industry-standard hashing protocols.</li>
              <li><strong>Google Sign-In (OAuth 2.0):</strong> When you authenticate using Google Sign-In, IEC requests only your basic identity profile: your email address, full display name, and avatar picture. We do not access contacts, calendar, or personal search history.</li>
              <li><strong>Admin Approval Gate:</strong> Newly registered accounts or first-time Google sign-ins default to a <span className="font-semibold text-amber-600 dark:text-amber-400">Pending Approval</span> state. System administrators verify and assign appropriate operational roles (Technician, Manager, Auditor, or Admin) before application access is granted.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Database className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">3. Information Collected & Processed</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              To guarantee cryptographic provenance and operational safety across industrial plants, IEC processes the following categories of data:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">Operational Evidence</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  Maintenance notes, inspection findings, work-order references, activity classifications (e.g., Repair, Calibration, Inspection), and equipment status reports.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">Sensory & Media Files</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  Photographs and inspection videos captured directly on site to corroborate maintenance. Each media asset is immediately hashed using SHA-256 upon ingestion.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">Geolocation & Telemetry</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  GPS coordinates (latitude, longitude, accuracy) and physical plant site addresses captured at the precise moment of evidence ingestion to ensure location anchoring.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">Cryptographic Proofs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  Deterministic SHA-256 payload hashes, Merkle roots, Hyperledger Fabric transaction IDs, and block receipts proving non-tampering.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <HardDrive className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">4. Storage Architecture & Cloud Providers</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              IEC employs a partitioned cloud architecture to separate user accounts, operational records, and media payloads:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Google Cloud Firestore:</strong> Houses authoritative user profiles, access states, asset catalog entries, audit trails, and evidence metadata records in the Frankfurt / Iowa regional cluster.</li>
              <li><strong>Cloud Storage & Application Media:</strong> Evidence media files are securely routed to dedicated application storage buckets or served via configured media streaming endpoints with individual file hash checks.</li>
              <li><strong>Google Drive OAuth Integration Disclosure:</strong> If an organization configures optional Google Drive storage for long-term cold evidence archiving, authorization is requested solely under restricted, app-specific Drive scopes (<code className="px-1 font-mono text-xs">drive.file</code> or dedicated app folders). Under no circumstances does IEC inspect, read, or index documents, personal photos, or files outside the designated industrial evidence archive. In the current primary deployment, evidence records are preserved natively in Firestore and cloud ledger structures.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Layers className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">5. Role-Based Access, Sharing & Audit Logs</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Data visibility within IEC is governed strictly by organizational roles:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5 text-gray-600 dark:text-gray-300">
              <li><strong>Technicians:</strong> May create evidence, capture site media, view assets, and review their own submissions.</li>
              <li><strong>Managers:</strong> May view assigned assets, execute cryptographic verification, request re-capture, or escalate detected anomalies.</li>
              <li><strong>Auditors:</strong> Have read-only compliance access to all historical verification records, tamper alerts, and audit trails.</li>
              <li><strong>Administrators:</strong> Manage system user approvals, role assignments, asset definitions, and security policies.</li>
            </ul>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 pt-2">
              Every sensitive action—including submission, ledger anchoring, verification decision, and user role modification—is automatically written to an append-only audit trail stored in Firestore with actor metadata and ISO 8601 timestamps.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Lock className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">6. Data Retention, Integrity & Deletion</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Because IEC serves regulatory and legal compliance functions under international industrial standards:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1.5 text-gray-600 dark:text-gray-300">
              <li><strong>Immutability of Anchored Evidence:</strong> Once an evidence record is anchored to the cryptographic ledger and verified, it cannot be modified, overwritten, or erased by technicians or managers. This ensures non-repudiation and forensic admissibility.</li>
              <li><strong>Audit Trail Longevity:</strong> Audit logs are preserved permanently for the lifecycle of the monitored plant or asset.</li>
              <li><strong>Account Deactivation:</strong> Administrators can deactivate accounts or revoke role privileges. User identity identifiers are retained in historical audit logs to prevent retroactive erasure of chain-of-custody actors.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Server className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">7. Third-Party Services & Subprocessors</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              The application utilizes trusted third-party infrastructure providers:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-gray-500 font-semibold">
                    <th className="py-2.5 pr-4">Provider</th>
                    <th className="py-2.5 pr-4">Purpose</th>
                    <th className="py-2.5">Data Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-600 dark:text-gray-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold">Google Firebase</td>
                    <td className="py-2.5 pr-4">Auth & Cloud Firestore database</td>
                    <td className="py-2.5">User credentials, profiles, evidence records, audit logs</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold">Google Identity</td>
                    <td className="py-2.5 pr-4">OAuth 2.0 Single Sign-On</td>
                    <td className="py-2.5">Email address, full name, profile photo URL</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold">Vercel Inc.</td>
                    <td className="py-2.5 pr-4">Web Application CDN & Edge Hosting</td>
                    <td className="py-2.5">IP addresses, request headers for delivery performance</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
              <Mail className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">8. User Inquiries & Contact Details</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              For questions regarding this policy, security audits, or data rights inquiries, authorized personnel and users may contact the project security officers via the operational contact endpoint:
            </p>
            <div className="p-4 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/50 dark:border-primary-800/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-400 block">Security & Compliance Desk</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white font-medium">support@iec-evidence.org</span>
              </div>
              <a
                href="mailto:support@iec-evidence.org"
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Send Inquiry
              </a>
            </div>
          </section>

        </div>

        {/* Legal Footer Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400 px-2">
          <span>© 2026 Industrial Evidence Chain. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms-of-service" className="hover:text-primary-600 dark:hover:text-primary-400 underline-offset-4 hover:underline">
              Terms of Service
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

