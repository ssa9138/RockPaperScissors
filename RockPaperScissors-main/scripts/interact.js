require('dotenv').config();
const { ethers } = require('hardhat');
async function main(){
  const addr = process.env.RPS_ADDRESS;
  if(!addr) throw new Error('Set RPS_ADDRESS in .env');
  const rps = await ethers.getContractAt('RockPaperScissors', addr);
  const info = await rps.getBasic(1);
  console.log('Game 1:', info);
}
main().catch(e=>{ console.error(e); process.exitCode=1 });
