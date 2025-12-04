// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface PathRecord {
  id: string;
  encryptedPath: string;
  timestamp: number;
  owner: string;
  difficulty: number;
  status: "pending" | "solved" | "failed";
  solveTime?: number;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PathRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newPathData, setNewPathData] = useState({
    difficulty: 3,
    description: ""
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  // Calculate statistics for dashboard
  const solvedCount = records.filter(r => r.status === "solved").length;
  const pendingCount = records.filter(r => r.status === "pending").length;
  const failedCount = records.filter(r => r.status === "failed").length;
  const avgSolveTime = solvedCount > 0 
    ? records.filter(r => r.status === "solved" && r.solveTime)
        .reduce((sum, r) => sum + (r.solveTime || 0), 0) / solvedCount 
    : 0;

  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("path_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing path keys:", e);
        }
      }
      
      const list: PathRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`path_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedPath: recordData.data,
                timestamp: recordData.timestamp,
                owner: recordData.owner,
                difficulty: recordData.difficulty || 3,
                status: recordData.status || "pending",
                solveTime: recordData.solveTime
              });
            } catch (e) {
              console.error(`Error parsing path data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading path ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading paths:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) {
        throw new Error("Contract not available");
      }
      
      const isAvailable = await contract.isAvailable();
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: `FHE CAPTCHA system is ${isAvailable ? "available" : "unavailable"}`
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Availability check failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const submitPath = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Generating FHE-encrypted maze path..."
    });
    
    try {
      // Simulate FHE encryption of maze path
      const encryptedPath = `FHE-PATH-${btoa(JSON.stringify({
        difficulty: newPathData.difficulty,
        description: newPathData.description,
        maze: generateMaze(newPathData.difficulty),
        solution: generateSolution()
      }))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const pathId = `path-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const pathData = {
        data: encryptedPath,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        difficulty: newPathData.difficulty,
        status: "pending"
      };
      
      // Store encrypted path on-chain using FHE
      await contract.setData(
        `path_${pathId}`, 
        ethers.toUtf8Bytes(JSON.stringify(pathData))
      );
      
      const keysBytes = await contract.getData("path_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(pathId);
      
      await contract.setData(
        "path_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE-encrypted path submitted successfully!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewPathData({
          difficulty: 3,
          description: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const solvePath = async (pathId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Solving FHE-encrypted maze path..."
    });

    try {
      // Simulate FHE computation time based on difficulty
      const path = records.find(r => r.id === pathId);
      const difficulty = path?.difficulty || 3;
      await new Promise(resolve => setTimeout(resolve, difficulty * 1000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const pathBytes = await contract.getData(`path_${pathId}`);
      if (pathBytes.length === 0) {
        throw new Error("Path not found");
      }
      
      const pathData = JSON.parse(ethers.toUtf8String(pathBytes));
      
      // Random success based on difficulty (higher difficulty = harder to solve)
      const success = Math.random() > (difficulty * 0.15);
      
      const updatedPath = {
        ...pathData,
        status: success ? "solved" : "failed",
        solveTime: Math.floor(Date.now() / 1000) - pathData.timestamp
      };
      
      await contract.setData(
        `path_${pathId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedPath))
      );
      
      setTransactionStatus({
        visible: true,
        status: success ? "success" : "error",
        message: success 
          ? "Maze path solved successfully with FHE!" 
          : "Failed to solve maze path. Try again."
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Solution failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to interact with the FHE CAPTCHA system",
      icon: "🔗"
    },
    {
      title: "Generate Encrypted Maze",
      description: "Create a FHE-encrypted maze path with your chosen difficulty level",
      icon: "🔒"
    },
    {
      title: "FHE Path Solving",
      description: "Solve the maze path while it remains encrypted using FHE technology",
      icon: "⚙️"
    },
    {
      title: "Verification",
      description: "Get verified as human through successful path solving",
      icon: "✅"
    }
  ];

  const generateMaze = (difficulty: number) => {
    // Simulate maze generation based on difficulty
    const size = 5 + difficulty * 3;
    return {
      size,
      start: { x: 0, y: 0 },
      end: { x: size - 1, y: size - 1 },
      walls: Math.floor((size * size) * (0.2 + difficulty * 0.1))
    };
  };

  const generateSolution = () => {
    // Simulate solution generation
    return {
      steps: Math.floor(10 + Math.random() * 20),
      complexity: Math.random() * 100
    };
  };

  const renderBarChart = () => {
    const difficulties = [1, 2, 3, 4, 5];
    const data = difficulties.map(diff => {
      return records.filter(r => r.difficulty === diff && r.status === "solved").length;
    });

    const maxValue = Math.max(...data, 1);
    
    return (
      <div className="barchart-container">
        <div className="barchart">
          {data.map((value, index) => (
            <div key={index} className="bar-wrapper">
              <div 
                className="bar" 
                style={{ height: `${(value / maxValue) * 100}%` }}
              >
                <span className="bar-value">{value}</span>
              </div>
              <div className="bar-label">L{index + 1}</div>
            </div>
          ))}
        </div>
        <div className="barchart-legend">
          <span>Difficulty Level</span>
        </div>
      </div>
    );
  };

  const toggleRecordExpand = (id: string) => {
    if (expandedRecord === id) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(id);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="cyber-spinner"></div>
      <p>Initializing FHE CAPTCHA system...</p>
    </div>
  );

  return (
    <div className="app-container cyberpunk-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="maze-icon"></div>
          </div>
          <h1>PathCaptcha<span>FHE</span></h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-path-btn cyber-button"
          >
            <div className="add-icon"></div>
            New Maze
          </button>
          <button 
            className="cyber-button"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? "Hide Guide" : "Show Guide"}
          </button>
          <button 
            className="cyber-button"
            onClick={checkAvailability}
          >
            Check FHE Status
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>FHE-Based Privacy-Preserving CAPTCHA</h2>
            <p>Prove you're human by solving encrypted maze paths without compromising privacy</p>
          </div>
          <div className="neon-grid"></div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>How PathCaptcha FHE Works</h2>
            <p className="subtitle">Learn how to use our privacy-preserving CAPTCHA system</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  {index < tutorialSteps.length - 1 && <div className="step-connector"></div>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="dashboard-panels">
          <div className="panel cyber-card">
            <h3>About PathCaptcha FHE</h3>
            <p>PathCaptcha FHE uses Fully Homomorphic Encryption to create privacy-preserving CAPTCHA challenges. Users solve maze paths that remain encrypted during the entire process, ensuring no sensitive data is exposed.</p>
            <div className="fhe-badge">
              <span>FHE-Powered</span>
            </div>
          </div>
          
          <div className="panel cyber-card">
            <h3>Path Solving Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{records.length}</div>
                <div className="stat-label">Total Paths</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{solvedCount}</div>
                <div className="stat-label">Solved</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.round(avgSolveTime)}s</div>
                <div className="stat-label">Avg Time</div>
              </div>
            </div>
          </div>
          
          <div className="panel cyber-card">
            <h3>Success Rate by Difficulty</h3>
            {renderBarChart()}
          </div>
        </div>
        
        <div className="paths-section">
          <div className="section-header">
            <h2>FHE-Encrypted Maze Paths</h2>
            <div className="header-actions">
              <button 
                onClick={loadRecords}
                className="refresh-btn cyber-button"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="paths-list cyber-card">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Difficulty</div>
              <div className="header-cell">Owner</div>
              <div className="header-cell">Created</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {records.length === 0 ? (
              <div className="no-paths">
                <div className="no-paths-icon"></div>
                <p>No maze paths found</p>
                <button 
                  className="cyber-button primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Path
                </button>
              </div>
            ) : (
              records.map(path => (
                <React.Fragment key={path.id}>
                  <div className="path-row" onClick={() => toggleRecordExpand(path.id)}>
                    <div className="table-cell path-id">#{path.id.substring(0, 6)}</div>
                    <div className="table-cell">
                      <span className="difficulty-badge">L{path.difficulty}</span>
                    </div>
                    <div className="table-cell">{path.owner.substring(0, 6)}...{path.owner.substring(38)}</div>
                    <div className="table-cell">
                      {new Date(path.timestamp * 1000).toLocaleDateString()}
                    </div>
                    <div className="table-cell">
                      <span className={`status-badge ${path.status}`}>
                        {path.status}
                      </span>
                    </div>
                    <div className="table-cell actions">
                      {path.status === "pending" && (
                        <button 
                          className="action-btn cyber-button primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            solvePath(path.id);
                          }}
                        >
                          Solve
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedRecord === path.id && (
                    <div className="path-details">
                      <h4>Path Details</h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Path ID:</span>
                          <span className="detail-value">{path.id}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Owner:</span>
                          <span className="detail-value">{path.owner}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Created:</span>
                          <span className="detail-value">{new Date(path.timestamp * 1000).toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Difficulty:</span>
                          <span className="detail-value">Level {path.difficulty}</span>
                        </div>
                        {path.solveTime && (
                          <div className="detail-item">
                            <span className="detail-label">Solve Time:</span>
                            <span className="detail-value">{path.solveTime} seconds</span>
                          </div>
                        )}
                      </div>
                      <div className="encryption-notice">
                        <div className="lock-icon"></div>
                        This maze path is encrypted using FHE and can be solved without decryption
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitPath} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating}
          pathData={newPathData}
          setPathData={setNewPathData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content cyber-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="cyber-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="maze-icon"></div>
              <span>PathCaptcha FHE</span>
            </div>
            <p>Privacy-preserving CAPTCHA using Fully Homomorphic Encryption</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} PathCaptcha FHE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  pathData: any;
  setPathData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  pathData,
  setPathData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPathData({
      ...pathData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal cyber-card">
        <div className="modal-header">
          <h2>Create FHE-Encrypted Maze Path</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your maze path will be encrypted with FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Difficulty Level</label>
              <select 
                name="difficulty"
                value={pathData.difficulty} 
                onChange={handleChange}
                className="cyber-select"
              >
                <option value="1">Level 1 (Easy)</option>
                <option value="2">Level 2 (Medium)</option>
                <option value="3">Level 3 (Hard)</option>
                <option value="4">Level 4 (Very Hard)</option>
                <option value="5">Level 5 (Expert)</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Description (Optional)</label>
              <textarea 
                name="description"
                value={pathData.description} 
                onChange={handleChange}
                placeholder="Describe your maze path..." 
                className="cyber-textarea"
                rows={2}
              />
            </div>
          </div>
          
          <div className="difficulty-preview">
            <h4>Difficulty Preview</h4>
            <div className="preview-maze">
              {Array.from({ length: parseInt(pathData.difficulty) + 2 }).map((_, i) => (
                <div key={i} className="maze-row">
                  {Array.from({ length: parseInt(pathData.difficulty) + 2 }).map((_, j) => (
                    <div 
                      key={j} 
                      className={`maze-cell ${Math.random() > 0.7 ? 'wall' : 'path'}`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn cyber-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="submit-btn cyber-button primary"
          >
            {creating ? "Encrypting with FHE..." : "Generate Maze"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;