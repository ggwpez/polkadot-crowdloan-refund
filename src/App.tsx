import { Wallet, Lock, Building2 } from "lucide-react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import ConnectWallet from "./components/ConnectWallet";
import CrowdloanContributions from "./pages/CrowdloanContributions";
import LeaseReserve from "./pages/LeaseReserve";
import CrowdloanReserve from "./pages/CrowdloanReserve";
import { PolkadotProvider } from "./providers/PolkadotProvider";
import { RPCSettingsProvider } from "./providers/RPCSettingsProvider";

function Navigation() {
  const links = [
    { to: "/", label: "Crowdloan Contributions", icon: Wallet },
    { to: "/lease-reserve", label: "Lease Reserves", icon: Lock },
    { to: "/crowdloan-reserve", label: "Crowdloan Reserves", icon: Building2 },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/10 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-polkadot"></div>
            <span className="text-xl font-bold text-white">AssetHub AhOps</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ConnectWallet />
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="glass-dark border-t border-white/10 mt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-polkadot"></div>
            <span className="text-white/70 text-sm">
              AssetHub AhOps Interface
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://polkadot.network"
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Polkadot
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <RPCSettingsProvider>
      <PolkadotProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-br from-[#0b0b1e] via-[#1a0b2e] to-[#0b0b1e]">
            <Navigation />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<CrowdloanContributions />} />
                <Route path="/lease-reserve" element={<LeaseReserve />} />
                <Route path="/crowdloan-reserve" element={<CrowdloanReserve />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </PolkadotProvider>
    </RPCSettingsProvider>
  );
}
