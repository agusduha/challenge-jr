const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RockPaperScissors", function () {

  let token;
  let RPSContract;
  let deployer;
  let player1;
  let player2;
  // ethers.utils.parseEther(bet);

  beforeEach(async function() {
    [deployer, player1, player2, ...addrs] = await ethers.getSigners();

    const RPSToken = await ethers.getContractFactory("RPSToken");
    token = await RPSToken.deploy();
    await token.deployed();

    // Send balance to players
    token.transfer(player1.address, ethers.utils.parseEther("10"))
    token.transfer(player2.address, ethers.utils.parseEther("10"))

    const RockPaperScissors = await ethers.getContractFactory("RockPaperScissors");
    RPSContract = await RockPaperScissors.deploy();
    await RPSContract.deployed();
  });

  it("RockPaperScissors is created correctly", async function () {
    expect(await RPSContract.gamesCounter()).to.equal(0);
  });

  it("Player 1 create game and win", async function () {
    // const bet = ethers.utils.parseEther("1")
    
    // Approve token to bet
    // await token.approve(RPSContract.address, bet)

    // Player 1 creeate game
    await RPSContract.connect(player1).createGame(token.address, player2.address, 0, 1, false)

    expect(await RPSContract.gamesCounter()).to.equal(1);

    const gameId = 0;
    await RPSContract.connect(player2).play(gameId, 3, false)

    const game = await RPSContract.games(gameId)
    expect(game.state).to.equal(1)
  });

  
});
