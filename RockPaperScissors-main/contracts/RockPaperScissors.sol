// SPDX-License-Identifier: M
pragma solidity ^0.8.19;

contract RockPaperScissors {
    enum State { WaitingForPlayer, Committed, Revealed, Finished }

    struct Game {
        address payable player1;
        address payable player2;
        uint256 stake;
        mapping(address => bytes32) commit;
        mapping(address => uint8) move;
        mapping(address => bool) revealed;
        State state;
        uint256 createdAt;
        uint256 commitDeadline;
        uint256 revealDeadline;
    }
    uint256 public gameCount;
    mapping(uint256 => Game) private games;
    mapping(uint256 => address) public gameOwner;

    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 stake);
    event PlayerJoined(uint256 indexed gameId, address indexed player2);
    event Committed(uint256 indexed gameId, address indexed player);
    event Revealed(uint256 indexed gameId, address indexed player, uint8 move);
    event GameFinished(uint256 indexed gameId, address winner, uint256 amount);

    function createGame(uint256 commitSeconds, uint256 revealSeconds) external payable returns (uint256) {
        require(msg.value > 0, "stake required");
        uint256 id = ++gameCount;
        Game storage g = games[id];
        g.player1 = payable(msg.sender);
        g.stake = msg.value;
        g.state = State.WaitingForPlayer;
        g.createdAt = block.timestamp;
        g.commitDeadline = block.timestamp + commitSeconds;
        g.revealDeadline = g.commitDeadline + revealSeconds;
        gameOwner[id] = msg.sender;
        emit GameCreated(id, msg.sender, msg.value);
        return id;
    }

    function joinGame(uint256 id) external payable {
        Game storage g = games[id];
        require(g.player1 != address(0), "no game");
        require(g.player2 == address(0), "already joined");
        require(msg.value == g.stake, "stake mismatch");
        require(g.state == State.WaitingForPlayer, "not joinable");
        g.player2 = payable(msg.sender);
        g.state = State.Committed;
        emit PlayerJoined(id, msg.sender);
    }

    function commitMove(uint256 id, bytes32 commitHash) external {
        Game storage g = games[id];
        require(g.state == State.Committed, "not in commit phase");
        require(block.timestamp <= g.commitDeadline, "commit closed");
        require(msg.sender == g.player1 || msg.sender == g.player2, "not player");
        require(g.commit[msg.sender] == bytes32(0), "already committed");
        g.commit[msg.sender] = commitHash;
        emit Committed(id, msg.sender);
    }

    function revealMove(uint256 id, uint8 move, string calldata salt) external {
        require(move <= 2, "invalid move");
        Game storage g = games[id];
        require(g.state == State.Committed || g.state == State.Revealed, "not revealable");
        require(block.timestamp > g.commitDeadline, "reveal not started");
        require(block.timestamp <= g.revealDeadline, "reveal closed");
        require(msg.sender == g.player1 || msg.sender == g.player2, "not player");
        bytes32 expected = keccak256(abi.encodePacked(move, salt));
        require(g.commit[msg.sender] == expected, "commit mismatch");
        g.move[msg.sender] = move;
        g.revealed[msg.sender] = true;
        emit Revealed(id, msg.sender, move);

        if (g.revealed[g.player1] && g.revealed[g.player2]) {
            _resolve(id);
        }
    }

    function claimTimeoutWin(uint256 id) external {
        Game storage g = games[id];
        require(g.state == State.Committed, "not in commit phase");
        require(block.timestamp > g.revealDeadline, "reveal not over");
        require(msg.sender == g.player1 || msg.sender == g.player2, "not player");
        address payable winner;
        if (g.revealed[msg.sender]) {
            winner = payable(msg.sender);
        } else if (g.revealed[g.player1] && !g.revealed[g.player2]) {
            winner = g.player1;
        } else if (g.revealed[g.player2] && !g.revealed[g.player1]) {
            winner = g.player2;
        } else {
            revert("no revealed moves");
        }
        uint256 prize = g.stake * 2;
        g.state = State.Finished;
        (bool ok,) = winner.call{value: prize}("");
        require(ok, "transfer failed");
        emit GameFinished(id, winner, prize);
    }

    function _resolve(uint256 id) internal {
        Game storage g = games[id];
        require(g.state != State.Finished, "already finished");
        uint8 a = g.move[g.player1];
        uint8 b = g.move[g.player2];

        if (a == b) {
            g.state = State.Finished;
            uint256 refund = g.stake;
            (bool ok1,) = g.player1.call{value: refund}("");
            (bool ok2,) = g.player2.call{value: refund}("");
            require(ok1 && ok2, "refund failed");
            emit GameFinished(id, address(0), 0);
            return;
        }
        bool player1Wins = (a == 0 && b == 2) || (a == 1 && b == 0) || (a == 2 && b == 1);
        address payable winner = player1Wins ? g.player1 : g.player2;
        uint256 prize = g.stake * 2;
        g.state = State.Finished;
        (bool ok,) = winner.call{value: prize}("");
        require(ok, "transfer failed");
        emit GameFinished(id, winner, prize);
    }

    function getBasic(uint256 id) external view returns (
        address player1,
        address player2,
        uint256 stake,
        State state,
        uint256 createdAt,
        uint256 commitDeadline,
        uint256 revealDeadline
    ) {
        Game storage g = games[id];
        return (g.player1, g.player2, g.stake, g.state, g.createdAt, g.commitDeadline, g.revealDeadline);
    }
}
