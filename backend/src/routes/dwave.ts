import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../utils/logger';

const router = Router();

/**
 * D-Wave Ocean SDK Optimization Endpoint
 * Separate from IBM Qiskit endpoint for clean separation
 */
router.post('/optimize', async (req: Request, res: Response): Promise<void> => {
  console.log('🌊 [D-WAVE OPTIMIZE HANDLER CALLED]', new Date().toISOString());
  const { hosts, requests, config } = req.body;

  // Create temporary input file with proper structure for Python
  const inputData = JSON.stringify({ 
    dwaveConfig: config,
    problemData: { hosts, requests }
  }, null, 2);
  const inputFile = path.join(__dirname, '../../temp/dwave_input.json');
  
  try {
    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await fs.writeFile(inputFile, inputData);

    // Resolve paths
    const pythonPath = path.join(__dirname, '../../../quantum-env/bin/python3');
    const scriptPath = path.join(__dirname, '../../../backend/dwave_backend.py');
    
    // Validate paths
    try {
      await fs.access(pythonPath);
    } catch {
      res.status(500).json({ 
        success: false, 
        error: `Python environment not found at ${pythonPath}. Run: python3 -m venv quantum-env` 
      });
      return;
    }
    
    try {
      await fs.access(scriptPath);
    } catch {
      res.status(500).json({ 
        success: false, 
        error: `D-Wave backend script not found at ${scriptPath}` 
      });
      return;
    }

    logger.info(`🌊 Starting D-Wave Ocean SDK optimization with ${requests.length} requests and ${hosts.length} hosts`);
    logger.info(`⚙️ Config: ${JSON.stringify(config)}`);

    // Run D-Wave optimization
    await new Promise<void>((resolve, reject) => {
      console.info('[dwave] Spawning python', { pythonPath, scriptPath, inputFile });
      
      const python = spawn(pythonPath, [scriptPath, inputFile]);
      python.on('spawn', () => {
        console.info('[dwave] Python process started', { pid: python.pid });
      });
      
      let stdout = '';
      let stderr = '';
      let responded = false;
      
      python.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[dwave:stdout]', output);
        stdout += output;
      });
      
      python.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error('[dwave:stderr]', errorOutput);
        stderr += errorOutput;
      });
      
      python.on('close', (code) => {
        if (responded) return;
        responded = true;
        
        console.info(`[dwave] Python process closed with code: ${code}`);
        
        if (stderr) {
          console.warn('[dwave] Full stderr output:', stderr);
        }

        if (code !== 0) {
          console.error(`[dwave] Python script exited with non-zero code ${code}.`);
          res.status(500).json({
            success: false,
            error: `D-Wave optimization failed with exit code ${code}.`,
            details: stderr
          });
          return reject(new Error(`Exit code ${code}`));
        }
        
        try {
          console.info('[dwave] Raw stdout for parsing:', stdout);
          const result = JSON.parse(stdout);
          
          logger.info(`✅ D-Wave optimization complete: ${result.schedule?.length || 0} meetings scheduled`);
          
          // Return results
          res.json({
            success: true,
            schedule: result.schedule || [],
            metrics: result.metrics || {},
            quboStats: result.quboStats || {},
            computationTimeMs: result.computationTimeMs || 0,
            timestamp: new Date().toISOString()
          });
          resolve();
        } catch (parseError: any) {
          console.error('Failed to parse D-Wave results:', parseError);
          console.error('Raw stdout was:', stdout);
          res.status(500).json({
            success: false,
            error: 'Failed to parse D-Wave results',
            details: parseError.message
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
          error: `Failed to spawn Python process: ${error.message}`
        });
        reject(error);
      });
      
      // Timeout (10 minutes for D-Wave optimization - can be longer than QAOA)
      setTimeout(() => {
        if (responded) return;
        responded = true;
        python.kill();
        res.status(504).json({
          success: false,
          error: 'D-Wave optimization timeout (10 minutes)'
        });
        reject(new Error('Timeout'));
      }, 600000);
    });
      
  } catch (error) {
    console.error('Error in D-Wave optimization:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * Get D-Wave system status
 */
router.get('/status', async (req, res) => {
  try {
    const pythonPath = path.join(__dirname, '../../../quantum-env/bin/python3');
    
    // Check if D-Wave Ocean SDK is available
    const python = spawn(pythonPath, ['-c', 'import dimod; import dwave.system; print("OK")']);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0 && stdout.includes('OK')) {
        res.json({
          available: true,
          oceanSdkInstalled: true,
          mode: 'offline',
          ready: true,
          message: 'D-Wave Ocean SDK ready (offline simulation mode)'
        });
      } else {
        res.json({
          available: false,
          oceanSdkInstalled: false,
          ready: false,
          error: 'D-Wave Ocean SDK not installed',
          hint: 'Run: pip install dwave-ocean-sdk'
        });
      }
    });
  } catch (error) {
    res.json({
      available: false,
      ready: false,
      error: 'Failed to check D-Wave status'
    });
  }
});

export default router;
