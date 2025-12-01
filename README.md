# Rock Paper Scissors — OnChain Duell

## Projektbeschreibung
Dieses Projekt implementiert **Schere-Stein-Papier als On-Chain-Duell** auf der Ethereum-Blockchain (Sepolia Testnet).  
Zwei Spieler treten gegeneinander an, committen verdeckt ihren Zug mit einem Hash  
und decken ihn später auf. Der Gewinner erhält den vollständigen Einsatz.

> Entwickelt im Rahmen des Blockchain-Technologie-Assignments.

---

## Features
- MetaMask Wallet-Integration
- Spiel erstellen + beitreten
- Commit-Reveal Mechanismus
- On-Chain Spiellogik in Solidity
- Sichere Hash-Berechnung (move + salt)
- React Frontend (Vite)
- Sepolia Testnet kompatibel

---


## Installation

### Voraussetzungen
- Node.js + npm
- MetaMask installiert
- Sepolia-ETH (Testnet-Tokens)

---

### Projekt klonen
```bash
git clone https://github.com/ssa9138/RockPaperScissors.git
cd RockPaperScissors/frontend
```
---
### Abhängigkeiten installieren
```bash
npm install

---
### Projekt starten
```bash
npm run dev
---

### Frontend erreichbar unter:
-> http://localhost:5173
