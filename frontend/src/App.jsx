import { useState, useEffect, useCallback } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  keccak256,
  toHex,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { NOXGUARD_ABI, NOXGUARD_ADDRESS, CRLC_ADDRESS, ERC7984_ABI } from "./utils/contracts";

// ─── Helpers ──────────────────────────────────────────────────────

const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

const BOUNTY_STATUS = ["Active", "Closed"];
const FINDING_STATUS = ["Submitted", "Approved", "Rejected"];

// Gas config for Arbitrum Sepolia (avoid "max fee less than base fee" errors)
// 1 gwei = 50x typical base fee headroom
const GAS_OVERRIDES = {
  gas: 5000000n,
  maxFeePerGas: 1000000000n,
  maxPriorityFeePerGas: 1000000n,
};

// ─── CreateBountyForm (hoisted) ───────────────────────────────────

function CreateBountyForm({ ctx }) {
  const {
    walletClient, publicClient, handleClient,
    loading, setLoading, txStatus, setTxStatus, error, setError,
    setView, loadBounties,
  } = ctx;

  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");

  const handleCreate = async () => {
    if (!walletClient || !title || !scope || !rewardAmount) return;
    setLoading(true);
    setTxStatus("Step 1/3: Setting operator on cRLC...");
    setError("");

    try {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30;

      const setOpHash = await walletClient.writeContract({
        address: CRLC_ADDRESS,
        abi: ERC7984_ABI,
        functionName: "setOperator",
        args: [NOXGUARD_ADDRESS, futureTimestamp],
        ...GAS_OVERRIDES,
      });
      await publicClient.waitForTransactionReceipt({ hash: setOpHash });

      setTxStatus("Step 2/3: Encrypting reward amount...");
      let encryptedHandle, inputProof;

      if (handleClient) {
        const encrypted = await handleClient.encryptInput(
          BigInt(rewardAmount),
          "uint256",
          NOXGUARD_ADDRESS
        );
        encryptedHandle = encrypted.handle;
        inputProof = encrypted.handleProof;
      } else {
        setError("Nox Handle SDK required for encryption.");
        setLoading(false);
        return;
      }

      setTxStatus("Step 3/3: Creating bounty on-chain...");

      const createHash = await walletClient.writeContract({
        address: NOXGUARD_ADDRESS,
        abi: NOXGUARD_ABI,
        functionName: "createBounty",
        args: [CRLC_ADDRESS, encryptedHandle, inputProof, title, scope],
        ...GAS_OVERRIDES,
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      setTxStatus("Bounty created successfully!");
      setTimeout(() => {
        setView("dashboard");
        setTxStatus("");
        loadBounties();
      }, 2000);
    } catch (err) {
      setError(err.message || "Transaction failed");
      setTxStatus("");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => setView("dashboard")}
        className="text-nox-muted hover:text-nox-text mb-6 flex items-center gap-2"
      >
        ← Back to Dashboard
      </button>

      <div className="glass-card p-8 glow-accent">
        <h2 className="text-2xl font-bold mb-2">Create Bounty Program</h2>
        <p className="text-nox-muted mb-8">
          Deposit confidential tokens as rewards. Amount stays encrypted on-chain.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-nox-muted mb-2">
              Bounty Title
            </label>
            <input
              className="input-field"
              placeholder="e.g. DeFi Protocol Security Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nox-muted mb-2">
              Scope Description
            </label>
            <textarea
              className="input-field min-h-[120px]"
              placeholder="Describe what is in scope for this bounty..."
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nox-muted mb-2">
              Reward Amount (cRLC)
            </label>
            <input
              className="input-field mono"
              type="number"
              placeholder="e.g. 100"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
            />
            <p className="text-xs text-nox-muted mt-2">
              This amount will be encrypted before depositing into the escrow.
            </p>
          </div>

          {txStatus && (
            <div className="bg-nox-accent/10 border border-nox-accent/30 rounded-xl p-4 text-nox-accent">
              {txStatus}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
              {error}
            </div>
          )}

          <button
            className="btn-primary w-full"
            onClick={handleCreate}
            disabled={loading || !title || !scope || !rewardAmount}
          >
            {loading ? "Processing..." : "Create Bounty"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SubmitFindingForm (hoisted) ──────────────────────────────────

function SubmitFindingForm({ bounty, ctx }) {
  const {
    walletClient, publicClient,
    loading, setLoading, txStatus, setTxStatus, error, setError,
    loadFindings, loadBounties,
  } = ctx;

  const [report, setReport] = useState("");

  const handleSubmit = async () => {
    if (!walletClient || !report) return;
    setLoading(true);
    setTxStatus("Submitting finding...");
    setError("");

    try {
      const reportHash = keccak256(toHex(report));

      const hash = await walletClient.writeContract({
        address: NOXGUARD_ADDRESS,
        abi: NOXGUARD_ABI,
        functionName: "submitFinding",
        args: [BigInt(bounty.id), reportHash],
        ...GAS_OVERRIDES,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setTxStatus("Finding submitted successfully!");
      setReport("");
      setTimeout(() => {
        setTxStatus("");
        loadFindings(bounty.id, bounty.findingCount + 1);
        loadBounties();
      }, 2000);
    } catch (err) {
      setError(err.message || "Transaction failed");
      setTxStatus("");
    }
    setLoading(false);
  };

  return (
    <div className="glass-card p-6 mt-6">
      <h3 className="text-xl font-bold mb-4">Submit a Finding</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-nox-muted mb-2">
            Report Content
          </label>
          <textarea
            className="input-field min-h-[150px]"
            placeholder="Describe the vulnerability you found..."
            value={report}
            onChange={(e) => setReport(e.target.value)}
          />
          <p className="text-xs text-nox-muted mt-1">
            A hash of your report will be committed on-chain (commit phase).
          </p>
        </div>

        {txStatus && (
          <div className="bg-nox-accent/10 border border-nox-accent/30 rounded-xl p-4 text-nox-accent text-sm">
            {txStatus}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          className="btn-primary w-full"
          onClick={handleSubmit}
          disabled={loading || !report}
        >
          {loading ? "Submitting..." : "Submit Finding"}
        </button>
      </div>
    </div>
  );
}

// ─── ApproveFindingButton (hoisted) ───────────────────────────────

function ApproveFindingButton({ bountyId, findingId, ctx }) {
  const {
    walletClient, publicClient, handleClient, bounties,
    loading, setLoading, setTxStatus, setError,
    loadFindings,
  } = ctx;

  const [payoutAmount, setPayoutAmount] = useState("");
  const [showApprove, setShowApprove] = useState(false);

  const handleApprove = async () => {
    if (!walletClient || !payoutAmount || !handleClient) return;
    setLoading(true);
    setTxStatus("Encrypting payout amount...");
    setError("");

    try {
      const encrypted = await handleClient.encryptInput(
        BigInt(payoutAmount),
        "uint256",
        NOXGUARD_ADDRESS
      );

      setTxStatus("Approving finding and releasing payment...");

      const hash = await walletClient.writeContract({
        address: NOXGUARD_ADDRESS,
        abi: NOXGUARD_ABI,
        functionName: "approveFinding",
        args: [BigInt(bountyId), BigInt(findingId), encrypted.handle, encrypted.handleProof],
        ...GAS_OVERRIDES,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setTxStatus("Finding approved! Payment released.");
      setTimeout(() => {
        setTxStatus("");
        loadFindings(bountyId, bounties.find((b) => b.id === bountyId)?.findingCount || 0);
      }, 2000);
    } catch (err) {
      setError(err.message || "Transaction failed");
      setTxStatus("");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!walletClient) return;
    setLoading(true);
    setError("");
    try {
      const hash = await walletClient.writeContract({
        address: NOXGUARD_ADDRESS,
        abi: NOXGUARD_ABI,
        functionName: "rejectFinding",
        args: [BigInt(bountyId), BigInt(findingId)],
        ...GAS_OVERRIDES,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      loadFindings(bountyId, bounties.find((b) => b.id === bountyId)?.findingCount || 0);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!showApprove) {
    return (
      <div className="flex gap-2">
        <button
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2 px-4 rounded-lg transition"
          onClick={() => setShowApprove(true)}
        >
          Approve
        </button>
        <button
          className="bg-red-600 hover:bg-red-500 text-white text-sm py-2 px-4 rounded-lg transition"
          onClick={handleReject}
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        className="input-field text-sm w-32 py-2"
        type="number"
        placeholder="Payout"
        value={payoutAmount}
        onChange={(e) => setPayoutAmount(e.target.value)}
      />
      <button
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2 px-4 rounded-lg transition"
        onClick={handleApprove}
        disabled={loading || !payoutAmount}
      >
        Confirm
      </button>
      <button
        className="text-nox-muted hover:text-nox-text text-sm"
        onClick={() => setShowApprove(false)}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── BountyDetail (hoisted) ───────────────────────────────────────

function BountyDetail({ bounty, ctx }) {
  const {
    account, findings, txStatus, error,
    setView, setSelectedBounty, setFindings,
    loadFindings,
  } = ctx;

  const isCreator = account?.toLowerCase() === bounty.creator.toLowerCase();

  // useEffect cuma fire saat bounty.id atau findingCount berubah.
  // Sekarang BountyDetail di-hoist keluar App jadi NOT recreated tiap render.
  // Tidak ada lagi unmount/remount infinite loop.
  useEffect(() => {
    loadFindings(bounty.id, bounty.findingCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounty.id, bounty.findingCount]);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => {
          setView("dashboard");
          setSelectedBounty(null);
          setFindings([]);
        }}
        className="text-nox-muted hover:text-nox-text mb-6 flex items-center gap-2"
      >
        ← Back to Dashboard
      </button>

      <div className="glass-card p-8 glow-accent">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{bounty.title}</h2>
            <p className="text-nox-muted text-sm mt-1 mono">
              by {shortenAddress(bounty.creator)}
            </p>
          </div>
          <span className={bounty.status === 0 ? "status-active" : "status-closed"}>
            {BOUNTY_STATUS[bounty.status]}
          </span>
        </div>

        <div className="bg-nox-dark rounded-xl p-4 mb-6">
          <p className="text-sm text-nox-muted mb-1">Scope</p>
          <p className="text-nox-text">{bounty.scope}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-nox-dark rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-nox-accent">
              {bounty.findingCount}
            </p>
            <p className="text-xs text-nox-muted">Findings</p>
          </div>
          <div className="bg-nox-dark rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-nox-orange">****</p>
            <p className="text-xs text-nox-muted">Reward (Encrypted)</p>
          </div>
          <div className="bg-nox-dark rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-nox-green">cRLC</p>
            <p className="text-xs text-nox-muted">Token</p>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-4">
          Findings ({findings.length})
        </h3>

        {findings.length === 0 ? (
          <p className="text-nox-muted text-center py-8">
            No findings submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {findings.map((f) => (
              <div
                key={f.id}
                className="bg-nox-dark rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm mono text-nox-muted">
                    Finding #{f.id} by {shortenAddress(f.hunter)}
                  </p>
                  <p className="text-xs mono text-nox-muted mt-1">
                    Hash: {f.reportHash.slice(0, 18)}...
                  </p>
                  {f.reportURI && (
                    <p className="text-xs text-nox-accent mt-1">
                      Report: {f.reportURI}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      f.status === 0
                        ? "status-submitted"
                        : f.status === 1
                        ? "status-approved"
                        : "status-rejected"
                    }
                  >
                    {FINDING_STATUS[f.status]}
                  </span>
                  {isCreator && f.status === 0 && (
                    <ApproveFindingButton
                      bountyId={bounty.id}
                      findingId={f.id}
                      ctx={ctx}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {txStatus && (
          <div className="bg-nox-accent/10 border border-nox-accent/30 rounded-xl p-4 text-nox-accent text-sm mt-4">
            {txStatus}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mt-4">
            {error}
          </div>
        )}

        {!isCreator && bounty.status === 0 && (
          <SubmitFindingForm bounty={bounty} ctx={ctx} />
        )}
      </div>
    </div>
  );
}

// ─── Dashboard (hoisted) ──────────────────────────────────────────

function Dashboard({ ctx }) {
  const { bounties, setView, setSelectedBounty } = ctx;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Bounty Programs</h2>
          <p className="text-nox-muted">
            Browse active programs. Reward amounts are encrypted.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setView("create")}>
          + Create Bounty
        </button>
      </div>

      {bounties.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">🛡</div>
          <h3 className="text-xl font-bold mb-2">No Bounties Yet</h3>
          <p className="text-nox-muted mb-6">
            Be the first to create a confidential bounty program.
          </p>
          <button className="btn-primary" onClick={() => setView("create")}>
            Create First Bounty
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bounties.map((b) => (
            <div
              key={b.id}
              className="glass-card p-6 cursor-pointer hover:border-nox-accent/50 transition-all"
              onClick={() => {
                setSelectedBounty(b);
                setView("bounty");
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold">{b.title}</h3>
                <span
                  className={b.status === 0 ? "status-active" : "status-closed"}
                >
                  {BOUNTY_STATUS[b.status]}
                </span>
              </div>
              <p className="text-sm text-nox-muted mb-4 line-clamp-2">
                {b.scope}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-nox-muted">
                  {b.findingCount} findings
                </span>
                <span className="text-nox-accent mono">Reward: ****</span>
              </div>
              <p className="text-xs mono text-nox-muted mt-2">
                by {shortenAddress(b.creator)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────

export default function App() {
  const [account, setAccount] = useState(null);
  const [publicClient, setPublicClient] = useState(null);
  const [walletClient, setWalletClient] = useState(null);
  const [handleClient, setHandleClient] = useState(null);
  const [view, setView] = useState("dashboard");
  const [bounties, setBounties] = useState([]);
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [error, setError] = useState("");

  // ─── Wallet Connection ────────────────────────────────────────

  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        setError("Please install MetaMask");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x66eee" }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x66eee",
                chainName: "Arbitrum Sepolia",
                rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
                blockExplorerUrls: ["https://sepolia.arbiscan.io"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        }
      }

      const wClient = createWalletClient({
        account: accounts[0],
        chain: arbitrumSepolia,
        transport: custom(window.ethereum),
      });

      const pClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: custom(window.ethereum),
      });

      setAccount(accounts[0]);
      setWalletClient(wClient);
      setPublicClient(pClient);

      try {
        const { createViemHandleClient } = await import("@iexec-nox/handle");
        const hClient = await createViemHandleClient(wClient);
        setHandleClient(hClient);
      } catch (e) {
        console.warn("Nox Handle SDK not available:", e);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Load Bounties ────────────────────────────────────────────

  const loadBounties = useCallback(async () => {
    if (!publicClient) return;
    try {
      const count = await publicClient.readContract({
        address: NOXGUARD_ADDRESS,
        abi: NOXGUARD_ABI,
        functionName: "bountyCount",
      });

      const loaded = [];
      for (let i = 0; i < Number(count); i++) {
        const data = await publicClient.readContract({
          address: NOXGUARD_ADDRESS,
          abi: NOXGUARD_ABI,
          functionName: "getBounty",
          args: [BigInt(i)],
        });
        loaded.push({
          id: i,
          creator: data[0],
          token: data[1],
          title: data[2],
          scope: data[3],
          findingCount: Number(data[4]),
          status: Number(data[5]),
        });
      }
      setBounties(loaded);
    } catch (err) {
      console.error("Failed to load bounties:", err);
    }
  }, [publicClient]);

  useEffect(() => {
    if (publicClient) loadBounties();
  }, [publicClient, loadBounties]);

  // ─── Load Findings ────────────────────────────────────────────

  const loadFindings = useCallback(async (bountyId, findingCount) => {
    if (!publicClient) return;
    const loaded = [];
    for (let i = 0; i < findingCount; i++) {
      const data = await publicClient.readContract({
        address: NOXGUARD_ADDRESS,
        abi: NOXGUARD_ABI,
        functionName: "getFinding",
        args: [BigInt(bountyId), BigInt(i)],
      });
      loaded.push({
        id: i,
        hunter: data[0],
        reportHash: data[1],
        reportURI: data[2],
        status: Number(data[3]),
      });
    }
    setFindings(loaded);
  }, [publicClient]);

  // Context object passed to all hoisted child components
  const ctx = {
    account, publicClient, walletClient, handleClient,
    bounties, findings,
    loading, setLoading, txStatus, setTxStatus, error, setError,
    setView, setSelectedBounty, setFindings,
    loadBounties, loadFindings,
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <header className="border-b border-nox-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nox-accent rounded-xl flex items-center justify-center text-white font-bold text-lg">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold">NoxGuard</h1>
              <p className="text-xs text-nox-muted">
                Confidential Audit Escrow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-nox-muted bg-nox-card px-3 py-1 rounded-full border border-nox-border">
              Arbitrum Sepolia
            </span>
            {account ? (
              <div className="flex items-center gap-2 bg-nox-card px-4 py-2 rounded-xl border border-nox-border">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="mono text-sm">{shortenAddress(account)}</span>
              </div>
            ) : (
              <button className="btn-primary text-sm py-2" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!account ? (
          <div className="glass-card p-16 text-center glow-accent max-w-xl mx-auto mt-16">
            <div className="text-5xl mb-6">🔐</div>
            <h2 className="text-3xl font-bold mb-3">Welcome to NoxGuard</h2>
            <p className="text-nox-muted mb-8 max-w-md mx-auto">
              Trustless bug bounty escrow where reward amounts stay encrypted
              until settlement. Built on Nox Protocol with ERC-7984 Confidential Tokens.
            </p>
            <button className="btn-primary text-lg py-4 px-8" onClick={connectWallet}>
              Connect Wallet to Start
            </button>
            <p className="text-xs text-nox-muted mt-4">
              Requires MetaMask on Arbitrum Sepolia
            </p>
          </div>
        ) : view === "dashboard" ? (
          <Dashboard ctx={ctx} />
        ) : view === "create" ? (
          <CreateBountyForm ctx={ctx} />
        ) : view === "bounty" && selectedBounty ? (
          <BountyDetail bounty={selectedBounty} ctx={ctx} />
        ) : (
          <Dashboard ctx={ctx} />
        )}
      </main>

      <footer className="border-t border-nox-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <p className="text-sm text-nox-muted">
            Built for iExec Vibe Coding Challenge 2026
          </p>
          <div className="flex gap-4 text-sm text-nox-muted">
            <a
              href="https://docs.iex.ec/nox-protocol/getting-started/welcome"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-nox-text"
            >
              Nox Docs
            </a>
            <a
              href="https://cdefi.iex.ec/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-nox-text"
            >
              Get cRLC
            </a>
            <a
              href="https://github.com/xnotok-ops/noxguard"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-nox-text"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
