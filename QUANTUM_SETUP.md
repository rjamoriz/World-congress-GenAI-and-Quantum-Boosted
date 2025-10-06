# 🚀 Quantum Computing Setup Guide

This guide explains how to set up and use the **real Qiskit quantum optimization** features in the Agenda Manager.

## 📋 Overview

The system includes three levels of optimization:

1. **🔵 Classical Greedy** - Fast deterministic algorithm
2. **🟣 Quantum-Inspired** - Simulated annealing (currently active)
3. **⚛️ True Quantum** - Real Qiskit QAOA optimization (requires setup)

## 🛠️ Quantum Setup Instructions

### Step 1: Install Python Dependencies

```bash
# Install Qiskit and quantum optimization packages
pip install -r quantum-requirements.txt

# Or install individually:
pip install qiskit>=0.45.0
pip install qiskit-optimization>=0.6.0
pip install qiskit-algorithms>=0.2.0
pip install qiskit-aer>=0.13.0
```

### Step 2: Install Node.js Python Bridge

```bash
# In your backend directory
npm install python-shell
```

### Step 3: Test Quantum Setup

```bash
# Test the quantum demo
cd quantum/
python3 quantum_demo.py < test_qubo.json

# Test full Qiskit (if installed)
python3 qaoa_scheduler.py < test_qubo.json
```

### Step 4: Enable Quantum Scheduler

Update `backend/src/services/scheduler/SchedulerService.ts`:

```typescript
import { QiskitQuantumScheduler } from './QiskitQuantumScheduler';

// In constructor:
this.quantumScheduler = new QiskitQuantumScheduler();

// In optimize method:
case SchedulerAlgorithm.QUANTUM:
  result = await this.quantumScheduler.schedule(request);
  break;
```

## 🔬 Quantum Algorithm Details

### QAOA (Quantum Approximate Optimization Algorithm)

The quantum scheduler uses QAOA to solve the meeting scheduling problem:

1. **Problem Formulation**: Convert scheduling to QUBO (Quadratic Unconstrained Binary Optimization)
2. **Quantum Circuit**: Create parameterized quantum circuit with alternating layers
3. **Optimization**: Use classical optimizer to find optimal quantum parameters
4. **Measurement**: Extract classical solution from quantum state

### QUBO Formulation

```python
# Variables: x_request_host_day_slot ∈ {0,1}
# Objective: Minimize -∑(importance_scores) + penalties

# Constraints:
# 1. Each request scheduled at most once: ∑x_r,*,*,* ≤ 1
# 2. No time conflicts: ∑x_*,h,d,s ≤ 1 for each (host,day,slot)
# 3. Expertise matching bonus: -20 points
# 4. Preferred date bonus: -15 points
```

### Quantum Circuit Structure

```
|0⟩ ──H── RZ(γ₁) ── RX(β₁) ── RZ(γ₂) ── RX(β₂) ── ... ── Measure
|0⟩ ──H── RZ(γ₁) ── RX(β₁) ── RZ(γ₂) ── RX(β₂) ── ... ── Measure
...
```

## 🎯 Usage Examples

### Basic Quantum Optimization

```bash
# Run quantum optimization via API
curl -X POST "http://localhost:3001/api/schedule/optimize" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"quantum","maxIterations":1000}'
```

### Advanced Configuration

```typescript
// Configure quantum parameters
const quantumScheduler = new QiskitQuantumScheduler();
quantumScheduler.maxQubits = 20;        // Max qubits for NISQ devices
quantumScheduler.shots = 2048;          // Measurement shots
quantumScheduler.maxLayers = 5;         // QAOA layers
```

## 🔧 IBM Quantum Integration

### Setup IBM Quantum Account

```python
from qiskit_ibm_provider import IBMProvider

# Save IBM Quantum credentials
IBMProvider.save_account('YOUR_IBM_QUANTUM_TOKEN')

# Use real quantum hardware
provider = IBMProvider()
backend = provider.get_backend('ibm_brisbane')  # 127-qubit processor
```

### Hardware Considerations

- **NISQ Era**: Current quantum computers are noisy and limited
- **Qubit Limit**: Real devices have 5-1000+ qubits
- **Gate Errors**: ~0.1-1% error rates
- **Decoherence**: Quantum states decay quickly (~100μs)

## 📊 Performance Comparison

| Algorithm | Time | Quality | Scalability | Quantum Advantage |
|-----------|------|---------|-------------|-------------------|
| Classical | 10ms | Good | High | None |
| Quantum-Inspired | 100ms | Better | Medium | Concepts only |
| True Quantum | 1-10s | Best* | Limited | Potential |

*For problems where quantum advantage exists

## 🚨 Troubleshooting

### Common Issues

1. **Python not found**: Ensure Python 3.8+ is installed
2. **Qiskit import error**: Run `pip install qiskit`
3. **Memory issues**: Reduce problem size or use classical fallback
4. **IBM Quantum timeout**: Check network and credentials

### Debug Mode

```bash
# Enable quantum debugging
export QUANTUM_DEBUG=true
export QISKIT_LOG_LEVEL=DEBUG

# Run with verbose output
npm run dev:backend
```

## 🔮 Future Enhancements

1. **Variational Quantum Eigensolver (VQE)** for larger problems
2. **Quantum Machine Learning** for preference prediction
3. **Quantum Annealing** using D-Wave systems
4. **Hybrid Classical-Quantum** algorithms
5. **Real-time quantum optimization** with streaming data

## 📚 Resources

- [Qiskit Documentation](https://qiskit.org/documentation/)
- [IBM Quantum Experience](https://quantum-computing.ibm.com/)
- [QAOA Tutorial](https://qiskit.org/textbook/ch-applications/qaoa.html)
- [Quantum Optimization](https://qiskit.org/ecosystem/optimization/)

---

**Note**: Quantum computing is rapidly evolving. This implementation demonstrates current capabilities and prepares for future quantum advantage in optimization problems.
