# Rock–Paper–Scissors (RPS) – Blockchain DApp on Sepolia

Dieses Projekt implementiert das klassische Spiel **Stein–Papier–Schere** als **interaktive, trustless Web3 DApp**.  
Es besteht aus zwei Hauptteilen:

1. **Smart Contract (Solidity / Hardhat)**  
2. **Frontend (Vite + React + MetaMask)**

Die DApp wurde für Task 3 entwickelt und erfüllt folgende Anforderungen:
- Interaktive Smart Contracts  
- Deployment auf Sepolia  
- Dokumentation + ABI + Code + Instructions  
- Bonus: Eigenes, funktionales Frontend  

---

##  Features

### 2-Spieler PvP (on-chain)  
Zwei Spieler treten gegeneinander an, Einsätze werden vorab eingezahlt.

### Faires Spiel dank Commit–Reveal Mechanismus  
Spieler senden zuerst einen verschlüsselten Hash ihres Zuges (`commit`).  
Danach müssen beide ihren Zug offenlegen (`reveal`).  
→ verhindert Betrug, da kein Spieler sehen kann, was der andere gewählt hat.

### Vollständig On-Chain  
- Spiele anlegen  
- Spiel beitreten  
- Commit senden  
- Reveal durchführen  
- Gewinner wird automatisch bestimmt  
- Gewinne werden automatisch ausgezahlt

### Cooles Frontend  
Das Frontend bietet:  
- MetaMask-Verbindung  
- Spiele erstellen / beitreten  
- Commit & Reveal Buttons  
- Aktualisierung des Spielstatus  
- Anzeige der Sieger  
- Automatisches Laden von ABI + Contract-Adresse

---

# Projektstruktur

