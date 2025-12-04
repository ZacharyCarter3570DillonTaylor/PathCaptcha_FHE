# PathCaptcha_FHE

A next-generation **privacy-preserving CAPTCHA system** that challenges users to solve an encrypted maze — a **proof-of-pathfinding** puzzle computed entirely under **Fully Homomorphic Encryption (FHE)**.  
It offers a robust, AI-resistant verification method that ensures both human usability and cryptographic privacy.

---

## Overview

Conventional CAPTCHA systems have become increasingly vulnerable to AI-based solvers, which can rapidly decode text, images, and logic puzzles.  
Furthermore, many CAPTCHA implementations leak interaction data, IP patterns, or behavioral profiles that compromise user privacy.

**PathCaptcha_FHE** introduces a new paradigm in human verification:  
Instead of asking users to identify distorted text or select images, it asks them to **find a valid path** through an encrypted maze.  
Both the maze and the user's path are **fully encrypted** during computation.  
The server verifies correctness without ever decrypting user actions — all powered by **Fully Homomorphic Encryption**.

---

## Motivation

Modern CAPTCHAs suffer from several fundamental issues:

- **AI Decoding:** Machine vision models can solve visual CAPTCHAs with over 99% accuracy.  
- **Privacy Leakage:** Behavioral CAPTCHAs collect sensitive data such as cursor movements and IP patterns.  
- **Centralized Verification:** Verification servers can view and store user interaction data in plaintext.  
- **Predictable Patterns:** Once the logic is reverse-engineered, bots can simulate valid solutions.

PathCaptcha_FHE addresses all of these challenges through encrypted computation.  
It redefines verification as a **cryptographic challenge** rather than a visual or behavioral one.

---

## Key Concept: Proof of Pathfinding

Each CAPTCHA instance presents an **encrypted maze**, represented as a matrix of encrypted nodes and barriers.  
The user must submit an **encrypted path** from start to goal — computed locally within the encrypted domain.  
The server then verifies that:

1. The path begins and ends at valid encrypted coordinates.  
2. Every move adheres to maze constraints (no wall crossings, consistent adjacency).  
3. The path length is within expected limits.

All of these checks occur **under FHE**, ensuring that neither the maze layout nor the user’s path is ever decrypted.

---

## Core Features

### 🔐 Fully Encrypted Maze Challenges

- Each maze is generated and encrypted before being sent to the user.  
- Users interact with the encrypted maze using client-side tools that support homomorphic evaluation.  
- The maze content remains hidden from both users and servers — only the validity of movement is verifiable.

### 🧭 Homomorphic Path Verification

- The user’s encrypted sequence of moves (up, down, left, right) is processed using FHE operations.  
- The server computes homomorphic path validity checks without learning the path itself.  
- Only a final encrypted Boolean result (valid/invalid) is decrypted for verification.

### 🧠 AI-Resistant Design

- The challenge is computational, not visual — rendering computer vision and pattern-recognition models ineffective.  
- Since each maze is unique and encrypted, pre-trained AI solvers cannot generalize across instances.

### 🧩 Adaptive Difficulty

- The maze complexity adjusts dynamically based on security level.  
- Parameters like maze size, branching factor, and cryptographic depth are tunable for different applications.

### 🌐 Privacy by Default

- No visual tracking, behavioral profiling, or session recording.  
- User activity remains mathematically private under homomorphic encryption.  
- Even the verifying server cannot reconstruct how a user solved the challenge.

---

## Why Fully Homomorphic Encryption?

Fully Homomorphic Encryption (FHE) allows arbitrary computations on encrypted data without revealing the underlying plaintext.  
In PathCaptcha_FHE, this means that both **the maze and the solution process** remain confidential:

- The **user** never sees the full maze structure.  
- The **server** never sees the user’s path.  
- Yet, both can cooperatively verify correctness through cryptographic computation.

This removes the need for trust between client and server — verification becomes provably private.

---

## Architecture

### System Components

1. **Maze Generator**
   - Creates random maze topologies represented as adjacency matrices.
   - Encrypts the maze structure using FHE before dispatching it to the client.

2. **Client Interface**
   - Provides users with an interactive solver UI that interprets encrypted maze hints.
   - Converts user navigation actions into encrypted move vectors.

3. **Verification Engine**
   - Processes encrypted path submissions.
   - Executes homomorphic path-validation circuits (adjacency checks, goal validation).

4. **Decryption Authority**
   - Decrypts only the final binary result (pass/fail) without accessing any other data.

---


Each step preserves total data confidentiality — only the final verification outcome is revealed.

---

## Technical Highlights

- **Encryption Scheme:** CKKS-based approximate arithmetic for efficient FHE path computations.  
- **Path Circuit Design:** Optimized Boolean circuits for encrypted adjacency validation.  
- **Noise Management:** Bootstrapping pipeline for maintaining ciphertext freshness across path-length operations.  
- **Encrypted Randomization:** Each maze uses randomized encryption seeds to ensure unique ciphertext representations.  
- **Scalable Complexity:** Maze generation scales from 10×10 grids to complex graph networks.

---

## Example Scenario

1. The server creates a 12×12 maze encoded as encrypted grid cells.  
2. The user’s device receives encrypted maze hints and navigates interactively.  
3. The local client computes an encrypted sequence of moves.  
4. The encrypted path is submitted for validation.  
5. The server runs the FHE verification algorithm.  
6. The decrypted result returns a simple “✅ Verified” or “❌ Failed” response.

Neither side ever accesses or stores the plaintext maze or user actions.

---

## Security & Privacy Model

### Zero-Knowledge Validation
Only the validity of the user’s solution is revealed — not how they reached it.

### Server-Side Blind Verification
The server cannot reconstruct maze layouts or identify user behavior from encrypted inputs.

### AI Defense Mechanism
Since the maze logic and structure are encrypted, AI models cannot train on prior CAPTCHA patterns.

### Human Accessibility
While AI systems struggle with path inference under encryption, humans can intuitively solve simplified visualized hints that don’t reveal structural secrets.

---

## Advantages

- **AI-Resistant:** Fundamentally harder for automated systems to crack.  
- **Privacy-Respecting:** No tracking, profiling, or plaintext submission.  
- **Mathematically Verifiable:** Cryptographic assurance of fairness and correctness.  
- **Modular Integration:** Compatible with authentication APIs and identity gateways.  
- **Adaptive Complexity:** Dynamic difficulty adjustment for various threat levels.

---

## Limitations

- Encrypted computation adds latency compared to standard CAPTCHAs.  
- Requires homomorphic-capable client environments.  
- Bootstrapping overhead for large mazes increases processing time.  
- Visualization of encrypted hints requires approximation schemes for usability.

Despite these constraints, PathCaptcha_FHE establishes a new benchmark for **secure and ethical human verification**.

---

## Future Development Roadmap

### Near-Term Goals
- Optimize ciphertext compression for faster maze transmission.  
- Add hybrid FHE–ZKP (zero-knowledge proof) verification for lightweight validation.  
- Extend support to mobile devices and low-power clients.  

### Long-Term Vision
- Integrate with decentralized identity (DID) systems for anonymous proof-of-humanity.  
- Support multi-user collaborative verification tasks under encryption.  
- Develop an open FHE CAPTCHA benchmark for AI-resistance testing.

---

## Research Perspective

PathCaptcha_FHE blurs the line between cryptography, human-computer interaction, and AI security.  
It demonstrates that verification systems can be **both private and secure**, without resorting to behavioral tracking or invasive data collection.

The project represents an early step toward a new class of **cryptographically private human verification protocols**, built on the foundations of **FHE**.

---

Built for a future where **trustless privacy** and **human authenticity** coexist —  
a world where proving humanity doesn’t mean surrendering privacy.
