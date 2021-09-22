// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract RockPaperScissors {
    enum Hand {
        NONE,
        ROCK,
        PAPER,
        SCISSORS
    }

    enum State {
        STARTED,
        FINISHED,
        CANCELED
    }

    struct Game {
        IERC20 token;
        address player1;
        address player2;
        uint256 bet;
        State state;
        Hand hand1;
        Hand hand2;
        uint256 startTime;
    }

    uint256 public gamesCounter;
    mapping(uint256 => Game) public games;

    mapping(address => mapping(address => uint256)) public playerTokenBalances;

    event GameCreated(
        address indexed player1,
        address indexed player2,
        address indexed token,
        uint256 bet
    );
    event GameFinished(
        address indexed winner,
        address indexed looser,
        address indexed token,
        uint256 prize
    );
    event GameTied(address indexed player1, address indexed player2);
    event GameCanceled(address indexed player1, uint256 gameId);

    address constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    uint256 constant deadline = 1 days;

    modifier isValidHand(Hand _hand) {
        require(
            _hand == Hand.ROCK || _hand == Hand.PAPER || _hand == Hand.SCISSORS,
            "The hand is not valid"
        );
        _;
    }

    function createGame(
        address _token,
        address _player2,
        uint256 _bet,
        Hand _hand,
        bool _useBalance
    ) external isValidHand(_hand) {
        console.log("Bet is %s tokens", _bet);
        Game memory game = Game({
            token: IERC20(_token),
            player1: msg.sender,
            player2: _player2,
            bet: _bet,
            state: State.STARTED,
            hand1: _hand,
            hand2: Hand.NONE,
            startTime: block.timestamp
        });
        games[gamesCounter] = game;
        gamesCounter++;

        _pay(game, _useBalance);

        emit GameCreated(msg.sender, _player2, _token, _bet);
    }

    function play(
        uint256 _gameId,
        Hand _hand,
        bool _useBalance
    ) external isValidHand(_hand) {
        require(_gameId < gamesCounter, "Game is not created");
        Game storage game = games[_gameId];

        require(State.STARTED == game.state, "Game is finished");
        require(
            msg.sender == game.player2 || game.player2 == ZERO_ADDRESS,
            "You are not a player"
        );
        game.hand2 = _hand;
        _pay(game, _useBalance);

        _finish(game);
    }

    function _pay(Game memory game, bool useBalance) internal {
        if (useBalance) {
            playerTokenBalances[msg.sender][address(game.token)] -= game.bet;
        } else if (game.bet > 0) {
            game.token.transferFrom(msg.sender, address(this), game.bet);
        }
    }

    function _finish(Game storage game) internal {
        address player1 = game.player1;
        address player2 = game.player2;
        Hand player1Hand = game.hand1;
        Hand player2Hand = game.hand2;

        if (player1Hand == Hand.ROCK && player2Hand == Hand.PAPER) {
            _win(player2, player1, game);
        } else if (player1Hand == Hand.ROCK && player2Hand == Hand.SCISSORS) {
            _win(player1, player2, game);
        } else if (player1Hand == Hand.PAPER && player2Hand == Hand.ROCK) {
            _win(player1, player2, game);
        } else if (player1Hand == Hand.PAPER && player2Hand == Hand.SCISSORS) {
            _win(player2, player1, game);
        } else if (player1Hand == Hand.SCISSORS && player2Hand == Hand.ROCK) {
            _win(player2, player1, game);
        } else if (player1Hand == Hand.SCISSORS && player2Hand == Hand.PAPER) {
            _win(player1, player2, game);
        } else {
            _tie(game);
        }
    }

    function _tie(Game storage game) internal {
        game.state = State.FINISHED;
        playerTokenBalances[game.player1][address(game.token)] += game.bet;
        playerTokenBalances[game.player2][address(game.token)] += game.bet;
        emit GameTied(game.player1, game.player2);
    }

    function _win(
        address _winner,
        address _looser,
        Game storage game
    ) internal {
        game.state = State.FINISHED;
        playerTokenBalances[_winner][address(game.token)] += game.bet * 2;
        emit GameFinished(_winner, _looser, address(game.token), game.bet * 2);
    }

    function claimRewards(address _token) external {
        uint256 totalBalance = playerTokenBalances[msg.sender][_token];
        require(totalBalance > 0, "You don't have any balance");
        playerTokenBalances[msg.sender][_token] = 0;
        IERC20(_token).transfer(msg.sender, totalBalance);
    }

    function cancelGame(uint256 _gameId) external {
        require(_gameId < gamesCounter, "Game is not created");
        Game storage game = games[_gameId];
        require(msg.sender == game.player1, "You are not a player");
        require(State.STARTED == game.state, "Game is finished");
        require(
            block.timestamp > game.startTime + deadline,
            "Game still in progress"
        );

        playerTokenBalances[msg.sender][address(game.token)] += game.bet;
        game.state = State.CANCELED;

        emit GameCanceled(msg.sender, _gameId);
    }
}
