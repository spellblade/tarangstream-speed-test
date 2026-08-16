import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  Cpu,
  Database,
  Workflow,
  Mail,
  Building2,
  Bookmark,
  Zap,
  Globe,
} from "lucide-react";
import { version } from "../../package.json";

interface AboutPageProps {
  onBack: () => void;
}

export default function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header with Back */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">
          About Tarangstream
        </h1>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 md:p-12 shadow-sm flex flex-col gap-8">
        {/* Overview */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-lg font-bold uppercase tracking-wider">
            <Bookmark className="w-6 h-6" />
            <span>Overview</span>
          </div>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Most internet speed tests give you a single number and move on.
            TarangStream treats your connection as a living system — measuring
            not only raw throughput but also how stable, consistent, and
            resilient it actually is under load.
          </p>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            It uses real concurrent TCP streams against a backend server
            combined with advanced client-side analysis (multiple smoothing
            methods, variance-based packet loss estimation, and geographic-aware
            server selection). The goal is to reveal the true character of your
            link — something simple download tests often miss.
          </p>
        </div>

        {/* Key Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-lg font-bold uppercase tracking-wider">
            <Activity className="w-6 h-6" />
            <span>Key Features</span>
          </div>
          <ul className="text-base text-slate-500 dark:text-slate-400 leading-relaxed space-y-1.5 list-disc pl-4">
            <li>
              <strong>Dual high-resolution speedometers</strong> with live peaks
              for both download and upload.
            </li>
            <li>
              <strong>Real backend streaming tests</strong> — sustained data
              transfer (not just short file downloads) for more realistic
              results.
            </li>
            <li>
              <strong>Live packet loss estimation</strong> derived from transfer
              stalls and variance, not just ping.
            </li>
            <li>
              <strong>Dynamic multi-stream scaling</strong> — automatically
              opens more connections (up to 6+) when conditions allow, to
              properly stress fast links.
            </li>
            <li>
              <strong>Three user-selectable smoothing modes</strong> (EMA, WMA,
              or Hybrid) so you can choose how aggressively the numbers react.
            </li>
            <li>
              <strong>High-fidelity stability tracking</strong> — an interactive
              historical chart showing download, upload, latency, and jitter
              over time.
            </li>
            <li>
              <strong>Geographic server selection</strong> with real distance
              calculations and latency modeling.
            </li>
            <li>
              <strong>Custom server support</strong> — add your own endpoints
              for targeted testing.
            </li>
            <li>
              <strong>Full export</strong> — JSON diagnostics report + CSV
              history for further analysis.
            </li>
            <li>
              <strong>Built-in diagnostics</strong> — performance tier
              references and a glossary explaining every metric.
            </li>
          </ul>
        </div>

        {/* Differentiation */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-lg font-bold uppercase tracking-wider">
            <Zap className="w-6 h-6" />
            <span>How TarangStream Differs from Typical Speed Tests</span>
          </div>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Popular tools (Ookla Speedtest, Fast.com, Cloudflare, etc.) are
            excellent at giving quick peak numbers. TarangStream takes a
            different approach:
          </p>
          <ul className="text-base text-slate-500 dark:text-slate-400 leading-relaxed space-y-1 list-disc pl-4">
            <li>
              Most tests use short, single-threaded or lightly parallel HTTP
              transfers. TarangStream runs sustained, multi-stream tests against
              its own backend to better saturate modern connections.
            </li>
          </ul>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            In short: it is designed for people who need to understand{" "}
            <em>why</em> their connection feels the way it does, not just what
            the headline speed is.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-lg font-bold uppercase tracking-wider">
            <Cpu className="w-6 h-6" />
            <span>The Engineering Behind the Numbers</span>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  WEMA vs. Standard EMA Smoothing
                </h4>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5">
                <strong>Why it matters:</strong> Standard speed tests often feel
                “laggy” or jumpy because they react too slowly or too wildly to
                momentary changes.
              </p>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                TarangStream uses a custom{" "}
                <strong>Weighted Exponential Moving Average (WEMA)</strong> that
                gives more weight to recent samples while still damping noise.
                You can also choose pure EMA (very reactive) or WMA (smoother
                trend following) and switch live.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Intelligent Fallback & Real Measurement
                </h4>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5">
                <strong>Why it matters:</strong> When testing from home or a
                restricted network, pure browser tests can fail or be throttled.
              </p>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                TarangStream prefers real streaming tests against its backend.
                If the connection can’t sustain the test (or the server is
                unreachable), it gracefully falls back to a high-fidelity
                simulation that still respects your measured ping and jitter. An
                automatic fallback engine also switches to backup nodes if a
                primary server stops responding within ~1500 ms.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Workflow className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Stability Visualization with Spline Smoothing
                </h4>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5">
                <strong>Why it matters:</strong> Raw speed numbers fluctuate
                constantly. Most tools either hide this or show noisy graphs.
              </p>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                The stability chart applies{" "}
                <strong>Cubic Bezier spline curves</strong> to historical test
                results. This preserves the overall trend while removing
                distracting micro-spikes, making it much easier to see whether
                your connection is consistently good or has recurring problems.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Database className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Dynamic Concurrency / Thread Scaling
                </h4>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5">
                <strong>Why it matters:</strong> A single connection is rarely
                enough to measure today’s fiber or cable links accurately.
              </p>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                TarangStream starts with one stream and automatically adds more
                (up to 6 or 8 depending on observed speed) when latency is low
                and loss is minimal. This lets it actually saturate gigabit+
                connections instead of being limited by TCP single-stream
                behavior. It also backs off gracefully when conditions degrade.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Geographic-Aware Server Selection
                </h4>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5">
                <strong>Why it matters:</strong> The physical distance to the
                test server has a major effect on latency and the speeds you can
                actually achieve. Testing against a server on the other side of
                the world will show very different results than one nearby.
              </p>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                TarangStream calculates real-world distance using location data.
                The "Optimal" option automatically picks the closest suitable
                server. This distance is also used to model realistic latency
                expectations and to adjust the performance targets when using
                simulated fallback tests.
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostics */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-lg font-bold uppercase tracking-wider">
            <Activity className="w-6 h-6" />
            <span>Diagnostics & Understanding Results</span>
          </div>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            In the Diagnostics tab you’ll find reference tiers (Alpha through
            Delta) that map typical latency, speed, and jitter combinations to
            real-world use cases (gaming, 4K streaming, general browsing, etc.),
            plus a glossary explaining every metric the app measures.
          </p>
        </div>

        {/* About the Organization */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-4">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-lg font-bold uppercase tracking-wider">
            <Building2 className="w-6 h-6" />
            <span>About the Organization</span>
          </div>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Spellblade Labs. Inc. and associated contact information are
            fictional and used for demonstration purposes. It is an independent
            internet performance diagnostics developer dedicated to building
            high-fidelity measuring systems, telemetry software, and distributed 
            monitoring networks. Our tools help network administrators, engineers,
            and everyday users understand the true limits, routing overheads, 
            and quality patterns of their internet connections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider mb-1">
                Headquarters
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                Spellblade Labs. Inc.
                <br />
                100 Demo Science Park Drive, Suite 450
                <br />
                San Francisco, CA 94107
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                  Feedback & Discussion
                </span>
                <a
                  href="mailto:sohamray24@outlook.com"
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-350 hover:underline transition-all block truncate"
                >
                  sohamray24@outlook.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          TarangStream v{version} • © 2026
        </div>
      </div>
    </div>
  );
}
