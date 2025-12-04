// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PathCaptcha_FHE is SepoliaConfig {
    struct EncryptedMaze {
        uint256 mazeId;
        euint32[][] encryptedGrid;    // Encrypted maze grid (0=path, 1=wall)
        euint32 encryptedStartX;      // Encrypted start position X
        euint32 encryptedStartY;      // Encrypted start position Y
        euint32 encryptedEndX;       // Encrypted end position X
        euint32 encryptedEndY;       // Encrypted end position Y
        uint256 timestamp;
    }
    
    struct EncryptedSolution {
        uint256 solutionId;
        euint32[] encryptedPathX;     // Encrypted path coordinates X
        euint32[] encryptedPathY;     // Encrypted path coordinates Y
        uint256 mazeId;
    }
    
    struct DecryptedVerification {
        bool isValid;
        bool isRevealed;
    }

    uint256 public mazeCount;
    uint256 public solutionCount;
    mapping(uint256 => EncryptedMaze) public encryptedMazes;
    mapping(uint256 => EncryptedSolution) public encryptedSolutions;
    mapping(uint256 => DecryptedVerification) public solutionVerifications;
    
    mapping(uint256 => uint256) private requestToSolutionId;
    
    event MazeGenerated(uint256 indexed mazeId, uint256 timestamp);
    event SolutionSubmitted(uint256 indexed solutionId, uint256 mazeId);
    event VerificationComplete(uint256 indexed solutionId);
    
    modifier onlyMazeOwner(uint256 mazeId) {
        _;
    }
    
    function generateEncryptedMaze(
        euint32[][] memory encryptedGrid,
        euint32 encryptedStartX,
        euint32 encryptedStartY,
        euint32 encryptedEndX,
        euint32 encryptedEndY
    ) public {
        mazeCount += 1;
        uint256 newId = mazeCount;
        
        encryptedMazes[newId] = EncryptedMaze({
            mazeId: newId,
            encryptedGrid: encryptedGrid,
            encryptedStartX: encryptedStartX,
            encryptedStartY: encryptedStartY,
            encryptedEndX: encryptedEndX,
            encryptedEndY: encryptedEndY,
            timestamp: block.timestamp
        });
        
        emit MazeGenerated(newId, block.timestamp);
    }
    
    function submitEncryptedSolution(
        uint256 mazeId,
        euint32[] memory encryptedPathX,
        euint32[] memory encryptedPathY
    ) public {
        solutionCount += 1;
        uint256 newId = solutionCount;
        
        encryptedSolutions[newId] = EncryptedSolution({
            solutionId: newId,
            encryptedPathX: encryptedPathX,
            encryptedPathY: encryptedPathY,
            mazeId: mazeId
        });
        
        solutionVerifications[newId] = DecryptedVerification({
            isValid: false,
            isRevealed: false
        });
        
        emit SolutionSubmitted(newId, mazeId);
    }
    
    function verifySolution(
        uint256 solutionId
    ) public {
        EncryptedSolution storage solution = encryptedSolutions[solutionId];
        EncryptedMaze storage maze = encryptedMazes[solution.mazeId];
        
        ebool isValid = FHE.asEbool(true);
        
        // Check start position
        ebool validStart = FHE.and(
            FHE.eq(solution.encryptedPathX[0], maze.encryptedStartX),
            FHE.eq(solution.encryptedPathY[0], maze.encryptedStartY)
        );
        isValid = FHE.and(isValid, validStart);
        
        // Check end position
        uint256 lastIdx = solution.encryptedPathX.length - 1;
        ebool validEnd = FHE.and(
            FHE.eq(solution.encryptedPathX[lastIdx], maze.encryptedEndX),
            FHE.eq(solution.encryptedPathY[lastIdx], maze.encryptedEndY)
        );
        isValid = FHE.and(isValid, validEnd);
        
        // Check path continuity and validity
        for (uint256 i = 1; i < solution.encryptedPathX.length; i++) {
            ebool adjacent = FHE.or(
                FHE.eq(
                    FHE.sub(solution.encryptedPathX[i], solution.encryptedPathX[i-1]),
                    FHE.asEuint32(1)
                ),
                FHE.eq(
                    FHE.sub(solution.encryptedPathY[i], solution.encryptedPathY[i-1]),
                    FHE.asEuint32(1)
                )
            );
            isValid = FHE.and(isValid, adjacent);
            
            // Check if path is within bounds and not a wall
            euint32 cellValue = maze.encryptedGrid[0][0]; // Placeholder for actual grid access
            ebool isPath = FHE.eq(cellValue, FHE.asEuint32(0));
            isValid = FHE.and(isValid, isPath);
        }
        
        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(FHE.cast(isValid));
        
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptVerification.selector);
        requestToSolutionId[reqId] = solutionId;
    }
    
    function decryptVerification(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 solutionId = requestToSolutionId[requestId];
        require(solutionId != 0, "Invalid request");
        
        DecryptedVerification storage verification = solutionVerifications[solutionId];
        require(!verification.isRevealed, "Already verified");
        
        FHE.checkSignatures(requestId, cleartexts, proof);
        
        bool isValid = abi.decode(cleartexts, (bool));
        verification.isValid = isValid;
        verification.isRevealed = true;
        
        emit VerificationComplete(solutionId);
    }
    
    function getVerificationResult(
        uint256 solutionId
    ) public view returns (bool isValid, bool isRevealed) {
        DecryptedVerification storage v = solutionVerifications[solutionId];
        return (v.isValid, v.isRevealed);
    }
    
    function generateComplexityScore(
        euint32[][] memory mazeGrid
    ) public pure returns (euint32) {
        euint32 complexity = FHE.asEuint32(0);
        for (uint i = 0; i < mazeGrid.length; i++) {
            for (uint j = 0; j < mazeGrid[i].length; j++) {
                complexity = FHE.add(complexity, mazeGrid[i][j]);
            }
        }
        return complexity;
    }
    
    function checkPathAdjacency(
        euint32 x1,
        euint32 y1,
        euint32 x2,
        euint32 y2
    ) public pure returns (ebool) {
        ebool xAdjacent = FHE.eq(
            FHE.sub(x1, x2),
            FHE.asEuint32(1)
        );
        ebool yAdjacent = FHE.eq(
            FHE.sub(y1, y2),
            FHE.asEuint32(1)
        );
        return FHE.or(xAdjacent, yAdjacent);
    }
    
    function bytes32ToUint(bytes32 b) private pure returns (uint256) {
        return uint256(b);
    }
    
    function calculatePathDifficulty(
        euint32[] memory pathX,
        euint32[] memory pathY
    ) public pure returns (euint32) {
        euint32 difficulty = FHE.asEuint32(0);
        for (uint i = 1; i < pathX.length; i++) {
            euint32 xDiff = FHE.sub(pathX[i], pathX[i-1]);
            euint32 yDiff = FHE.sub(pathY[i], pathY[i-1]);
            difficulty = FHE.add(difficulty, FHE.add(xDiff, yDiff));
        }
        return difficulty;
    }
}