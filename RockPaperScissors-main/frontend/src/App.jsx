// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// 0 = Rock, 1 = Paper, 2 = Scissors
const MOVE_LABELS = ["Rock", "Paper", "Scissors"];

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balanceEth, setBalanceEth] = useState("0.0");
  const [contractAddr, setContractAddr] = useState("");
  const [contract, setContract] = useState(null);
  const [status, setStatus] = useState("");
  const [saltLocal, setSaltLocal] = useState("");
  const [stakeEth, setStakeEth] = useState("0.011"); // default stake (ETH)
  const [gameIdInput, setGameIdInput] = useState("1");

  // NEW: aktuell gewählter Move (0 = Rock, 1 = Paper, 2 = Scissors)
  const [selectedMove, setSelectedMove] = useState(0);

  useEffect(() => {
    // init provider if ethereum available
    if (window.ethereum) {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
      // try load address file automatically
      fetch("/RPS_ADDRESS.json")
        .then((r) => r.json())
        .then((j) => {
          if (j.address) setContractAddr(j.address);
        })
        .catch(() => {});

      // listen for account/network changes and update UI
      const handleAccountsChanged = async (accounts) => {
        if (!accounts || accounts.length === 0) {
          setAccount("");
          setSigner(null);
          setBalanceEth("0.0");
          setStatus("Wallet disconnected");
          return;
        }
        await internalSetSignerAndBalance(p, accounts[0]);
      };

      const handleChainChanged = async (chainId) => {
        // chain changed -> re-create provider & signer & update balance
        const newP = new ethers.BrowserProvider(window.ethereum);
        setProvider(newP);
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts && accounts[0]) await internalSetSignerAndBalance(newP, accounts[0]);
        } catch (e) {
          console.warn("chainChanged handler error", e);
        }
      };

      window.ethereum.on?.("accountsChanged", handleAccountsChanged);
      window.ethereum.on?.("chainChanged", handleChainChanged);

      return () => {
        try {
          window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener?.("chainChanged", handleChainChanged);
        } catch (e) {}
      };
    } else {
      setStatus("Please install MetaMask");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to set signer and load balance for a given address
  async function internalSetSignerAndBalance(p, addr) {
    try {
      const s = await p.getSigner();
      setSigner(s);
      setAccount(addr);
      setStatus("Wallet connected: " + addr);

      // ensure we are on Sepolia — try to switch (best-effort)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Sepolia hex
        });
      } catch (switchError) {
        console.debug("wallet_switchEthereumChain error (can be ignored):", switchError?.message || switchError);
      }

      const bal = await p.getBalance(addr);
      setBalanceEth(ethers.formatEther(bal));
    } catch (e) {
      console.error("internalSetSignerAndBalance error", e);
    }
  }

  // Connect wallet button
  const connect = async () => {
    if (!window.ethereum) return setStatus("No provider (install MetaMask)");
    try {
      // re-create provider each connect to be safe
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);

      await p.send("eth_requestAccounts", []);
      const signerObj = await p.getSigner();
      const addr = await signerObj.getAddress();
      await internalSetSignerAndBalance(p, addr);
    } catch (err) {
      console.error(err);
      setStatus("User denied wallet connection or error occurred.");
    }
  };

  const loadContract = async () => {
    if (!contractAddr) return setStatus("Contract address missing");
    try {
      const abiResp = await fetch("/RPS_ABI.json").then((r) => r.json());
      const c = new ethers.Contract(contractAddr, abiResp.abi, provider || ethers.getDefaultProvider());
      setContract(c);
      setStatus("Contract loaded (read-only)");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load contract ABI/address.");
    }
  };

  // helper: parse stake input and return BigInt value or throw
  const parseStake = (ethString) => {
    if (!ethString || ethString.trim() === "") throw new Error("Stake empty");
    const s = ethString.replace(",", ".").trim();
    if (isNaN(Number(s))) throw new Error("Invalid stake value");
    return ethers.parseEther(s); // BigInt
  };

  const createGame = async () => {
    try {
      setStatus("Preparing transaction...");
      if (!signer || !provider) return setStatus("Please connect your wallet first.");
      if (!contractAddr || contractAddr.length < 10) return setStatus("Contract address missing or invalid.");

      const abiResp = await fetch("/RPS_ABI.json").then((r) => r.json()).catch(() => null);
      if (!abiResp || !abiResp.abi) return setStatus("ABI not found. Make sure frontend/public/RPS_ABI.json exists.");

      const c = new ethers.Contract(contractAddr, abiResp.abi, signer);

      const sender = await signer.getAddress();
      const bal = await provider.getBalance(sender);

      let value;
      try {
        value = parseStake(stakeEth);
      } catch (e) {
        return setStatus("Invalid stake: " + e.message);
      }

      console.log("Sender", sender, "balance", ethers.formatEther(bal));
      if (bal < value) {
        return setStatus("Insufficient balance for stake. Balance: " + ethers.formatEther(bal));
      }

      setStatus("Sending createGame transaction (value " + ethers.formatEther(value) + " ETH)...");
      const tx = await c.createGame(120, 120, { value });
      setStatus("Transaction sent: " + (tx.hash || "no-hash"));
      await tx.wait();
      setStatus("Game created (tx mined).");

      const balAfter = await provider.getBalance(await signer.getAddress());
      setBalanceEth(ethers.formatEther(balAfter));
    } catch (err) {
      console.error("createGame error", err);
      if (err?.data) setStatus("Error: " + JSON.stringify(err.data));
      else if (err?.error?.message) setStatus("Error: " + err.error.message);
      else if (err?.message) setStatus("Error: " + err.message);
      else setStatus("Unknown error (see console).");
    }
  };

  const joinGame = async (id) => {
    try {
      setStatus("Preparing join...");
      if (!signer || !provider) return setStatus("Please connect your wallet first.");
      if (!contractAddr || contractAddr.length < 10) return setStatus("Contract address missing or invalid.");

      const abiResp = await fetch("/RPS_ABI.json").then((r) => r.json()).catch(() => null);
      if (!abiResp || !abiResp.abi) return setStatus("ABI not found.");

      const c = new ethers.Contract(contractAddr, abiResp.abi, signer);

      const sender = await signer.getAddress();
      const bal = await provider.getBalance(sender);

      let value;
      try {
        value = parseStake(stakeEth);
      } catch (e) {
        return setStatus("Invalid stake: " + e.message);
      }

      if (bal < value) return setStatus("Insufficient balance for stake. Balance: " + ethers.formatEther(bal));

      setStatus("Sending joinGame transaction (value " + ethers.formatEther(value) + " ETH)...");
      const tx = await c.joinGame(id, { value });
      setStatus("Join tx sent: " + (tx.hash || "no-hash"));
      await tx.wait();
      setStatus("Joined game (tx mined).");

      const balAfter = await provider.getBalance(await signer.getAddress());
      setBalanceEth(ethers.formatEther(balAfter));
    } catch (err) {
      console.error("joinGame error", err);
      if (err?.message) setStatus("Error: " + err.message);
      else setStatus("Unknown error (see console).");
    }
  };

  // Commit eines Moves (0=Rock,1=Paper,2=Scissors)
  const commit = async (id, move) => {
    try {
      if (!signer) return setStatus("Connect wallet first");
      const salt = Math.random().toString(36).slice(2, 12);
      setSaltLocal(salt);

      const moveBytes = ethers.hexZeroPad(ethers.hexlify(move), 1);
      const packed = ethers.concat([moveBytes, ethers.toUtf8Bytes(salt)]);
      const hash = ethers.keccak256(packed);

      const abiResp = await fetch("/RPS_ABI.json").then((r) => r.json());
      const c = new ethers.Contract(contractAddr, abiResp.abi, signer);
      const tx = await c.commitMove(id, hash);

      setStatus("Committed tx: " + tx.hash + " (save salt)");
      await tx.wait();
      setStatus("Committed");

      window.localStorage.setItem(
        "rps-salt-" + id + "-" + (await signer.getAddress()),
        salt
      );

      const balAfter = await provider.getBalance(await signer.getAddress());
      setBalanceEth(ethers.formatEther(balAfter));
    } catch (err) {
      console.error(err);
      setStatus("Commit error: " + (err?.message || "see console"));
    }
  };

  const reveal = async (id, move) => {
    try {
      if (!signer) return setStatus("Connect wallet first");
      const salt = window.localStorage.getItem(
        "rps-salt-" + id + "-" + (await signer.getAddress())
      );
      if (!salt) return setStatus("No salt found for this game/account");

      const abiResp = await fetch("/RPS_ABI.json").then((r) => r.json());
      const c = new ethers.Contract(contractAddr, abiResp.abi, signer);
      const tx = await c.revealMove(id, move, salt);

      setStatus("Reveal tx: " + tx.hash);
      await tx.wait();
      setStatus("Reveal confirmed");

      const balAfter = await provider.getBalance(await signer.getAddress());
      setBalanceEth(ethers.formatEther(balAfter));
    } catch (err) {
      console.error(err);
      setStatus("Reveal error: " + (err?.message || "see console"));
    }
  };

  const readBasic = async (id) => {
    try {
      if (!provider) return setStatus("No provider");
      const abiResp = await fetch("/RPS_ABI.json").then((r) => r.json()).catch(() => null);
      if (!abiResp || !abiResp.abi) return setStatus("ABI not found.");
      const c = new ethers.Contract(contractAddr, abiResp.abi, provider);
      const b = await c.getBasic(id);
      setStatus(
        "Game " +
          id +
          ": p1=" +
          b[0] +
          " p2=" +
          b[1] +
          " stake=" +
          ethers.formatEther(b[2]) +
          " state=" +
          b[3]
      );
    } catch (err) {
      console.error(err);
      setStatus("Read error: " + (err?.message || "see console"));
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", background: "#fff", padding: 20, borderRadius: 12 }}>
      <h1>RockPaperScissors — OnChain Duell</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={connect}>Connect Wallet</button>
        <div style={{ marginLeft: 12, fontSize: 12 }}>{account ? account : "Not connected"}</div>
        <div style={{ marginLeft: 12, fontSize: 12 }}>Balance: {balanceEth} ETH</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          placeholder="Contract address"
          style={{ width: "60%" }}
          value={contractAddr}
          onChange={(e) => setContractAddr(e.target.value)}
        />
        <button onClick={loadContract} style={{ marginLeft: 8 }}>
          Load
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <label>Stake (ETH): </label>
        <input
          value={stakeEth}
          onChange={(e) => setStakeEth(e.target.value)}
          style={{ width: 100, padding: 6, borderRadius: 6 }}
        />
        <label style={{ marginLeft: 12 }}>Game ID:</label>
        <input
          value={gameIdInput}
          onChange={(e) => setGameIdInput(e.target.value)}
          style={{ width: 80, padding: 6, borderRadius: 6 }}
        />
      </div>

      {/* NEW: Move-Auswahl */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span>Choose your move:</span>
        {MOVE_LABELS.map((label, idx) => (
          <button
            key={label}
            onClick={() => setSelectedMove(idx)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: selectedMove === idx ? "2px solid #2563eb" : "1px solid #ccc",
              background: selectedMove === idx ? "#e0edff" : "#f7f7f7",
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 12, fontSize: 12 }}>
          Selected: <strong>{MOVE_LABELS[selectedMove]}</strong>
        </span>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={createGame}>Create game ({stakeEth} ETH)</button>
        <button onClick={() => joinGame(Number(gameIdInput))}>Join game #{gameIdInput}</button>
        <button onClick={() => commit(Number(gameIdInput), selectedMove)}>
          Commit {MOVE_LABELS[selectedMove]} (id={gameIdInput})
        </button>
        <button onClick={() => reveal(Number(gameIdInput), selectedMove)}>
          Reveal {MOVE_LABELS[selectedMove]} (id={gameIdInput})
        </button>
        <button onClick={() => readBasic(Number(gameIdInput))}>Read Game #{gameIdInput}</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div>Status: {status}</div>
        <div>Saved salt: {saltLocal}</div>
      </div>
    </div>
  );
}
