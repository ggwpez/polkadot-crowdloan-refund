import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Check, Github } from "lucide-react";
import type { ReactNode } from "react";

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-polkadot-cyan)]/15">
        <Check className="h-3 w-3 text-[var(--color-polkadot-cyan)]" strokeWidth={3} />
      </span>
      <span className="text-white/80">{children}</span>
    </li>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0b0b1e] via-[#1a0b2e] to-[#0b0b1e]">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="relative mx-auto mb-8 h-24 w-24">
              <div className="absolute inset-0 rounded-full bg-gradient-polkadot blur-2xl opacity-40" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-xl animate-pop-in">
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-up">
              Mission <span className="text-gradient">Complete</span>
            </h1>
            <p
              className="text-lg text-white/60 max-w-xl mx-auto animate-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              The Polkadot crowdloan refund is done. All contributions and reserves
              handled by this interface have been unlocked and returned to their
              owners.
            </p>
          </div>

          <Card className="mb-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <CardHeader>
              <CardTitle className="text-xl">What was accomplished</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <CheckItem>Crowdloan contributions withdrawn and refunded</CheckItem>
                <CheckItem>Lease reserves released</CheckItem>
                <CheckItem>Crowdloan reserves released</CheckItem>
                <CheckItem>No outstanding claims remain</CheckItem>
              </ul>
            </CardContent>
          </Card>

          <Card className="animate-fade-up" style={{ animationDelay: "360ms" }}>
            <CardContent className="pt-6">
              <p className="text-white/60 text-sm text-center">
                This interface is now retired — no wallet connection needed,
                there is nothing left to claim here.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-polkadot" />
            <span className="text-white/70 text-sm">Polkadot Crowdloan Refund</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://polkadot.network"
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Polkadot
            </a>
            <a
              href="https://github.com/ggwpez/polkadot-crowdloan-refund"
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}