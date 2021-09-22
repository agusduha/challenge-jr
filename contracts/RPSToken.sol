// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RPSToken is ERC20 {
    constructor() ERC20("Rock Paper Scissors token", "RPS") {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}