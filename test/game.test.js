const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RockPaperScissors", function () {
  let token;
  let RPSContract;
  let deployer;
  let player1;
  let player2;

  beforeEach(async function () {
    [deployer, player1, player2, ...addrs] = await ethers.getSigners();

    const RPSToken = await ethers.getContractFactory("RPSToken");
    token = await RPSToken.deploy();
    await token.deployed();

    // Send balance to players
    token.transfer(player1.address, ethers.utils.parseEther("10"));
    token.transfer(player2.address, ethers.utils.parseEther("10"));

    const RockPaperScissors = await ethers.getContractFactory(
      "RockPaperScissors"
    );
    RPSContract = await RockPaperScissors.deploy();
    await RPSContract.deployed();
  });

  it("RockPaperScissors is created correctly", async function () {
    expect(await RPSContract.gamesCounter()).to.equal(0);
  });

  it("Player 1 creates game without bet and win with rock against scissors", async function () {
    // Player 1 creates game
    await RPSContract.connect(player1).createGame(
      token.address,
      player2.address,
      0,
      1,
      false
    );

    // Game created
    expect(await RPSContract.gamesCounter()).to.equal(1);

    // Player 2 play
    const gameId = 0;
    const tx = await RPSContract.connect(player2).play(gameId, 3, false);
    tx.wait();

    // GameFinished event emmited
    expect(tx)
      .to.emit(RPSContract, "GameFinished")
      .withArgs(player1.address, player2.address, token.address, 0);

    // Game state is finished
    const game = await RPSContract.games(gameId);
    expect(game.state).to.equal(1);
  });

  it("Player 1 creates game with bet and win with paper against rock", async function () {
    const bet = ethers.utils.parseEther("1");
    const prize = ethers.utils.parseEther("2");

    // Player 1 approve token to bet
    await token.connect(player1).approve(RPSContract.address, bet);

    // Player 1 creates game
    await RPSContract.connect(player1).createGame(
      token.address,
      player2.address,
      bet,
      2,
      false
    );

    // Game created
    expect(await RPSContract.gamesCounter()).to.equal(1);

    // Player 2 approve token to bet
    await token.connect(player2).approve(RPSContract.address, bet);

    // Player 2 play
    const gameId = 0;
    const tx = await RPSContract.connect(player2).play(gameId, 1, false);
    tx.wait();

    // GameFinished event emmited
    expect(tx)
      .to.emit(RPSContract, "GameFinished")
      .withArgs(player1.address, player2.address, token.address, prize);

    // Game state is finished
    const game = await RPSContract.games(gameId);
    expect(game.state).to.equal(1);

    // Player balances are correct
    expect(
      await RPSContract.playerTokenBalances(player1.address, token.address)
    ).to.equal(prize);
    expect(
      await RPSContract.playerTokenBalances(player2.address, token.address)
    ).to.equal(0);
  });

  it("Player 1 creates game with bet and lose with paper against scissors", async function () {
    const bet = ethers.utils.parseEther("1");
    const prize = ethers.utils.parseEther("2");

    // Player 1 approve token to bet
    await token.connect(player1).approve(RPSContract.address, bet);

    // Player 1 creates game
    await RPSContract.connect(player1).createGame(
      token.address,
      player2.address,
      bet,
      2,
      false
    );

    // Game created
    expect(await RPSContract.gamesCounter()).to.equal(1);

    // Player 2 approve token to bet
    await token.connect(player2).approve(RPSContract.address, bet);

    // Player 2 play
    const gameId = 0;
    const tx = await RPSContract.connect(player2).play(gameId, 3, false);
    tx.wait();

    // GameFinished event emmited
    expect(tx)
      .to.emit(RPSContract, "GameFinished")
      .withArgs(player2.address, player1.address, token.address, prize);

    // Game state is finished
    const game = await RPSContract.games(gameId);
    expect(game.state).to.equal(1);

    // Player balances are correct
    expect(
      await RPSContract.playerTokenBalances(player1.address, token.address)
    ).to.equal(0);
    expect(
      await RPSContract.playerTokenBalances(player2.address, token.address)
    ).to.equal(prize);
  });

  it("Player cant create game with wrong hand", async function () {
    // Player 1 creates game
    await expect(
      RPSContract.connect(player1).createGame(
        token.address,
        player2.address,
        0,
        4,
        false
      )
    ).to.be.reverted;

    // Game not created
    expect(await RPSContract.gamesCounter()).to.equal(0);
  });

  it("Tie and both players claim their bets", async function () {
    const bet = ethers.utils.parseEther("1");

    // Player 1 approve token to bet
    await token.connect(player1).approve(RPSContract.address, bet);

    // Player 1 creates game
    await RPSContract.connect(player1).createGame(
      token.address,
      player2.address,
      bet,
      2,
      false
    );

    // Game created
    expect(await RPSContract.gamesCounter()).to.equal(1);

    // Player 2 approve token to bet
    await token.connect(player2).approve(RPSContract.address, bet);

    // Player 2 play
    const gameId = 0;
    const tx = await RPSContract.connect(player2).play(gameId, 2, false);
    tx.wait();

    // Game state is finished
    const game = await RPSContract.games(gameId);
    expect(game.state).to.equal(1);

    // Player balances are correct
    expect(
      await RPSContract.playerTokenBalances(player1.address, token.address)
    ).to.equal(bet);
    expect(
      await RPSContract.playerTokenBalances(player2.address, token.address)
    ).to.equal(bet);

    expect(await token.balanceOf(player1.address)).to.equal(ethers.utils.parseEther("9"))
    expect(await token.balanceOf(player2.address)).to.equal(ethers.utils.parseEther("9"))
    await RPSContract.connect(player1).claimRewards(token.address)
    await RPSContract.connect(player2).claimRewards(token.address)
    expect(await token.balanceOf(player1.address)).to.equal(ethers.utils.parseEther("10"))
    expect(await token.balanceOf(player2.address)).to.equal(ethers.utils.parseEther("10"))

  });

  it.only("Player 1 wins and claims balance. Player 2 can't claim", async function () {
    const bet = ethers.utils.parseEther("1");
    const prize = ethers.utils.parseEther("2");

    // Player 1 approve token to bet
    await token.connect(player1).approve(RPSContract.address, bet);

    // Player 1 creates game
    await RPSContract.connect(player1).createGame(
      token.address,
      player2.address,
      bet,
      2,
      false
    );

    // Game created
    expect(await RPSContract.gamesCounter()).to.equal(1);

    // Player 2 approve token to bet
    await token.connect(player2).approve(RPSContract.address, bet);

    // Player 2 play
    const gameId = 0;
    const tx = await RPSContract.connect(player2).play(gameId, 1, false);
    tx.wait();

    await RPSContract.connect(player1).claimRewards(token.address)
    //await RPSContract.connect(player2).claimRewards(token.address)
    expect(await token.balanceOf(player1.address)).to.equal(ethers.utils.parseEther("11"))
    expect(await token.balanceOf(player2.address)).to.equal(ethers.utils.parseEther("9"))

    const claim = RPSContract.connect(player2).claimRewards(token.address);
    await expect(claim).to.be.reverted
  })

});
