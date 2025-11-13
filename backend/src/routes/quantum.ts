import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';

const router = Router();

// Add logging middleware to see if requests are reaching this router
router.use((req, res, next) => {
  console.log('🔵 [QUANTUM ROUTE HIT]', req.method, req.path, 'at', new Date().toISOString());
  next();
});

/**
 * Run quantum optimization
 */
router.post('/optimize', async (req: Request, res: Response): Promise<void> => {
  console.log('🟢 [QUANTUM OPTIMIZE HANDLER CALLED]', new Date().toISOString());
  const { hosts, requests, algorithm = 'qaoa' } = req.body;

  // Create temporary input file
  const inputData = JSON.stringify({ hosts, requests }, null, 2);
  const inputFile = path.join(__dirname, '../../temp/quantum_input.json');
  
  // Lightweight diagnostics: allow a safe dry-run that returns immediately
  // without invoking Python. This helps isolate CORS/Express vs Python issues
  // without changing normal behavior.
  if (req.query.dryRun === '1') {
    res.json({
      success: true,
      mode: 'dry-run',
      hostsCount: Array.isArray(hosts) ? hosts.length : 0,
      requestsCount: Array.isArray(requests) ? requests.length : 0,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  try {
    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await fs.writeFile(inputFile, inputData);

    // Resolve paths and validate they exist before spawning
    const pythonPath = path.join(__dirname, '../../../quantum-env/bin/python3');
    
    // Select script based on algorithm
    let scriptPath: string;
    switch (algorithm) {
      case 'dwave':
      case 'dwave-annealing':
        scriptPath = path.join(__dirname, '../../../backend/dwave_backend.py');
        console.log('🌊 Using D-Wave Ocean SDK backend');
        break;
      case 'dwave-hybrid':
        scriptPath = path.join(__dirname, '../../../backend/dwave_hybrid_backend.py');
        console.log('🔀 Using D-Wave Hybrid solver');
        break;
      case 'qaoa':
      default:
        scriptPath = path.join(__dirname, '../../../quantum/qaoa_scheduler.py');
        console.log('⚛️ Using QAOA quantum optimizer');
        break;
    }
    
    try {
      await fs.access(pythonPath);
    } catch {
      res.status(500).json({ success: false, error: `Python not found at ${pythonPath}` });
      return;
    }
    
    try {
      await fs.access(scriptPath);
    } catch {
      res.status(500).json({ success: false, error: `Quantum script not found at ${scriptPath}` });
      return;
    }

    // Run quantum optimization using spawn - wrapped in Promise to properly await
    await new Promise<void>((resolve, reject) => {
      // pythonPath and scriptPath pre-validated above
      console.info('[quantum] Spawning python', { pythonPath, scriptPath, inputFile });
      
      const python = spawn(pythonPath, [scriptPath, inputFile]);
      python.on('spawn', () => {
        console.info('[quantum] Python process started', { pid: python.pid });
      });
      
      let stdout = '';
      let stderr = '';
      let responded = false;
      
      python.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[quantum:stdout]', output);
        stdout += output;
      });
      
      python.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error('[quantum:stderr]', errorOutput);
        stderr += errorOutput;
      });
      
      python.on('close', (code) => {
        if (responded) return;
        responded = true;
        
        console.info(`[quantum] Python process closed with code: ${code}`);
        
        // Always log stderr for debugging, even on success
        if (stderr) {
          console.warn('[quantum] Full stderr output:', stderr);
        }

        if (code !== 0) {
          console.error(`[quantum] Python script exited with non-zero code ${code}.`);
          res.status(500).json({
            success: false,
            error: `Quantum optimization failed with exit code ${code}.`,
            pythonError: stderr // Include stderr in the response
          });
          return reject(new Error(`Exit code ${code}`));
        }
        
        try {
          // Log the raw stdout before parsing
          console.info('[quantum] Raw stdout for parsing:', stdout);
          const result = JSON.parse(stdout);
          
          // Return results
          res.json({
            success: true,
            schedule: result.schedule,
            metrics: result.metrics,
            circuitStats: result.circuitStats,
            timestamp: new Date().toISOString()
          });
          resolve();
        } catch (parseError: any) {
          console.error('Failed to parse quantum results:', parseError);
          res.status(500).json({
            success: false,
            error: 'Failed to parse quantum results'
          });
          reject(parseError);
        }
      });
      
      python.on('error', (error) => {
        if (responded) return;
        responded = true;
        console.error('Python spawn error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
        reject(error);
      });
      
      // Set timeout (5 minutes for quantum optimization)
      setTimeout(() => {
        if (responded) return;
        responded = true;
        python.kill();
        res.status(504).json({
          success: false,
          error: 'Quantum optimization timeout (5 minutes)'
        });
        reject(new Error('Timeout'));
      }, 300000);
    });
      
  } catch (error) {
    console.error('Error in quantum optimization:', error);
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * Get quantum circuit visualization
 */
router.get('/circuit-image', async (req, res) => {
  try {
    const imagePath = path.join(
      __dirname,
      '../../../quantum_circuit_detailed.png'
    );
    
    // Check if file exists
    await fs.access(imagePath);
    
    res.sendFile(imagePath);
  } catch (error) {
    res.status(404).json({ error: 'Circuit image not found' });
  }
});

/**
 * Get quantum statistics visualization
 */
router.get('/stats-image', async (req, res) => {
  try {
    const imagePath = path.join(
      __dirname,
      '../../../quantum_stats.png'
    );
    
    await fs.access(imagePath);
    res.sendFile(imagePath);
  } catch (error) {
    res.status(404).json({ error: 'Stats image not found' });
  }
});

/**
 * Get quantum system status
 */
router.get('/status', async (req, res) => {
  try {
    const pythonPath = path.join(__dirname, '../../../quantum-env/bin/python3');
    
    // Check if quantum environment is available using spawn
    const python = spawn(pythonPath, ['-c', 'import qiskit; print(qiskit.__version__)']);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        res.json({
          available: true,
          qiskitVersion: stdout.trim(),
          ready: true
        });
      } else {
        res.json({
          available: false,
          ready: false,
          error: 'Quantum environment not configured'
        });
      }
    });
  } catch (error) {
    res.json({
      available: false,
      ready: false,
      error: 'Quantum environment not configured'
    });
  }
});

export default router;
