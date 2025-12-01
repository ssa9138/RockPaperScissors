const fs = require('fs');
const path = require('path');
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with', deployer.address);

  const RPS = await ethers.getContractFactory('RockPaperScissors');
  const rps = await RPS.deploy();
  if (typeof rps.waitForDeployment === 'function') {
    await rps.waitForDeployment();
  } else if (typeof rps.deployed === 'function') {
    await rps.deployed();
  }

  const address = (rps.getAddress ? await rps.getAddress() : rps.address);
  console.log('Deployed:', address);

  const frontendPublic = path.resolve(__dirname, '..', 'frontend', 'public');
  if (!fs.existsSync(frontendPublic)) fs.mkdirSync(frontendPublic, { recursive: true });

  fs.writeFileSync(path.join(frontendPublic, 'RPS_ADDRESS.json'), JSON.stringify({ address }, null, 2));

  const artifactPath = path.resolve(__dirname, '..', 'artifacts', 'contracts', 'RockPaperScissors.sol', 'RockPaperScissors.json');
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    if (artifact.abi) {
      fs.writeFileSync(path.join(frontendPublic, 'RPS_ABI.json'), JSON.stringify({ abi: artifact.abi }, null, 2));
      console.log('ABI written to frontend/public/RPS_ABI.json');
    }
  } else {
    console.warn('Artifact not found; run npx hardhat compile first.');
  }
}
main().catch((e)=>{ console.error(e); process.exitCode = 1 });
